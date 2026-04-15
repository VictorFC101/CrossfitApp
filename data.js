export const plan = {
  weeks: [
    {
      number: 1,
      dates: "30 Mar – 4 Abr",
      focus: "Activación & Técnica Base",
      theme: "Establecemos patrones de movimiento y punto de partida",
      days: [
        {
          day: "Lunes 30 Mar",
          type: "Halterofilia",
          label: "CLEAN & JERK",
          rmKey: "cj",
          warmup: [
            "2 rondas: 400m remo suave + 10 dislocaciones de hombro + 10 sentadillas goblet (KB 16kg)",
            "Movilidad de cadera y tobillo con banda elástica — 90 seg/lado",
            "Hang power clean con barra vacía x5 + press en split x5"
          ],
          strength: {
            title: "Clean & Jerk",
            sets: [
              { desc: "3 × 3 al 65% 1RM", note: "Foco en posición de recepción y split jerk" },
              { desc: "3 × 2 al 72% 1RM", note: "Velocidad de extensión" },
              { desc: "2 × 1 al 78% 1RM", note: "Confianza en el movimiento completo" }
            ],
            rest: "2-3 min entre series",
            note: "Bajar 5% si falla la recepción."
          },
          wod: {
            type: "AMRAP", duration: "20 min", format: "YOU GO I GO",
            formatNote: "Pareja A completa la ronda entera, luego Pareja B.",
            movements: [
              { reps: "4", name: "Clean & Jerk", weight: "♂ 60kg / ♀ 40kg" },
              { reps: "4", name: "Shoulder to Overhead", weight: "♂ 60kg / ♀ 40kg" },
              { reps: "10", name: "TTB", weight: "BW" },
              { reps: "15", name: "Cal Ski Erg", weight: "alternos" },
            ],
            gymNote: "TTB en fatiga de barra — mantened el kip desde el inicio.",
          },
          gymExtra: {
            title: "Ring Muscle-Up (S1)",
            focus: "Fase de activación: establecer la base del RMU",
            blocks: [
              { label: "Movilidad activa", detail: "Dislocaciones PVC x10 + band pull-apart x15 + shoulder CARs x5/lado — 4 min" },
              { label: "False grip hold", detail: "False grip en anillas 3 × 20 seg. Alternáis." },
              { label: "Pull to chest", detail: "False grip pull to chest 4 × 5 reps. Control total, sin balanceo." },
              { label: "Transición asistida", detail: "Jumping RMU desde cajón 4 × 3 — foco en la transición de muñeca." },
              { label: "Nota", detail: "Si ya tenéis RMU: 4 × 2-3 reps con pausa 1 seg en la transición." }
            ]
          }
        },
        {
          day: "Miércoles 1 Abr",
          type: "Fuerza",
          label: "BACK SQUAT",
          rmKey: "bs",
          warmup: [
            "2 rondas: 10 goblet squat (KB 24kg) + 10 hip hinge con banda",
            "Movilidad de tobillo y cadera — foam roller cuádriceps 2 min",
            "Back squat progresivo: barra vacía x8, 40% x5, 55% x3"
          ],
          strength: {
            title: "Back Squat",
            sets: [
              { desc: "4 × 5 al 70% 1RM", note: "Profundidad completa, control excéntrico 2 seg" },
              { desc: "3 × 3 al 78% 1RM", note: "Explosión en la subida" },
              { desc: "2 × 2 al 83% 1RM", note: "Máxima intención" }
            ],
            rest: "2-3 min entre series",
            note: "Semana 1: establece tus 1RM si no los tienes. Anota las marcas."
          },
          wod: {
            type: "FOR TIME", duration: "Est. 22-25 min", format: "A REPARTIR LIBREMENTE",
            formatNote: "Repartid las reps como queráis. Mínimo 15 de cada movimiento por persona.",
            movements: [
              { reps: "50", name: "DB Lunges", weight: "♂ 2x22.5kg / ♀ 2x15kg" },
              { reps: "40", name: "KB Swings", weight: "♂ 24kg / ♀ 16kg" },
              { reps: "30", name: "C2B Pull-ups", weight: "BW" },
              { reps: "20", name: "DB Snatch", weight: "♂ 22.5kg / ♀ 15kg" },
              { reps: "30", name: "Cal Assault Bike", weight: "alternos" },
              { reps: "20", name: "C2B Pull-ups", weight: "BW" },
              { reps: "20", name: "DB Lunges", weight: "♂ 2x22.5kg / ♀ 2x15kg" },
            ],
            gymNote: "C2B en dos bloques — primero fresco, luego en fatiga profunda.",
          },
          gymExtra: {
            title: "Handstand Walk (S1)",
            focus: "Fase de activación: control de la vertical y patada",
            blocks: [
              { label: "Movilidad activa", detail: "Shoulder taps en plancha x10 + wrist circles + pike stretch 60 seg" },
              { label: "Wall walks", detail: "5 wall walks lentos — alinear caderas sobre hombros." },
              { label: "Kick-up libre", detail: "Kick-up a la vertical 5 × 3 intentos — aguantar 3-5 seg." },
              { label: "HSH + shoulder taps", detail: "Handstand hold pared 3 × 20 seg + 5 shoulder taps lentos." },
              { label: "Nota", detail: "Si ya camináis: 3 × 10m foco en piernas juntas y mirada al suelo." }
            ]
          }
        },
        {
          day: "Viernes 3 Abr",
          type: "Halterofilia",
          label: "SNATCH",
          rmKey: "sn",
          warmup: [
            "PVC pass-through x10 + OHS x10 con PVC",
            "Snatch grip deadlift barra vacía x5 + hang snatch x5",
            "Movilidad de hombro y muñeca — 90 seg por lado"
          ],
          strength: {
            title: "Snatch",
            sets: [
              { desc: "3 × 3 al 60% 1RM", note: "Foco en recepción estable en OHS" },
              { desc: "3 × 2 al 68% 1RM", note: "Velocidad bajo la barra" },
              { desc: "2 × 1 al 75% 1RM", note: "Control total del movimiento" }
            ],
            rest: "2-3 min entre series",
            note: "Si falla la recepción: bajar 5% y rehacer."
          },
          wod: {
            type: "FOR TIME", duration: "Est. 22-25 min", format: "A REPARTIR LIBREMENTE",
            formatNote: "Mínimo 12 reps de cada movimiento por persona.",
            movements: [
              { reps: "40", name: "Power Snatch", weight: "♂ 60kg / ♀ 40kg" },
              { reps: "40", name: "Pull-ups", weight: "BW" },
              { reps: "30", name: "OHS", weight: "♂ 60kg / ♀ 40kg" },
              { reps: "30", name: "TTB", weight: "BW" },
              { reps: "20", name: "Power Snatch", weight: "♂ 60kg / ♀ 40kg" },
              { reps: "40", name: "Cal Remo", weight: "alternos" },
            ],
            gymNote: "Pull-ups + TTB en el mismo WOD — administrad el hombro.",
          },
          gymExtra: {
            title: "Bar Muscle-Up (S1)",
            focus: "Fase de activación: kipping agresivo y pull-over",
            blocks: [
              { label: "Movilidad activa", detail: "Kipping swing x10 + scap pull-up x10 + banded lat stretch 60 seg" },
              { label: "Strict C2B", detail: "4 × 5 Strict C2B — base de fuerza de tirón." },
              { label: "Kipping + hip drive", detail: "Kipping swing agresivo x5 + intento BMU x3." },
              { label: "Negativo BMU", detail: "4 × 3 BMU negativo bajada 4 seg." },
              { label: "Nota", detail: "Si ya tenéis BMU: 5 × 3 touch & go." }
            ]
          }
        },
        {
          day: "Sábado 4 Abr",
          type: "Libre",
          label: "OPEN GYM",
          rmKey: null,
          warmup: [],
          strength: null,
          wod: {
            type: null, duration: null, format: null, formatNote: null, movements: [],
            gymNote: null,
            freeContent: [
              "Movilidad y recuperación activa — foco en caderas y hombros",
              "Cardio aeróbico suave — 30-45 min a baja intensidad",
              "Trabajo libre de debilidades personales",
              "Opcional: repasar técnica al 50-60%"
            ]
          },
          gymExtra: null
        }
      ]
    },
    {
      number: 2,
      dates: "6 – 11 Abr",
      focus: "Construcción de Fuerza",
      theme: "Subimos intensidad y consolidamos el patrón técnico",
      days: [
        {
          day: "Lunes 6 Abr",
          type: "Halterofilia",
          label: "POWER CLEAN + PUSH JERK",
          rmKey: "cj",
          warmup: [
            "500m remo + 10 hang power clean con barra vacía",
            "Activación tríceps y hombros con banda — 2x15",
            "Push press progresivo: barra vacía x5, 40% x5, 55% x3"
          ],
          strength: {
            title: "Power Clean + Push Jerk",
            sets: [
              { desc: "4 × 3 al 70% 1RM", note: "Sin soltar la barra entre Clean y Jerk" },
              { desc: "3 × 2 al 78% 1RM", note: "Agresividad en el dip-drive del jerk" },
              { desc: "2 × 1 al 83% 1RM", note: "Movimiento completo y confiado" }
            ],
            rest: "2-3 min entre series",
            note: "Power Clean + Push Jerk sin soltar la barra."
          },
          wod: {
            type: "AMRAP", duration: "20 min", format: "SYNCHRO",
            formatNote: "Power Clean + Push Jerk en SYNCHRO. BMU, HSPU y Bike a repartir.",
            movements: [
              { reps: "3 SYNC", name: "Power Clean + Push Jerk", weight: "♂ 60kg / ♀ 40kg" },
              { reps: "4", name: "BMU / C2B (x2)", weight: "BW" },
              { reps: "6", name: "HSPU Kipping", weight: "BW" },
              { reps: "12", name: "Cal Assault Bike", weight: "alternos" },
            ],
            gymNote: "BMU + HSPU en la misma ronda — tren superior muy exigido.",
          },
          gymExtra: {
            title: "Ring Muscle-Up (S2)",
            focus: "Semana 2: más tensión en la transición y primeras reps completas",
            blocks: [
              { label: "Movilidad activa", detail: "Shoulder CARs x5/lado + ring row x8 + false grip activation" },
              { label: "Kipping en anillas", detail: "Kipping swing en anillas 3 × 10 — mantener false grip." },
              { label: "Pull + transición", detail: "5 × 3 pull to chest + transición lenta al dip." },
              { label: "RMU completo", detail: "5 × 2-3 RMU completos — pausa 1 seg arriba." },
              { label: "Nota", detail: "Objetivo: transición sin perder el false grip." }
            ]
          }
        },
        {
          day: "Miércoles 8 Abr",
          type: "Fuerza",
          label: "DEADLIFT",
          rmKey: "dl",
          warmup: [
            "2 rondas: 10 Romanian DL barra vacía + 10 hip hinge con banda",
            "Activación glúteos: 2x15 hip thrust barra vacía",
            "Deadlift progresivo: 40% x5, 55% x3, 65% x2"
          ],
          strength: {
            title: "Deadlift",
            sets: [
              { desc: "4 × 4 al 72% 1RM", note: "Control excéntrico 2 seg, espalda neutral" },
              { desc: "3 × 3 al 80% 1RM", note: "Explosión en la subida" },
              { desc: "2 × 2 al 85% 1RM", note: "Máxima tensión y velocidad de barra" }
            ],
            rest: "2-3 min entre series",
            note: "Cinturón opcional al 85%."
          },
          wod: {
            type: "FOR TIME", duration: "Est. 22-25 min", format: "YOU GO I GO",
            formatNote: "Pareja A hace ronda completa, B descansa. 5 rondas cada uno.",
            movements: [
              { reps: "8", name: "DB Thruster", weight: "♂ 2x30kg / ♀ 2x20kg" },
              { reps: "12", name: "KB Swings", weight: "♂ 28kg / ♀ 20kg" },
              { reps: "10", name: "TTB", weight: "BW" },
              { reps: "1", name: "Rope Climb", weight: "BW · 4-5m" },
              { reps: "12", name: "Cal Ski Erg", weight: "alternos" },
            ],
            gymNote: "TTB + Rope Climb en cada ronda — core y grip de cuerda.",
          },
          gymExtra: {
            title: "Rope Climb (S2)",
            focus: "Semana 2: técnica J-hook y eficiencia en la subida",
            blocks: [
              { label: "Movilidad activa", detail: "Ring rows x10 + bicep stretch 60 seg + wrist flexor stretch" },
              { label: "J-hook drill", detail: "3 × 5 repeticiones de la técnica J-hook sin subir." },
              { label: "Subida técnica", detail: "4 × 1 Rope Climb lento — foco en usar los pies." },
              { label: "Subida con pausa", detail: "3 × 1 con pausa 2 seg a mitad de subida." },
              { label: "Nota", detail: "Objetivo: bajar el gasto de brazos al 30%." }
            ]
          }
        },
        {
          day: "Viernes 10 Abr",
          type: "Halterofilia",
          label: "SNATCH + OHS",
          rmKey: "sn",
          warmup: [
            "Foam roller en torácica — 2 min",
            "OHS con PVC: 3x10 buscando profundidad máxima",
            "Snatch pull barra vacía x5 + power snatch x3"
          ],
          strength: {
            title: "Snatch + OHS",
            sets: [
              { desc: "4 × 2 al 72% 1RM", note: "Velocidad y recepción estable" },
              { desc: "3 × 2 al 78% 1RM", note: "Extensión completa antes de tirar" },
              { desc: "2 × 1 al 83% 1RM", note: "Máxima velocidad bajo la barra" }
            ],
            rest: "2-3 min entre series",
            note: "Añadir 1 OHS al final de cada serie."
          },
          wod: {
            type: "FOR TIME", duration: "Est. 22-25 min", format: "A REPARTIR LIBREMENTE",
            formatNote: "Mínimo 12 reps de cada movimiento por persona.",
            movements: [
              { reps: "10", name: "BMU / C2B (x2)", weight: "BW" },
              { reps: "20", name: "Power Snatch", weight: "♂ 60kg / ♀ 40kg" },
              { reps: "30", name: "TTB", weight: "BW" },
              { reps: "20", name: "OHS", weight: "♂ 60kg / ♀ 40kg" },
              { reps: "10", name: "BMU / C2B (x2)", weight: "BW" },
              { reps: "30", name: "TTB", weight: "BW" },
              { reps: "50", name: "Cal Remo", weight: "alternos" },
            ],
            gymNote: "BMU + TTB en dos bloques — los 50 cal de remo son el cierre.",
          },
          gymExtra: {
            title: "Handstand Walk (S2)",
            focus: "Semana 2: primeros pasos reales y control de la línea",
            blocks: [
              { label: "Movilidad activa", detail: "Wrist warm-up + downdog a pike x10 + shoulder taps x10" },
              { label: "Wall walks + hold", detail: "4 wall walks + HSH 15 seg en la posición más alta." },
              { label: "Kick-up + paso", detail: "5 × 3 kick-up + dar 1-3 pasos." },
              { label: "HSW con compañero", detail: "3 × 5m — el compañero sujeta tobillos si es necesario." },
              { label: "Nota", detail: "Clave: mirada al suelo entre las manos, no hacia adelante." }
            ]
          }
        },
        {
          day: "Sábado 11 Abr",
          type: "Libre",
          label: "OPEN GYM",
          rmKey: null,
          warmup: [],
          strength: null,
          wod: {
            type: null, duration: null, format: null, formatNote: null, movements: [],
            gymNote: null,
            freeContent: [
              "Movilidad focalizada en caderas y hombros — 20 min",
              "Práctica libre de gimnásticos de la semana",
              "Cardio aeróbico a elección — 30 min",
              "Core: L-sit, hollow hold, arch hold — 3x30 seg"
            ]
          },
          gymExtra: null
        }
      ]
    },
    {
      number: 3,
      dates: "13 – 18 Abr",
      focus: "Intensidad Máxima",
      theme: "Semana de mayor carga — empujamos los porcentajes al límite",
      days: [
        {
          day: "Lunes 13 Abr",
          type: "Halterofilia",
          label: "CLEAN & JERK PESADO",
          rmKey: "cj",
          warmup: [
            "500m remo + movilidad de cadera con banda — 90 seg/lado",
            "Hang power clean progresivo hasta 60% — 3x3",
            "Split jerk barra vacía: 3x3 técnicos"
          ],
          strength: {
            title: "Clean & Jerk",
            sets: [
              { desc: "3 × 2 al 80% 1RM", note: "Ritmo alto y explosivo" },
              { desc: "2 × 2 al 85% 1RM", note: "Máxima intención en cada rep" },
              { desc: "2 × 1 al 88-90% 1RM", note: "Intentos de mejor marca de sesión" }
            ],
            rest: "3 min entre series pesadas",
            note: "Si falla el split jerk: push jerk como opción."
          },
          wod: {
            type: "AMRAP", duration: "20 min", format: "YOU GO I GO",
            formatNote: "Pareja A completa ronda entera, B descansa.",
            movements: [
              { reps: "5", name: "Clean & Jerk", weight: "♂ 60kg / ♀ 40kg" },
              { reps: "7", name: "HSPU Kipping", weight: "BW" },
              { reps: "9", name: "TTB", weight: "BW" },
              { reps: "14", name: "Cal Assault Bike", weight: "alternos" },
            ],
            gymNote: "HSPU + TTB en semana de intensidad máxima — gestionad la respiración.",
          },
          gymExtra: {
            title: "Ring Muscle-Up (S3)",
            focus: "Semana 3: encadenar reps y aguantar técnica con fatiga",
            blocks: [
              { label: "Movilidad activa", detail: "Band pull-apart x15 + ring row x10 + shoulder activation" },
              { label: "RMU en fresco", detail: "3 × 3 RMU con false grip — pausa 1 seg arriba." },
              { label: "Touch & go", detail: "4 × 2 RMU touch & go — no perder tensión entre reps." },
              { label: "Mini chipper", detail: "3 rondas: 2 RMU + 5 ring dips estrictos." },
              { label: "Nota", detail: "El segundo RMU debe ser igual de limpio que el primero." }
            ]
          }
        },
        {
          day: "Miércoles 15 Abr",
          type: "Fuerza",
          label: "FRONT SQUAT + PUSH PRESS",
          rmKey: "fs",
          warmup: [
            "2 rondas: 10 goblet squat (KB 24kg) + 10 strict press barra vacía",
            "Front squat progresivo: barra vacía x8, 40% x5, 55% x3",
            "Movilidad de muñeca y codo — 2 min"
          ],
          strength: {
            title: "Front Squat + Push Press",
            sets: [
              { desc: "Front Squat: 4 × 4 al 73% 1RM", note: "Codos altos, core apretado, profundidad completa" },
              { desc: "Front Squat: 3 × 2 al 82% 1RM", note: "Explosión máxima en la subida" },
              { desc: "Push Press: 4 × 5 al 70% 1RM", note: "Dip-drive agresivo, lockout completo" }
            ],
            rest: "2 min FS / 90 seg PP",
            note: "Superset opcional si los pesos coinciden."
          },
          wod: {
            type: "FOR TIME", duration: "Est. 22-25 min", format: "A REPARTIR LIBREMENTE",
            formatNote: "Mínimo 12 de cada movimiento por persona.",
            movements: [
              { reps: "30", name: "DB Snatch", weight: "♂ 27.5kg / ♀ 17.5kg · HEAVY" },
              { reps: "20", name: "C2B Pull-ups", weight: "BW" },
              { reps: "30", name: "KB Swings americano", weight: "♂ 28kg / ♀ 20kg" },
              { reps: "6", name: "Rope Climbs", weight: "BW · alternos" },
              { reps: "30", name: "DB Snatch", weight: "♂ 27.5kg / ♀ 17.5kg · HEAVY" },
              { reps: "40", name: "Cal Remo", weight: "alternos" },
            ],
            gymNote: "C2B + Rope Climb en fatiga de DB y KB pesado.",
          },
          gymExtra: {
            title: "Handstand Walk (S3)",
            focus: "Semana 3: distancia real y control de giro",
            blocks: [
              { label: "Movilidad activa", detail: "Wrist warm-up + pike stretch + shoulder taps x10" },
              { label: "HSW libre", detail: "5 × 10m — mantener línea y no abrir caderas." },
              { label: "Giro 90°", detail: "3 × 2 giros de 90° — uno hacia cada lado." },
              { label: "HSW con obstáculo", detail: "2 × recorrido con bumper en el suelo." },
              { label: "Nota", detail: "Objetivo: 10m sin tocar el suelo. Si lo conseguís, id a 15m." }
            ]
          }
        },
        {
          day: "Viernes 17 Abr",
          type: "Halterofilia",
          label: "SNATCH PESADO",
          rmKey: "sn",
          warmup: [
            "OHS con PVC 2x10 + snatch balance barra vacía x5",
            "Progresión hasta 65% en hang snatch — 3x2",
            "Activación glúteos y core: 2x10 hip thrust + 2x10 pallof press"
          ],
          strength: {
            title: "Snatch",
            sets: [
              { desc: "3 × 2 al 80% 1RM", note: "Explosión total en la segunda tracción" },
              { desc: "2 × 2 al 85% 1RM", note: "Máxima velocidad bajo la barra" },
              { desc: "2 × 1 al 88-90% 1RM", note: "Intentos de mejor marca del mes" }
            ],
            rest: "3 min entre series pesadas",
            note: "Si falla técnica al 88%: repetir al 85%."
          },
          wod: {
            type: "AMRAP", duration: "20 min", format: "SYNCHRO",
            formatNote: "Power Snatch en SYNCHRO. DU cada uno los suyos. RC y Ski alternos.",
            movements: [
              { reps: "4 SYNC", name: "Power Snatch", weight: "♂ 60kg / ♀ 40kg" },
              { reps: "50", name: "Double Unders", weight: "BW · cada uno" },
              { reps: "2", name: "Rope Climbs", weight: "BW · alternos" },
              { reps: "14", name: "Cal Ski Erg", weight: "alternos" },
            ],
            gymNote: "DU + Rope Climb en semana punta — coordinación y grip en fatiga.",
          },
          gymExtra: {
            title: "Rope Climb (S3)",
            focus: "Semana 3: velocidad y legless intro",
            blocks: [
              { label: "Movilidad activa", detail: "Ring row x10 + dead hang 30 seg + wrist flexor stretch" },
              { label: "Subida rápida", detail: "3 × 1 a máxima velocidad con J-hook." },
              { label: "Legless intro", detail: "3 × 1 Legless hasta donde podáis — sin presión." },
              { label: "Descenso controlado", detail: "3 × 1 subida + descenso lento 5 seg." },
              { label: "Nota", detail: "El legless es el objetivo del siguiente bloque." }
            ]
          }
        },
        {
          day: "Sábado 18 Abr",
          type: "Libre",
          label: "OPEN GYM",
          rmKey: null,
          warmup: [],
          strength: null,
          wod: {
            type: null, duration: null, format: null, formatNote: null, movements: [],
            gymNote: null,
            freeContent: [
              "⚠️ Semana de carga alta — prioridad absoluta a la recuperación",
              "Movilidad profunda: caderas, hombros y muñecas — 25 min",
              "Cardio suave: 20-30 min remo o bici al 60% FC máx",
              "Opcional: técnica ligera al 50-60% sin fatiga"
            ]
          },
          gymExtra: null
        }
      ]
    },
    {
      number: 4,
      dates: "20 – 25 Abr",
      focus: "Descarga & Test Final",
      theme: "Bajamos volumen, testeamos marcas y cerramos el bloque",
      days: [
        {
          day: "Lunes 20 Abr",
          type: "Halterofilia",
          label: "C&J — TEST",
          rmKey: "cj",
          warmup: [
            "Activación dinámica full body — 5 min",
            "Progresión técnica ligera hasta 65% — 3x2",
            "2 × 1 al 75% para activar el sistema nervioso"
          ],
          strength: {
            title: "TEST — Clean & Jerk",
            sets: [
              { desc: "1 × 1 al 80%", note: "Calentamiento — ¿cómo se siente?" },
              { desc: "1 × 1 al 87%", note: "Aproximación al máximo" },
              { desc: "1 × 1 al 93-95%", note: "Intento de PR o mejor marca del mes" },
              { desc: "Opcional: 1 × 1 al 100%+", note: "Solo si la serie anterior fue limpia" }
            ],
            rest: "4-5 min entre intentos",
            note: "¡Día de marcas! Anotad el resultado para el siguiente bloque."
          },
          wod: {
            type: "FOR TIME", duration: "Est. 16-20 min", format: "YOU GO I GO",
            formatNote: "3 rondas cada uno. Sin descanso extra entre cambios.",
            movements: [
              { reps: "5", name: "Clean & Jerk", weight: "♂ 60kg / ♀ 40kg" },
              { reps: "7", name: "HSPU Estricto", weight: "BW" },
              { reps: "9", name: "C2B Pull-ups", weight: "BW" },
              { reps: "14", name: "Cal Ski Erg", weight: "alternos" },
            ],
            gymNote: "WOD de post-test. HSPU estricto + C2B — calidad sobre velocidad.",
          },
          gymExtra: {
            title: "Ring Muscle-Up (S4 · Test)",
            focus: "Semana de test: máximo de reps y calidad de cierre",
            blocks: [
              { label: "Activación suave", detail: "Ring row x8 + false grip hold 20 seg + shoulder rotation" },
              { label: "Test 1: Max reps", detail: "1 intento de máximo de RMU sin soltar anillas." },
              { label: "Descanso", detail: "5 min activo — caminar, respirar, estirar hombros." },
              { label: "Test 2: Calidad", detail: "3 × 3 RMU pausa 1 seg arriba — calidad máxima." },
              { label: "Nota", detail: "¿La transición es más limpia que en S1? Eso es el progreso." }
            ]
          }
        },
        {
          day: "Miércoles 22 Abr",
          type: "Fuerza",
          label: "STRICT PRESS + PULL-UP",
          rmKey: "sp",
          warmup: [
            "2 rondas: 10 band pull-apart + 10 face pull + 10 scap push-up",
            "Strict press progresivo: barra vacía x8, 40% x5, 55% x3",
            "Activación manguito: 2x15 rotación externa con banda"
          ],
          strength: {
            title: "Strict Press + Weighted Pull-up",
            sets: [
              { desc: "Strict Press: 5 × 5 al 75% 1RM", note: "Sin impulso de piernas, core apretado" },
              { desc: "Weighted Pull-up: 4 × 4", note: "♂ +10-15kg / ♀ +5kg — control excéntrico" },
              { desc: "Strict Press: 2 × 3 al 82% 1RM", note: "Máxima intención en el lockout" }
            ],
            rest: "2 min entre supersets",
            note: "Press + Pull-up en superset."
          },
          wod: {
            type: "AMRAP", duration: "18 min", format: "A REPARTIR LIBREMENTE",
            formatNote: "Strict Pull-ups SYNCHRO al inicio de cada ronda.",
            movements: [
              { reps: "5 SYNC", name: "Strict Pull-ups", weight: "BW" },
              { reps: "50", name: "Double Unders", weight: "BW · cada uno" },
              { reps: "10", name: "DB Thruster", weight: "♂ 2x22.5kg / ♀ 2x15kg" },
              { reps: "12", name: "DB Lunges", weight: "♂ 2x22.5kg / ♀ 2x15kg" },
              { reps: "14", name: "Cal Assault Bike", weight: "alternos" },
            ],
            gymNote: "DU + Strict Pull-ups — descarga de agarre con DB.",
          },
          gymExtra: {
            title: "Handstand Walk (S4 · Test)",
            focus: "Semana de test: distancia máxima y control total",
            blocks: [
              { label: "Activación suave", detail: "Wall walks x3 + shoulder taps x10 + wrist warm-up" },
              { label: "Test 1: Distancia", detail: "1 intento de HSW máxima distancia. Anotad los metros." },
              { label: "Descanso", detail: "5 min — movilidad de muñecas y hombros." },
              { label: "Test 2: Consistencia", detail: "3 × 10m — completar los 3 intentos sin fallo." },
              { label: "Nota", detail: "¿Más metros que en S1? ¿La línea es más recta? Eso es progreso." }
            ]
          }
        },
        {
          day: "Viernes 24 Abr",
          type: "Halterofilia",
          label: "SNATCH — TEST",
          rmKey: "sn",
          warmup: [
            "Snatch balance progresivo hasta 60% — 3x3",
            "OHS: 3x3 al 70% para activar estabilidad",
            "Hang snatch x2 al 72% — activar velocidad"
          ],
          strength: {
            title: "TEST — Snatch",
            sets: [
              { desc: "1 × 1 al 80%", note: "Confianza — siente la barra" },
              { desc: "1 × 1 al 87%", note: "Aproximación al máximo" },
              { desc: "1 × 1 al 93-95%", note: "Intento de PR o mejor marca del mes" },
              { desc: "Opcional: 1 × 1 al 100%+", note: "Solo si el anterior fue limpio" }
            ],
            rest: "4-5 min entre intentos",
            note: "Si no está el día: quedarse en 90%. Sin frustración."
          },
          wod: {
            type: "FOR TIME", duration: "Sin cap — disfrutadlo", format: "A REPARTIR LIBREMENTE",
            formatNote: "Mínimo 10 reps de cada movimiento por persona.",
            movements: [
              { reps: "30", name: "Snatch", weight: "♂ 60kg / ♀ 40kg" },
              { reps: "20", name: "BMU / C2B (x2)", weight: "BW" },
              { reps: "20", name: "TTB", weight: "BW" },
              { reps: "10", name: "Rope Climbs", weight: "BW · 4-5m" },
              { reps: "50", name: "Cal Remo", weight: "alternos" },
              { reps: "30", name: "HSPU Kipping", weight: "BW" },
            ],
            gymNote: "🏆 WOD de cierre del mes — todos los gimnásticos del bloque. ¡Disfrutadlo!",
          },
          gymExtra: {
            title: "Cierre del Bloque (S4)",
            focus: "Test final: un rep de cada movimiento trabajado este mes",
            blocks: [
              { label: "Activación suave", detail: "Dead hang 30 seg + shoulder rotation + wrist circles" },
              { label: "RMU", detail: "3 × 2 RMU con false grip — pausa 1 seg arriba." },
              { label: "HSW", detail: "3 × 10m — lo más limpio del mes." },
              { label: "Rope Climb", detail: "2 × 1 técnico + 1 intento legless." },
              { label: "Nota", detail: "No es competición — es celebración de lo que habéis construido. 💪" }
            ]
          }
        }
      ]
    }
  ]
};

export const typeColors = {
  Halterofilia: { bg: '#1a0808', accent: '#e63946' },
  Fuerza: { bg: '#080f1a', accent: '#4895ef' },
  Libre: { bg: '#0f0f0a', accent: '#f4a261' },
};