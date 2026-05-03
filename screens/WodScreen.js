import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useApp } from '../AppContext';
import { useTheme } from '../ThemeContext';
import { useProgram } from '../ProgramContext';
import { getTodayDay, isTodayInProgram, formatDateShort, getToday } from '../dateUtils';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const TYPE_COLORS = {
  'endurance extra': '#f77f00',
  'endurance pesado': '#e9c46a',
  'endurance': '#f4a261',
  'crossfit general': '#e63946',
  'crossfit largo': '#9b5de5',
  'halterofilia': '#3a86ff',
  'fuerza': '#06d6a0',
  'powerlifting': '#ef476f',
};
function typeColor(type, fallback) {
  if (!type) return fallback;
  const key = type.toLowerCase();
  for (const [k, v] of Object.entries(TYPE_COLORS)) {
    if (key.includes(k)) return v;
  }
  return fallback;
}

// ── Tarjeta de resultados para compartir ──────────────────────
function ShareCard({ day, resultado, notas, rx, acento }) {
  const now = new Date();
  const dateStr = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  // Parsear resultado — solo aceptar formatos estrictos
  const segs = (resultado || '').split(' · ');
  const timePart   = segs.find(s => /^\d{1,2}:\d{2}$/.test(s.trim())) || '';
  const roundsSeg  = segs.find(s => /^\d+\+\d+$/.test(s.trim())) || '';
  const [ron, rep] = roundsSeg ? roundsSeg.split('+') : ['', ''];
  const hasBoth    = !!(timePart && roundsSeg);
  const hasNone    = !timePart && !roundsSeg;

  // Movimientos: soporta movements, parts y emomMinutes
  const movements = (() => {
    if (day?.wod?.movements) return day.wod.movements.filter(m => m.name !== '—').slice(0, 5);
    if (day?.wod?.parts) {
      const all = day.wod.parts.flatMap(p => p.movements?.filter(m => m.name !== '—') || []);
      return all.slice(0, 5);
    }
    if (day?.wod?.emomMinutes) return day.wod.emomMinutes.slice(0, 5).map(m => ({ reps: m.min, name: m.work }));
    return [];
  })();

  return (
    <View style={{ width: 320, backgroundColor: '#0a0a12', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: acento + '40' }}>

      {/* Cabecera */}
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 18 }}>⚡</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 3 }}>WODLY</Text>
        </View>
        <Text style={{ fontSize: 11, color: '#ffffff45' }}>{dateStr}</Text>
      </View>

      {/* Línea acento */}
      <View style={{ height: 2, backgroundColor: acento + '70', marginHorizontal: 20, borderRadius: 1 }} />

      {/* Día + tipo */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1, marginBottom: 3 }}>
          {(day?.label || day?.day || '').toUpperCase()}
        </Text>
        {(day?.wod?.type || day?.type) && (
          <Text style={{ fontSize: 10, color: '#ffffff50', letterSpacing: 1 }}>
            {[day?.wod?.type, day?.wod?.duration, day?.type?.toUpperCase()].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>

      {/* Movimientos */}
      {movements.length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 14, gap: 5 }}>
          {movements.map((m, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff08', borderLeftWidth: 2, borderLeftColor: acento, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: acento, minWidth: 32 }}>{m.reps}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }} numberOfLines={1}>{m.name}</Text>
                {m.weight && m.weight !== 'BW' && (
                  <Text style={{ fontSize: 10, color: '#ffffff55', fontWeight: '600', marginTop: 2 }}>{m.weight}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Separador */}
      <View style={{ height: 1, backgroundColor: '#ffffff12', marginHorizontal: 20, marginBottom: 16 }} />

      {/* Bloques resultado — siempre ambos, apilados */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 14, gap: 8 }}>

        {/* TIEMPO */}
        <View style={{ backgroundColor: acento + '12', borderWidth: 1, borderColor: acento + '30', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 34, fontWeight: '900', color: timePart ? '#fff' : '#ffffff20', letterSpacing: 1 }} numberOfLines={1} adjustsFontSizeToFit>
            {timePart || '—'}
          </Text>
          <Text style={{ fontSize: 9, color: acento, letterSpacing: 2, fontWeight: '700', marginTop: 6 }}>TIEMPO</Text>
        </View>

        {/* RONDAS + REPS */}
        <View style={{ backgroundColor: acento + '12', borderWidth: 1, borderColor: acento + '30', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
          {roundsSeg ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontSize: 34, fontWeight: '900', color: '#fff' }} numberOfLines={1}>{ron}</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#ffffff55', paddingBottom: 4 }} numberOfLines={1}>+{rep}</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 34, fontWeight: '900', color: '#ffffff20' }}>—</Text>
          )}
          <Text style={{ fontSize: 9, color: acento, letterSpacing: 2, fontWeight: '700', marginTop: 6 }}>RONDAS + REPS</Text>
        </View>

        {/* Rx / Scaled */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: rx ? '#52b78815' : '#f4a26115', borderWidth: 1, borderColor: rx ? '#52b78855' : '#f4a26155', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: rx ? '#52b788' : '#f4a261', letterSpacing: 1 }}>{rx ? '✓ Rx' : '⚡ Scaled'}</Text>
          </View>
        </View>
      </View>

      {/* Notas */}
      {!!notas && (
        <>
          <View style={{ height: 1, backgroundColor: '#ffffff10', marginHorizontal: 20 }} />
          <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ fontSize: 11, color: '#ffffff55', fontStyle: 'italic', lineHeight: 17 }} numberOfLines={2}>"{notas}"</Text>
          </View>
        </>
      )}

      {/* Footer */}
      <View style={{ height: 1, backgroundColor: '#ffffff08', marginHorizontal: 20 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: '#ffffff08', marginLeft: 20 }} />
        <Text style={{ fontSize: 9, color: '#ffffff25', letterSpacing: 4, fontWeight: '700', marginHorizontal: 10 }}>WODLY.APP</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: '#ffffff08', marginRight: 20 }} />
      </View>
    </View>
  );
}

// ── Tira de progresión — últimos 4 resultados ─────────────────
const MONTHS_S = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function fmtDateShort(iso) {
  try { const d = new Date(iso); return `${d.getDate()} ${MONTHS_S[d.getMonth()]}`; } catch { return ''; }
}
function ProgressStrip({ resultados, currentDayKey, t }) {
  const entries = Object.entries(resultados)
    .filter(([k, v]) => k !== currentDayKey && v?.resultado)
    .map(([k, v]) => {
      const segs = (v.resultado || '').split(' · ');
      const roundsPart = segs.find(s => /^\d+\+\d+$/.test(s.trim())) || '';
      const timePart   = segs.find(s => /^\d{1,2}:\d{2}$/.test(s.trim())) || '';
      const [ron, rep] = roundsPart ? roundsPart.split('+') : ['', ''];
      const [min, sec] = timePart   ? timePart.split(':')   : ['', ''];
      return {
        key: k,
        resultado: v.resultado,
        fecha: v.fecha,
        rx: v.rx !== false,
        roundsPart, timePart,
        rondasN: roundsPart ? parseInt(ron) * 1000 + parseInt(rep || 0) : null,
        timeN:   timePart   ? parseInt(min) * 60  + parseInt(sec || 0) : null,
      };
    })
    .filter(e => e.fecha)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 4)
    .reverse();

  if (entries.length === 0) return null;

  const hasRounds = entries.some(e => e.roundsPart);
  const hasTime   = entries.some(e => e.timePart);

  let scores;
  if (hasRounds) {
    const vals = entries.map(e => e.rondasN ?? 0);
    const mn = Math.min(...vals), mx = Math.max(...vals);
    scores = vals.map(v => mx === mn ? 70 : 20 + 60 * (v - mn) / (mx - mn));
  } else if (hasTime) {
    const vals = entries.map(e => e.timeN ?? 0);
    const mn = Math.min(...vals), mx = Math.max(...vals);
    scores = vals.map(v => mx === mn ? 70 : 20 + 60 * (mx - v) / (mx - mn));
  } else {
    scores = entries.map(() => 60);
  }

  return (
    <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '30', borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <Text style={{ fontSize: t.fs(10), fontWeight: '700', letterSpacing: 2, color: t.accent, marginBottom: 14 }}>📈 TU PROGRESIÓN</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {entries.map((e, i) => (
          <View key={e.key} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ height: 56, justifyContent: 'flex-end', width: '100%', marginBottom: 6 }}>
              <View style={{ width: '100%', height: Math.round(scores[i]), backgroundColor: t.accent + '35', borderTopLeftRadius: 4, borderTopRightRadius: 4, borderWidth: 1, borderColor: t.accent + '60' }} />
            </View>
            <Text style={{ fontSize: t.fs(9), fontWeight: '900', color: t.text, textAlign: 'center' }} numberOfLines={2} adjustsFontSizeToFit>
              {e.resultado}
            </Text>
            <Text style={{ fontSize: t.fs(8), color: t.text3, marginTop: 2 }}>
              {fmtDateShort(e.fecha)}
            </Text>
            <View style={{ marginTop: 4, backgroundColor: e.rx ? t.accent + '20' : '#f4a26120', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: t.fs(7), color: e.rx ? t.accent : '#f4a261', fontWeight: '800' }}>
                {e.rx ? 'Rx' : 'Sc'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// Aplica adaptación sobre el wod original sin mutarlo
function applyAdaptacion(wod, adaptacion) {
  if (!wod || !adaptacion?.movements?.length) return wod;
  const map = {};
  adaptacion.movements.forEach(m => { map[m.name] = m; });
  const merge = (list) => (list || []).map(m => map[m.name] ? { ...m, reps: map[m.name].reps ?? m.reps, weight: map[m.name].weight ?? m.weight } : m);
  if (wod.movements) return { ...wod, movements: merge(wod.movements) };
  if (wod.parts) return { ...wod, parts: wod.parts.map(p => ({ ...p, movements: merge(p.movements) })) };
  return wod;
}

// Extrae lista plana de movimientos de cualquier formato de WOD
function extractMovements(wod) {
  if (!wod) return [];
  if (wod.movements) return wod.movements.filter(m => m.name && m.name !== '—');
  if (wod.parts) return wod.parts.flatMap(p => (p.movements || []).filter(m => m.name && m.name !== '—'));
  return [];
}

function AdaptModal({ visible, originalMovements, adaptacion, hasAdaptacion, onSave, onClose }) {
  const t = useTheme();
  const [localMovements, setLocalMovements] = useState([]);

  useEffect(() => {
    if (visible) {
      setLocalMovements(
        originalMovements.map(m => {
          const saved = adaptacion?.movements?.find(a => a.name === m.name);
          return { name: m.name, reps: String(saved?.reps ?? m.reps ?? ''), weight: String(saved?.weight ?? m.weight ?? '') };
        })
      );
    }
  }, [visible]);

  const handleSave = () => {
    const changed = localMovements.filter((lm, i) => {
      const orig = originalMovements[i];
      return lm.reps !== String(orig.reps ?? '') || lm.weight !== String(orig.weight ?? '');
    });
    onSave(changed.length ? { movements: changed } : null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000000cc', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: t.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ flex: 1, fontSize: t.fs(14), fontWeight: '900', color: t.text, letterSpacing: 1 }}>✏️ ADAPTAR WOD</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: t.fs(20), color: t.text3 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: t.fs(11), color: t.text3, marginBottom: 14 }}>
            Modifica pesos o reps para tu adaptación de hoy. El programa original no cambia.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {localMovements.map((m, i) => (
              <View key={i} style={{ backgroundColor: t.bg4, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text, marginBottom: 10 }}>{m.name}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginBottom: 4 }}>REPS</Text>
                    <TextInput
                      value={m.reps}
                      onChangeText={v => setLocalMovements(prev => prev.map((x, j) => j === i ? { ...x, reps: v } : x))}
                      keyboardType="numeric"
                      placeholder={String(originalMovements[i]?.reps ?? '')}
                      placeholderTextColor={t.text3}
                      style={{ backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, padding: 10, fontSize: t.fs(15), fontWeight: '700', textAlign: 'center' }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginBottom: 4 }}>PESO</Text>
                    <TextInput
                      value={m.weight}
                      onChangeText={v => setLocalMovements(prev => prev.map((x, j) => j === i ? { ...x, weight: v } : x))}
                      placeholder={String(originalMovements[i]?.weight ?? 'BW')}
                      placeholderTextColor={t.text3}
                      style={{ backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, padding: 10, fontSize: t.fs(15), fontWeight: '700', textAlign: 'center' }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {hasAdaptacion && (
              <TouchableOpacity onPress={() => onSave(null)}
                style={{ flex: 1, backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: t.text3 }}>🔄 Restablecer</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleSave}
              style={{ flex: 2, backgroundColor: t.accent, borderRadius: 10, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: '#fff', letterSpacing: 1 }}>GUARDAR ADAPTACIÓN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Detectar bloques guardables del día ──────────────────────
function getDayParts(day) {
  if (!day) return [];
  const parts = [];
  if (day.strength?.sets?.length) {
    parts.push({ key: 'strength', label: 'FUERZA', isStrength: true });
  }
  if (day.wod && day.type !== 'Libre') {
    if (day.wod.parts?.length >= 1) {
      day.wod.parts.forEach((p, i) => {
        parts.push({ key: `wod_${i}`, label: p.label || `WOD ${i + 1}`, type: p.type, duration: p.duration });
      });
    } else {
      parts.push({ key: 'wod', label: 'WOD', type: day.wod.type, duration: day.wod.duration });
    }
  }
  return parts.length >= 2 ? parts : [];
}

// ── Tarjeta de resultado para un bloque individual ────────────
function PartResultCard({ part, pr = {}, onChange, t }) {
  const isRx = pr.rx !== false;
  const gbg = t.dark ? '#06100a' : '#e8f5e9';
  const gborder = t.dark ? '#2e6e3250' : '#c8e6c9';
  const ibg = t.dark ? '#080e0a' : '#fff';
  const iborder = t.dark ? '#1a3a1e' : '#c8e6c9';
  const icolor = t.dark ? '#81c784' : '#2e7d32';
  const ph = t.dark ? '#2a4a2e' : '#81c784';
  const lbl = { fontSize: t.fs(9), color: '#4caf50', letterSpacing: 2, fontWeight: '700', marginBottom: 6, textAlign: 'center' };
  const inp = { backgroundColor: ibg, borderWidth: 1, borderColor: iborder, borderRadius: 8, color: icolor, fontWeight: '700', padding: 12, textAlign: 'center', fontSize: t.fs(32) };

  return (
    <View style={{ backgroundColor: gbg, borderWidth: 1, borderColor: gborder, borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: '#4caf50', letterSpacing: 1 }}>
          {part.isStrength ? '💪 ' : '⚡ '}{part.label}
        </Text>
        {!part.isStrength && part.type && (
          <View style={{ backgroundColor: '#4caf5015', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: t.fs(8), color: '#4caf50', fontWeight: '700' }}>
              {part.type}{part.duration ? ` · ${part.duration}` : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => onChange({ rx: true })}
          style={{ flex: 1, backgroundColor: isRx ? '#52b78820' : ibg, borderWidth: 1.5, borderColor: isRx ? '#52b788' : iborder, borderRadius: 8, padding: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: t.fs(12), fontWeight: '900', color: isRx ? '#52b788' : ph }}>Rx</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onChange({ rx: false })}
          style={{ flex: 1, backgroundColor: !isRx ? '#f4a26120' : ibg, borderWidth: 1.5, borderColor: !isRx ? '#f4a261' : iborder, borderRadius: 8, padding: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: t.fs(12), fontWeight: '900', color: !isRx ? '#f4a261' : ph }}>Scaled</Text>
        </TouchableOpacity>
      </View>

      {part.isStrength ? (
        <TextInput value={pr.resultado || ''} onChangeText={v => onChange({ resultado: v })}
          placeholder="Ej: 5×80kg" placeholderTextColor={ph}
          style={{ ...inp, fontSize: t.fs(22), marginBottom: 12 }} />
      ) : (
        <>
          <Text style={[lbl, { marginBottom: 8 }]}>TIEMPO</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={lbl}>MIN</Text>
              <TextInput value={pr.minutos || ''} onChangeText={v => onChange({ minutos: v })} keyboardType="numeric" placeholder="00" placeholderTextColor={ph} style={inp} />
            </View>
            <View style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12 }}>
              <Text style={{ fontSize: t.fs(22), color: '#4caf50', fontWeight: '900' }}>:</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={lbl}>SEG</Text>
              <TextInput value={pr.segundos || ''} onChangeText={v => onChange({ segundos: v })} keyboardType="numeric" placeholder="00" placeholderTextColor={ph} style={inp} />
            </View>
          </View>
          <Text style={[lbl, { marginBottom: 8 }]}>RONDAS + REPS</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={lbl}>RONDAS</Text>
              <TextInput value={pr.rondas || ''} onChangeText={v => onChange({ rondas: v })} keyboardType="numeric" placeholder="0" placeholderTextColor={ph} style={inp} />
            </View>
            <View style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12 }}>
              <Text style={{ fontSize: t.fs(22), color: '#4caf50', fontWeight: '900' }}>+</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={lbl}>REPS</Text>
              <TextInput value={pr.repsExtra || ''} onChangeText={v => onChange({ repsExtra: v })} keyboardType="numeric" placeholder="0" placeholderTextColor={ph} style={inp} />
            </View>
          </View>
        </>
      )}

      <TextInput value={pr.notas || ''} onChangeText={v => onChange({ notas: v })}
        placeholder="Notas..." placeholderTextColor={ph} multiline numberOfLines={2}
        style={{ backgroundColor: ibg, borderWidth: 1, borderColor: iborder, borderRadius: 8, color: icolor, fontSize: t.fs(13), padding: 12, textAlignVertical: 'top' }} />
    </View>
  );
}

function detectFormat(wod) {
  if (!wod) return 'text';
  if (wod.emomMinutes) return 'emom';
  if (wod.parts) return 'parts';
  const f = (wod.format || '').toUpperCase();
  if (f.includes('AMRAP')) return 'amrap';
  if (f.includes('FOR TIME') || f.includes('TIEMPO')) return 'fortime';
  if (f.includes('MAX')) return 'maxreps';
  return 'text';
}

// ─────────────────────────────────────────────────────────────
export default function WodScreen({ navigate }) {
  const { rms, resultados, saveResultado, partnerProfile, partnerResultados } = useApp();
  const t = useTheme();
  const { activeProgram } = useProgram();
  const [resultado, setResultado] = useState('');
  const [notas, setNotas]         = useState('');
  const [rx, setRx]               = useState(true);
  const [rondas, setRondas]       = useState('');
  const [repsExtra, setRepsExtra] = useState('');
  const [minutos, setMinutos]     = useState('');
  const [segundos, setSegundos]   = useState('');
  const [saved, setSaved]         = useState(false);
  const [sharing, setSharing]     = useState(false);
  const [adaptacion, setAdaptacion] = useState(null);
  const [showAdaptModal, setShowAdaptModal] = useState(false);
  const [partResults, setPartResults] = useState({});
  const shareCardRef              = useRef(null);

  const allDaysFlat = activeProgram
    ? activeProgram.weeks.flatMap(w => w.days)
    : [];
  const todayInProgram = allDaysFlat.length > 0 && isTodayInProgram(allDaysFlat);
  const day = allDaysFlat.length > 0 ? getTodayDay(allDaysFlat) : null;

  const savedResult = day ? resultados[day.day] : null;
  const dayParts = getDayParts(day);

  useEffect(() => {
    setNotas(savedResult?.notas || '');
    setRx(savedResult?.rx !== false);
    setAdaptacion(savedResult?.adaptacion || null);
    const r = savedResult?.resultado || '';
    setResultado(r);
    const segs = r.split(' · ');
    const roundsPart = segs.find(s => /^\d+\+\d+$/.test(s.trim())) || '';
    const timePart   = segs.find(s => /^\d{1,2}:\d{2}$/.test(s.trim())) || '';
    if (roundsPart) { const [ron, rep] = roundsPart.split('+'); setRondas(ron || ''); setRepsExtra(rep || ''); }
    else { setRondas(''); setRepsExtra(''); }
    if (timePart) { const [min, sec] = timePart.split(':'); setMinutos(min || ''); setSegundos(sec || ''); }
    else { setMinutos(''); setSegundos(''); }
    // Inicializar resultados de partes si el día tiene bloques múltiples
    const parts = getDayParts(day);
    if (parts.length >= 2) {
      const init = {};
      parts.forEach(p => {
        const saved = (savedResult?.partes || []).find(s => s.key === p.key);
        const pr = { resultado: '', minutos: '', segundos: '', rondas: '', repsExtra: '', notas: '', rx: true };
        if (saved) {
          pr.resultado = saved.resultado || '';
          pr.notas = saved.notas || '';
          pr.rx = saved.rx !== false;
          const ss = (saved.resultado || '').split(' · ');
          const rp = ss.find(s => /^\d+\+\d+$/.test(s.trim()));
          const tp = ss.find(s => /^\d{1,2}:\d{2}$/.test(s.trim()));
          if (rp) { const [ron, rep] = rp.split('+'); pr.rondas = ron || ''; pr.repsExtra = rep || ''; }
          if (tp) { const [min, sec] = tp.split(':'); pr.minutos = min || ''; pr.segundos = sec || ''; }
        }
        init[p.key] = pr;
      });
      setPartResults(init);
    }
  }, [savedResult]);

  const updatePart = (key, fields) =>
    setPartResults(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...fields } }));

  const guardarPartes = async () => {
    if (!day) return;
    const parts = getDayParts(day);
    const partes = parts.map(p => {
      const pr = partResults[p.key] || {};
      let resultado;
      if (p.isStrength) {
        resultado = pr.resultado || '';
      } else {
        const tp = pr.minutos ? `${pr.minutos.padStart(2,'0')}:${(pr.segundos||'00').padStart(2,'0')}` : '';
        const rp = pr.rondas ? `${pr.rondas}+${pr.repsExtra || '0'}` : '';
        resultado = [rp, tp].filter(Boolean).join(' · ');
      }
      return { key: p.key, label: p.label, resultado, notas: pr.notas || '', rx: pr.rx !== false };
    });
    const summary = partes.map(p => `${p.label}: ${p.resultado || '—'}`).join(' · ');
    await saveResultado(day.day, {
      resultado: summary, notas: '', fecha: new Date().toISOString(),
      rx: partes.every(p => p.rx), adaptacion, partes,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const guardar = async () => {
    if (!day) return;
    const timePart   = minutos ? `${minutos.padStart(2,'0')}:${(segundos||'00').padStart(2,'0')}` : '';
    const roundsPart = rondas  ? `${rondas}+${repsExtra || '0'}` : '';
    const finalResultado = [roundsPart, timePart].filter(Boolean).join(' · ') || resultado;
    await saveResultado(day.day, { resultado: finalResultado, notas, fecha: new Date().toISOString(), rx, adaptacion });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const compartir = async () => {
    if (!currentResult || !shareCardRef.current) return;
    setSharing(true);
    try {
      const uri = await shareCardRef.current.capture();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartir resultado WOD',
      });
    } catch (_) {}
    setSharing(false);
  };

  const today   = getToday();
  const rmKey   = day?.rmKey || 'cj';
  const rmVal   = parseFloat(rms[rmKey]);
  const hasRM   = rmVal > 0;

  const timePart_   = minutos ? `${minutos.padStart(2,'0')}:${(segundos||'00').padStart(2,'0')}` : '';
  const roundsPart_ = rondas  ? `${rondas}+${repsExtra || '0'}` : '';
  const currentResult = [roundsPart_, timePart_].filter(Boolean).join(' · ') || resultado;
  const hasResult = !!currentResult;

  const effectiveWod = day?.wod ? applyAdaptacion(day.wod, adaptacion) : day?.wod;
  const adaptedDay   = day ? { ...day, wod: effectiveWod } : day;
  const hasAdaptacion = !!(adaptacion?.movements?.length);

  // ── NO HAY WOD HOY ──────────────────────────────────────────
  if (!todayInProgram || !day) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 60 }}>
          <Text style={{ fontSize: t.fs(10), color: t.accent + '88', letterSpacing: 4, fontWeight: '700' }}>WOD DEL DÍA</Text>
          <Text style={{ fontSize: t.fs(28), fontWeight: '900', letterSpacing: 2, color: t.text, marginTop: 4 }}>HOY</Text>
          <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 4 }}>{formatDateShort(today)}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
          <View style={{ marginTop: 40, alignItems: 'center', marginBottom: 30 }}>
            <Text style={{ fontSize: t.fs(60), marginBottom: 16 }}>🕊️</Text>
            <Text style={{ fontSize: t.fs(20), fontWeight: '900', color: t.text, marginBottom: 8, textAlign: 'center' }}>
              Sin WOD programado hoy
            </Text>
            <Text style={{ fontSize: t.fs(13), color: t.text3, textAlign: 'center', lineHeight: t.fs(20) }}>
              No hay sesión en el programa para hoy. Puedes descansar o crear un entrenamiento libre.
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigate('HISTORIAL')}
            style={{ backgroundColor: t.accent, borderRadius: 12, padding: 16, alignItems: 'center', width: '100%', marginBottom: 12 }}>
            <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: '#fff', letterSpacing: 1 }}>🔓 CREAR WOD LIBRE</Text>
            <Text style={{ fontSize: t.fs(11), color: '#ffffff99', marginTop: 4 }}>Ir a Historial → + WOD Libre</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigate('PROGRAM')}
            style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, alignItems: 'center', width: '100%' }}>
            <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text2 }}>📅 Ver programa completo</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const originalMovements = extractMovements(day.wod);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>

      <AdaptModal
        visible={showAdaptModal}
        originalMovements={originalMovements}
        adaptacion={adaptacion}
        hasAdaptacion={hasAdaptacion}
        onSave={(newAdaptacion) => { setAdaptacion(newAdaptacion); setShowAdaptModal(false); }}
        onClose={() => setShowAdaptModal(false)}
      />

      {/* ShareCard renderizada fuera de pantalla para captura */}
      <View style={{ position: 'absolute', top: 0, left: -400 }} collapsable={false}>
        <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 0.95, result: 'tmpfile' }}>
          <ShareCard day={adaptedDay} resultado={currentResult} notas={notas} rx={rx} acento={t.accent} />
        </ViewShot>
      </View>

      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <View style={{ backgroundColor: t.accent, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontSize: t.fs(8), color: '#fff', fontWeight: '900', letterSpacing: 2 }}>HOY</Text>
          </View>
          <Text style={{ fontSize: t.fs(10), color: t.accent + '88', letterSpacing: 3, fontWeight: '700' }}>{day.day.toUpperCase()}</Text>
        </View>
        <Text style={{ fontSize: t.fs(28), fontWeight: '900', letterSpacing: 2, color: t.text }}>{day.label}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <View style={{ backgroundColor: typeColor(day.type, t.accent) + '20', borderWidth: 1, borderColor: typeColor(day.type, t.accent) + '40', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: t.fs(9), fontWeight: '700', color: typeColor(day.type, t.accent), letterSpacing: 1 }}>🏋️ {day.type.toUpperCase()}</Text>
          </View>
          {day.wod?.type && (
            <View style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: t.fs(9), fontWeight: '700', color: t.text2, letterSpacing: 1 }}>{day.wod.type} · {day.wod.duration}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>

        {/* FUERZA */}
        {day.strength && (
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '30', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <Text style={{ fontSize: t.fs(12), fontWeight: '700', letterSpacing: 2, color: t.accent, marginBottom: 12 }}>💪 FUERZA / TÉCNICA</Text>
            <View style={{ backgroundColor: t.accent + '10', borderWidth: 1, borderColor: t.accent + '25', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 6 }}>TU {day.label} 1RM</Text>
              {hasRM ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: t.fs(28), fontWeight: '900', color: t.accent }}>
                    {rms[rmKey]}<Text style={{ fontSize: t.fs(14), color: t.text2 }}> kg</Text>
                  </Text>
                  <Text style={{ fontSize: t.fs(11), color: t.text2, flex: 1 }}>
                    {`65%→${Math.round(rmVal * 0.65)}kg  ·  72%→${Math.round(rmVal * 0.72)}kg  ·  78%→${Math.round(rmVal * 0.78)}kg`}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => navigate('RM')}
                  style={{ backgroundColor: t.accent + '15', borderWidth: 1, borderColor: t.accent + '30', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: t.fs(12), color: t.accent, fontWeight: '700' }}>+ Añadir tu 1RM →</Text>
                </TouchableOpacity>
              )}
            </View>
            {day.strength.sets.map((s, i) => {
              const p = s.desc.match(/(\d+)%/)?.[1];
              return (
                <View key={i} style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: t.accent + '20', borderWidth: 1, borderColor: t.accent + '40', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: t.fs(10), color: t.accent, fontWeight: '700' }}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>
                        {s.desc}{hasRM && p ? ` → ${Math.round(rmVal * parseInt(p) / 100)}kg` : ''}
                      </Text>
                      {s.note && <Text style={{ fontSize: t.fs(11), color: t.text2, marginTop: 3 }}>{s.note}</Text>}
                      {p && (
                        <View style={{ marginTop: 6, height: 3, backgroundColor: t.border, borderRadius: 2 }}>
                          <View style={{ height: 3, width: `${p}%`, backgroundColor: t.accent, borderRadius: 2 }} />
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
            <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 4 }}>⏱ {day.strength.rest}</Text>
          </View>
        )}

        {/* WOD */}
        {day.wod && (day.wod.movements || day.wod.parts || day.wod.emomMinutes) && (
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '30', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ flex: 1, fontSize: t.fs(12), fontWeight: '700', letterSpacing: 2, color: t.accent }}>
                ⚡ WOD{day.wod.parts ? ` — DOBLE WOD` : day.wod.type ? ` — ${day.wod.type} ${day.wod.duration}` : ''}
              </Text>
              {extractMovements(day.wod).length > 0 && (
                <TouchableOpacity onPress={() => setShowAdaptModal(true)}
                  style={{ backgroundColor: hasAdaptacion ? t.accent + '20' : t.bg4, borderWidth: 1, borderColor: hasAdaptacion ? t.accent : t.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: t.fs(9), fontWeight: '700', color: hasAdaptacion ? t.accent : t.text3 }}>
                    {hasAdaptacion ? '✏️ Adaptado' : '✏️ Adaptar'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* WOD con múltiples partes */}
            {effectiveWod.parts ? effectiveWod.parts.map((part, pi) => (
              <View key={pi} style={{ marginBottom: pi < effectiveWod.parts.length - 1 ? 14 : 0 }}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: t.accent + '20', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: t.fs(9), fontWeight: '700', color: t.accent }}>WOD {pi + 1} · {part.type} · {part.duration}</Text>
                  </View>
                  {part.format && <View style={{ backgroundColor: t.bg4, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: t.fs(9), color: t.text2 }}>{part.format}</Text>
                  </View>}
                </View>
                {part.formatNote && (
                  <View style={{ backgroundColor: t.bg4, borderRadius: 6, padding: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: t.fs(11), color: t.text2 }}>{part.formatNote}</Text>
                  </View>
                )}
                {part.movements?.filter(m => m.name !== '—').map((m, i) => {
                  const adapted = adaptacion?.movements?.find(a => a.name === m.name);
                  return (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, backgroundColor: adapted ? t.accent + '10' : t.bg4, borderLeftWidth: 3, borderLeftColor: adapted ? t.accent : t.accent + '60', borderRadius: 8, padding: 10, marginBottom: 6 }}>
                    <Text style={{ minWidth: 38, fontSize: t.fs(13), fontWeight: '700', color: t.accent }}>{m.reps}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>{m.name}</Text>
                      {m.weight && m.weight !== 'BW' && <Text style={{ fontSize: t.fs(11), color: adapted ? t.accent : t.text2, marginTop: 2 }}>{m.weight}{adapted ? ' ✏️' : ''}</Text>}
                    </View>
                  </View>
                  );
                })}
                {pi < effectiveWod.parts.length - 1 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                    <Text style={{ fontSize: t.fs(9), color: t.text3, fontWeight: '700', letterSpacing: 2 }}>2 MIN DESCANSO</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
                  </View>
                )}
              </View>
            )) : null}

            {/* WOD EMOM */}
            {!effectiveWod.parts && effectiveWod.emomMinutes && (
              <>
                {effectiveWod.formatNote && (
                  <View style={{ backgroundColor: t.bg4, borderRadius: 6, padding: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: t.fs(11), color: t.text2 }}>{effectiveWod.formatNote}</Text>
                  </View>
                )}
                {effectiveWod.emomMinutes.map((min, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, backgroundColor: t.bg4, borderLeftWidth: 3, borderLeftColor: t.accent, borderRadius: 8, padding: 10, marginBottom: 6 }}>
                    <Text style={{ minWidth: 52, fontSize: t.fs(10), fontWeight: '700', color: t.accent }}>{min.min}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>{min.work}</Text>
                      {min.weight && min.weight !== 'BW' && <Text style={{ fontSize: t.fs(11), color: t.text2, marginTop: 2 }}>{min.weight}</Text>}
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* WOD LADDER / estándar */}
            {!effectiveWod.parts && !effectiveWod.emomMinutes && effectiveWod.movements && (
              <>
                {effectiveWod.formatNote && (
                  <View style={{ backgroundColor: t.bg4, borderRadius: 6, padding: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: t.fs(11), color: t.text2 }}>⚡ {effectiveWod.format} — {effectiveWod.formatNote}</Text>
                  </View>
                )}
                {effectiveWod.ladderNote && (
                  <View style={{ backgroundColor: t.bg4, borderRadius: 6, padding: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: t.fs(11), color: t.text2 }}>📐 {effectiveWod.ladderNote}</Text>
                  </View>
                )}
                {effectiveWod.movements.filter(m => m.name !== '—').map((m, i) => {
                  const adapted = adaptacion?.movements?.find(a => a.name === m.name);
                  return (
                    <View key={i} style={{ flexDirection: 'row', gap: 10, backgroundColor: adapted ? t.accent + '10' : t.bg4, borderLeftWidth: 3, borderLeftColor: adapted ? t.accent : t.accent + '60', borderRadius: 8, padding: 10, marginBottom: 7 }}>
                      <Text style={{ minWidth: 38, fontSize: t.fs(13), fontWeight: '700', color: t.accent }}>{m.reps}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: t.fs(14), fontWeight: '700', color: t.text }}>{m.name}</Text>
                        {m.weight && m.weight !== 'BW' && <Text style={{ fontSize: t.fs(11), color: adapted ? t.accent : t.text2, marginTop: 2 }}>{m.weight}{adapted ? ' ✏️' : ''}</Text>}
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {day.wod.gymNote && (
              <View style={{ backgroundColor: t.dark ? '#080f08' : '#e8f5e9', borderWidth: 1, borderColor: t.dark ? '#1e3e1e' : '#c8e6c9', borderRadius: 6, padding: 10, marginTop: 4 }}>
                <Text style={{ fontSize: t.fs(11), color: '#5a9a5a' }}>💡 {day.wod.gymNote}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => navigate('TIMER')}
              style={{ backgroundColor: t.accent, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(14), letterSpacing: 1 }}>▶ INICIAR TIMER</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PROGRESIÓN */}
        <ProgressStrip resultados={resultados} currentDayKey={day.day} t={t} />

        {/* RESULTADO DE LA PAREJA */}
        {partnerProfile && partnerResultados[day.day] && (() => {
          const pr = partnerResultados[day.day];
          const initials = partnerProfile.nombre?.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() || '??';
          return (
            <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '30', borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <Text style={{ fontSize: t.fs(10), fontWeight: '700', letterSpacing: 2, color: t.accent, marginBottom: 10 }}>🤝 RESULTADO DE TU PAREJA</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: t.accent }}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>{partnerProfile.nombre || 'Tu pareja'}</Text>
                  <View style={{ marginTop: 3, alignSelf: 'flex-start', backgroundColor: pr.rx ? t.accent + '20' : '#f4a26120', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: t.fs(8), color: pr.rx ? t.accent : '#f4a261', fontWeight: '700' }}>{pr.rx ? 'Rx' : 'Scaled'}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.accent }}>{pr.resultado || '—'}</Text>
              </View>
              {!!pr.notas && (
                <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 8, fontStyle: 'italic' }}>"{pr.notas}"</Text>
              )}
            </View>
          );
        })()}

        {/* ANOTAR RESULTADOS — multi-bloque */}
        {dayParts.length >= 2 && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: t.fs(10), color: '#4caf50', letterSpacing: 2, fontWeight: '700' }}>✏️ ANOTAR RESULTADOS</Text>
              {saved && <Text style={{ fontSize: t.fs(10), color: '#52b788', fontWeight: '700' }}>✓ GUARDADO</Text>}
            </View>
            {dayParts.map(part => (
              <PartResultCard key={part.key} part={part} pr={partResults[part.key]} onChange={fields => updatePart(part.key, fields)} t={t} />
            ))}
            {(() => {
              const filled = dayParts.filter(p => {
                const pr = partResults[p.key] || {};
                return p.isStrength ? !!pr.resultado : !!(pr.minutos || pr.rondas);
              }).length;
              return (
                <TouchableOpacity onPress={guardarPartes}
                  style={{ backgroundColor: '#2e6e32', borderRadius: 8, padding: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(13), letterSpacing: 1 }}>
                    💾 GUARDAR TODO{filled > 0 ? ` (${filled}/${dayParts.length})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        )}

        {/* ANOTAR RESULTADO — bloque único */}
        {dayParts.length < 2 && (
        <View style={{ backgroundColor: t.dark ? '#06100a' : '#e8f5e9', borderWidth: 1, borderColor: t.dark ? '#2e6e3250' : '#c8e6c9', borderRadius: 10, padding: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: t.fs(10), color: '#4caf50', letterSpacing: 2, fontWeight: '700' }}>✏️ ANOTAR RESULTADO</Text>
            {saved && <Text style={{ fontSize: t.fs(10), color: '#52b788', fontWeight: '700' }}>✓ GUARDADO</Text>}
          </View>

          {/* Rx / Scaled */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <TouchableOpacity onPress={() => setRx(true)}
              style={{ flex: 1, backgroundColor: rx ? '#52b78820' : t.dark ? '#080e0a' : '#fff', borderWidth: 1.5, borderColor: rx ? '#52b788' : t.dark ? '#1a3a1e' : '#c8e6c9', borderRadius: 8, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: rx ? '#52b788' : t.text3 }}>Rx</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRx(false)}
              style={{ flex: 1, backgroundColor: !rx ? '#f4a26120' : t.dark ? '#080e0a' : '#fff', borderWidth: 1.5, borderColor: !rx ? '#f4a261' : t.dark ? '#1a3a1e' : '#c8e6c9', borderRadius: 8, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(13), fontWeight: '900', color: !rx ? '#f4a261' : t.text3 }}>Scaled</Text>
            </TouchableOpacity>
          </View>

          {/* Inputs — siempre visibles para todos los tipos */}
          {(() => {
            const inputBase = { backgroundColor: t.dark ? '#080e0a' : '#fff', borderWidth: 1, borderColor: t.dark ? '#1a3a1e' : '#c8e6c9', borderRadius: 8, color: t.dark ? '#81c784' : '#2e7d32', fontWeight: '700', padding: 12, textAlign: 'center', fontSize: t.fs(32) };
            const ph = t.dark ? '#2a4a2e' : '#81c784';
            const label = { fontSize: t.fs(9), color: '#4caf50', letterSpacing: 2, fontWeight: '700', marginBottom: 6, textAlign: 'center' };
            const sep = { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12 };
            return (
              <>
                <Text style={[label, { marginBottom: 8 }]}>TIEMPO REALIZADO</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={label}>MIN</Text>
                    <TextInput value={minutos} onChangeText={setMinutos} keyboardType="numeric" placeholder="00" placeholderTextColor={ph} style={inputBase} />
                  </View>
                  <View style={sep}><Text style={{ fontSize: t.fs(22), color: t.text3, fontWeight: '900' }}>:</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={label}>SEG</Text>
                    <TextInput value={segundos} onChangeText={setSegundos} keyboardType="numeric" placeholder="00" placeholderTextColor={ph} style={inputBase} />
                  </View>
                </View>

                <Text style={[label, { marginBottom: 8 }]}>RONDAS + REPS</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={label}>RONDAS</Text>
                    <TextInput value={rondas} onChangeText={setRondas} keyboardType="numeric" placeholder="0" placeholderTextColor={ph} style={inputBase} />
                  </View>
                  <View style={sep}><Text style={{ fontSize: t.fs(22), color: t.text3, fontWeight: '900' }}>+</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={label}>REPS EXTRA</Text>
                    <TextInput value={repsExtra} onChangeText={setRepsExtra} keyboardType="numeric" placeholder="0" placeholderTextColor={ph} style={inputBase} />
                  </View>
                </View>
              </>
            );
          })()}

          <TextInput
            value={notas} onChangeText={setNotas}
            placeholder="Notas de la sesión..."
            placeholderTextColor={t.dark ? '#2a4a2e' : '#81c784'}
            multiline numberOfLines={3}
            style={{ backgroundColor: t.dark ? '#080e0a' : '#fff', borderWidth: 1, borderColor: t.dark ? '#1a3a1e' : '#c8e6c9', borderRadius: 8, color: t.dark ? '#81c784' : '#2e7d32', fontSize: t.fs(13), padding: 12, textAlignVertical: 'top', marginBottom: 10 }}
          />

          {/* Botones */}
          <TouchableOpacity onPress={guardar}
            style={{ backgroundColor: '#2e6e32', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: hasResult ? 8 : 0 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(13), letterSpacing: 1 }}>💾 GUARDAR RESULTADO</Text>
          </TouchableOpacity>

          {hasResult && (
            <TouchableOpacity
              onPress={compartir}
              disabled={sharing}
              style={{ backgroundColor: t.dark ? '#0e1a10' : '#fff', borderWidth: 1.5, borderColor: '#2e6e32', borderRadius: 8, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              {sharing
                ? <ActivityIndicator size="small" color="#52b788" />
                : <Text style={{ fontSize: t.fs(16) }}>📤</Text>
              }
              <Text style={{ color: '#52b788', fontWeight: '900', fontSize: t.fs(13), letterSpacing: 1 }}>
                {sharing ? 'GENERANDO...' : 'COMPARTIR RESULTADO'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        )}

      </ScrollView>
    </View>
  );
}
