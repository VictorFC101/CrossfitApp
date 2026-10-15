import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../ThemeContext';
import {
  getVisibleBlocks, getPrescriptionLoad, formatLoadLabel, descShowsLoad, computeSetKg, loadBarPercent,
  resolveBlockRM, resolveSetRM, suggestedPercentLine, wodHeaderSuffix,
} from '../dayBlocksLogic';
import { RM_KEY_NAMES } from '../wodLogic';

// ── Render unificado de day.blocks ───────────────────────────────────────────
// Props:
//   day            día (con blocks; si no, se normaliza)
//   rms            { rmKey: kg } para calcular kg por serie
//   variant        'full' | 'compact' (feed / historial)
//   accent         color de acento (por defecto t.accent)
//   hideKinds      tipos de bloque a omitir (compact omite 'warmup' por defecto)
//   boxed          compact: cada bloque en tarjeta (por defecto true)
//   fallbackRmKey  RM del día para bloques sin rmKeys (días legacy)
//   rmSummary      full: caja "TU 1RM" en bloques de fuerza/lift
//   onAddRM        full: callback del botón "+ Añadir tu 1RM"
//   adaptacion     { movements: [{name}] } para resaltar movimientos adaptados
//   renderSection  full: ({ block, title, accent, children, key }) => nodo (p. ej. sección colapsable)
//   wodHeaderRight (block) => nodo junto al título del WOD (botón Adaptar)
//   wodFooter      (block) => nodo al final del WOD (botón Iniciar timer)
export default function DayBlocks({
  day, rms = {}, variant = 'full', accent, hideKinds, boxed = true, fallbackRmKey = null,
  rmSummary = false, onAddRM, adaptacion, renderSection, wodHeaderRight, wodFooter,
}) {
  const t = useTheme();
  const ac = accent || t.accent;
  const compact = variant === 'compact';
  const blocks = getVisibleBlocks(day, { hideKinds: hideKinds || (compact ? ['warmup'] : []) });
  const ctx = { t, ac, rms, compact, fallbackRmKey, rmSummary, onAddRM, adaptacion };

  return (
    <>
      {blocks.map((block, i) => {
        const key = block.id || String(i);
        const body = renderBody(block, ctx, { wodFooter });
        const spec = blockTitle(block, compact);
        if (compact) {
          return <CompactShell key={key} t={t} ac={ac} boxed={boxed} title={spec.title} sub={spec.sub}>{body}</CompactShell>;
        }
        const color = block.kind === 'accessory' ? '#4caf50' : block.kind === 'free' ? '#f4a261' : ac;
        if (renderSection) {
          return renderSection({ block, title: spec.title, accent: color, children: body, key });
        }
        return (
          <View key={key} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: color + '30', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ flex: 1, fontSize: t.fs(12), fontWeight: '700', letterSpacing: 2, color }}>{spec.title}</Text>
              {block.kind === 'wod' && wodHeaderRight ? wodHeaderRight(block) : null}
            </View>
            {spec.sub ? <Text style={{ fontSize: t.fs(11), color: t.text3, marginBottom: 8 }}>{spec.sub}</Text> : null}
            {body}
          </View>
        );
      })}
    </>
  );
}

function blockTitle(block, compact) {
  const title = block.title || '';
  switch (block.kind) {
    case 'warmup': return { title: '🔥 CALENTAMIENTO' };
    case 'strength': return { title: compact ? '💪 FUERZA' : `💪 FUERZA${title ? ` — ${title}` : ''}`, sub: compact ? title : '' };
    case 'lift': return { title: compact ? '🏋️ HALTEROFILIA' : `🏋️ ${title.toUpperCase() || 'HALTEROFILIA'}`, sub: compact ? title : '' };
    case 'wod': {
      const suffix = wodHeaderSuffix(block.wod);
      const custom = title && title !== 'WOD' ? title : '';
      return { title: `⚡ WOD${suffix ? (compact ? ` · ${suffix}` : ` — ${suffix}`) : ''}`, sub: custom };
    }
    case 'accessory': return { title: `🤸 ${(title || 'Accesorios').toUpperCase()}` };
    case 'skill': return { title: `🎯 ${(title || 'Técnica').toUpperCase()}` };
    case 'free': return { title: title && title !== 'Contenido libre' ? `🕊️ ${title.toUpperCase()}` : '🕊️ SESIÓN LIBRE' };
    default: return { title: title.toUpperCase() };
  }
}

function CompactShell({ t, ac, boxed, title, sub, children }) {
  const box = boxed
    ? { backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 12, marginBottom: 12 }
    : { marginTop: 10, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10 };
  return (
    <View style={box}>
      <Text style={{ fontSize: t.fs(10), color: ac, letterSpacing: 2, fontWeight: '700', marginBottom: sub ? 4 : 6 }}>{title}</Text>
      {sub ? <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text, marginBottom: 6 }}>{sub}</Text> : null}
      {children}
    </View>
  );
}

function renderBody(block, ctx, slots) {
  switch (block.kind) {
    case 'strength':
    case 'lift': return <LiftBody block={block} ctx={ctx} />;
    case 'wod': return <WodBody block={block} ctx={ctx} footer={slots.wodFooter} />;
    default: return <ListBody block={block} ctx={ctx} />;
  }
}

// ── warmup / free / accessory / skill ───────────────────────────────────────
function ListBody({ block, ctx }) {
  const { t, ac, compact } = ctx;
  const items = block.items || [];
  const isFree = block.kind === 'free';
  const isWarmup = block.kind === 'warmup';
  const color = block.kind === 'accessory' ? '#4caf50' : ac;
  return (
    <View>
      {block.notes ? <Text style={{ fontSize: t.fs(11), color: t.text3, fontStyle: 'italic', marginBottom: 8 }}>🎯 {block.notes}</Text> : null}
      {items.map((txt, i) => {
        if (isFree) {
          return <Text key={i} style={{ fontSize: t.fs(12), color: String(txt).startsWith('⚠️') ? '#f4a261' : t.text2, marginBottom: 8 }}>▸ {txt}</Text>;
        }
        if (compact) {
          return <Text key={i} style={{ fontSize: t.fs(11), color: t.text2, marginBottom: 2 }}>{i + 1}. {txt}</Text>;
        }
        return (
          <View key={i} style={{ flexDirection: 'row', gap: 10, backgroundColor: t.bg4, borderLeftWidth: 3, borderLeftColor: color + '60', borderRadius: 8, padding: 10, marginBottom: 6 }}>
            <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: color + '20', borderWidth: 1, borderColor: color + '40', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Text style={{ fontSize: t.fs(10), color, fontWeight: '700' }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: t.fs(isWarmup ? 13 : 12), color: t.text, lineHeight: t.fs(19) }}>{String(txt)}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── strength / lift ──────────────────────────────────────────────────────────
function LiftBody({ block, ctx }) {
  const { t, ac, rms, compact, fallbackRmKey, rmSummary, onAddRM } = ctx;
  const blockRM = resolveBlockRM(block, rms, fallbackRmKey);
  const sets = block.prescription || [];
  return (
    <View>
      {!compact && rmSummary && blockRM.rmKey && (
        <View style={{ backgroundColor: ac + '10', borderWidth: 1, borderColor: ac + '25', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <Text style={{ fontSize: t.fs(10), color: ac, letterSpacing: 2, fontWeight: '700', marginBottom: 6 }}>
            {blockRM.isComplex && blockRM.limitName ? `TU ${blockRM.limitName} 1RM` : `TU ${(RM_KEY_NAMES[blockRM.rmKey] || block.title || 'MOVIMIENTO').toUpperCase()} 1RM`}
          </Text>
          {blockRM.hasRM ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: t.fs(28), fontWeight: '900', color: ac }}>
                {blockRM.rmVal}<Text style={{ fontSize: t.fs(14), color: t.text2 }}> kg</Text>
              </Text>
              <Text style={{ fontSize: t.fs(11), color: t.text2, flex: 1 }}>{suggestedPercentLine(blockRM.rmVal)}</Text>
            </View>
          ) : onAddRM ? (
            <TouchableOpacity onPress={onAddRM}
              style={{ backgroundColor: ac + '15', borderWidth: 1, borderColor: ac + '30', borderRadius: 8, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(12), color: ac, fontWeight: '700' }}>
                {blockRM.isComplex ? '+ Añadir tus 1RM →' : '+ Añadir tu 1RM →'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {blockRM.isComplex && blockRM.hasRM && (
            <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 6, fontStyle: 'italic' }}>
              Complejo: el % se calcula sobre el RM más bajo de los movimientos ({blockRM.limitName}).
            </Text>
          )}
        </View>
      )}

      {sets.map((s, i) => {
        const load = getPrescriptionLoad(s);
        const kg = computeSetKg(load, resolveSetRM(s, blockRM, rms));
        const bar = loadBarPercent(load);
        const badge = !descShowsLoad(s) ? formatLoadLabel(load) : null;
        const meta = [s.tempo ? `Tempo ${s.tempo}` : null, s.rest ? `Descanso ${s.rest}` : null].filter(Boolean).join(' · ');
        if (compact) {
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 5, alignItems: 'center' }}>
              <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: ac + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: t.fs(9), fontWeight: '700', color: ac }}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: t.fs(12), color: t.text, flex: 1 }}>{s.desc}{badge ? ` · ${badge}` : ''}</Text>
              {s.note ? <Text style={{ fontSize: t.fs(11), color: t.text3 }}>{s.note}</Text> : null}
            </View>
          );
        }
        return (
          <View key={i} style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: ac + '20', borderWidth: 1, borderColor: ac + '40', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: t.fs(10), color: ac, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>{s.desc}{kg ? ` → ${kg}` : ''}</Text>
                  {badge ? (
                    <View style={{ backgroundColor: ac + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: t.fs(9), fontWeight: '700', color: ac }}>{badge}</Text>
                    </View>
                  ) : null}
                </View>
                {meta ? <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 3 }}>{meta}</Text> : null}
                {s.note ? <Text style={{ fontSize: t.fs(11), color: t.text2, marginTop: 3 }}>{s.note}</Text> : null}
                {bar ? (
                  <View style={{ marginTop: 6, height: 3, backgroundColor: t.border, borderRadius: 2 }}>
                    <View style={{ height: 3, width: `${Math.min(bar, 100)}%`, backgroundColor: ac, borderRadius: 2 }} />
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}

      {block.notes ? <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 4 }}>📝 {block.notes}</Text> : null}
      {block.rest ? <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 4 }}>⏱ {block.rest}</Text> : null}
    </View>
  );
}

// ── wod ──────────────────────────────────────────────────────────────────────
function WodBody({ block, ctx, footer }) {
  const { t, ac, compact, adaptacion } = ctx;
  const wod = block.wod || {};
  const isAdapted = m => !!adaptacion?.movements?.find(a => a.name === m.name);
  const real = list => (list || []).filter(m => m.name !== '—');

  const noteBox = (txt, key, mb = 8) => (
    <View key={key} style={{ backgroundColor: t.bg4, borderRadius: 6, padding: 8, marginBottom: mb }}>
      <Text style={{ fontSize: t.fs(11), color: t.text2 }}>{txt}</Text>
    </View>
  );

  const moveFull = (m, i, mb = 6) => {
    const ad = isAdapted(m);
    return (
      <View key={i} style={{ flexDirection: 'row', gap: 10, backgroundColor: ad ? ac + '10' : t.bg4, borderLeftWidth: 3, borderLeftColor: ad ? ac : ac + '60', borderRadius: 8, padding: 10, marginBottom: mb }}>
        <Text style={{ minWidth: 38, fontSize: t.fs(13), fontWeight: '700', color: ac }}>{m.reps}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>{m.name}</Text>
          {m.weight && m.weight !== 'BW' && <Text style={{ fontSize: t.fs(11), color: ad ? ac : t.text2, marginTop: 2 }}>{m.weight}{ad ? ' ✏️' : ''}</Text>}
        </View>
      </View>
    );
  };
  const moveCompact = (m, j) => (
    <View key={j} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
      <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: ac, minWidth: 30 }}>{m.reps}</Text>
      <Text style={{ fontSize: t.fs(12), color: t.text, flex: 1 }}>{m.name}</Text>
      {m.weight && m.weight !== 'BW' && <Text style={{ fontSize: t.fs(11), color: t.text3 }}>· {m.weight}</Text>}
    </View>
  );

  const emom = (wod.emomMinutes || []).map((min, i) => (compact ? (
    <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 5 }}>
      <Text style={{ fontSize: t.fs(10), fontWeight: '700', color: ac, minWidth: 52 }}>{min.min}</Text>
      <Text style={{ fontSize: t.fs(12), color: t.text }}>{min.work}</Text>
    </View>
  ) : (
    <View key={i} style={{ flexDirection: 'row', gap: 10, backgroundColor: t.bg4, borderLeftWidth: 3, borderLeftColor: ac, borderRadius: 8, padding: 10, marginBottom: 6 }}>
      <Text style={{ minWidth: 52, fontSize: t.fs(10), fontWeight: '700', color: ac }}>{min.min}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>{min.work}</Text>
        {min.weight && min.weight !== 'BW' && <Text style={{ fontSize: t.fs(11), color: t.text2, marginTop: 2 }}>{min.weight}</Text>}
      </View>
    </View>
  )));

  return (
    <View>
      {block.notes ? <Text style={{ fontSize: t.fs(11), color: t.text3, marginBottom: 8 }}>📝 {block.notes}</Text> : null}

      {wod.parts?.length > 0 ? wod.parts.map((part, pi) => (
        <View key={pi} style={{ marginBottom: pi < wod.parts.length - 1 ? (compact ? 10 : 14) : 0 }}>
          {compact ? (
            <View style={{ backgroundColor: ac + '20', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 }}>
              <Text style={{ fontSize: t.fs(9), fontWeight: '700', color: ac }}>
                {part.label || `WOD ${pi + 1}`}{part.type ? ` · ${part.type}` : ''}{part.duration ? ` · ${part.duration}` : ''}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: ac + '20', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: t.fs(9), fontWeight: '700', color: ac }}>WOD {pi + 1}{part.type ? ` · ${part.type}` : ''}{part.duration ? ` · ${part.duration}` : ''}</Text>
              </View>
              {part.format ? (
                <View style={{ backgroundColor: t.bg4, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: t.fs(9), color: t.text2 }}>{part.format}</Text>
                </View>
              ) : null}
            </View>
          )}
          {!compact && part.formatNote ? noteBox(part.formatNote, 'fn') : null}
          {real(part.movements).map((m, i) => (compact ? moveCompact(m, i) : moveFull(m, i)))}
          {pi < wod.parts.length - 1 && (compact
            ? <View style={{ height: 1, backgroundColor: t.border, marginTop: 8 }} />
            : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                <Text style={{ fontSize: t.fs(9), color: t.text3, fontWeight: '700', letterSpacing: 2 }}>2 MIN DESCANSO</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
              </View>
            ))}
        </View>
      )) : null}

      {!wod.parts && wod.emomMinutes ? (
        <>
          {!compact && wod.formatNote ? noteBox(wod.formatNote, 'fn') : null}
          {emom}
        </>
      ) : null}

      {!wod.parts && !wod.emomMinutes && wod.movements ? (
        <>
          {!compact && wod.formatNote ? noteBox(`⚡ ${wod.format ? `${wod.format} — ` : ''}${wod.formatNote}`, 'fn') : null}
          {!compact && wod.ladderNote ? noteBox(`📐 ${wod.ladderNote}`, 'ln') : null}
          {real(wod.movements).map((m, i) => (compact ? moveCompact(m, i) : moveFull(m, i, 7)))}
        </>
      ) : null}

      {!compact && wod.gymNote ? (
        <View style={{ backgroundColor: t.dark ? '#080f08' : '#e8f5e9', borderWidth: 1, borderColor: t.dark ? '#1e3e1e' : '#c8e6c9', borderRadius: 6, padding: 10, marginTop: 4 }}>
          <Text style={{ fontSize: t.fs(11), color: '#5a9a5a' }}>💡 {wod.gymNote}</Text>
        </View>
      ) : null}
      {!compact && footer ? footer(block) : null}
    </View>
  );
}
