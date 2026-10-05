// Supabase Edge Function — stripe-webhook
// Recibe eventos de Stripe, verifica la firma (STRIPE_WEBHOOK_SECRET) y sincroniza
// pedidos / suscripciones / pagos con service role.
//
// IMPORTANTE: desplegar con verificación JWT desactivada:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Idempotencia: cada evento se "reclama" insertando una fila en pagos con
// stripe_event_id UNIQUE (estado 'procesando'). Si ya existe y está terminada, el evento
// se ignora (200). Si sigue en 'procesando' desde hace más de CLAIM_STALE_MS (la función
// murió a mitad), el reintento la "retoma" con un UPDATE condicional atómico y la procesa
// de nuevo. Si el procesamiento lanza error, la fila se borra y se devuelve 500 para que
// Stripe reintente.
// Todos los handlers son re-ejecutables: las transiciones de estado son condicionales
// (p.ej. solo pendiente → pagado) y el paso a pagado + descuento de stock va en una sola
// transacción (RPC marcar_pedido_pagado), por lo que el stock nunca se descuenta dos veces.
//
// Requiere la migración 017_pagos_hardening.sql aplicada ANTES de desplegar esta versión.

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
  "charge.refunded",
  "charge.dispute.created",
]);

/**
 * Antigüedad a partir de la cual una fila 'procesando' se considera abandonada
 * (la ejecución anterior murió). Mayor que el límite de ejecución de una Edge Function
 * (400 s en planes de pago) para no retomar un evento que aún se está procesando.
 * Mientras no caduque, el reintento recibe 409 (no 200) para que Stripe vuelva a intentarlo.
 */
const CLAIM_STALE_MS = 7 * 60 * 1000;

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
    // Pago asíncrono (p.ej. SEPA): se confirmará con async_payment_succeeded.
    // No usar 'procesando' (reservado para eventos en curso / abandonados).
    return { ...base, estado: "pago_pendiente" };
  }

  if (meta.tipo === "producto" && meta.pedido_id) {
    // pendiente → pagado + descuento de stock en UNA transacción: si la función muere a
    // mitad no queda un pedido pagado sin descontar, y un reintento no descuenta dos veces.
    const { error } = await admin.rpc("marcar_pedido_pagado", {
      p_pedido_id: meta.pedido_id,
      p_payment_intent: idOf(session.payment_intent),
    });
    if (error) throw error;
    return { ...base, tipo: "pedido", referencia_id: meta.pedido_id, estado: "pagado" };
  }

  if (meta.tipo === "plan" && meta.suscripcion_id) {
    const susRef = { ...base, tipo: "suscripcion" as const, referencia_id: meta.suscripcion_id };

    if (session.mode === "subscription") {
      const subId = idOf(session.subscription);
      if (!subId) throw new Error("checkout.session sin subscription");
      const sub = await stripe.subscriptions.retrieve(subId);
      const { start, end } = subscriptionPeriod(sub);
      const estado = mapSubscriptionStatus(sub);
      // CHECK suscripciones_activa_con_fin: nunca 'activa' sin periodo_fin
      if (estado === "activa" && !end) throw new Error(`Suscripción ${subId} activa sin current_period_end`);
      const { error } = await admin
        .from("suscripciones")
        .update({
          stripe_subscription_id: subId,
          estado,
          periodo_inicio: start,
          periodo_fin: end,
          cancelar_al_final: sub.cancel_at_period_end,
        })
        .eq("id", meta.suscripcion_id);
      if (error) throw error;
      return { ...susRef, estado };
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
    const { data: vigentes, error: vErr } = await admin
      .from("suscripciones")
      .select("periodo_fin")
      .eq("usuario_id", sus.usuario_id)
      .eq("estado", "activa")
      .is("stripe_subscription_id", null)
      .gt("periodo_fin", now.toISOString())
      .order("periodo_fin", { ascending: false })
      .limit(1);
    if (vErr) throw vErr; // no acortar el encadenado por un error de lectura
    const inicio = vigentes?.[0]?.periodo_fin ? new Date(vigentes[0].periodo_fin) : now;

    const { error } = await admin
      .from("suscripciones")
      .update({
        estado: "activa",
        periodo_inicio: inicio.toISOString(),
        periodo_fin: addMonths(inicio, meses).toISOString(),
        // Para enlazar un reembolso (charge.refunded) con esta suscripción
        stripe_payment_intent: idOf(session.payment_intent),
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
    const live = mapSubscriptionStatus(sub);
    if (live === "cancelada" || live === "vencida") {
      // Factura pagada reenviada/tardía de una suscripción ya terminada: no reactivar
      update.estado = live;
      if (end) update.periodo_fin = end;
    } else {
      // CHECK suscripciones_activa_con_fin: nunca 'activa' sin periodo_fin
      if (!end) throw new Error(`Suscripción ${subId} sin current_period_end`);
      update.estado = "activa";
      update.periodo_fin = end;
      if (sus.estado === "pendiente") update.periodo_inicio = start;
    }
  } else {
    // Según el estado real en Stripe: un fallo tardío/reenviado no debe pisar una suscripción
    // ya terminada ni una que ya se recuperó (activa) con un pago posterior.
    const live = mapSubscriptionStatus(sub);
    if (live === "cancelada" || live === "vencida") update.estado = live;
    else if (live !== "activa") update.estado = "impago";
  }
  const { error } = await admin.from("suscripciones").update(update).eq("id", sus.id);
  if (error) throw error;

  return { ...info, usuario_id: sus.usuario_id, referencia_id: sus.id, estado: paid ? "pagado" : "fallido" };
}

async function onSubscriptionChange(sub: Stripe.Subscription, deleted: boolean): Promise<PagoInfo> {
  const sus = await findSuscripcion(sub);
  if (!sus) return { tipo: "suscripcion", estado: "ignorado" };

  let { end } = subscriptionPeriod(sub);
  const estado = deleted ? (sub.cancel_at_period_end ? "vencida" : "cancelada") : mapSubscriptionStatus(sub);

  // CHECK suscripciones_activa_con_fin: no activar sin periodo_fin. Si el payload no trae el
  // periodo, se consulta la suscripción en Stripe; si aun así no hay, no se toca el estado.
  if (estado === "activa" && !end) {
    end = subscriptionPeriod(await stripe.subscriptions.retrieve(sub.id)).end;
  }

  // No pisar una activación con un 'pendiente' (incomplete) tardío
  const update: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    cancelar_al_final: sub.cancel_at_period_end,
  };
  if (!(estado === "pendiente" && sus.estado !== "pendiente") && !(estado === "activa" && !end)) {
    update.estado = estado;
  }
  if (end) update.periodo_fin = end;

  const { error } = await admin.from("suscripciones").update(update).eq("id", sus.id);
  if (error) throw error;
  return { tipo: "suscripcion", usuario_id: sus.usuario_id, referencia_id: sus.id, estado };
}

interface Referencia {
  tipo: "pedido" | "suscripcion";
  id: string;
  usuario_id: string | null;
  recurrente: boolean;
}

/**
 * Localiza el pedido / suscripción de un cargo: primero por stripe_payment_intent guardado,
 * después por la metadata del PaymentIntent (filas anteriores a la 017) y, para facturas de
 * suscripciones recurrentes, por la suscripción de la factura.
 */
async function findReferencia(paymentIntentId: string | null, invoiceId: string | null): Promise<Referencia | null> {
  if (paymentIntentId) {
    const { data: ped, error: e1 } = await admin
      .from("pedidos")
      .select("id, usuario_id")
      .eq("stripe_payment_intent", paymentIntentId)
      .maybeSingle();
    if (e1) throw e1;
    if (ped) return { tipo: "pedido", id: ped.id, usuario_id: ped.usuario_id, recurrente: false };

    const { data: sus, error: e2 } = await admin
      .from("suscripciones")
      .select("id, usuario_id")
      .eq("stripe_payment_intent", paymentIntentId)
      .maybeSingle();
    if (e2) throw e2;
    if (sus) return { tipo: "suscripcion", id: sus.id, usuario_id: sus.usuario_id, recurrente: false };

    // Fallback: metadata que create-checkout pone en payment_intent_data (pedidos y prepagos)
    if (!invoiceId) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      const m = pi.metadata ?? {};
      if (m.tipo === "producto" && m.pedido_id) {
        return { tipo: "pedido", id: m.pedido_id, usuario_id: m.usuario_id ?? null, recurrente: false };
      }
      if (m.tipo === "plan" && m.plan_tipo === "prepago" && m.suscripcion_id) {
        return { tipo: "suscripcion", id: m.suscripcion_id, usuario_id: m.usuario_id ?? null, recurrente: false };
      }
    }
  }

  if (invoiceId) {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    const subId = invoiceSubscriptionId(invoice);
    if (subId) {
      const { data: sus, error } = await admin
        .from("suscripciones")
        .select("id, usuario_id")
        .eq("stripe_subscription_id", subId)
        .maybeSingle();
      if (error) throw error;
      if (sus) return { tipo: "suscripcion", id: sus.id, usuario_id: sus.usuario_id, recurrente: true };
    }
  }
  return null;
}

/**
 * charge.refunded. Reembolso TOTAL: pedido → 'cancelado'; prepago → 'cancelada' con
 * periodo_fin = ahora (corta el acceso). Recurrente (cargo de factura): solo se registra,
 * la suscripción la gestiona el negocio. Reembolso PARCIAL: solo se registra.
 * No se repone stock automáticamente.
 */
async function onChargeRefunded(charge: Stripe.Charge): Promise<PagoInfo> {
  // deno-lint-ignore no-explicit-any
  const invoiceId = idOf((charge as any).invoice);
  const full = charge.refunded === true || charge.amount_refunded >= charge.amount;
  const ref = await findReferencia(idOf(charge.payment_intent), invoiceId);
  const info: PagoInfo = {
    usuario_id: ref?.usuario_id ?? null,
    tipo: ref?.tipo ?? (invoiceId ? "suscripcion" : null),
    referencia_id: ref?.id ?? null,
    importe_cents: charge.amount_refunded,
    moneda: charge.currency,
    estado: full ? "reembolsado" : "reembolso_parcial",
  };
  if (!full || !ref || ref.recurrente || invoiceId) return info;

  if (ref.tipo === "pedido") {
    const { error } = await admin
      .from("pedidos")
      .update({ estado: "cancelado" })
      .eq("id", ref.id)
      .in("estado", ["pendiente", "pagado", "entregado"]);
    if (error) throw error;
  } else {
    const { error } = await admin
      .from("suscripciones")
      .update({ estado: "cancelada", periodo_fin: new Date().toISOString() })
      .eq("id", ref.id)
      .in("estado", ["pendiente", "activa", "impago"]);
    if (error) throw error;
  }
  return info;
}

/** charge.dispute.created: solo se registra (y se avisa en logs); no cambia pedidos ni suscripciones. */
async function onDisputeCreated(dispute: Stripe.Dispute): Promise<PagoInfo> {
  const chargeId = idOf(dispute.charge);
  let paymentIntentId = idOf(dispute.payment_intent);
  let invoiceId: string | null = null;
  if (chargeId) {
    const charge = await stripe.charges.retrieve(chargeId);
    paymentIntentId ??= idOf(charge.payment_intent);
    // deno-lint-ignore no-explicit-any
    invoiceId = idOf((charge as any).invoice);
  }
  const ref = await findReferencia(paymentIntentId, invoiceId);
  console.error(
    `DISPUTA Stripe ${dispute.id} (cargo ${chargeId}, motivo ${dispute.reason}, ${dispute.amount} ${dispute.currency})` +
      (ref ? ` → ${ref.tipo} ${ref.id} (usuario ${ref.usuario_id})` : " → sin referencia local"),
  );
  return {
    usuario_id: ref?.usuario_id ?? null,
    tipo: ref?.tipo ?? null,
    referencia_id: ref?.id ?? null,
    importe_cents: dispute.amount,
    moneda: dispute.currency,
    estado: "disputa",
  };
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
    case "charge.refunded":
      return await onChargeRefunded(event.data.object as Stripe.Charge);
    case "charge.dispute.created":
      return await onDisputeCreated(event.data.object as Stripe.Dispute);
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

  // Reclamar el evento (idempotencia). claimedAt identifica NUESTRA reclamación para que
  // el borrado del catch no libere una reclamación retomada por otra ejecución.
  let claimedAt: string;
  const { data: claim, error: claimErr } = await admin
    .from("pagos")
    .insert({ stripe_event_id: event.id, estado: "procesando" })
    .select("created_at")
    .single();
  if (!claimErr) {
    claimedAt = claim.created_at;
  } else if (claimErr.code === "23505") {
    // Ya existe: ¿terminado, en curso o abandonado?
    const { data: prev, error: prevErr } = await admin
      .from("pagos")
      .select("estado, created_at")
      .eq("stripe_event_id", event.id)
      .maybeSingle();
    if (prevErr) {
      console.error("Error leyendo evento reclamado:", prevErr);
      return json({ error: "Error interno" }, 500);
    }
    // Borrado entre medias (la otra ejecución falló y lo liberó): que Stripe reintente
    if (!prev) return json({ error: "Evento en reproceso, reintentar" }, 409);
    if (prev.estado !== "procesando") return json({ received: true, duplicate: true });

    // Retomar solo si está abandonado; el UPDATE condicional garantiza un único ganador
    const staleBefore = new Date(Date.now() - CLAIM_STALE_MS).toISOString();
    const { data: taken, error: takeErr } = await admin
      .from("pagos")
      .update({ created_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id)
      .eq("estado", "procesando")
      .lt("created_at", staleBefore)
      .select("created_at");
    if (takeErr) {
      console.error("Error retomando evento:", takeErr);
      return json({ error: "Error interno" }, 500);
    }
    if (!taken || taken.length === 0) {
      // Otra ejecución lo está procesando ahora: no responder 200 (Stripe dejaría de
      // reintentar y, si esa ejecución muere, el evento se perdería).
      return json({ error: "Evento en proceso, reintentar" }, 409);
    }
    console.warn(`Retomando evento abandonado ${event.type} (${event.id})`);
    claimedAt = taken[0].created_at;
  } else {
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
    // Liberar el evento para que el reintento de Stripe lo procese (solo si sigue siendo
    // nuestra reclamación: otra ejecución pudo retomarlo entretanto)
    await admin
      .from("pagos")
      .delete()
      .eq("stripe_event_id", event.id)
      .eq("estado", "procesando")
      .eq("created_at", claimedAt);
    return json({ error: "Error procesando evento" }, 500);
  }
});
