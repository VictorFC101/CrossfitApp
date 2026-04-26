// ============================================================
// PROGRAMA CROSSFIT MAYO 2026 — EN PAREJA · 1.5H
// S1: Activación & Técnica Base
// S2: Construcción de Fuerza
// S3: Intensidad Máxima
// S4: Descarga & Test Final
// Lunes: CrossFit Largo · Miércoles: Endurance Pesado · Viernes: CrossFit Largo
// ============================================================

export const mayo2026 = {
  name: "CrossFit Mayo 2026 — Pareja",
  weeks: [
    {
      number: 1,
      dates: "",
      focus: "Activación & Técnica Base",
      theme: "Establecemos patrones de mayo y punto de partida",
      days: [
        {
          day: "Lunes",
          type: "Halterofilia",
          label: "POWER CLEAN + PUSH PRESS",
          trainType: "CrossFit Largo",
          rmKey: "cj",
          warmup: [
            "2 rondas: 500m remo suave + 10 dislocaciones de hombro + 10 goblet squat (KB 16kg)",
            "Movilidad de cadera y tobillo con banda — 90 seg/lado",
            "Hang power clean barra vacía x5 + push press barra vacía x5"
          ],
          strength: {
            title: "Power Clean + Push Press",
            sets: [
              { desc: "3 x 3 al 65% 1RM", note: "Foco en recepción alta y lockout del press" },
              { desc: "3 x 2 al 72% 1RM", note: "Velocidad de extensión en el clean" },
              { desc: "2 x 2 al 78% 1RM", note: "Sin soltar la barra entre Clean y Press" }
            ],
            rest: "2-3 min entre series",
            note: "Establece la base del mes. Vídeo de referencia en las series pesadas."
          },
          wod: {
            parts: null,
            type: "AMRAP",
            duration: "20 min",
            format: "YOU GO I GO",
            formatNote: "Pareja A completa la ronda entera, luego Pareja B. Sin descanso adicional entre cambios.",
            movements: [
              { reps: "4", name: "Power Clean + Push Press", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "8", name: "TTB", weight: "BW", equipment: "Barra" },
              { reps: "10m", name: "Handstand Walk / 5 Wall Climbs", weight: "BW", equipment: "Suelo / Pared" },
              { reps: "14", name: "Cal Ski Erg", weight: "BW", equipment: "Ski Erg — alternos" }
            ],
            gymNote: "💡 Gim: TTB en fatiga de Clean + Push Press. HSW/Wall Climbs como transición activa entre barra y máquina."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Ring Muscle-Up (S1)",
            duration: "~20 min · En pareja · Bajada de pulsaciones",
            focus: "Fase de activación: false grip y transición base",
            blocks: [
              { label: "Movilidad activa", detail: "Dislocaciones PVC x10 + band pull-apart x15 + shoulder CARs x5/lado — 4 min" },
              { label: "False grip hold", detail: "False grip en anillas 3 x 20 seg. Alternáis: uno hace, el otro descansa con ring row." },
              { label: "Pull to chest", detail: "False grip pull to chest 4 x 5 reps. Control total, sin balanceo. Series alternas." },
              { label: "Transición asistida", detail: "Jumping RMU desde cajón 4 x 3 — foco en la transición de muñeca. Bajada excéntrica 3 seg." },
              { label: "📝 Nota", detail: "Si ya tenéis RMU: 4 x 2-3 reps con pausa 1 seg en transición. Calidad sobre cantidad." }
            ]
          }
        },
        {
          day: "Miércoles",
          type: "Endurance",
          label: "BACK SQUAT + ENDURANCE",
          trainType: "Endurance Pesado",
          rmKey: null,
          warmup: [
            "2 rondas: 10 goblet squat (KB 16kg) + 10 hip hinge con banda + 10 wall walk lento",
            "Movilidad de tobillo y cadera — foam roller cuádriceps 2 min/lado",
            "Back squat progresivo: barra vacía x8, 40% x5, 55% x3"
          ],
          strength: {
            title: "Back Squat",
            sets: [
              { desc: "4 x 5 al 68% 1RM", note: "Profundidad completa, control excéntrico 2 seg" },
              { desc: "3 x 3 al 76% 1RM", note: "Explosión en la subida" },
              { desc: "2 x 2 al 81% 1RM", note: "Máxima intención" }
            ],
            rest: "2-3 min entre series",
            note: "Semana 1 de squats — establece tus marcas si no las tienes claras."
          },
          wod: {
            parts: null,
            type: "ROUNDS FOR TIME",
            duration: "5 rondas c/u — Est. 22-25 min",
            format: "YOU GO I GO",
            formatNote: "Pareja A hace ronda completa entera, B descansa. Alternar hasta 5 rondas cada uno. Sin descanso extra.",
            movements: [
              { reps: "10", name: "DB Thruster", weight: "♂ 2x25kg / ♀ 2x17.5kg", equipment: "Dumbbell" },
              { reps: "15", name: "KB Swings (americano)", weight: "♂ 28kg / ♀ 20kg", equipment: "Kettlebell" },
              { reps: "10", name: "C2B Pull-ups", weight: "BW", equipment: "Barra" },
              { reps: "12", name: "TTB", weight: "BW", equipment: "Barra" },
              { reps: "5", name: "Wall Climbs", weight: "BW", equipment: "Pared" },
              { reps: "16", name: "Cal Assault Bike", weight: "BW", equipment: "Assault Bike — alternos" }
            ],
            gymNote: "💡 Gim: C2B + TTB en cada ronda — tirón y core. DB Thruster como variante del squat trabajado en fuerza. Wall Climbs como trabajo de HSW."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Handstand Walk (S1)",
            duration: "~20 min · En pareja · Bajada de pulsaciones",
            focus: "Fase de activación: control de la vertical y primeros pasos",
            blocks: [
              { label: "Movilidad activa", detail: "Shoulder taps en plancha x10 + wrist circles + pike stretch 60 seg — 4 min" },
              { label: "Wall walks", detail: "5 wall walks lentos — foco en alinear caderas sobre hombros. Alternáis." },
              { label: "Kick-up libre", detail: "Kick-up a la vertical sin pared 5 x 3 intentos — objetivo: aguantar 3-5 seg estable." },
              { label: "HSH + shoulder taps", detail: "Handstand hold contra pared 3 x 20 seg + 5 shoulder taps lentos. Alternáis." },
              { label: "📝 Nota", detail: "Si ya camináis: 3 x intentos de 10m foco en piernas juntas y mirada al suelo." }
            ]
          }
        },
        {
          day: "Viernes",
          type: "Halterofilia",
          label: "POWER SNATCH",
          trainType: "CrossFit Largo",
          rmKey: "sn",
          warmup: [
            "PVC pass-through x10 + OHS x10 con PVC + snatch balance x5 barra vacía",
            "Movilidad de hombro y muñeca — 90 seg por lado",
            "Snatch grip deadlift x5 + hang power snatch x3 barra vacía"
          ],
          strength: {
            title: "Power Snatch",
            sets: [
              { desc: "3 x 3 al 62% 1RM", note: "Foco en recepción estable y posición de OHS" },
              { desc: "3 x 2 al 70% 1RM", note: "Velocidad bajo la barra" },
              { desc: "2 x 1 al 76% 1RM", note: "Control total — calidad sobre carga" }
            ],
            rest: "2-3 min entre series",
            note: "Primer ciclo del mes — establece tu sensación con el peso."
          },
          wod: {
            gymNote: "💡 Gim: WOD 1 — Pull-ups SYNCHRO fresco + Snatch. WOD 2 — OHS + Devil Press + Remo. Dos estímulos distintos del mismo patrón.",
            parts: [
              {
                type: "AMRAP",
                duration: "12 min",
                format: "SYNCHRO",
                formatNote: "Pull-ups SYNCHRO — los dos a la vez. Snatch y Ski Erg a repartir libremente.",
                movements: [
                  { reps: "6 SYNCHRO", name: "Pull-ups", weight: "BW", equipment: "Barra — los dos a la vez" },
                  { reps: "6", name: "Power Snatch", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
                  { reps: "14", name: "Cal Ski Erg", weight: "BW", equipment: "Ski Erg — alternos" }
                ]
              },
              {
                type: "FOR TIME",
                duration: "Cap 13 min",
                format: "A REPARTIR LIBREMENTE",
                formatNote: "Repartid reps libremente. Mínimo 10 reps de cada movimiento por persona.",
                movements: [
                  { reps: "30", name: "OHS", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
                  { reps: "20", name: "Devil Press", weight: "♂ 2x22.5kg / ♀ 2x15kg", equipment: "Dumbbell" },
                  { reps: "30", name: "TTB", weight: "BW", equipment: "Barra" },
                  { reps: "30", name: "Cal Remo", weight: "BW", equipment: "Remo — alternos" }
                ]
              }
            ]
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Bar Muscle-Up (S1)",
            duration: "~20 min · En pareja · Bajada de pulsaciones",
            focus: "Fase de activación: kipping agresivo y pull-over",
            blocks: [
              { label: "Movilidad activa", detail: "Kipping swing x10 + scap pull-up x10 + banded lat stretch 60 seg — 4 min" },
              { label: "Strict C2B", detail: "4 x 5 Strict C2B — base de fuerza de tirón. Alternáis con descanso activo." },
              { label: "Kipping + hip drive", detail: "Kipping swing agresivo x5 + intento de BMU x3 — foco en llevar caderas a la barra." },
              { label: "Negativo BMU", detail: "4 x 3 BMU negativo (bajada 4 seg) — construir fuerza excéntrica. Alternáis." },
              { label: "📝 Nota", detail: "Si ya tenéis BMU: 5 x 3 touch & go — foco en el kip de salida sin perder tensión." }
            ]
          }
        }
      ]
    },
    {
      number: 2,
      dates: "",
      focus: "Construcción de Fuerza",
      theme: "Subimos intensidad y consolidamos el patrón técnico",
      days: [
        {
          day: "Lunes",
          type: "Halterofilia",
          label: "SQUAT CLEAN + PUSH JERK",
          trainType: "CrossFit Largo",
          rmKey: "cj",
          warmup: [
            "500m remo + 10 hang power clean barra vacía + 10 front squat barra vacía",
            "Movilidad de muñeca y codo — 2 min + activación de tríceps con banda",
            "Push jerk progresivo: barra vacía x5, 40% x3, 55% x2"
          ],
          strength: {
            title: "Squat Clean + Push Jerk",
            sets: [
              { desc: "4 x 3 al 70% 1RM", note: "Foco en profundidad del squat clean y jerk explosivo" },
              { desc: "3 x 2 al 78% 1RM", note: "Velocidad en la recepción del squat" },
              { desc: "2 x 1 al 83% 1RM", note: "Movimiento completo y confiado" }
            ],
            rest: "2-3 min entre series",
            note: "Variante de S1 — mismo patrón Clean, más técnica en la recepción profunda."
          },
          wod: {
            parts: null,
            type: "EMOM",
            duration: "20 min",
            format: "YOU GO I GO",
            formatNote: "Minutos BARRA (1,5,9,13,17): los dos juntos. Minutos GIMNÁSTICOS y BIKE: Pareja A en impar, Pareja B en par.",
            emomMinutes: [
              { min: "1,5,9,13,17 (JUNTOS)", work: "3 Squat Clean + Push Jerk", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell — cada uno su barra" },
              { min: "ODD 3,7,11,15,19 (Pareja A)", work: "5 BMU / 8 C2B", weight: "BW", equipment: "Barra" },
              { min: "EVEN 2,6,10,12,18 (Pareja B)", work: "5 BMU / 8 C2B", weight: "BW", equipment: "Barra" },
              { min: "ODD 4,8,12,16,20 (Pareja A)", work: "8 HSPU Kipping + 5m HSW / 3 Wall Climbs", weight: "BW", equipment: "Pared / Suelo" },
              { min: "EVEN 3,7,11,15,19 (Pareja B)", work: "8 HSPU Kipping + 5m HSW / 3 Wall Climbs", weight: "BW", equipment: "Pared / Suelo" }
            ],
            gymNote: "💡 Gim: En los minutos de barra trabajáis los dos a la vez con vuestra barra. En los minutos de gimnásticos y HSW os alternáis para tener más tiempo de trabajo."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Ring Muscle-Up (S2)",
            duration: "~20 min · En pareja · Bajada de pulsaciones",
            focus: "Semana 2: tensión en la transición y primeras reps completas",
            blocks: [
              { label: "Movilidad activa", detail: "Shoulder CARs x5/lado + ring row profundo x8 + false grip activation — 4 min" },
              { label: "Kipping en anillas", detail: "Kipping swing en anillas 3 x 10 — mantener false grip durante el swing." },
              { label: "Pull + transición", detail: "5 x 3 pull to chest + transición lenta al dip. Alternáis. Controlad la muñeca." },
              { label: "RMU completo", detail: "5 x 2-3 RMU completos (jumping si no sale) — pausa 1 seg arriba. Alternáis." },
              { label: "📝 Nota", detail: "Objetivo: hacer la transición sin perder el false grip. Esa es la clave de esta semana." }
            ]
          }
        },
        {
          day: "Miércoles",
          type: "Endurance",
          label: "DEADLIFT + ENDURANCE",
          trainType: "Endurance Pesado",
          rmKey: null,
          warmup: [
            "2 rondas: 10 Romanian DL con barra vacía + 10 hip hinge con banda + 10 inchworm",
            "Activación de glúteos: 2x15 hip thrust barra vacía + movilidad de cadera",
            "Deadlift progresivo: 40% x5, 55% x3, 65% x2"
          ],
          strength: {
            title: "Deadlift",
            sets: [
              { desc: "4 x 4 al 72% 1RM", note: "Control excéntrico 2 seg, espalda neutral" },
              { desc: "3 x 3 al 80% 1RM", note: "Explosión en la subida" },
              { desc: "2 x 2 al 84% 1RM", note: "Máxima tensión y velocidad de barra" }
            ],
            rest: "2-3 min entre series",
            note: "Deadlift convencional. Cinturón opcional al 84%."
          },
          wod: {
            parts: null,
            type: "FOR TIME",
            duration: "Est. 22-25 min",
            format: "A REPARTIR LIBREMENTE",
            formatNote: "Repartid las reps libremente. Mínimo 15 de cada movimiento por persona. HSPU al inicio en pareja.",
            movements: [
              { reps: "20", name: "HSPU Kipping", weight: "BW", equipment: "Pared" },
              { reps: "40", name: "DB Snatch (alt.)", weight: "♂ 25kg / ♀ 17.5kg", equipment: "Dumbbell" },
              { reps: "30", name: "KB Swings (americano)", weight: "♂ 28kg / ♀ 20kg", equipment: "Kettlebell" },
              { reps: "30", name: "DB Lunges (alt.)", weight: "♂ 2x22.5kg / ♀ 2x15kg", equipment: "Dumbbell" },
              { reps: "10m", name: "Handstand Walk / 5 Wall Climbs", weight: "BW", equipment: "Suelo / Pared" },
              { reps: "20", name: "C2B Pull-ups", weight: "BW", equipment: "Barra" },
              { reps: "40", name: "Cal Ski Erg", weight: "BW", equipment: "Ski Erg — alternos" }
            ],
            gymNote: "💡 Gim: HSPU + C2B + HSW — tres patrones gimnásticos. KB Swings como variante hip hinge del Deadlift. DB Snatch y Lunges protegen el grip de barra."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Handstand Walk (S2)",
            duration: "~20 min · En pareja · Bajada de pulsaciones",
            focus: "Semana 2: primeros pasos reales y control de la línea",
            blocks: [
              { label: "Movilidad activa", detail: "Wrist warm-up completo + downdog a pike x10 + shoulder taps en plancha x10 — 4 min" },
              { label: "Wall walks + hold", detail: "4 wall walks + HSH 15 seg en la posición más alta. Alternáis." },
              { label: "Kick-up + paso", detail: "5 x 3 intentos de kick-up libre + dar 1-3 pasos. Uno intenta, el otro da feedback." },
              { label: "HSW con compañero", detail: "3 x intentos de 5m — el compañero puede sujetar los tobillos si es necesario al inicio." },
              { label: "📝 Nota", detail: "Clave: mirada al suelo entre las manos, no hacia adelante. Cambia todo." }
            ]
          }
        },
        {
          day: "Viernes",
          type: "Halterofilia",
          label: "HANG POWER SNATCH + OHS",
          trainType: "CrossFit Largo",
          rmKey: "sn",
          warmup: [
            "Foam roller en torácica — 2 min + shoulder opener con banda 60 seg/lado",
            "OHS con PVC 3 x 10 buscando profundidad máxima",
            "Hang snatch pull x5 + hang power snatch x3 barra vacía"
          ],
          strength: {
            title: "Hang Power Snatch + OHS",
            sets: [
              { desc: "4 x 3 al 68% 1RM", note: "Foco en posición de colgado y extensión de cadera" },
              { desc: "3 x 2 al 76% 1RM", note: "Velocidad bajo la barra desde la colgada" },
              { desc: "2 x 1 al 82% 1RM", note: "Añadir 1 OHS al final de cada serie pesada" }
            ],
            rest: "2-3 min entre series",
            note: "Variante de S1 — mismo patrón Snatch desde posición de colgado. Refuerza la segunda tracción."
          },
          wod: {
            parts: null,
            type: "LADDER",
            duration: "Est. 22-25 min",
            format: "YOU GO I GO",
            formatNote: "Pareja A hace ronda completa entera, B descansa. Bajáis juntos a la siguiente ronda.",
            ladderNote: "Rondas: 18 — 14 — 10 — 6 reps de cada movimiento. Cal Remo fijo 12 cal cada ronda.",
            movements: [
              { reps: "18/14/10/6", name: "C2B Pull-ups", weight: "BW", equipment: "Barra" },
              { reps: "18/14/10/6", name: "Hang Power Snatch", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "18/14/10/6", name: "OHS", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "18/14/10/6", name: "TTB", weight: "BW", equipment: "Barra" },
              { reps: "12 cal fijo", name: "Cal Remo", weight: "BW", equipment: "Remo — alternos" }
            ],
            gymNote: "💡 Gim: C2B + TTB en cada ronda — tirón y core en fatiga creciente de Snatch. La ladder hace el trabajo por vosotros."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Bar Muscle-Up (S2)",
            duration: "~20 min · En pareja · Bajada de pulsaciones",
            focus: "Semana 2: hip drive y primeras reps touch & go",
            blocks: [
              { label: "Movilidad activa", detail: "Kipping swing x10 + banded lat stretch 60 seg + scap pull-up x8 — 4 min" },
              { label: "C2B strict", detail: "4 x 5 strict C2B — base de fuerza. Alternáis series." },
              { label: "Kipping agresivo", detail: "5 x 3 kipping swing máximo + intento BMU. Foco en llevar caderas a la barra." },
              { label: "Touch & go", detail: "4 x 2-3 BMU touch & go — no perder tensión entre reps. Alternáis." },
              { label: "📝 Nota", detail: "Objetivo: el segundo BMU igual de limpio que el primero. Eso es lo que buscamos." }
            ]
          }
        }
      ]
    },
    {
      number: 3,
      dates: "",
      focus: "Intensidad Máxima",
      theme: "Semana de mayor carga — empujamos los porcentajes al límite",
      days: [
        {
          day: "Lunes",
          type: "Halterofilia",
          label: "CLEAN & JERK PESADO",
          trainType: "CrossFit Largo",
          rmKey: "cj",
          warmup: [
            "500m remo + movilidad de cadera con banda — 90 seg/lado",
            "Hang power clean progresivo hasta 60% — 3x3",
            "Split jerk barra vacía 3x3 técnicos + push jerk al 50% x3"
          ],
          strength: {
            title: "Clean & Jerk",
            sets: [
              { desc: "3 x 2 al 80% 1RM", note: "Ritmo alto y explosivo — semana punta" },
              { desc: "2 x 2 al 85% 1RM", note: "Máxima intención en cada rep" },
              { desc: "2 x 1 al 88-90% 1RM", note: "Intentos de mejor marca de sesión" }
            ],
            rest: "3 min entre series pesadas",
            note: "Pico del mes. Si falla el split jerk: push jerk. No comprometer técnica."
          },
          wod: {
            gymNote: "💡 Gim: WOD 1 — BMU SYNCHRO + HSPU en semana punta. WOD 2 — C&J + Thruster + HSW en fatiga máxima. Doble estímulo de hombro y pierna.",
            parts: [
              {
                type: "AMRAP",
                duration: "10 min",
                format: "SYNCHRO",
                formatNote: "BMU SYNCHRO — los dos a la vez. HSPU y S2OH a repartir libremente.",
                movements: [
                  { reps: "3 SYNCHRO", name: "BMU / C2B (x2)", weight: "BW", equipment: "Barra — los dos a la vez" },
                  { reps: "6", name: "HSPU Kipping", weight: "BW", equipment: "Pared" },
                  { reps: "6", name: "Shoulder to Overhead", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" }
                ]
              },
              {
                type: "AMRAP",
                duration: "12 min",
                format: "YOU GO I GO",
                formatNote: "Pareja A hace ronda completa entera, B descansa. Sin descanso extra entre cambios.",
                movements: [
                  { reps: "4", name: "Clean & Jerk", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
                  { reps: "6", name: "DB Thruster", weight: "♂ 2x25kg / ♀ 2x17.5kg", equipment: "Dumbbell" },
                  { reps: "10m", name: "Handstand Walk / 5 Wall Climbs", weight: "BW", equipment: "Suelo / Pared" },
                  { reps: "14", name: "Cal Assault Bike", weight: "BW", equipment: "Assault Bike — alternos" }
                ]
              }
            ]
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Ring Muscle-Up (S3)",
            duration: "~20 min · En pareja · Bajada de pulsaciones",
            focus: "Semana 3: encadenar reps y aguantar la técnica con fatiga",
            blocks: [
              { label: "Movilidad activa", detail: "Band pull-apart x15 + ring row x10 + shoulder activation — 3 min" },
              { label: "RMU en fresco", detail: "3 x 3 RMU con false grip — pausa 1 seg arriba. Descanso completo entre series." },
              { label: "Touch & go", detail: "4 x 2 RMU touch & go — foco en no perder tensión entre reps. Alternáis." },
              { label: "Mini chipper", detail: "3 rondas alternando: 2 RMU + 5 ring dips estrictos. Uno hace, otro descansa." },
              { label: "📝 Nota", detail: "Esta semana: el segundo RMU debe ser igual de limpio que el primero." }
            ]
          }
        },
        {
          day: "Miércoles",
          type: "Endurance",
          label: "FRONT SQUAT + ENDURANCE",
          trainType: "Endurance Pesado",
          rmKey: null,
          warmup: [
            "2 rondas: 10 goblet squat (KB 24kg) + 10 strict press barra vacía + 10 shoulder tap plancha",
            "Front squat progresivo: barra vacía x8, 40% x5, 55% x3",
            "Movilidad de muñeca y codo — 2 min"
          ],
          strength: {
            title: "Front Squat",
            sets: [
              { desc: "4 x 4 al 73% 1RM", note: "Codos altos, core apretado, profundidad completa" },
              { desc: "3 x 2 al 82% 1RM", note: "Explosión máxima en la subida" },
              { desc: "2 x 1 al 87% 1RM", note: "Semana de intensidad máxima — máxima intención" }
            ],
            rest: "2-3 min entre series",
            note: "Semana punta de fuerza. Codos altos en todo momento — si caen, bajar el peso."
          },
          wod: {
            gymNote: "💡 Gim: WOD 1 — TTB + Rope Climb + DB Thruster (variante FS). WOD 2 — C2B + HSW metros + Ski Erg. Cuatro movimientos gimnásticos en 22 min.",
            parts: [
              {
                type: "ROUNDS FOR TIME",
                duration: "4 rondas c/u — Cap 13 min",
                format: "YOU GO I GO",
                formatNote: "Pareja A hace ronda entera completa, B descansa. 4 rondas cada uno.",
                movements: [
                  { reps: "12", name: "TTB", weight: "BW", equipment: "Barra" },
                  { reps: "10", name: "DB Thruster", weight: "♂ 2x30kg / ♀ 2x20kg", equipment: "Dumbbell — variante Front Squat" },
                  { reps: "2", name: "Rope Climbs (alternos)", weight: "BW", equipment: "Cuerda — 4-5m" },
                  { reps: "16", name: "Cal Ski Erg", weight: "BW", equipment: "Ski Erg — alternos" }
                ]
              },
              {
                type: "AMRAP",
                duration: "10 min",
                format: "A REPARTIR LIBREMENTE",
                formatNote: "Uno trabaja, el otro descansa. HSW alternos — uno camina, el otro recupera.",
                movements: [
                  { reps: "10", name: "C2B Pull-ups", weight: "BW", equipment: "Barra" },
                  { reps: "12", name: "KB Swings (americano)", weight: "♂ 32kg / ♀ 24kg", equipment: "Kettlebell — HEAVY" },
                  { reps: "10m", name: "Handstand Walk / 5 Wall Climbs", weight: "BW", equipment: "Suelo / Pared" },
                  { reps: "50", name: "Double Unders", weight: "BW", equipment: "Cuerda — cada uno" }
                ]
              }
            ]
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Handstand Walk (S3)",
            duration: "~20 min · En pareja · Bajada de pulsaciones",
            focus: "Semana 3: distancia real y control de giro",
            blocks: [
              { label: "Movilidad activa", detail: "Wrist warm-up + pike stretch + shoulder taps x10 — 3 min" },
              { label: "HSW libre", detail: "5 x intentos de 10m — foco en mantener la línea y no abrir caderas. Alternáis." },
              { label: "Giro de 90°", detail: "3 x 2 giros de 90° en handstand — uno hacia cada lado. Clave para HSW en WOD." },
              { label: "HSW con obstáculo", detail: "2 x recorrido con un bumper en el suelo como obstáculo — entrenar el paso lateral." },
              { label: "📝 Nota", detail: "Objetivo: completar 10m sin tocar el suelo. Si ya lo conseguís, id a 15m." }
            ]
          }
        },
        {
          day: "Viernes",
          type: "Halterofilia",
          label: "SNATCH PESADO",
          trainType: "CrossFit Largo",
          rmKey: "sn",
          warmup: [
            "OHS con PVC 2x10 + snatch balance barra vacía x5",
            "Progresión hasta 65% en hang snatch — 3x2",
            "Activación glúteos y core: 2x10 hip thrust + 2x10 pallof press"
          ],
          strength: {
            title: "Snatch",
            sets: [
              { desc: "3 x 2 al 80% 1RM", note: "Explosión total en la segunda tracción" },
              { desc: "2 x 2 al 85% 1RM", note: "Máxima velocidad bajo la barra" },
              { desc: "2 x 1 al 88-90% 1RM", note: "Intentos de mejor marca del mes" }
            ],
            rest: "3 min entre series pesadas",
            note: "Si falla técnica al 88%: repetir al 85% y finalizar ahí."
          },
          wod: {
            parts: null,
            type: "FOR TIME",
            duration: "Est. 22-25 min",
            format: "A REPARTIR LIBREMENTE",
            formatNote: "Repartid reps libremente. Mínimo 10 reps de cada movimiento por persona.",
            movements: [
              { reps: "10 SYNCHRO", name: "TTB", weight: "BW", equipment: "Barra — los dos a la vez" },
              { reps: "20", name: "Power Snatch", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "10 SYNCHRO", name: "HSPU Kipping", weight: "BW", equipment: "Pared — los dos a la vez" },
              { reps: "20", name: "Hang Power Snatch", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "8", name: "Rope Climbs", weight: "BW", equipment: "Cuerda — alternos" },
              { reps: "20", name: "OHS", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "10 SYNCHRO", name: "C2B Pull-ups", weight: "BW", equipment: "Barra — los dos a la vez" },
              { reps: "30", name: "Cal Remo", weight: "BW", equipment: "Remo — alternos" }
            ],
            gymNote: "💡 Gim: TTB + HSPU + C2B SYNCHRO intercalados con los tres planos del Snatch — patrón de movimiento y gimnásticos alternando continuamente."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Bar Muscle-Up (S3)",
            duration: "~20 min · En pareja · Bajada de pulsaciones",
            focus: "Semana 3: sets encadenados y resistencia de BMU",
            blocks: [
              { label: "Movilidad activa", detail: "Kipping swing x10 + dead hang 30 seg + lat stretch 60 seg — 3 min" },
              { label: "BMU en fresco", detail: "3 x 4 BMU — pausa 1 seg arriba. Descanso completo entre series. Alternáis." },
              { label: "Touch & go largo", detail: "4 x 3-4 BMU touch & go — foco en ritmo constante. Alternáis." },
              { label: "Mini AMRAP técnico", detail: "5 min: max BMU calidad. Anotad total de reps. Alternáis cada intento." },
              { label: "📝 Nota", detail: "Comparad con S1. ¿Más reps? ¿Menos fatiga entre sets? Ese es el progreso real." }
            ]
          }
        }
      ]
    },
    {
      number: 4,
      dates: "",
      focus: "Descarga & Test Final",
      theme: "Bajamos volumen, testeamos marcas y cerramos el bloque",
      days: [
        {
          day: "Lunes",
          type: "Halterofilia",
          label: "CLEAN & JERK — TEST",
          trainType: "CrossFit Largo",
          rmKey: "cj",
          warmup: [
            "Activación dinámica full body — 5 min suave",
            "Progresión técnica ligera hasta 65% — 3x2",
            "2 x 1 al 75% para activar el sistema nervioso"
          ],
          strength: {
            title: "TEST — Clean & Jerk",
            sets: [
              { desc: "1 x 1 al 80%", note: "Calentamiento previo al test — ¿cómo se siente?" },
              { desc: "1 x 1 al 87%", note: "Aproximación al máximo" },
              { desc: "1 x 1 al 93-95%", note: "Intento de PR o mejor marca del mes" },
              { desc: "Opcional: 1 x 1 al 100%+", note: "Solo si la serie anterior fue limpia y cómoda" }
            ],
            rest: "4-5 min entre intentos pesados",
            note: "¡Día de marcas! Confiad en el trabajo del mes. Anotad el resultado para el siguiente bloque."
          },
          wod: {
            parts: null,
            type: "LADDER",
            duration: "Est. 22-25 min",
            format: "YOU GO I GO",
            formatNote: "Pareja A hace ronda completa entera, B descansa. Bajáis juntos a la siguiente ronda.",
            ladderNote: "Rondas: 20 — 15 — 10 — 5 reps. Cal Bike fijo 12 cal cada ronda.",
            movements: [
              { reps: "20/15/10/5", name: "HSPU Estricto", weight: "BW", equipment: "Pared" },
              { reps: "20/15/10/5", name: "Clean & Jerk", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "20/15/10/5", name: "TTB", weight: "BW", equipment: "Barra" },
              { reps: "10m fijo", name: "Handstand Walk / 5 Wall Climbs", weight: "BW", equipment: "Suelo / Pared" },
              { reps: "12 cal fijo", name: "Cal Assault Bike", weight: "BW", equipment: "Assault Bike — alternos" }
            ],
            gymNote: "💡 Gim: HSPU estricto + TTB + HSW en ladder descendente — semana de descarga, calidad técnica en cada ronda. La de 20 es la más exigente."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Ring Muscle-Up (S4 · Test)",
            duration: "~20 min · En pareja · Bajada de pulsaciones",
            focus: "Semana de test: máximo de reps y calidad de cierre",
            blocks: [
              { label: "Activación suave", detail: "Ring row x8 + false grip hold 20 seg + shoulder rotation — 4 min" },
              { label: "Test 1: Max reps", detail: "1 intento de máximo RMU sin soltar las anillas. Anotad el resultado. Alternáis." },
              { label: "Descanso", detail: "5 min de descanso activo — caminar, respirar, estirar hombros." },
              { label: "Test 2: Calidad", detail: "3 x 3 RMU con pausa 1 seg arriba — calidad máxima, no velocidad. Alternáis." },
              { label: "📝 Nota", detail: "Comparad con S1. ¿La transición es más limpia? ¿Mantenéis el false grip? Eso es el progreso." }
            ]
          }
        },
        {
          day: "Miércoles",
          type: "Endurance",
          label: "STRICT PRESS + ENDURANCE",
          trainType: "Endurance Pesado",
          rmKey: null,
          warmup: [
            "2 rondas: 10 band pull-apart + 10 face pull con banda + 10 scap push-up",
            "Strict press progresivo: barra vacía x8, 40% x5, 55% x3",
            "Activación manguito rotador: 2x15 rotación externa con banda"
          ],
          strength: {
            title: "Strict Press",
            sets: [
              { desc: "5 x 5 al 72% 1RM", note: "Sin impulso de piernas, core apretado, lockout completo" },
              { desc: "3 x 3 al 80% 1RM", note: "Máxima intención en el lockout" },
              { desc: "2 x 2 al 85% 1RM", note: "Semana de descarga — técnica limpia sobre carga" }
            ],
            rest: "2 min entre series",
            note: "Semana de descarga. Press estricto puro — sin dip de piernas en ninguna serie."
          },
          wod: {
            parts: null,
            type: "AMRAP",
            duration: "22 min",
            format: "A REPARTIR LIBREMENTE",
            formatNote: "Uno trabaja, el otro descansa. HSW alternos — uno camina metros mientras el otro recupera activamente.",
            movements: [
              { reps: "10m", name: "Handstand Walk / 5 Wall Climbs", weight: "BW", equipment: "Suelo / Pared" },
              { reps: "10", name: "DB Push Press", weight: "♂ 2x22.5kg / ♀ 2x15kg", equipment: "Dumbbell — variante Strict Press" },
              { reps: "6", name: "Pull-ups", weight: "BW", equipment: "Barra" },
              { reps: "15", name: "KB Swings (americano)", weight: "♂ 24kg / ♀ 16kg", equipment: "Kettlebell" },
              { reps: "50", name: "Double Unders", weight: "BW", equipment: "Cuerda — cada uno" },
              { reps: "12", name: "TTB", weight: "BW", equipment: "Barra" },
              { reps: "16", name: "Cal Ski Erg", weight: "BW", equipment: "Ski Erg — alternos" }
            ],
            gymNote: "💡 Gim: HSW metros + Pull-ups + TTB — semana de descarga, los gimnásticos protagonistas. DB Push Press como variante del Strict Press trabajado. Peso RX para disfrutar."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Handstand Walk (S4 · Test)",
            duration: "~20 min · En pareja · Bajada de pulsaciones",
            focus: "Semana de test: distancia máxima y control total",
            blocks: [
              { label: "Activación suave", detail: "Wall walks x3 + shoulder taps x10 + wrist warm-up — 4 min" },
              { label: "Test 1: Distancia máxima", detail: "1 intento de HSW máxima distancia sin tocar el suelo. Anotad los metros. Alternáis." },
              { label: "Descanso", detail: "5 min de descanso activo — movilidad de muñecas y hombros." },
              { label: "Test 2: Consistencia", detail: "3 x 10m HSW — objetivo: completar los 3 intentos sin fallo. Calidad sobre distancia." },
              { label: "📝 Nota", detail: "¿Más metros que en S1? ¿La línea es más recta? Eso es el progreso real del mes." }
            ]
          }
        },
        {
          day: "Viernes",
          type: "Halterofilia",
          label: "SNATCH — TEST",
          trainType: "CrossFit Largo",
          rmKey: "sn",
          warmup: [
            "Snatch balance progresivo hasta 60% — 3x3",
            "OHS 3x3 al 70% para activar estabilidad de recepción",
            "Hang snatch x2 al 72% — activar velocidad"
          ],
          strength: {
            title: "TEST — Snatch",
            sets: [
              { desc: "1 x 1 al 80%", note: "Confianza — siente la barra" },
              { desc: "1 x 1 al 87%", note: "Aproximación al máximo" },
              { desc: "1 x 1 al 93-95%", note: "Intento de PR o mejor marca del mes" },
              { desc: "Opcional: 1 x 1 al 100%+", note: "Solo si el anterior fue limpio y estable" }
            ],
            rest: "4-5 min entre intentos",
            note: "Si no está el día: quedarse en 90% y dejar el PR para el siguiente bloque."
          },
          wod: {
            parts: null,
            type: "FOR TIME",
            duration: "Est. 22-25 min",
            format: "A REPARTIR LIBREMENTE",
            formatNote: "Repartid reps libremente. Mínimo 15 reps de cada movimiento por persona. ¡WOD de cierre del mes!",
            movements: [
              { reps: "40", name: "Power Snatch", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "30", name: "BMU / C2B (x2)", weight: "BW", equipment: "Barra" },
              { reps: "20", name: "Devil Press", weight: "♂ 2x22.5kg / ♀ 2x15kg", equipment: "Dumbbell" },
              { reps: "30", name: "Hang Power Snatch", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "20", name: "BMU / C2B (x2)", weight: "BW", equipment: "Barra" },
              { reps: "10", name: "Rope Climbs", weight: "BW", equipment: "Cuerda — alternos" },
              { reps: "20", name: "OHS", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "10", name: "BMU / C2B (x2)", weight: "BW", equipment: "Barra" },
              { reps: "5 c/u", name: "Legless Rope Climb", weight: "BW", equipment: "Cuerda — 4-5m" }
            ],
            gymNote: "🏆 WOD de cierre del mes — escalera Power Snatch → Hang Power Snatch → OHS con BMU + Rope Climb intercalados. El Legless es el sello final."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Cierre del Bloque (S4)",
            duration: "~20 min · En pareja · Bajada de pulsaciones",
            focus: "Test final: un rep de cada movimiento trabajado este mes",
            blocks: [
              { label: "Activación suave", detail: "Dead hang 30 seg + shoulder rotation + wrist circles — 3 min" },
              { label: "RMU", detail: "3 x 2 RMU con false grip — pausa 1 seg arriba. Calidad de cierre." },
              { label: "HSW", detail: "3 x 10m HSW — lo más limpio que hayáis caminado en el mes." },
              { label: "BMU + Rope Climb", detail: "3 x (2 BMU + 1 Rope Climb) — los tres movimientos del bloque juntos." },
              { label: "📝 Nota", detail: "Este bloque es vuestra firma del mes. No es competición — es celebración de lo que habéis construido. 💪" }
            ]
          }
        }
      ]
    }
  ]
};
