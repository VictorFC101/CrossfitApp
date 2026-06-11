// Supabase Edge Function — generate-program
// Deno runtime · llama a la API de Anthropic (Claude) con el Prompt Maestro
// y devuelve un programa CrossFit completo en formato JSON compatible con la app.

import Anthropic from "npm:@anthropic-ai/sdk@0.27.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── SCHEMA DE REFERENCIA ────────────────────────────────────────────────────
const SCHEMA_EXAMPLE = `
{
  "weeks": [
    {
      "number": 1,
      "dates": "5 May – 10 May",
      "focus": "Activación & Técnica Base",
      "theme": "Establecemos patrones de movimiento y punto de partida",
      "days": [
        {
          "day": "Lunes 5 May",
          "type": "Halterofilia",
          "label": "CLEAN & JERK",
          "rmKey": "cj",
          "warmup": [
            "2 rondas: 400m remo suave + 10 dislocaciones de hombro + 10 sentadillas goblet (KB 16kg)",
            "Movilidad de cadera y tobillo con banda elástica — 90 seg/lado",
            "Hang power clean con barra vacía x5 + press en split x5"
          ],
          "strength": {
            "title": "Clean & Jerk",
            "sets": [
              { "desc": "3 × 3 al 65% 1RM", "note": "Foco en posición de recepción y split jerk" },
              { "desc": "3 × 2 al 72% 1RM", "note": "Velocidad de extensión" },
              { "desc": "2 × 1 al 78% 1RM", "note": "Confianza en el movimiento completo" }
            ],
            "rest": "2-3 min entre series",
            "note": "Bajar 5% si falla la recepción."
          },
          "wod": {
            "type": "AMRAP",
            "duration": "20 min",
            "format": "YOU GO I GO",
            "formatNote": "Pareja A completa la ronda entera, luego Pareja B.",
            "movements": [
              { "reps": "4", "name": "Clean & Jerk", "weight": "♂ 60kg / ♀ 40kg" },
              { "reps": "10", "name": "TTB", "weight": "BW" },
              { "reps": "15", "name": "Cal Ski Erg", "weight": "alternos" }
            ],
            "gymNote": "Mantened el kip desde el inicio en TTB."
          },
          "gymExtra": {
            "title": "Ring Muscle-Up (S1)",
            "focus": "Fase de activación: establecer la base del RMU",
            "blocks": [
              { "label": "Movilidad activa", "detail": "Dislocaciones PVC x10 + band pull-apart x15 — 4 min" },
              { "label": "False grip hold", "detail": "False grip en anillas 3 × 20 seg. Alternáis." },
              { "label": "Transición asistida", "detail": "Jumping RMU desde cajón 4 × 3 — foco en la transición de muñeca." }
            ]
          }
        }
      ]
    }
  ]
}`;

// ─── PROMPT MAESTRO ───────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
  return `Eres un programador experto de CrossFit de alto rendimiento. Tu tarea es generar programación mensual completa y detallada para un box de CrossFit de nivel competitivo.

## ESTRUCTURA DE LA PROGRAMACIÓN

Genera EXACTAMENTE 4 semanas con 3 días de entrenamiento por semana (Lunes, Miércoles, Viernes o similar).
Total: 12 días de entrenamiento.

Distribución de tipos por mes:
- 4 días Halterofilia (alternando entre Clean & Jerk y Snatch)
- 4 días Fuerza (alternando Back Squat, Deadlift, Strict Press, Front Squat)
- 4 días Powerlifting (alternando Back Squat pesado, Bench Press, Deadlift rumano)

## PROGRESIÓN DE INTENSIDAD POR SEMANAS

- Semana 1: Activación & Técnica Base (65-78% 1RM) — "Establecer patrones y punto de partida"
- Semana 2: Construcción de Fuerza (70-85% 1RM) — "Incrementamos carga manteniendo técnica"
- Semana 3: Intensificación (78-93% 1RM) — "Máxima exigencia controlada"
- Semana 4: Deload & Test (50-70% + test 1RM) — "Recuperación activa y marca personal"

## RMKEYS PERMITIDOS

Halterofilia: "cj" (Clean & Jerk), "sn" (Snatch), "pc" (Power Clean), "pj" (Push Jerk), "hpc" (Hang Power Clean)
Powerlifting: "bs" (Back Squat), "dl" (Deadlift), "sp" (Strict Press), "bp" (Bench Press), "fs" (Front Squat)
Fuerza: "bs" (Back Squat), "dl" (Deadlift), "sp" (Strict Press), "fs" (Front Squat)

## TIPOS DE DÍA DISPONIBLES

Cuando el config incluya `tipoPorDia`, respeta el tipo asignado a cada día:

- **crossfit_general**: Fuerza 20 min (porcentajes 1RM) + WOD 10-15 min alta intensidad. Usa `type: "Crossfit General"`.
- **crossfit_largo**: Fuerza 20 min + WOD 22-25 min alto volumen. Usa `type: "Crossfit Largo"`.
- **endurance**: WOD 30-40 min sin fuerza, cardio + gimnásticos ligeros. Sin bloque `strength`. Usa `type: "Endurance"`.
- **endurance_pesado**: WOD 30-40 min sin fuerza, peso moderado-alto. Sin bloque `strength`. Usa `type: "Endurance Pesado"`.
- **endurance_extra**: WOD 30-35 min sin fuerza. Formato de trabajo variable: Individual, YOU GO I GO (pareja), REPARTIR LIBREMENTE (pareja) o Por Equipos (3 personas) — varía cada semana. Pesos altos: mancuerna (~30kg) o KB (28-32kg). Incluye gimnásticos, cuerda, cardio (remo, ski erg, assault bike, cinta). Foco dentro del box. Sin bloque `strength`. Sin bloque `gymExtra`. Usa `type: "Endurance EXTRA"`.

## FORMATOS DE WOD

Varía entre: AMRAP, FOR TIME, EMOM, CHIPPER, TABATA, HERO WOD
Formatos de trabajo: Individual, YOU GO I GO (parejas), REPARTIR LIBREMENTE (parejas), Por Equipos (3 personas)
Duraciones: 12-25 minutos para tipos con fuerza; 30-35 min para Endurance EXTRA; 30-40 min para Endurance.

## MOVIMIENTOS DE WOD

Incluye variedad de: barbell (thrusters, hang power clean, power snatch), gimnásticos (TTB, HSPU, muscle-up, pull-ups, C2B, ring dips), cardio (cal rower, cal ski erg, cal assault bike, cinta/treadmill), kettlebell (swings, goblet squat, KB thrusters, KB snatch), mancuerna (DB thrusters, DB snatch, DB lunges, DB hang clean), cuerda (rope climbs, rope pulls), bodyweight (burpees, box jumps, wall balls)

Siempre incluir peso para hombres y mujeres: "♂ Xkg / ♀ Xkg"

## GYMEXTRA (Skill Work)

Cada día CON FUERZA incluye un bloque de habilidad progresivo de 4 semanas. Alterna entre:
- Semana 1-2: Ring Muscle-Up (progresión desde false grip)
- Semana 3-4: Handstand Walk (progresión desde wall walks)

Los días de tipo Endurance, Endurance Pesado o Endurance EXTRA NO incluyen bloque `gymExtra`.

## REGLAS CRÍTICAS

1. Todas las fechas en español (Lunes, Martes... / Ene, Feb, Mar, Abr, May, Jun, Jul, Ago, Sep, Oct, Nov, Dic)
2. El campo "day" debe ser "DiaSemana DD Mes" (ej: "Lunes 5 May")
3. Cada semana tiene "dates": "DD Mes – DD Mes"
4. El JSON debe ser válido y completo, sin comentarios ni texto extra
5. Warmup: mínimo 3 entradas detalladas y específicas al movimiento del día
6. Strength.sets: entre 3 y 6 entradas con porcentajes específicos (solo si el día tiene bloque de fuerza)
7. WOD.movements: entre 3 y 6 movimientos con reps y peso siempre especificados
8. GymExtra: mínimo 3 bloques detallados con tiempos/reps exactos (solo días con fuerza)
9. Endurance EXTRA: NUNCA incluir bloque `strength`, NUNCA incluir bloque `gymExtra`. Formato de trabajo varía cada semana (individual, pareja o equipos). Pesos altos con mancuerna (~30kg ♂) o KB (28-32kg ♂). Duración 30-35 min.

Responde ÚNICAMENTE con el JSON válido, comenzando con { y terminando con }. Sin markdown, sin explicaciones, sin texto adicional.`;
}

function buildUserPrompt(mes: number, anio: number): string {
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const nombreMes = MESES[mes - 1];
  const mesCorto = MESES_CORTOS[mes - 1];

  // Calcular primer lunes del mes
  const primerDia = new Date(anio, mes - 1, 1);
  let primerLunes = new Date(primerDia);
  const diaSemana = primerDia.getDay(); // 0=Dom, 1=Lun
  if (diaSemana === 0) primerLunes.setDate(2);       // Domingo → siguiente Lunes
  else if (diaSemana !== 1) primerLunes.setDate(1 + (8 - diaSemana) % 7);

  // Generar las 4 semanas con fechas reales
  const semanas = [];
  let cursor = new Date(primerLunes);
  const DIAS_NOMBRES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

  for (let s = 0; s < 4; s++) {
    // Lunes, Miércoles, Viernes de la semana
    const lunes = new Date(cursor);
    const miercoles = new Date(cursor); miercoles.setDate(cursor.getDate() + 2);
    const viernes = new Date(cursor); viernes.setDate(cursor.getDate() + 4);

    const formatDay = (d: Date) => `${DIAS_NOMBRES[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
    const fmtShort = (d: Date) => `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;

    semanas.push({
      number: s + 1,
      dates: `${fmtShort(lunes)} – ${fmtShort(viernes)}`,
      dias: [formatDay(lunes), formatDay(miercoles), formatDay(viernes)],
    });

    cursor.setDate(cursor.getDate() + 7);
  }

  const semanasTexto = semanas.map(s =>
    `  Semana ${s.number} (${s.dates}): días ${s.dias.join(', ')}`
  ).join('\n');

  return `Genera la programación completa de CrossFit para ${nombreMes} ${anio}.

Usa EXACTAMENTE estas fechas para los días de entrenamiento:
${semanasTexto}

El JSON debe seguir exactamente esta estructura de ejemplo:
${SCHEMA_EXAMPLE}

Genera los 12 días completos con toda la información detallada.`;
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada en Supabase secrets");

    const body = await req.json();
    const mes: number = body.mes ?? new Date().getMonth() + 2; // próximo mes por defecto
    const anio: number = body.anio ?? new Date().getFullYear();

    if (mes < 1 || mes > 12) throw new Error("mes debe estar entre 1 y 12");
    if (anio < 2024 || anio > 2030) throw new Error("anio fuera de rango");

    console.log(`Generando programación para mes=${mes} anio=${anio}`);

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 16000,
      system: buildSystemPrompt(),
      messages: [
        { role: "user", content: buildUserPrompt(mes, anio) }
      ],
    });

    const rawText = message.content[0]?.type === "text" ? message.content[0].text : "";
    if (!rawText) throw new Error("Claude no devolvió contenido de texto");

    // Limpiar posibles bloques markdown
    const jsonText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Validar que es JSON válido
    let program: unknown;
    try {
      program = JSON.parse(jsonText);
    } catch {
      console.error("JSON inválido recibido:", jsonText.slice(0, 500));
      throw new Error("Claude devolvió JSON inválido. Intenta de nuevo.");
    }

    // Validación básica de estructura
    const p = program as Record<string, unknown>;
    if (!p.weeks || !Array.isArray(p.weeks)) throw new Error("El programa no contiene 'weeks'");
    if ((p.weeks as unknown[]).length === 0) throw new Error("'weeks' está vacío");

    const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    return new Response(JSON.stringify({
      success: true,
      program,
      meta: {
        mes,
        anio,
        mesNombre: MESES_CORTOS[mes - 1],
        semanas: (p.weeks as unknown[]).length,
        dias: (p.weeks as Array<{days?: unknown[]}>).reduce((acc, w) => acc + (w.days?.length ?? 0), 0),
        tokensUsed: message.usage?.input_tokens + message.usage?.output_tokens,
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error en generate-program:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
