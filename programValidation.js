// Validación de programas (legacy y schema v2) — lógica pura, sin React.
import { DAY_TYPES, BLOCK_KINDS, SCORE_TYPES, RM_CATEGORIES } from './constants';

const RM_KEYS = new Set(Object.values(RM_CATEGORIES).flatMap(c => c.movements.map(m => m.key)));
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidIsoDate(s) {
  const m = typeof s === 'string' && s.match(ISO_DATE);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

// Devuelve { ok, errors:[{path,msg}], warnings:[{path,msg}] }. Solo los errores bloquean (ok=false).
export function validateProgram(program) {
  const errors = [];
  const warnings = [];
  const err = (path, msg) => errors.push({ path, msg });
  const warn = (path, msg) => warnings.push({ path, msg });

  if (!program || typeof program !== 'object') {
    err('Programa', 'el programa debe ser un objeto JSON');
    return { ok: false, errors, warnings };
  }
  if (!Array.isArray(program.weeks)) {
    err('Programa', 'falta el campo "weeks" (debe ser un array)');
    return { ok: false, errors, warnings };
  }
  if (program.weeks.length === 0) err('Programa', '"weeks" no puede estar vacío');

  const checkRmKeys = (path, keys) => {
    if (!Array.isArray(keys)) { err(path, 'rmKeys debe ser un array'); return; }
    keys.forEach(k => { if (!RM_KEYS.has(k)) err(path, `rmKey desconocida '${k}'`); });
  };

  program.weeks.forEach((w, wi) => {
    const wPath = `Semana ${wi + 1}`;
    if (!w || typeof w !== 'object' || !Array.isArray(w.days)) {
      err(wPath, 'cada semana necesita un array "days"');
      return;
    }
    w.days.forEach((d, di) => {
      const dPath = `${wPath} › ${typeof d?.day === 'string' && d.day ? d.day : `día ${di + 1}`}`;
      if (!d || typeof d !== 'object') { err(dPath, 'el día debe ser un objeto'); return; }
      if (typeof d.day !== 'string' || !d.day.trim()) err(dPath, 'falta "day" (texto, p.ej. "Lunes 12 Oct")');
      if (d.date !== undefined && !isValidIsoDate(d.date)) {
        err(dPath, `fecha no válida '${d.date}' (formato AAAA-MM-DD)`);
      }
      if (d.type !== undefined && !DAY_TYPES.includes(d.type)) {
        warn(dPath, `tipo de día desconocido '${d.type}'`);
      }
      if (d.rmKey != null && !RM_KEYS.has(d.rmKey)) err(dPath, `rmKey desconocida '${d.rmKey}'`);
      if (d.rmKeys != null) checkRmKeys(dPath, d.rmKeys);
      if (d.strength != null) {
        const st = d.strength;
        if (typeof st !== 'object') err(dPath, 'strength debe ser un objeto');
        else {
          if (st.sets !== undefined && !Array.isArray(st.sets)) err(dPath, 'strength.sets debe ser un array');
          if (st.blocks !== undefined && !Array.isArray(st.blocks)) err(dPath, 'strength.blocks debe ser un array');
        }
      }
      if (d.blocks === undefined) return;
      if (!Array.isArray(d.blocks)) { err(dPath, '"blocks" debe ser un array'); return; }
      d.blocks.forEach((b, bi) => {
        const bPath = `${dPath} › bloque ${bi + 1}`;
        if (!b || typeof b !== 'object') { err(bPath, 'el bloque debe ser un objeto'); return; }
        if (!BLOCK_KINDS.includes(b.kind)) {
          err(bPath, `tipo de bloque desconocido '${b.kind}'`);
        }
        if (b.score !== undefined) {
          if (!b.score || typeof b.score !== 'object' || !SCORE_TYPES.includes(b.score.type)) {
            err(bPath, `tipo de marcador desconocido '${b.score?.type}'`);
          }
        }
        if (b.rmKeys !== undefined) checkRmKeys(bPath, b.rmKeys);
        if (b.prescription !== undefined) {
          if (!Array.isArray(b.prescription)) err(bPath, '"prescription" debe ser un array');
          else b.prescription.forEach((p, pi) => {
            const pPath = `${bPath} › serie ${pi + 1}`;
            if (!p || typeof p !== 'object') { err(pPath, 'la prescripción debe ser un objeto'); return; }
            if (p.rmKey != null && !RM_KEYS.has(p.rmKey)) err(pPath, `rmKey desconocida '${p.rmKey}'`);
            if (p.complex !== undefined && !Array.isArray(p.complex)) err(pPath, '"complex" debe ser un array');
          });
        }
        if (b.items !== undefined && !Array.isArray(b.items)) err(bPath, '"items" debe ser un array');
        if (b.kind === 'wod' && (!b.wod || typeof b.wod !== 'object')) err(bPath, 'un bloque wod necesita el campo "wod"');
      });
    });
  });

  return { ok: errors.length === 0, errors, warnings };
}

// Texto para mostrar en una alerta: hasta `max` líneas "path: msg".
export function formatValidationIssues(issues, max = 8) {
  const lines = issues.slice(0, max).map(i => `• ${i.path}: ${i.msg}`);
  if (issues.length > max) lines.push(`… y ${issues.length - max} más`);
  return lines.join('\n');
}
