#!/usr/bin/env node
// Publicación segura de EAS Update al canal "default" (el que carga Expo Go).
//
// Uso:  npm run eas:publish -- "mensaje del update"   (añade --dry-run para probar sin publicar)
//
// Garantías:
//  - Solo publica origin/main recién descargado: incluye el trabajo de todos los chats.
//  - Se niega si la rama actual tiene commits que aún no están en origin/main.
//  - Empaqueta desde un worktree limpio (nunca cambios sin commitear de nadie).
//  - Comprueba dependencias y pasa los tests antes de publicar.
//  - Un lock evita dos publicaciones simultáneas desde chats distintos.

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const isWin = process.platform === 'win32';

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

function fail(msg) {
  console.error(`\n✖ Publicación cancelada: ${msg}\n`);
  process.exit(1);
}

// Sin metacaracteres de shell: el mensaje acaba en una línea de comandos.
const dryRun = process.argv.includes('--dry-run');
const message = process.argv.slice(2).filter((a) => a !== '--dry-run').join(' ').replace(/["'`$&|<>^%!;]/g, '').trim();
if (!message) fail('falta el mensaje. Uso: npm run eas:publish -- "mensaje"');

// Raíz del repo principal (también cuando se ejecuta desde un worktree).
const gitCommonDir = path.resolve(sh('git rev-parse --git-common-dir'));
const mainRoot = path.dirname(gitCommonDir);

// 1. Traer lo último de origin.
console.log('→ git fetch origin');
sh('git fetch origin main');
const sha = sh('git rev-parse origin/main');
const shortSha = sha.slice(0, 7);

// 2. La rama actual no puede tener trabajo sin integrar.
const pending = sh('git rev-list origin/main..HEAD');
if (pending) {
  fail(
    `la rama actual tiene ${pending.split('\n').length} commit(s) que no están en origin/main.\n` +
      '  Integra primero: git fetch origin && git rebase origin/main && git push origin HEAD:main'
  );
}
if (sh('git status --porcelain --untracked-files=no')) {
  console.warn('⚠ Hay cambios sin commitear en esta carpeta: NO se publicarán (se publica origin/main).');
}

// 3. Lock entre chats.
const lockDir = path.join(gitCommonDir, 'eas-publish.lock');
try {
  fs.mkdirSync(lockDir);
} catch {
  fail(`otra publicación está en curso (lock: ${lockDir}). Si no es así, borra esa carpeta.`);
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `eas-publish-${shortSha}-`));
const nodeModulesLink = path.join(workDir, 'node_modules');

function cleanup() {
  // Quitar el junction ANTES de borrar el worktree para no tocar el node_modules real.
  try {
    if (fs.existsSync(nodeModulesLink)) {
      if (isWin) spawnSync('cmd', ['/c', 'rmdir', nodeModulesLink]);
      else fs.unlinkSync(nodeModulesLink);
    }
  } catch {}
  try {
    sh(`git -C "${mainRoot}" worktree remove --force "${workDir}"`);
  } catch {}
  try {
    fs.rmSync(lockDir, { recursive: true, force: true });
  } catch {}
}
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));

// 4. Worktree limpio en origin/main + node_modules compartido.
console.log(`→ worktree limpio en origin/main (${shortSha})`);
fs.rmdirSync(workDir); // git worktree add necesita que no exista
sh(`git -C "${mainRoot}" worktree add --detach "${workDir}" ${sha}`);
const realNodeModules = path.join(mainRoot, 'node_modules');
if (!fs.existsSync(realNodeModules)) fail(`no existe ${realNodeModules}. Ejecuta npm install en la carpeta principal.`);
fs.symlinkSync(realNodeModules, nodeModulesLink, isWin ? 'junction' : 'dir');

// 5. Dependencias declaradas en origin/main instaladas en node_modules.
const pkg = JSON.parse(fs.readFileSync(path.join(workDir, 'package.json'), 'utf8'));
const missing = Object.keys(pkg.dependencies || {}).filter(
  (dep) => !fs.existsSync(path.join(realNodeModules, dep, 'package.json'))
);
if (missing.length) fail(`faltan dependencias en node_modules: ${missing.join(', ')}. Ejecuta npm install en ${mainRoot}.`);

// 6. Tests.
console.log('→ npm test');
const test = spawnSync('npx', ['jest', '--silent'], { cwd: workDir, stdio: 'inherit', shell: true });
if (test.status !== 0) fail('los tests fallan en origin/main.');

// 7. Publicar.
const fullMessage = `main@${shortSha}: ${message}`;
if (dryRun) {
  console.log(`\n✔ Dry run OK: se publicaría "${fullMessage}" (no se ha publicado nada).\n`);
  process.exit(0);
}
console.log(`→ eas update --channel default  "${fullMessage}"`);
const eas = spawnSync(
  'eas',
  ['update', '--channel', 'default', '--environment', 'preview', '--non-interactive', '--message', JSON.stringify(fullMessage)],
  { cwd: workDir, stdio: 'inherit', shell: true }
);
if (eas.status !== 0) fail('eas update ha fallado.');
console.log(`\n✔ Publicado origin/main (${shortSha}) en el canal default.\n`);
