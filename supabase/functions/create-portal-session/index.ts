// Supabase Edge Function — create-portal-session
// Devuelve la URL del Stripe Billing Portal del usuario autenticado
// (gestionar método de pago, cancelar suscripción, ver facturas).
//
// Body (opcional): { return_url_base? }  → vuelve a `${base}/pago/portal`
// Respuesta: { url }

import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_RETURN_BASE = "wodly:/"; // → wodly://pago/portal

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

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) throw new HttpError(401, "No autenticado");
    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData?.user) throw new HttpError(401, "Sesión inválida");

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // body vacío permitido
    }
    const base = resolveReturnBase(body.return_url_base);

    const { data: cliente, error } = await admin
      .from("clientes_stripe")
      .select("stripe_customer_id")
      .eq("usuario_id", authData.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!cliente) throw new HttpError(404, "Todavía no tienes pagos registrados");

    const session = await stripe.billingPortal.sessions.create({
      customer: cliente.stripe_customer_id,
      return_url: `${base}/pago/portal`,
    });
    return json({ url: session.url });
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof Stripe.errors.StripeError) {
      console.error("Stripe error:", e.type, e.message);
      return json({ error: "Error con el proveedor de pagos" }, 502);
    }
    console.error("create-portal-session error:", e);
    return json({ error: "Error interno" }, 500);
  }
});
