// Supabase Edge Function — create-checkout
// Crea una Stripe Checkout Session para comprar productos de la tienda o contratar un plan.
// Los precios SIEMPRE se leen de la base de datos (service role); nunca del cliente.
//
// Body:
//   { tipo: 'producto', items: [{ producto_id, variante_id?, cantidad }], return_url_base? }
//   { tipo: 'plan', plan_id, return_url_base? }
// Respuesta: { url }

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
      const productoIds = [...new Set(items.map((i) => i.producto_id))];

      const { data: productos, error: pErr } = await admin
        .from("productos")
        .select("id, nombre, descripcion, precio_cents, moneda, imagen_url, activo")
        .in("id", productoIds);
      if (pErr) throw pErr;
      const prodMap = new Map((productos ?? []).map((p) => [p.id, p]));

      const { data: variantes, error: vErr } = await admin
        .from("producto_variantes")
        .select("id, producto_id, etiqueta, stock, activo")
        .in("producto_id", productoIds);
      if (vErr) throw vErr;
      const varMap = new Map((variantes ?? []).map((v) => [v.id, v]));

      // Stock agregado por variante (el mismo artículo puede venir en varias líneas)
      const pedidoPorVariante = new Map<string, number>();
      let moneda: string | null = null;
      let total = 0;

      for (const it of items) {
        const p = prodMap.get(it.producto_id);
        if (!p || !p.activo) throw new HttpError(409, "Un producto ya no está disponible");
        if (moneda && p.moneda !== moneda) throw new HttpError(400, "No se pueden mezclar monedas");
        moneda = p.moneda;

        const activeVariants = (variantes ?? []).filter((v) => v.producto_id === p.id && v.activo);
        if (it.variante_id) {
          const v = varMap.get(it.variante_id);
          if (!v || v.producto_id !== p.id || !v.activo) {
            throw new HttpError(409, `La variante de "${p.nombre}" ya no está disponible`);
          }
          pedidoPorVariante.set(v.id, (pedidoPorVariante.get(v.id) ?? 0) + it.cantidad);
        } else if (activeVariants.length > 0) {
          throw new HttpError(400, `Selecciona una talla/variante para "${p.nombre}"`);
        }
        total += p.precio_cents * it.cantidad;
      }

      for (const [vid, cant] of pedidoPorVariante) {
        const v = varMap.get(vid)!;
        if (v.stock < cant) {
          const p = prodMap.get(v.producto_id)!;
          throw new HttpError(409, `Sin stock suficiente de "${p.nombre}" (${v.etiqueta})`);
        }
      }

      if (total <= 0) throw new HttpError(400, "El total del pedido debe ser mayor que 0");

      const customerId = await getOrCreateCustomer(admin, stripe, user.id, user.email);

      const { data: pedido, error: pedErr } = await admin
        .from("pedidos")
        .insert({ usuario_id: user.id, estado: "pendiente", total_cents: total, moneda })
        .select("id")
        .single();
      if (pedErr) throw pedErr;

      try {
        const { error: itemsErr } = await admin.from("pedido_items").insert(
          items.map((it) => ({
            pedido_id: pedido.id,
            producto_id: it.producto_id,
            variante_id: it.variante_id,
            cantidad: it.cantidad,
            precio_cents: prodMap.get(it.producto_id)!.precio_cents,
          })),
        );
        if (itemsErr) throw itemsErr;

        const metadata = { tipo: "producto", pedido_id: pedido.id, usuario_id: user.id };
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          customer: customerId,
          client_reference_id: user.id,
          line_items: items.map((it) => {
            const p = prodMap.get(it.producto_id)!;
            const v = it.variante_id ? varMap.get(it.variante_id) : null;
            return {
              quantity: it.cantidad,
              price_data: {
                currency: p.moneda,
                unit_amount: p.precio_cents,
                product_data: {
                  name: v ? `${p.nombre} (${v.etiqueta})` : p.nombre,
                  ...(p.descripcion ? { description: p.descripcion } : {}),
                  ...(p.imagen_url?.startsWith("https://") ? { images: [p.imagen_url] } : {}),
                },
              },
            };
          }),
          metadata,
          payment_intent_data: { metadata },
          success_url: successUrl,
          cancel_url: cancelUrl,
        });

        const { error: updErr } = await admin
          .from("pedidos")
          .update({ stripe_session_id: session.id })
          .eq("id", pedido.id);
        if (updErr) throw updErr;

        return json({ url: session.url });
      } catch (e) {
        await admin.from("pedidos").delete().eq("id", pedido.id).eq("estado", "pendiente");
        throw e;
      }
    }

    // ─── Planes ────────────────────────────────────────────────────────────
    if (body.tipo === "plan") {
      if (!isUuid(body.plan_id)) throw new HttpError(400, "plan_id inválido");

      const { data: plan, error: planErr } = await admin
        .from("planes")
        .select("id, nombre, descripcion, precio_cents, moneda, tipo, meses, activo")
        .eq("id", body.plan_id)
        .maybeSingle();
      if (planErr) throw planErr;
      if (!plan || !plan.activo) throw new HttpError(404, "Plan no disponible");
      if (plan.precio_cents <= 0) throw new HttpError(400, "El plan no tiene precio válido");

      if (plan.tipo === "recurrente") {
        const { data: vigente } = await admin
          .from("suscripciones")
          .select("id")
          .eq("usuario_id", user.id)
          .not("stripe_subscription_id", "is", null)
          .in("estado", ["activa", "impago"])
          .limit(1);
        if (vigente && vigente.length > 0) {
          throw new HttpError(409, "Ya tienes una suscripción activa. Gestiónala desde el portal de pagos.");
        }
      }

      const customerId = await getOrCreateCustomer(admin, stripe, user.id, user.email);

      const { data: sus, error: susErr } = await admin
        .from("suscripciones")
        .insert({ usuario_id: user.id, plan_id: plan.id, estado: "pendiente" })
        .select("id")
        .single();
      if (susErr) throw susErr;

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
            success_url: successUrl,
            cancel_url: cancelUrl,
          });

        const { error: updErr } = await admin
          .from("suscripciones")
          .update({ stripe_session_id: session.id })
          .eq("id", sus.id);
        if (updErr) throw updErr;

        return json({ url: session.url });
      } catch (e) {
        await admin.from("suscripciones").delete().eq("id", sus.id).eq("estado", "pendiente");
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
