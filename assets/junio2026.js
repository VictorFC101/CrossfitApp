// ============================================================
// PROGRAMA CROSSFIT JUNIO 2026 — EN PAREJA · 1.5H
// S1: Base & Variaciones · S2: Construcción · S3: Intensificación · S4: Descarga + Test
//
// LUNES   → Halterofilia (CrossFit Largo)  : Fuerza 20min + WOD 22-25min barra
// MIÉRCOLES → Endurance Extra              : Fuerza 20min + WOD 30-35min DB/KB pesados
// VIERNES → Halterofilia (CrossFit Largo)  : Fuerza 20min + WOD 22-25min barra
// ============================================================

export const junio2026 = {
  name: "CrossFit Junio 2026 — Pareja",
  weeks: [

    // ──────────────────────────────────────────────────────────
    // SEMANA 1 — Base & Variaciones
    // ──────────────────────────────────────────────────────────
    {
      number: 1,
      dates: "",
      focus: "Base & Variaciones de Halterofilia",
      theme: "Introducimos las variaciones. Técnica antes que peso.",
      days: [

        // LUNES — CrossFit Largo
        {
          day: "Lunes",
          type: "Halterofilia",
          label: "HANG POWER CLEAN",
          trainType: "CrossFit Largo",
          rmKey: "cj",
          warmup: [
            "3 min: 400m trote suave + 10 dislocaciones de hombro con PVC + 10 hip circles cada lado",
            "2 min: Movilidad de cadera — hip flexor stretch con banda 45 seg/lado + ankle circles x10",
            "3 min: Hang power clean progresivo con barra vacía — 3 x 5 reps, foco en codos altos y posición de rack"
          ],
          strength: {
            title: "Hang Power Clean",
            sets: [
              { desc: "4 x 5 al 65% 1RM", note: "Posición de partida: muslos, hombros sobre la barra" },
              { desc: "3 x 4 al 70% 1RM", note: "Extensión triple completa antes del pull alto" },
              { desc: "2 x 3 al 73% 1RM", note: "Velocidad de barra — acelera en los dos últimos sets" }
            ],
            rest: "2 min entre series",
            note: "S1 de junio. Establece la posición de hang antes de pasar al squat clean la semana siguiente."
          },
          wod: {
            parts: null,
            type: "AMRAP",
            duration: "20 min",
            format: "YOU GO I GO",
            formatNote: "Pareja A completa la ronda entera, Pareja B descansa. Alternáis sin descanso extra.",
            movements: [
              { reps: "5", name: "Hang Power Clean", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "8", name: "C2B Pull-ups", weight: "BW", equipment: "Barra" },
              { reps: "12", name: "Wall Ball", weight: "♂ 9kg / ♀ 6kg", equipment: "Wall Ball" },
              { reps: "10", name: "Cal Row", weight: "BW", equipment: "Remo — alternos" }
            ],
            gymNote: "💡 Gim: Mantened el mismo peso del bloque de fuerza. Gestiona las C2B para no romperte en las primeras rondas."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Ring Muscle-Up (S5)",
            duration: "~18 min · En pareja · Bajada de pulsaciones",
            focus: "Consolidación: encadenamiento de reps",
            blocks: [
              { label: "Activación", detail: "Banded pull-apart x15 + ring row x8 + ring dip x5 — 3 min" },
              { label: "Transición controlada", detail: "Jumping RMU desde cajón 4 x 2 — pausa 2 seg en transición. Alternáis." },
              { label: "RMU con banda", detail: "3 x 3 con banda de asistencia — foco en transición de muñeca suave." },
              { label: "Intento libre", detail: "3 x intento RMU sin asistencia. Si lo tienes: 3 x 2 reps con bajada excéntrica 4 seg." },
              { label: "📝 Nota", detail: "No forzar si el hombro carga. Una rep perfecta vale más que 5 con salto." }
            ]
          }
        },

        // MIÉRCOLES — Endurance Extra
        {
          day: "Miércoles",
          type: "Endurance Extra",
          label: "BACK SQUAT + ENDURANCE EXTRA",
          trainType: "Endurance Extra",
          rmKey: "bs",
          warmup: [
            "3 min: 2 rondas — 10 goblet squat KB 16kg + 10 banded hip abduction + 10 good mornings barra vacía",
            "2 min: Foam roller cuádriceps y glúteo — 1 min/lado",
            "3 min: Back squat progresivo — barra vacía x8, 40% x5, 55% x3 — foco en profundidad y control"
          ],
          strength: {
            title: "Back Squat",
            sets: [
              { desc: "4 x 5 al 65% 1RM", note: "Profundidad completa, control excéntrico 2 seg" },
              { desc: "3 x 4 al 70% 1RM", note: "Tensión en glúteos en la subida" },
              { desc: "2 x 3 al 73% 1RM", note: "Velocidad de subida máxima en los últimos sets" }
            ],
            rest: "2-3 min entre series",
            note: "Semana 1 de junio. Si no tienes marcas claras del mes anterior, estos sets te dan la referencia."
          },
          wod: {
            parts: null,
            type: "AMRAP",
            duration: "30 min",
            format: "YOU GO I GO",
            formatNote: "Pareja A completa la ronda entera, Pareja B descansa. Alternáis sin descanso extra.",
            movements: [
              { reps: "10", name: "DB Deadlift", weight: "♂ 2x35kg / ♀ 2x22.5kg", equipment: "Dumbbell" },
              { reps: "14 cal", name: "Ski Erg", weight: "BW", equipment: "Ski Erg — alternos" },
              { reps: "10", name: "TTB", weight: "BW", equipment: "Barra" },
              { reps: "12 cal", name: "Assault Bike", weight: "BW", equipment: "Assault Bike — alternos" },
              { reps: "14", name: "KB Swing (americano)", weight: "♂ 32kg / ♀ 24kg", equipment: "Kettlebell" },
              { reps: "8", name: "Pull-ups", weight: "BW", equipment: "Barra" }
            ],
            gymNote: "💡 Gim: Endurance Extra post-squat — las piernas van cargadas. Gestiona el DB Deadlift con espalda neutra aunque el cuádriceps queme."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Handstand Walk (S5)",
            duration: "~18 min · En pareja · Bajada de pulsaciones",
            focus: "Consolidación: primeros metros con control",
            blocks: [
              { label: "Movilidad activa", detail: "Pike stretch 45 seg + wrist extensions x10 + shoulder CARs x5/lado — 3 min" },
              { label: "Wall walks + shoulder taps", detail: "3 wall walks lentos + 6 shoulder taps arriba. Alternáis — 3 rondas." },
              { label: "Kick-up + hold libre", detail: "5 x kick-up a la vertical sin pared — objetivo aguantar 5 seg. Alternáis." },
              { label: "Primeros pasos", detail: "3 x intento de 5m HSW. Si no tienes HSW: 3 x 10m bear crawl + 5 shoulder taps en plancha." },
              { label: "📝 Nota", detail: "Si ya camináis 10m: trabajad cambio de dirección o piruletas (180°) con control." }
            ]
          }
        },

        // VIERNES — CrossFit Largo
        {
          day: "Viernes",
          type: "Halterofilia",
          label: "POWER SNATCH",
          trainType: "CrossFit Largo",
          rmKey: "sn",
          warmup: [
            "3 min: PVC pass-through x10 + OHS con PVC x8 + snatch grip deadlift barra vacía x5",
            "2 min: Movilidad de hombro — band dislocations x10 + wall slide x8 + wrist stretch 30 seg/lado",
            "3 min: Hang power snatch barra vacía x5 + power snatch desde suelo x3 — barra pegada al cuerpo"
          ],
          strength: {
            title: "Power Snatch",
            sets: [
              { desc: "4 x 4 al 62% 1RM", note: "Técnica prioritaria — barra pegada al cuerpo, extensión triple" },
              { desc: "3 x 3 al 68% 1RM", note: "Velocidad en el pull bajo la barra" },
              { desc: "2 x 2 al 72% 1RM", note: "Recepción firme en overhead squat controlado" }
            ],
            rest: "2 min entre series",
            note: "S1 snatch. Prioriza la trayectoria de barra — base para el squat snatch de S3."
          },
          wod: {
            parts: null,
            type: "FOR TIME",
            duration: "Sub 22 min",
            format: "CHIPPER EN PAREJA",
            formatNote: "Repartid las reps libremente. Podéis hacer distintos movimientos a la vez.",
            movements: [
              { reps: "40 cal", name: "Row", weight: "BW", equipment: "Remo" },
              { reps: "30", name: "Power Snatch", weight: "♂ 50kg / ♀ 35kg", equipment: "Barbell" },
              { reps: "40", name: "Box Jump Over", weight: "BW", equipment: "Box 60/50cm" },
              { reps: "30", name: "DB Snatch alternos", weight: "♂ 27.5kg / ♀ 20kg", equipment: "Dumbbell" },
              { reps: "40 cal", name: "Ski Erg", weight: "BW", equipment: "Ski Erg" }
            ],
            gymNote: "💡 Gim: Chipper de mayor a menor dificultad técnica. Arranca conservador en el remo para llegar fresco a los snatches."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Ring Muscle-Up (S5 bis)",
            duration: "~15 min · En pareja",
            focus: "Fuerza de apoyo en anillas",
            blocks: [
              { label: "Activación", detail: "Ring row x8 + ring dip x5 + banded pull-apart x15 — 3 min" },
              { label: "Ring dip hold", detail: "Dip hold en anillas 3 x 15 seg — codos cerrados, hombros bajos. Alternáis." },
              { label: "Ring support + L-sit", detail: "Ring support hold 3 x 10 seg + intento L-sit 3 seg. Acumulad." },
              { label: "📝 Nota", detail: "Semana ligera de skill. Énfasis en posición de soporte — base para la transición RMU." }
            ]
          }
        }
      ]
    },

    // ──────────────────────────────────────────────────────────
    // SEMANA 2 — Construcción & Complejos
    // ──────────────────────────────────────────────────────────
    {
      number: 2,
      dates: "",
      focus: "Construcción & Complejos",
      theme: "Aumentamos carga y encadenamos movimientos en complejo.",
      days: [

        // LUNES — CrossFit Largo
        {
          day: "Lunes",
          type: "Halterofilia",
          label: "SQUAT CLEAN + PUSH PRESS",
          trainType: "CrossFit Largo",
          rmKey: "cj",
          warmup: [
            "3 min: 3 rondas — 5 air squat + 5 hang power clean barra vacía + 5 push press barra vacía",
            "2 min: Movilidad de cadera y tobillo — pigeon stretch 45 seg/lado + ankle circles x10",
            "3 min: Squat clean progresivo — 50% x3, 58% x2 — foco en recepción en squat profundo con codos arriba"
          ],
          strength: {
            title: "Squat Clean + Push Press (Complejo)",
            sets: [
              { desc: "4 x 3+3 al 68% 1RM", note: "3 Squat Clean + 3 Push Press sin soltar la barra" },
              { desc: "3 x 2+2 al 74% 1RM", note: "Extensión de cadera total antes de iniciar el press" },
              { desc: "2 x 1+2 al 78% 1RM", note: "Clean pesado + doble press — el clean marca el peso del complejo" }
            ],
            rest: "2-3 min entre series",
            note: "Primer complejo del mes. El squat clean dicta el ritmo — no apresures el press."
          },
          wod: {
            parts: [
              {
                label: "PARTE A",
                type: "AMRAP",
                duration: "10 min",
                format: "YOU GO I GO",
                formatNote: "Pareja A completa la ronda, Pareja B descansa. Alternáis.",
                movements: [
                  { reps: "3", name: "Squat Clean", weight: "♂ 70kg / ♀ 47.5kg", equipment: "Barbell" },
                  { reps: "6", name: "C2B Pull-ups", weight: "BW", equipment: "Barra" },
                  { reps: "9", name: "Box Jump Over", weight: "BW", equipment: "Box 60/50cm" }
                ]
              },
              {
                label: "PARTE B",
                type: "AMRAP",
                duration: "10 min",
                format: "YOU GO I GO",
                formatNote: "2 min de descanso entre partes. Misma dinámica de alternancia.",
                movements: [
                  { reps: "5", name: "Push Press", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
                  { reps: "10", name: "TTB", weight: "BW", equipment: "Barra" },
                  { reps: "15 cal", name: "Assault Bike", weight: "BW", equipment: "Assault Bike — alternos" }
                ]
              }
            ]
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Ring Muscle-Up (S6)",
            duration: "~18 min · En pareja",
            focus: "Fase de enlace: primera rep limpia",
            blocks: [
              { label: "Activación", detail: "Banded pull-apart x15 + ring row estricto x8 + ring dip x6 — 3 min" },
              { label: "Transición dinámica", detail: "Jumping RMU desde cajón bajo 4 x 3 — salto mínimo, máxima transferencia. Alternáis." },
              { label: "RMU negativo", detail: "Desde arriba (con salto) bajada excéntrica 5 seg x 4 reps. Alternáis." },
              { label: "Intento libre", detail: "5 x intento RMU. Si lo consigues: 3 x 2 reps con control. Si no: 3 x 3 jumping con pausa." },
              { label: "📝 Nota", detail: "Hoy es el día para el primer RMU limpio. No forzar hombros si hay carga del WOD." }
            ]
          }
        },

        // MIÉRCOLES — Endurance Extra
        {
          day: "Miércoles",
          type: "Endurance Extra",
          label: "DEADLIFT + ENDURANCE EXTRA",
          trainType: "Endurance Extra",
          rmKey: "dl",
          warmup: [
            "3 min: 2 rondas — 8 KB deadlift 16kg + 8 hip hinge barra vacía + 10 band pull-apart",
            "2 min: Estiramiento isquios con banda — pierna recta tumbado 45 seg/lado",
            "3 min: Deadlift progresivo — 50% x5, 60% x3 — foco en espalda neutra y empuje de suelo"
          ],
          strength: {
            title: "Deadlift",
            sets: [
              { desc: "4 x 4 al 70% 1RM", note: "Espalda neutra, hombros levemente delante de la barra al inicio" },
              { desc: "3 x 3 al 76% 1RM", note: "Empuja el suelo — no tires de la barra desde los brazos" },
              { desc: "2 x 2 al 80% 1RM", note: "Lat engagement y respiración en el cinturón antes de arrancar" }
            ],
            rest: "2-3 min entre series",
            note: "Primera sesión de DL del mes. Registra el peso de cada set para comparar con S3."
          },
          wod: {
            parts: null,
            type: "AMRAP",
            duration: "32 min",
            format: "YOU GO I GO",
            formatNote: "Pareja A completa la ronda entera, Pareja B descansa. Alternáis sin descanso extra.",
            movements: [
              { reps: "10", name: "DB Romanian Deadlift", weight: "♂ 2x35kg / ♀ 2x22.5kg", equipment: "Dumbbell" },
              { reps: "12 cal", name: "Assault Bike", weight: "BW", equipment: "Assault Bike — alternos" },
              { reps: "10", name: "HSPU", weight: "BW", equipment: "Pared / Mat" },
              { reps: "12 cal", name: "Ski Erg", weight: "BW", equipment: "Ski Erg — alternos" },
              { reps: "15", name: "KB Swing (americano)", weight: "♂ 32kg / ♀ 24kg", equipment: "Kettlebell" },
              { reps: "10", name: "Ring Row", weight: "BW", equipment: "Anillas" }
            ],
            gymNote: "💡 Gim: Hinge-day completo. El DB Romanian DL y el KB Swing trabajan la cadena posterior desde ángulos distintos — gestiona el ritmo para mantener la técnica en las últimas rondas."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Handstand Walk (S6)",
            duration: "~18 min · En pareja",
            focus: "Construcción: 10m continuos",
            blocks: [
              { label: "Movilidad activa", detail: "Wrist stretch 30 seg + shoulder CARs x5/lado + pike stretch 45 seg — 2 min" },
              { label: "Wall walks + taps", detail: "4 wall walks + 8 shoulder taps arriba. Alternáis — 3 rondas." },
              { label: "Kick-up + 1er paso", detail: "3 x kick-up + 2-3 pasos inmediatos. Objetivo: 3 pasos controlados. Alternáis." },
              { label: "Distancia medida", detail: "3 x intento máximo HSW medido. Registrad vuestra mejor marca del día." },
              { label: "📝 Nota", detail: "Si ya camináis 15m+: 3 x 10m con disco en el suelo como obstáculo o cambio de dirección a los 5m." }
            ]
          }
        },

        // VIERNES — CrossFit Largo
        {
          day: "Viernes",
          type: "Halterofilia",
          label: "HANG POWER SNATCH + OHS",
          trainType: "CrossFit Largo",
          rmKey: "sn",
          warmup: [
            "3 min: PVC pass-through x10 + OHS con PVC x8 + hang power snatch con PVC x5",
            "2 min: Movilidad overhead — band shoulder stretch 45 seg/lado + wrist extension en suelo 30 seg",
            "3 min: Complejo barra vacía — 3 x (3 hang power snatch + 3 OHS) — recepción ancha y estable"
          ],
          strength: {
            title: "Hang Power Snatch + OHS (Complejo)",
            sets: [
              { desc: "4 x 3+3 al 65% 1RM", note: "3 Hang Power Snatch + 3 Overhead Squat sin soltar la barra" },
              { desc: "3 x 2+2 al 70% 1RM", note: "OHS profundo — rodillas separadas, core activo todo el tiempo" },
              { desc: "2 x 1+3 al 74% 1RM", note: "Snatch pesado + triple OHS para fijar la posición overhead" }
            ],
            rest: "2 min entre series",
            note: "Complejo de transición hacia el squat snatch de S3. El OHS entrena la posición de recepción."
          },
          wod: {
            parts: null,
            type: "FOR TIME",
            duration: "Sub 20 min",
            format: "CHIPPER EN PAREJA",
            formatNote: "Repartid las reps libremente. Podéis hacer distintos movimientos a la vez.",
            movements: [
              { reps: "50", name: "Wall Ball", weight: "♂ 9kg / ♀ 6kg", equipment: "Wall Ball" },
              { reps: "30", name: "Hang Power Snatch", weight: "♂ 45kg / ♀ 30kg", equipment: "Barbell" },
              { reps: "50 cal", name: "Row", weight: "BW", equipment: "Remo" },
              { reps: "30", name: "Overhead Squat", weight: "♂ 45kg / ♀ 30kg", equipment: "Barbell" },
              { reps: "40", name: "Double Unders", weight: "BW", equipment: "Comba" }
            ],
            gymNote: "💡 Gim: El peso de la barra es el mismo para snatch y OHS — planificad las partidas antes de empezar."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Handstand Walk (S6 bis)",
            duration: "~15 min · En pareja",
            focus: "Consolidación de metros",
            blocks: [
              { label: "Activación", detail: "5 wall walks + 5 shoulder taps arriba. Alternáis — 2 rondas. 4 min." },
              { label: "HSW en tramos", detail: "3 x 5m + parada + 5m. Foco en ritmo de manos y piernas unidas." },
              { label: "Distancia libre", detail: "2 x intento máximo sin parar. Registrad la marca del día." },
              { label: "📝 Nota", detail: "Si ya superáis 20m: ajustad dirección mid-walk girando 180° con control." }
            ]
          }
        }
      ]
    },

    // ──────────────────────────────────────────────────────────
    // SEMANA 3 — Intensificación
    // ──────────────────────────────────────────────────────────
    {
      number: 3,
      dates: "",
      focus: "Intensificación",
      theme: "Cargas altas y máxima intención. WODs cortos y muy duros.",
      days: [

        // LUNES — CrossFit Largo
        {
          day: "Lunes",
          type: "Halterofilia",
          label: "CLEAN & JERK",
          trainType: "CrossFit Largo",
          rmKey: "cj",
          warmup: [
            "3 min: 3 rondas — 5 hang power clean + 5 push jerk barra vacía + 3 squat clean barra vacía",
            "2 min: Movilidad de muñeca y hombro en rack — wrist circles x10 + band shoulder distraction 40 seg/lado",
            "3 min: C&J progresivo — 55% x2, 65% x1, 72% x1 — activa la cadena completa antes de los sets pesados"
          ],
          strength: {
            title: "Clean & Jerk",
            sets: [
              { desc: "4 x 2 al 78% 1RM", note: "Clean + Jerk con pausa 1 seg en rack antes del jerk" },
              { desc: "3 x 1+1 al 83% 1RM", note: "Máxima velocidad de extensión — jerk split o push jerk" },
              { desc: "2 x 1+1 al 86% 1RM", note: "Cargas cercanas al máximo — foco en salida del split y recuperación" }
            ],
            rest: "3 min entre series",
            note: "Semana de mayor intensidad. Graba las series pesadas para análisis técnico."
          },
          wod: {
            parts: null,
            type: "FOR TIME",
            duration: "Sub 18 min",
            format: "YOU GO I GO — 3 RONDAS",
            formatNote: "Alternáis rondas completas. La ronda del compañero ES tu descanso. Sin tiempo extra.",
            movements: [
              { reps: "7", name: "Clean & Jerk", weight: "♂ 70kg / ♀ 47.5kg", equipment: "Barbell" },
              { reps: "14", name: "C2B Pull-ups", weight: "BW", equipment: "Barra" },
              { reps: "7", name: "Burpee Box Jump Over", weight: "BW", equipment: "Box 60/50cm" },
              { reps: "14 cal", name: "Row", weight: "BW", equipment: "Remo — alternos" }
            ],
            gymNote: "💡 Gim: El C&J dicta el ritmo — si fallas el jerk, baja el peso para la siguiente ronda."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Ring Muscle-Up (S7)",
            duration: "~20 min · En pareja",
            focus: "Series de 2-3 reps consecutivas",
            blocks: [
              { label: "Activación", detail: "Banded pull-apart x15 + ring row x10 + ring dip x8 — 3 min" },
              { label: "RMU sin asistencia", detail: "5 x 2 intentos RMU. Descanso 90 seg entre sets. Alternáis." },
              { label: "Skill work", detail: "Si tienes 2 reps: 4 x 3 RMU con control. Si no: 4 x 3 jumping con bajada excéntrica 5 seg." },
              { label: "Superset final", detail: "3 x (5 ring dip estricto + 5 ring row) — fuerza de apoyo. Alternáis." },
              { label: "📝 Nota", detail: "La fatiga del WOD afecta — enfocad en consistencia, no en cantidad." }
            ]
          }
        },

        // MIÉRCOLES — Endurance Extra
        {
          day: "Miércoles",
          type: "Endurance Extra",
          label: "FRONT SQUAT + ENDURANCE EXTRA",
          trainType: "Endurance Extra",
          rmKey: "fs",
          warmup: [
            "3 min: 2 rondas — 8 goblet squat KB 20kg + 8 front squat barra vacía + 10 band pull-apart",
            "2 min: Movilidad de rack — wrist stretch en barra 45 seg + thoracic opener x8 con foam roller",
            "3 min: Front squat progresivo — 50% x4, 62% x2, 70% x1 — codos arriba y torso vertical"
          ],
          strength: {
            title: "Front Squat",
            sets: [
              { desc: "4 x 3 al 76% 1RM", note: "Codos arriba — si caen, reduce el peso sin dudarlo" },
              { desc: "3 x 2 al 82% 1RM", note: "Torso vertical obligatorio — el FS no perdona la inclinación" },
              { desc: "2 x 1 al 86% 1RM", note: "Explosión máxima desde el fondo — intención en cada rep" }
            ],
            rest: "3 min entre series",
            note: "El front squat carga más el quad y el core. Normal que el peso sea menor que el back squat."
          },
          wod: {
            parts: null,
            type: "EMOM",
            duration: "30 min — 6 rondas",
            format: "EMOM x30 — 5 estaciones rotativas",
            formatNote: "Un movimiento por minuto en rotación. En máquinas, el que espera hace el movimiento de suelo del siguiente minuto.",
            movements: [
              { reps: "14 cal", name: "Row", weight: "BW", equipment: "Remo — alternos" },
              { reps: "12", name: "DB Front Squat", weight: "♂ 2x25kg / ♀ 2x17.5kg", equipment: "Dumbbell" },
              { reps: "12 cal", name: "Assault Bike", weight: "BW", equipment: "Assault Bike — alternos" },
              { reps: "10", name: "TTB", weight: "BW", equipment: "Barra" },
              { reps: "15", name: "KB Swing (americano)", weight: "♂ 32kg / ♀ 24kg", equipment: "Kettlebell" }
            ],
            gymNote: "💡 Gim: El DB Front Squat en el EMOM te obliga a mantener la posición de rack bajo fatiga cardiovascular — exactamente lo que entrena esta sesión."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Handstand Walk (S7)",
            duration: "~18 min · En pareja",
            focus: "Distancia y control avanzado",
            blocks: [
              { label: "Activación", detail: "Pike stretch 45 seg + 5 wall walks + 10 shoulder taps arriba — 3 min" },
              { label: "Distancia objetivo", detail: "3 x intento de 15m sin parar. Registrad el mejor. Alternáis." },
              { label: "Obstáculos", detail: "3 x 10m sorteando 2 discos en el suelo. Foco en ajuste lateral." },
              { label: "Piruleta", detail: "3 x intento de 180° mid-walk. Si no lo tenéis: 3 x 10m con pausa a los 5m." },
              { label: "📝 Nota", detail: "Hoy es la sesión de mayor exigencia de skill. La fatiga del EMOM previo será un factor real." }
            ]
          }
        },

        // VIERNES — CrossFit Largo
        {
          day: "Viernes",
          type: "Halterofilia",
          label: "SQUAT SNATCH",
          trainType: "CrossFit Largo",
          rmKey: "sn",
          warmup: [
            "3 min: OHS con PVC x8 + snatch balance barra vacía x5 + hang squat snatch barra vacía x3",
            "2 min: Movilidad overhead profunda — band shoulder stretch 45 seg/lado + overhead squat hold 45 seg",
            "3 min: Squat snatch progresivo — 50% x3, 60% x2, 68% x1 — recepción baja y estable"
          ],
          strength: {
            title: "Squat Snatch",
            sets: [
              { desc: "4 x 2 al 72% 1RM", note: "Recepción por debajo de paralelo — no atrapar alto" },
              { desc: "3 x 2 al 78% 1RM", note: "Tracción alta y agresiva antes de caer bajo la barra" },
              { desc: "2 x 1 al 83% 1RM", note: "Máxima velocidad bajo la barra — confianza en la recepción" }
            ],
            rest: "2-3 min entre series",
            note: "Progresión natural desde power snatch (S1) y HPS+OHS (S2). El camino ya está hecho."
          },
          wod: {
            parts: null,
            type: "AMRAP",
            duration: "22 min",
            format: "YOU GO I GO",
            formatNote: "Alternáis rondas completas. El descanso es la ronda del compañero.",
            movements: [
              { reps: "3", name: "Squat Snatch", weight: "♂ 55kg / ♀ 37.5kg", equipment: "Barbell" },
              { reps: "6", name: "C2B Pull-ups", weight: "BW", equipment: "Barra" },
              { reps: "9", name: "KB Swing (americano)", weight: "♂ 28kg / ♀ 20kg", equipment: "Kettlebell" },
              { reps: "12 cal", name: "Row", weight: "BW", equipment: "Remo — alternos" }
            ],
            gymNote: "💡 Gim: Squat snatch en WOD con carga moderada. El objetivo es mantener la técnica bajo fatiga, no pesos máximos."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Ring Muscle-Up (S7 bis)",
            duration: "~15 min · En pareja",
            focus: "Fuerza de apoyo en anillas",
            blocks: [
              { label: "Activación", detail: "Ring support hold 3 x 15 seg + ring dip x8 + pull-apart x15 — 3 min" },
              { label: "Progresión enlazada", detail: "3 x (3 ring row explosivo + 3 ring dip). Enlazad el movimiento mentalmente." },
              { label: "Intento RMU", detail: "5 x intento RMU — foco en la transición de muñeca. Alternáis con 60 seg de descanso." },
              { label: "📝 Nota", detail: "Viernes de alta intensidad. No sobrecarguéis hombros — calidad sobre cantidad." }
            ]
          }
        }
      ]
    },

    // ──────────────────────────────────────────────────────────
    // SEMANA 4 — Descarga & Test Final
    // ──────────────────────────────────────────────────────────
    {
      number: 4,
      dates: "",
      focus: "Descarga & Test Final",
      theme: "Reducimos volumen y carga. Miércoles test BS, viernes test C&J.",
      days: [

        // LUNES — CrossFit Largo (descarga)
        {
          day: "Lunes",
          type: "Halterofilia",
          label: "PUSH PRESS + PUSH JERK",
          trainType: "CrossFit Largo",
          rmKey: "sp",
          warmup: [
            "3 min: 2 rondas — 10 band pull-apart + 8 push press barra vacía + 6 push jerk barra vacía",
            "2 min: Movilidad de hombro — arm circles x10/lado + band overhead stretch 40 seg/lado",
            "3 min: Complejo progresivo — 50% x (3 push press + 3 push jerk), 60% x (2+2)"
          ],
          strength: {
            title: "Push Press + Push Jerk (Complejo)",
            sets: [
              { desc: "3 x 4+4 al 60% 1RM SP", note: "4 Push Press + 4 Push Jerk — el dip-drive es idéntico en ambos" },
              { desc: "3 x 3+3 al 65% 1RM SP", note: "Lockout total: codos completamente extendidos antes de bajar" },
              { desc: "2 x 2+2 al 70% 1RM SP", note: "El press es fuerza, el jerk es velocidad — nótad la diferencia" }
            ],
            rest: "2 min entre series",
            note: "Semana de descarga. Pesos reducidos, técnica precisa. Corregid los puntos débiles detectados en S3."
          },
          wod: {
            parts: null,
            type: "AMRAP",
            duration: "15 min",
            format: "EN PAREJA",
            formatNote: "Alternáis rondas completas. Intensidad moderada — no al límite hoy.",
            movements: [
              { reps: "5", name: "Push Jerk", weight: "♂ 50kg / ♀ 35kg", equipment: "Barbell" },
              { reps: "10", name: "Pull-ups", weight: "BW", equipment: "Barra" },
              { reps: "15", name: "Wall Ball", weight: "♂ 9kg / ♀ 6kg", equipment: "Wall Ball" },
              { reps: "10 cal", name: "Row", weight: "BW", equipment: "Remo — alternos" }
            ],
            gymNote: "💡 Gim: WOD de descarga. El objetivo es llegar fresco al test del miércoles — no vaciéis el depósito hoy."
          },
          gymExtra: {
            title: "BLOQUE TÉCNICO — Skill Review (S8)",
            duration: "~15 min · En pareja",
            focus: "Repaso de RMU y HSW del mes",
            blocks: [
              { label: "RMU", detail: "3 x max reps RMU sin asistencia, 2 min descanso entre sets. Si no tienes RMU: 3 x 3 jumping." },
              { label: "HSW", detail: "3 x max distancia HSW. Registrad vuestra mejor marca del mes." },
              { label: "Comparativa", detail: "Comparad S1 vs S4: reps RMU máximas y metros HSW. ¿Dónde habéis mejorado más?" },
              { label: "📝 Nota", detail: "Semana de descarga — consolidar, no forzar. Los PRs técnicos son para julio." }
            ]
          }
        },

        // MIÉRCOLES — Endurance Extra (TEST 1RM Back Squat)
        {
          day: "Miércoles",
          type: "Endurance Extra",
          label: "BACK SQUAT — TEST 1RM",
          trainType: "Endurance Extra",
          rmKey: "bs",
          warmup: [
            "3 min: 2 rondas — 10 goblet squat KB 16kg + 10 hip hinge barra vacía + 10 band pull-apart",
            "2 min: Foam roller cuádriceps y glúteo — 1 min/lado",
            "4 min: Rampa de activación — 50% x5, 60% x3, 70% x2, 80% x1 — llegad al test frescos"
          ],
          strength: {
            title: "Back Squat — Test 1RM",
            sets: [
              { desc: "85% x 1 — activación final", note: "Si se mueve bien, subid. Si hay tensión, puede ser el techo de hoy." },
              { desc: "90% x 1 — primer intento serio", note: "Concentración máxima. Respiración profunda, tensión en el cinturón." },
              { desc: "95-100% x 1 — intento de PR", note: "Solo si los 90% salieron limpios. Actualizad el 1RM en la app." }
            ],
            rest: "4-5 min entre intentos pesados",
            note: "Test 1RM Back Squat de junio. Todo el mes ha construido hacia este momento."
          },
          wod: {
            parts: null,
            type: "AMRAP",
            duration: "20 min",
            format: "YOU GO I GO",
            formatNote: "Intensidad moderada — recuperación activa tras el test de 1RM.",
            movements: [
              { reps: "10", name: "DB Deadlift", weight: "♂ 2x25kg / ♀ 2x17.5kg", equipment: "Dumbbell" },
              { reps: "12 cal", name: "Row", weight: "BW", equipment: "Remo — alternos" },
              { reps: "10", name: "Ring Row", weight: "BW", equipment: "Anillas" },
              { reps: "12 cal", name: "Ski Erg", weight: "BW", equipment: "Ski Erg — alternos" },
              { reps: "12", name: "KB Swing", weight: "♂ 24kg / ♀ 16kg", equipment: "Kettlebell" }
            ],
            gymNote: "💡 Gim: WOD de recuperación activa post-test. Pesos reducidos, ritmo aeróbico mantenido. Sin vaciar el depósito antes del viernes."
          }
        },

        // VIERNES — CrossFit Largo (TEST 1RM C&J + WOD cierre)
        {
          day: "Viernes",
          type: "Halterofilia",
          label: "CLEAN & JERK — TEST 1RM",
          trainType: "CrossFit Largo",
          rmKey: "cj",
          warmup: [
            "3 min: 3 rondas — 5 hang power clean + 3 squat clean + 3 push jerk con barra vacía",
            "2 min: Movilidad completa — wrist stretch 30 seg + band shoulder distraction 30 seg/lado + thoracic rotation x8",
            "4 min: Rampa C&J — 55% x2, 65% x1, 73% x1, 80% x1 — activados pero no cargados"
          ],
          strength: {
            title: "Clean & Jerk — Test 1RM",
            sets: [
              { desc: "83% x 1 — activación final", note: "Debe sentirse manejable. El clean marca el techo del jerk." },
              { desc: "90% x 1 — primer intento serio", note: "Foco en el dip-drive del jerk — no empujéis con brazos antes de la extensión." },
              { desc: "95-100% x 1 — intento de PR", note: "Confiad en el proceso del mes. Actualizad el 1RM en la app." }
            ],
            rest: "4-5 min entre intentos pesados",
            note: "Test 1RM C&J. El mes completo ha trabajado la cadena de halterofilia desde las variaciones hasta aquí."
          },
          wod: {
            parts: null,
            type: "FOR TIME",
            duration: "Sub 10 min",
            format: "WOD CIERRE JUNIO — EN PAREJA",
            formatNote: "Repartid las reps libremente. Este WOD es el sello del mes.",
            movements: [
              { reps: "21", name: "Clean & Jerk", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "21", name: "C2B Pull-ups", weight: "BW", equipment: "Barra" },
              { reps: "15", name: "Clean & Jerk", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "15", name: "C2B Pull-ups", weight: "BW", equipment: "Barra" },
              { reps: "9", name: "Clean & Jerk", weight: "♂ 60kg / ♀ 40kg", equipment: "Barbell" },
              { reps: "9", name: "C2B Pull-ups", weight: "BW", equipment: "Barra" }
            ],
            gymNote: "💡 Gim: 21-15-9 clásico con C&J + C2B. La ronda de 9 es donde se marca la diferencia — llegad con energía para el sprint final."
          },
          gymExtra: {
            title: "CIERRE DE MES — JUNIO 2026 🏆",
            duration: "~10 min · En pareja",
            focus: "Registro de mejoras y reflexión del mes",
            blocks: [
              { label: "PR Board", detail: "Registrad en la app: nuevo 1RM BS, nuevo 1RM C&J, mejor distancia HSW, máximo RMU." },
              { label: "Comparativa", detail: "Mayo vs Junio: ¿cuántos kg habéis ganado en cada movimiento? ¿Cuántos metros más de HSW?" },
              { label: "Reflexión", detail: "¿Qué variación de halterofilia os resultó más difícil? ¿Cuál notasteis más progresión?" },
              { label: "🎉 Felicidades", detail: "12 sesiones. Mes de variaciones + progresión lineal: completado. A por julio." }
            ]
          }
        }
      ]
    }

  ]
};
