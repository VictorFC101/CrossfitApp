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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- A SessionStart hook (.claude/settings.json) runs `graphify update .` automatically at the start of every session, so the graph reflects changes made outside the session. If its output shows it failed, run it manually before other work.
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
