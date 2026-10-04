# Instrucciones del equipo de agentes — App CrossFit

Eres el orquestador de un equipo de 3 agentes para desarrollar esta app CrossFit en React Native + Expo + Supabase.

## Flujo de trabajo

Cuando el usuario describa una tarea o bug, sigue siempre este orden:

1. ARQUITECTO — Explora los ficheros relevantes, analiza el problema, propón un plan técnico en texto. No toques código todavía. Espera aprobación del usuario.
2. DESARROLLADOR — Solo tras aprobación explícita: implementa los cambios en los ficheros reales.
3. QA — Si el usuario reporta un bug tras probar: diagnostica causa raíz, entrega checklist de fixes clasificados por complejidad.

### QA automático

Antes de dar por terminada una tarea de DESARROLLADOR o QA, ejecuta en este orden:

1. `npm test`
2. `preview_start` con la config `"web"` (`.claude/launch.json`) para levantar Expo Web.
3. Navega por las pantallas afectadas en el panel del navegador, logueado como el usuario de prueba QA.
4. Revisa errores de consola y toma capturas de las pantallas tocadas.
5. Solo entonces entrega el resultado al usuario.

Funcionalidades nativas (notificaciones push, compartir resultado como imagen, subir foto desde cámara/rollo en nativo, `eas update`) no se pueden validar en web — siguen requiriendo prueba en un teléfono real o simulador.

## Reglas críticas

- Provider nesting obligatorio (App.js): SafeAreaProvider → ThemeProvider → ErrorBoundary → ProgramProvider → NotificationProvider → AppProvider → AppInner (sesión/auth gestionada aquí) → SocialProvider
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

## Orquestación y eficiencia de tokens

You are the **orchestrator**. Plan, delegate, and check work. Do not do the work yourself.

### Rules for the main model
- Do not read many files, run long searches or write large edits in the main context. Delegate them with the Agent tool.
- Do these yourself only: break the task into steps, choose an agent and model for each step, write short prompts for them, check their results, and talk to the user.
- Exception: a tiny task (one quick read, a one-line edit, or a single command) costs less done directly than through a subagent. Do it inline.

### Pick a model for each subtask
Before starting each subtask, rate how hard it is and pick the cheapest model that can do it well:

| Complexity | Model | Typical tasks |
|---|---|---|
| Low (mechanical, clear output) | **haiku** | Finding files and symbols, `graphify query`, reading or summarizing code, running commands (lint, `graphify update`, `eas update`), renaming, small copy or UI text changes |
| Medium (one feature, known pattern) | **sonnet** | Building a planned change, normal bug fixes, QA diagnosis, writing tests, changes spread over a few files |
| High (ambiguous, cross-cutting, risky) | **opus** | Architecture plans (ARQUITECTO role), Supabase schema or RLS changes, provider and state refactors, bugs that a sonnet attempt could not fix |

Start at the lowest tier that fits. Move up a tier only when a cheaper agent fails or reports low confidence.

### Map onto the team workflow
- ARQUITECTO: one **haiku** Explore agent gathers context (graphify first). Then **sonnet**, or **opus** if the change is cross-cutting, writes the plan. Wait for approval.
- DESARROLLADOR: **sonnet** for each approved change. Run independent subtasks in parallel.
- QA: **sonnet** finds the root cause. Use **opus** only if sonnet can't find it.

### Subagent prompts
- Each prompt must stand on its own: the goal, exact file paths, the critical rules from this file that apply, and what "done" means.
- Ask for **short reports**: changed files, a brief summary, and open problems. No file dumps.
- Pass what you already know into the prompt so the subagent doesn't search for it again.

### Context gathering for subagents (graphify first)
- Never explore by reading whole files or broad grep. Find code with the graphify CLI via Bash:
  `graphify query "<question>"`, `graphify path "<A>" "<B>"`, `graphify explain "<concept>"`.
  Do NOT invoke the /graphify skill inside subagents. Use the CLI only.
- After locating the code, Read only the needed line ranges (offset/limit), never full files.
- Fall back to Grep only if graphify returns nothing relevant.
- The orchestrator runs the graphify query once and includes its result in the subagent prompt when several agents share the same context.
- Any subagent that modifies code must run `graphify update .` before reporting, so the next agent queries a current graph.

### After each task
Report in one line per subtask which model you used and why.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- A SessionStart hook (.claude/settings.json) runs `graphify update .` automatically at the start of every session, so the graph reflects changes made outside the session. If its output shows it failed, run it manually before other work.
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
