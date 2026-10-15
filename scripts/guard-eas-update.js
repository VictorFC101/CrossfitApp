#!/usr/bin/env node
// Hook PreToolUse (Bash/PowerShell): bloquea `eas update` directo.
// Toda publicación debe pasar por `npm run eas:publish`, que publica origin/main
// desde un worktree limpio y así no pisa el trabajo de otros chats.

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let command = '';
  try {
    command = JSON.parse(input).tool_input?.command || '';
  } catch {
    process.exit(0);
  }
  // `eas update`, `eas.cmd update`, `npx eas-cli update`... pero no `eas update:list` / `update:view`.
  const direct = /\beas(?:-cli)?(?:\.cmd)?(?:@[\w.-]+)?\s+(?:--?\S+\s+)*update(?![:\w-])/i;
  if (direct.test(command)) {
    console.error(
      'Bloqueado: no lances `eas update` directamente. Usa `npm run eas:publish -- "mensaje"`, ' +
        'que publica origin/main actualizado desde un worktree limpio (ver CLAUDE.md, "Publicación y ramas").'
    );
    process.exit(2);
  }
  process.exit(0);
});
