// Supabase Edge Function — create-checkout
// Crea una Stripe Checkout Session para comprar productos de la tienda o contratar un plan.
// Los precios SIEMPRE se leen de la base de datos (service role); nunca del cliente.
//
// Body:
//   { tipo: 'producto', items: [{ producto_id, variante_id?, cantidad }], return_url_base? }
//   { tipo: 'plan', plan_id, return_url_base? }
// Respuesta: { url }
//
// Productos: la RPC crear_pedido_reservando (migración 020) valida y RESERVA stock en una
// transacción; la sesión caduca a los 31 min (< ventana de reserva de 35 min). Si Stripe
// falla, el pedido pasa a 'cancelado' y la reserva se libera.
// Solo se puede comprar catálogo del box del comprador o global (box_id NULL).
// Planes recurrentes: 409 si ya hay una suscripción vigente en BD o en Stripe; se reutiliza
// la Checkout abierta del mismo plan y se expiran las de otros planes.

import Stripe from "npm:stripe@17.7.0";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_RETURN_BASE = "wodly:/"; // → wodly://pago/exito
const MAX_ITEMS = 50;
const MAX_CANTIDAD = 99;

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} no configurada en Supabase secrets`);
  return v;
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function resolveReturnBase(requested: unknown): string {
  if (requested === undefined || requested === null || requested === "") return DEFAULT_RETURN_BASE;
  if (typeof requested !== "string") throw new HttpError(400, "return_url_base inválido");
  const base = requested.replace(/\/+$/, "");
  const allowed = (Deno.env.get("ALLOWED_RETURN_BASES") ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (base === DEFAULT_RETURN_BASE.replace(/\/+$/, "")) return DEFAULT_RETURN_BASE;
  if (!allowed.includes(base)) throw new HttpError(400, "return_url_base no permitido");
  return base;
}

async function getOrCreateCustomer(
  admin: SupabaseClient,
  stripe: Stripe,
  userId: string,
  email: string | undefined,
): Promise<string> {
  const { data: existing, error } = await admin
    .from("clientes_stripe")
    .select("stripe_customer_id")
    .eq("usuario_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await stripe.customers.create(
    { email, metadata: { usuario_id: userId } },
    { idempotencyKey: `customer-${userId}` },
  );

  const { error: insErr } = await admin
    .from("clientes_stripe")
    .insert({ usuario_id: userId, stripe_customer_id: customer.id });
  if (insErr) {
    // Carrera: otra petición lo creó a la vez → usar el guardado
    const { data: again } = await admin
      .from("clientes_stripe")
      .select("stripe_customer_id")
      .eq("usuario_id", userId)
      .maybeSingle();
    if (again?.stripe_customer_id) return again.stripe_customer_id;
    throw insErr;
  }
  return customer.id;
}

interface ItemInput {
  producto_id: string;
  variante_id?: string | null;
  cantidad: number;
}

function parseItems(raw: unknown): ItemInput[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, "El carrito está vacío");
  if (raw.length > MAX_ITEMS) throw new HttpError(400, "Demasiados artículos en el carrito");
  return raw.map((it) => {
    const i = it as Record<string, unknown>;
    if (!isUuid(i.producto_id)) throw new HttpError(400, "producto_id inválido");
    if (i.variante_id != null && !isUuid(i.variante_id)) throw new HttpError(400, "variante_id inválido");
    const cantidad = Number(i.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
      throw new HttpError(400, "Cantidad inválida");
    }
    return { producto_id: i.producto_id, variante_id: (i.variante_id as string) ?? null, cantidad };
  });
}

/** Resultado de la RPC crear_pedido_reservando (migración 020). */
interface Reserva {
  pedido_id: string;
  total_cents: number;
  moneda: string;
  items: {
    producto_id: string;
    variante_id: string | null;
    cantidad: number;
    precio_cents: number;
    nombre: string;
    descripcion: string | null;
    imagen_url: string | null;
    etiqueta: string | null;
  }[];
}

/**
 * Caducidad de las Checkout Sessions: 31 min (Stripe exige ≥ 30; +1 por desfase de reloj).
 * Debe ser MENOR que la ventana de reserva de crear_pedido_reservando (35 min).
 */
const SESSION_TTL_S = 31 * 60;
const RESERVA_MIN = 35;
const sessionExpiresAt = () => Math.floor(Date.now() / 1000) + SESSION_TTL_S;

/** Suscripciones de Stripe que cuentan como "ya tiene una" para no duplicar recurrentes. */
const SUB_VIGENTE = new Set(["active", "trialing", "past_due", "unpaid"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const stripe = new Stripe(env("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-02-24.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });
    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ─── Auth ──────────────────────────────────────────────────────────────
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) throw new HttpError(401, "No autenticado");
    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData?.user) throw new HttpError(401, "Sesión inválida");
    const user = authData.user;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "JSON inválido");
    }

    const base = resolveReturnBase(body.return_url_base);
    const successUrl = `${base}/pago/exito?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${base}/pago/cancelado`;

    // ─── Productos ─────────────────────────────────────────────────────────
    if (body.tipo === "producto") {
      const items = parseItems(body.items);

      // Validación (activo, box del comprador, variante obligatoria, moneda), precios de la BD
      // y RESERVA de stock en una sola transacción (migración 020). El pedido 'pendiente'
      // reserva sus unidades durante RESERVA_MIN minutos.
      const { data: reserva, error: rErr } = await admin.rpc("crear_pedido_reservando", {
        p_usuario_id: user.id,
        p_items: items,
      });
      if (rErr) {
        const m = /^PT(\d{3})$/.exec(rErr.code ?? "");
        if (m) throw new HttpError(Number(m[1]), rErr.message);
        throw rErr;
      }
      const pedido = reserva as Reserva;

      let sessionId: string | null = null;
      try {
        const customerId = await getOrCreateCustomer(admin, stripe, user.id, user.email);
        const metadata = { tipo: "producto", pedido_id: pedido.pedido_id, usuario_id: user.id };
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          customer: customerId,
          client_reference_id: user.id,
          line_items: pedido.items.map((it) => ({
            quantity: it.cantidad,
            price_data: {
              currency: pedido.moneda,
              unit_amount: it.precio_cents,
              product_data: {
                name: it.etiqueta ? `${it.nombre} (${it.etiqueta})` : it.nombre,
                ...(it.descripcion ? { description: it.descripcion } : {}),
                ...(it.imagen_url?.startsWith("https://") ? { images: [it.imagen_url] } : {}),
              },
            },
          })),
          metadata,
          payment_intent_data: { metadata },
          // Caduca antes de que termine la reserva (35 min): un pendiente que ya no cuenta
          // como reserva tampoco se puede pagar.
          expires_at: sessionExpiresAt(),
          success_url: successUrl,
          cancel_url: cancelUrl,
        });
        sessionId = session.id;

        const { error: updErr } = await admin
          .from("pedidos")
          .update({ stripe_session_id: session.id })
          .eq("id", pedido.pedido_id);
        if (updErr) throw updErr;

        return json({ url: session.url });
      } catch (e) {
        // Liberar la reserva y que la sesión (si llegó a crearse) no se pueda pagar
        if (sessionId) {
          await stripe.checkout.sessions.expire(sessionId).catch((x) =>
            console.error("No se pudo expirar la sesión", sessionId, x)
          );
        }
        const { error: cErr } = await admin
          .from("pedidos")
          .update({ estado: "cancelado" })
          .eq("id", pedido.pedido_id)
          .eq("estado", "pendiente");
        if (cErr) console.error("No se pudo cancelar el pedido", pedido.pedido_id, cErr);
        throw e;
      }
    }

    // ─── Planes ────────────────────────────────────────────────────────────
    if (body.tipo === "plan") {
      if (!isUuid(body.plan_id)) throw new HttpError(400, "plan_id inválido");

      const { data: plan, error: planErr } = await admin
        .from("planes")
        .select("id, box_id, nombre, descripcion, precio_cents, moneda, tipo, meses, activo")
        .eq("id", body.plan_id)
        .maybeSingle();
      if (planErr) throw planErr;
      if (!plan || !plan.activo) throw new HttpError(404, "Plan no disponible");
      if (plan.precio_cents <= 0) throw new HttpError(400, "El plan no tiene precio válido");

      // Solo planes del box del comprador (o globales). Sin box → solo globales.
      const { data: perfil, error: perfErr } = await admin
        .from("usuarios")
        .select("box_id")
        .eq("id", user.id)
        .maybeSingle();
      if (perfErr) throw perfErr;
      if (!perfil) throw new HttpError(403, "Perfil de usuario no encontrado");
      if (plan.box_id !== null && plan.box_id !== perfil.box_id) {
        throw new HttpError(403, "Este plan no está disponible en tu box");
      }

      const yaTienes = "Ya tienes una suscripción activa. Gestiónala desde el portal de pagos.";
      if (plan.tipo === "recurrente") {
        const { data: vigente, error: vErr } = await admin
          .from("suscripciones")
          .select("id")
          .eq("usuario_id", user.id)
          .not("stripe_subscription_id", "is", null)
          .in("estado", ["activa", "impago"])
          .limit(1);
        if (vErr) throw vErr;
        if (vigente && vigente.length > 0) throw new HttpError(409, yaTienes);
      }

      const customerId = await getOrCreateCustomer(admin, stripe, user.id, user.email);

      if (plan.tipo === "recurrente") {
        // Fuente de verdad: Stripe (la BD puede ir por detrás si un webhook aún no llegó)
        const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
        if (subs.data.some((s) => SUB_VIGENTE.has(s.status))) throw new HttpError(409, yaTienes);

        const limite = new Date(Date.now() - RESERVA_MIN * 60 * 1000).toISOString();

        // Intentos anteriores aún abiertos: reutilizar el del mismo plan, expirar los demás
        // (como mucho una Checkout de suscripción abierta por usuario → no se paga dos veces).
        const { data: abiertas, error: aErr } = await admin
          .from("suscripciones")
          .select("id, plan_id, stripe_session_id")
          .eq("usuario_id", user.id)
          .eq("estado", "pendiente")
          .not("stripe_session_id", "is", null)
          .gt("created_at", limite)
          .order("created_at", { ascending: false })
          .limit(5);
        if (aErr) throw aErr;
        for (const row of abiertas ?? []) {
          const prev = await stripe.checkout.sessions.retrieve(row.stripe_session_id!);
          if (prev.mode !== "subscription") continue;
          if (prev.status === "complete") {
            throw new HttpError(409, "Ya tienes una suscripción en proceso de alta. Espera unos minutos.");
          }
          if (prev.status !== "open") continue;
          if (row.plan_id === plan.id && prev.success_url === successUrl && prev.url) {
            return json({ url: prev.url });
          }
          await stripe.checkout.sessions.expire(prev.id); // el webhook .expired la cancela
        }

        // Pendientes caducados de este plan (su sesión ya no se puede pagar): no acumularlos.
        // Si aun así llegara un pago, el webhook reactiva la fila por id / stripe_subscription_id.
        const { error: stErr } = await admin
          .from("suscripciones")
          .update({ estado: "vencida" })
          .eq("usuario_id", user.id)
          .eq("plan_id", plan.id)
          .eq("estado", "pendiente")
          .lt("created_at", limite);
        if (stErr) throw stErr;
      }

      const { data: sus, error: susErr } = await admin
        .from("suscripciones")
        .insert({ usuario_id: user.id, plan_id: plan.id, estado: "pendiente" })
        .select("id")
        .single();
      if (susErr) throw susErr;

      let sessionId: string | null = null;
      try {
        const metadata = {
          tipo: "plan",
          plan_tipo: plan.tipo,
          suscripcion_id: sus.id,
          plan_id: plan.id,
          usuario_id: user.id,
        };
        const productData = {
          name: plan.nombre,
          ...(plan.descripcion ? { description: plan.descripcion } : {}),
        };

        const session = plan.tipo === "recurrente"
          ? await stripe.checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            client_reference_id: user.id,
            line_items: [{
              quantity: 1,
              price_data: {
                currency: plan.moneda,
                unit_amount: plan.precio_cents,
                recurring: { interval: "month", interval_count: plan.meses },
                product_data: productData,
              },
            }],
            metadata,
            subscription_data: { metadata },
            expires_at: sessionExpiresAt(),
            success_url: successUrl,
            cancel_url: cancelUrl,
          })
          : await stripe.checkout.sessions.create({
            mode: "payment",
            customer: customerId,
            client_reference_id: user.id,
            line_items: [{
              quantity: 1,
              price_data: {
                currency: plan.moneda,
                unit_amount: plan.precio_cents,
                product_data: productData,
              },
            }],
            metadata,
            payment_intent_data: { metadata },
            expires_at: sessionExpiresAt(),
            success_url: successUrl,
            cancel_url: cancelUrl,
          });
        sessionId = session.id;

        const { error: updErr } = await admin
          .from("suscripciones")
          .update({ stripe_session_id: session.id })
          .eq("id", sus.id);
        if (updErr) throw updErr;

        return json({ url: session.url });
      } catch (e) {
        // Se marca 'cancelada' (no se borra): si la sesión llegara a pagarse, el webhook
        // encuentra la fila por metadata.suscripcion_id y la activa.
        if (sessionId) {
          await stripe.checkout.sessions.expire(sessionId).catch((x) =>
            console.error("No se pudo expirar la sesión", sessionId, x)
          );
        }
        const { error: cErr } = await admin
          .from("suscripciones")
          .update({ estado: "cancelada" })
          .eq("id", sus.id)
          .eq("estado", "pendiente");
        if (cErr) console.error("No se pudo cancelar la suscripción", sus.id, cErr);
        throw e;
      }
    }

    throw new HttpError(400, "tipo debe ser 'producto' o 'plan'");
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof Stripe.errors.StripeError) {
      console.error("Stripe error:", e.type, e.message);
      return json({ error: "Error con el proveedor de pagos" }, 502);
    }
    console.error("create-checkout error:", e);
    return json({ error: "Error interno" }, 500);
  }
});
