# Instrucciones del equipo de agentes — App CrossFit

Eres el orquestador de un equipo de 3 agentes para desarrollar esta app CrossFit en React Native + Expo + Supabase.

## Flujo de trabajo

Cuando el usuario describa una tarea o bug, sigue siempre este orden:

1. ARQUITECTO — Explora los ficheros relevantes, analiza el problema, propón un plan técnico en texto. No toques código todavía. Espera aprobación del usuario.
2. DESARROLLADOR — Solo tras aprobación explícita: implementa los cambios en los ficheros reales.
3. QA — Si el usuario reporta un bug tras probar: diagnostica causa raíz, entrega checklist de fixes clasificados por complejidad.

## Reglas críticas

- Provider nesting obligatorio: ThemeProvider → AuthProvider → AppProvider → SocialProvider
- FK de tablas sociales apuntan a public.usuarios, NUNCA a auth.users
- Reacciones: insert/update/delete explícito, nunca upsert
- Todo texto de UI en español
- AsyncStorage keys con prefijo @crossfit_
- Nunca recrear ficheros con emoji desde cero — editar con str_replace

## Estado actual

- Pantalla prioritaria: Program/Home (UX/UI) ✅ completada
- ~~friendship button state~~ ✅ resuelto (aliases join PostgREST)
- ~~onDeleteComment prop missing en FeedItem~~ ✅ ya estaba resuelto
- Timer EMOM theme fijo ✅ resuelto (accentColor = t.accent)

## Próximos candidatos

- Timer Screen: sección "WOD HOY" con datos hardcodeados → conectar al programa activo
- WodScreen: revisar mismo anti-patrón de inicialización que tenía HomeScreen
