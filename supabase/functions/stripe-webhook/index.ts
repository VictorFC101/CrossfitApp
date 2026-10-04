// Supabase Edge Function — stripe-webhook
// Recibe eventos de Stripe, verifica la firma (STRIPE_WEBHOOK_SECRET) y sincroniza
// pedidos / suscripciones / pagos con service role.
//
// IMPORTANTE: desplegar con verificación JWT desactivada:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Idempotencia: cada evento se "reclama" insertando una fila en pagos con
// stripe_event_id UNIQUE. Si ya existe, el evento se ignora (200). Si el
// procesamiento falla, la fila se borra y se devuelve 500 para que Stripe reintente.
// Además, las transiciones de estado son condicionales (p.ej. solo pendiente → pagado),
// por lo que el descuento de stock nunca se aplica dos veces.

import Stripe from "npm:stripe@17.7.0";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} no configurada en Supabase secrets`);
  return v;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const stripe = new Stripe(env("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-02-24.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const admin: SupabaseClient = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Datos con los que se completa la fila de pagos del evento. */
interface PagoInfo {
  usuario_id?: string | null;
  tipo?: "pedido" | "suscripcion" | null;
  referencia_id?: string | null;
  importe_cents?: number | null;
  moneda?: string | null;
  estado?: string | null;
}

const HANDLED = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

// ─── Utilidades ──────────────────────────────────────────────────────────────
const toIso = (unix?: number | null) => (unix ? new Date(unix * 1000).toISOString() : null);

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0); // 31 ene + 1 mes → 28/29 feb
  return d;
}

function idOf(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}

/** Periodo actual de una suscripción (compatible con APIs donde se movió a items). */
function subscriptionPeriod(sub: Stripe.Subscription): { start: string | null; end: string | null } {
  // deno-lint-ignore no-explicit-any
  const s = sub as any;
  const item = s.items?.data?.[0];
  return {
    start: toIso(s.current_period_start ?? item?.current_period_start),
    end: toIso(s.current_period_end ?? item?.current_period_end),
  };
}

function mapSubscriptionStatus(sub: Stripe.Subscription): string {
  switch (sub.status) {
    case "active":
    case "trialing":
      return "activa";
    case "past_due":
    case "unpaid":
      return "impago";
    case "canceled":
      return sub.cancel_at_period_end ? "vencida" : "cancelada";
    case "incomplete_expired":
      return "vencida";
    default:
      return "pendiente"; // incomplete, paused
  }
}

/** Busca la fila de suscripciones de una suscripción de Stripe (por id o por metadata). */
async function findSuscripcion(sub: Stripe.Subscription) {
  const { data: byStripe, error } = await admin
    .from("suscripciones")
    .select("id, usuario_id, estado")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (error) throw error;
  if (byStripe) return byStripe;

  const susId = sub.metadata?.suscripcion_id;
  if (!susId) return null;
  const { data: byMeta, error: e2 } = await admin
    .from("suscripciones")
    .select("id, usuario_id, estado")
    .eq("id", susId)
    .maybeSingle();
  if (e2) throw e2;
  return byMeta;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // deno-lint-ignore no-explicit-any
  const inv = invoice as any;
  return idOf(inv.subscription) ?? idOf(inv.parent?.subscription_details?.subscription) ?? null;
}

// ─── Handlers ────────────────────────────────────────────────────────────────
async function onCheckoutPaid(session: Stripe.Checkout.Session): Promise<PagoInfo> {
  const meta = session.metadata ?? {};
  const base: PagoInfo = {
    usuario_id: meta.usuario_id ?? null,
    importe_cents: session.amount_total,
    moneda: session.currency,
  };

  if (session.payment_status === "unpaid") {
    // Pago asíncrono (p.ej. SEPA): se confirmará con async_payment_succeeded
    return { ...base, estado: "procesando" };
  }

  if (meta.tipo === "producto" && meta.pedido_id) {
    const { data: updated, error } = await admin
      .from("pedidos")
      .update({ estado: "pagado", stripe_payment_intent: idOf(session.payment_intent) })
      .eq("id", meta.pedido_id)
      .eq("estado", "pendiente")
      .select("id");
    if (error) throw error;

    // Solo descontar stock si este evento hizo la transición pendiente → pagado
    if (updated && updated.length > 0) {
      const { data: items, error: iErr } = await admin
        .from("pedido_items")
        .select("variante_id, cantidad")
        .eq("pedido_id", meta.pedido_id);
      if (iErr) throw iErr;
      for (const it of items ?? []) {
        if (!it.variante_id) continue;
        const { error: sErr } = await admin.rpc("decrementar_stock", {
          p_variante_id: it.variante_id,
          p_cantidad: it.cantidad,
        });
        if (sErr) throw sErr;
      }
    }
    return { ...base, tipo: "pedido", referencia_id: meta.pedido_id, estado: "pagado" };
  }

  if (meta.tipo === "plan" && meta.suscripcion_id) {
    const susRef = { ...base, tipo: "suscripcion" as const, referencia_id: meta.suscripcion_id };

    if (session.mode === "subscription") {
      const subId = idOf(session.subscription);
      if (!subId) throw new Error("checkout.session sin subscription");
      const sub = await stripe.subscriptions.retrieve(subId);
      const { start, end } = subscriptionPeriod(sub);
      const { error } = await admin
        .from("suscripciones")
        .update({
          stripe_subscription_id: subId,
          estado: mapSubscriptionStatus(sub),
          periodo_inicio: start,
          periodo_fin: end,
          cancelar_al_final: sub.cancel_at_period_end,
        })
        .eq("id", meta.suscripcion_id);
      if (error) throw error;
      return { ...susRef, estado: "activa" };
    }

    // Prepago: acceso durante plan.meses. Si ya tiene un prepago vigente, se encadena.
    const { data: sus, error: sErr } = await admin
      .from("suscripciones")
      .select("id, usuario_id, estado, planes(meses)")
      .eq("id", meta.suscripcion_id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!sus) throw new Error(`suscripcion ${meta.suscripcion_id} no encontrada`);
    if (sus.estado !== "pendiente") return { ...susRef, estado: sus.estado };

    // deno-lint-ignore no-explicit-any
    const meses = Number((sus as any).planes?.meses ?? 1);
    const now = new Date();
    const { data: vigentes } = await admin
      .from("suscripciones")
      .select("periodo_fin")
      .eq("usuario_id", sus.usuario_id)
      .eq("estado", "activa")
      .is("stripe_subscription_id", null)
      .gt("periodo_fin", now.toISOString())
      .order("periodo_fin", { ascending: false })
      .limit(1);
    const inicio = vigentes?.[0]?.periodo_fin ? new Date(vigentes[0].periodo_fin) : now;

    const { error } = await admin
      .from("suscripciones")
      .update({
        estado: "activa",
        periodo_inicio: inicio.toISOString(),
        periodo_fin: addMonths(inicio, meses).toISOString(),
      })
      .eq("id", sus.id)
      .eq("estado", "pendiente");
    if (error) throw error;
    return { ...susRef, estado: "activa" };
  }

  return { ...base, estado: "ignorado" };
}

async function onCheckoutClosedUnpaid(session: Stripe.Checkout.Session): Promise<PagoInfo> {
  const meta = session.metadata ?? {};
  if (meta.tipo === "producto" && meta.pedido_id) {
    const { error } = await admin
      .from("pedidos")
      .update({ estado: "cancelado" })
      .eq("id", meta.pedido_id)
      .eq("estado", "pendiente");
    if (error) throw error;
    return { usuario_id: meta.usuario_id, tipo: "pedido", referencia_id: meta.pedido_id, estado: "cancelado" };
  }
  if (meta.tipo === "plan" && meta.suscripcion_id) {
    const { error } = await admin
      .from("suscripciones")
      .update({ estado: "cancelada" })
      .eq("id", meta.suscripcion_id)
      .eq("estado", "pendiente");
    if (error) throw error;
    return { usuario_id: meta.usuario_id, tipo: "suscripcion", referencia_id: meta.suscripcion_id, estado: "cancelada" };
  }
  return { usuario_id: meta.usuario_id ?? null, estado: "ignorado" };
}

async function onInvoice(invoice: Stripe.Invoice, paid: boolean): Promise<PagoInfo> {
  const subId = invoiceSubscriptionId(invoice);
  const info: PagoInfo = {
    tipo: "suscripcion",
    importe_cents: paid ? invoice.amount_paid : invoice.amount_due,
    moneda: invoice.currency,
  };
  if (!subId) return { ...info, estado: "ignorado" };

  const sub = await stripe.subscriptions.retrieve(subId);
  const sus = await findSuscripcion(sub);
  if (!sus) {
    // Puede llegar antes de que exista la fila: devolver error para que Stripe reintente
    throw new Error(`Sin suscripción local para ${subId}`);
  }

  const update: Record<string, unknown> = { stripe_subscription_id: subId };
  if (paid) {
    const { start, end } = subscriptionPeriod(sub);
    update.estado = "activa";
    update.periodo_fin = end;
    if (sus.estado === "pendiente") update.periodo_inicio = start;
  } else {
    update.estado = "impago";
  }
  const { error } = await admin.from("suscripciones").update(update).eq("id", sus.id);
  if (error) throw error;

  return { ...info, usuario_id: sus.usuario_id, referencia_id: sus.id, estado: paid ? "pagado" : "fallido" };
}

async function onSubscriptionChange(sub: Stripe.Subscription, deleted: boolean): Promise<PagoInfo> {
  const sus = await findSuscripcion(sub);
  if (!sus) return { tipo: "suscripcion", estado: "ignorado" };

  const { end } = subscriptionPeriod(sub);
  const estado = deleted ? (sub.cancel_at_period_end ? "vencida" : "cancelada") : mapSubscriptionStatus(sub);

  // No pisar una activación con un 'pendiente' (incomplete) tardío
  const update: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    cancelar_al_final: sub.cancel_at_period_end,
  };
  if (!(estado === "pendiente" && sus.estado !== "pendiente")) update.estado = estado;
  if (end) update.periodo_fin = end;

  const { error } = await admin.from("suscripciones").update(update).eq("id", sus.id);
  if (error) throw error;
  return { tipo: "suscripcion", usuario_id: sus.usuario_id, referencia_id: sus.id, estado };
}

async function handle(event: Stripe.Event): Promise<PagoInfo> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return await onCheckoutPaid(event.data.object as Stripe.Checkout.Session);
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed":
      return await onCheckoutClosedUnpaid(event.data.object as Stripe.Checkout.Session);
    case "invoice.paid":
      return await onInvoice(event.data.object as Stripe.Invoice, true);
    case "invoice.payment_failed":
      return await onInvoice(event.data.object as Stripe.Invoice, false);
    case "customer.subscription.updated":
      return await onSubscriptionChange(event.data.object as Stripe.Subscription, false);
    case "customer.subscription.deleted":
      return await onSubscriptionChange(event.data.object as Stripe.Subscription, true);
    default:
      return { estado: "ignorado" };
  }
}

// ─── Entrada ─────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) return json({ error: "Falta Stripe-Signature" }, 400);

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      env("STRIPE_WEBHOOK_SECRET"),
      undefined,
      cryptoProvider,
    );
  } catch (e) {
    console.error("Firma inválida:", (e as Error).message);
    return json({ error: "Firma inválida" }, 400);
  }

  if (!HANDLED.has(event.type)) return json({ received: true, ignored: event.type });

  // Reclamar el evento (idempotencia)
  const { error: claimErr } = await admin
    .from("pagos")
    .insert({ stripe_event_id: event.id, estado: "procesando" });
  if (claimErr) {
    if (claimErr.code === "23505") return json({ received: true, duplicate: true });
    console.error("Error reclamando evento:", claimErr);
    return json({ error: "Error interno" }, 500);
  }

  try {
    const info = await handle(event);
    const { error } = await admin
      .from("pagos")
      .update({
        usuario_id: info.usuario_id ?? null,
        tipo: info.tipo ?? null,
        referencia_id: info.referencia_id ?? null,
        importe_cents: info.importe_cents ?? null,
        moneda: info.moneda ?? null,
        estado: info.estado ?? null,
      })
      .eq("stripe_event_id", event.id);
    if (error) console.error("Error actualizando pagos:", error);
    return json({ received: true });
  } catch (e) {
    console.error(`Error procesando ${event.type} (${event.id}):`, e);
    // Liberar el evento para que el reintento de Stripe lo procese
    await admin.from("pagos").delete().eq("stripe_event_id", event.id);
    return json({ error: "Error procesando evento" }, 500);
  }
});
