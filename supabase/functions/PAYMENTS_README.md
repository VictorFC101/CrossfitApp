# Pagos con Stripe (modo test)

Funciones: `create-checkout`, `stripe-webhook`, `create-portal-session`.
Migraciones: `supabase/migrations/016_pagos_stripe.sql` (tablas `productos`, `producto_variantes`, `planes`, `clientes_stripe`, `pedidos`, `pedido_items`, `suscripciones`, `pagos` + RLS) `017_pagos_hardening.sql` (solo admins actualizan pedidos/suscripciones, triggers guard, CHECK `activa` ⇒ `periodo_fin`, `suscripciones.stripe_payment_intent`, RPC `marcar_pedido_pagado`) y `020_pagos_medios.sql` (reserva de stock `crear_pedido_reservando`, catálogo filtrado por box con `mi_box_id()`).

## 1. Secrets

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  ALLOWED_RETURN_BASES="https://tu-dominio.app,http://localhost:8081"
```

- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente en las Edge Functions desplegadas. **No** intentes definirlos: los secrets que empiezan por `SUPABASE_` no se pueden crear con `supabase secrets set`.
- `ALLOWED_RETURN_BASES`: lista separada por comas de bases permitidas para `return_url_base` (p. ej. web). `wodly:/` (deep link `wodly://`) siempre está permitido y es el valor por defecto.

## 2. Migración y despliegue

```bash
supabase db push                                   # aplica 016, 017 y 020
# 017 debe estar aplicada ANTES de desplegar stripe-webhook (usa marcar_pedido_pagado y stripe_payment_intent)
# 020 debe estar aplicada ANTES de desplegar create-checkout (usa crear_pedido_reservando)
supabase functions deploy create-checkout
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe no envía JWT
```

No hay `supabase/config.toml` en el repo: si se crea, añadir

```toml
[functions.stripe-webhook]
verify_jwt = false
```

## 3. Webhook en Stripe

Dashboard → Developers → Webhooks → endpoint `https://<ref>.supabase.co/functions/v1/stripe-webhook` con los eventos:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `charge.refunded`
- `charge.dispute.created`

Copia el *signing secret* (`whsec_...`) a `STRIPE_WEBHOOK_SECRET`.
Activa también el **Customer Portal** (Settings → Billing → Customer portal) para `create-portal-session`.

## 4. Probar en local con Stripe CLI

```bash
supabase start
supabase functions serve --no-verify-jwt --env-file supabase/.env.local
stripe login
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
# usa el whsec_ que imprime `stripe listen` como STRIPE_WEBHOOK_SECRET en .env.local
```

Crear una sesión (JWT de un usuario logueado):

```bash
curl -X POST http://localhost:54321/functions/v1/create-checkout \
  -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
  -d '{"tipo":"plan","plan_id":"<uuid>"}'
```

Abre la `url` devuelta y paga con la tarjeta `4242 4242 4242 4242` (cualquier fecha futura y CVC).
Tarjeta de fallo: `4000 0000 0000 0341` (se asocia y luego falla → `invoice.payment_failed`).
Reenviar eventos: `stripe events resend <evt_id>` (los duplicados se ignoran gracias a `pagos.stripe_event_id`).

## Notas

- Los precios se leen siempre de la BD; el cliente solo envía ids y cantidades.
- **Reserva de stock**: `create-checkout` llama a la RPC `crear_pedido_reservando`, que bloquea las variantes (orden por id), calcula `disponible = stock − unidades de pedidos 'pendiente' de los últimos 35 min` y crea el pedido con precios de la BD, todo en una transacción. Dos compradores de la última unidad: el segundo recibe 409 *Sin stock suficiente*. La Checkout Session caduca a los 31 min (`expires_at`), antes que la reserva; los pendientes más antiguos dejan de contar solos (sin jobs). Si la llamada a Stripe falla, el pedido pasa a `cancelado` y la reserva se libera; `checkout.session.expired` también lo cancela.
- El stock se descuenta al recibir el pago (RPC `marcar_pedido_pagado`: pendiente → pagado + stock en una transacción, nunca baja de 0 ni se descuenta dos veces). Solo podría sobrevenderse si un pago se confirma después de la ventana (método asíncrono tipo SEPA o webhook retrasado > 35 min).
- Productos **sin variantes** no llevan control de stock. Si un producto tiene alguna variante (aunque estén todas inactivas) cada línea exige una `variante_id` activa de ese producto.
- **Box**: los usuarios solo ven (RLS) y solo pueden comprar productos/planes de su box o globales (`box_id` NULL); un usuario sin box solo los globales. El staff ve todo. Ojo: `box_id` tiene `ON DELETE SET NULL`, así que al borrar un box su catálogo pasa a ser global (desactívalo antes).
- **Suscripciones recurrentes duplicadas**: antes de crear la Checkout se comprueba la BD y Stripe (`active`, `trialing`, `past_due`, `unpaid` → 409, gestiónala desde el portal). Si hay una Checkout abierta del mismo plan se reutiliza su URL; las de otros planes se expiran. Las filas `pendiente` de más de 35 min del mismo plan pasan a `vencida`. Un prepago vigente **no** impide contratar un recurrente.
- **Eventos tardíos/desordenados**: `customer.subscription.updated/deleted` e `invoice.paid/payment_failed` vuelven a leer la suscripción en Stripe y sincronizan desde ese estado (si ya no existe → `cancelada`). Una fila `cancelada`/`vencida` solo vuelve a `activa` si Stripe la tiene activa con un `periodo_fin` posterior.
- Retorno a la app: `${base}/pago/exito?session_id=...`, `${base}/pago/cancelado`, `${base}/pago/portal`.
- Las tablas de dinero solo las escribe el service role. Desde la app solo un **admin** puede cambiar `estado`, y solo "hacia abajo": suscripción → `cancelada`/`vencida`; pedido `pagado` → `entregado` y `pendiente`/`pagado` → `cancelado`. Los coaches solo leen.
- Idempotencia: cada evento se reclama en `pagos` (`stripe_event_id` UNIQUE, estado `procesando`). Si la función muere a mitad, un reintento de Stripe retoma el evento cuando la reclamación tiene más de 7 min; mientras tanto responde 409 para que Stripe siga reintentando.
- **Reembolsos (`charge.refunded`)**: reembolso total de un pedido → `cancelado`; de un prepago → suscripción `cancelada` con `periodo_fin` = ahora. Si el cargo es de una factura de suscripción recurrente solo se registra en `pagos` (`reembolsado`) y la suscripción no se cancela (cancélala desde Stripe si procede). Los reembolsos parciales solo se registran (`reembolso_parcial`). **No se repone stock automáticamente.**
- **Disputas (`charge.dispute.created`)**: se registran en `pagos` con estado `disputa` y se escribe un `console.error` en los logs de la función; no cambian pedidos ni suscripciones (revisar a mano en Stripe).
