import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
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
function ShareCard({ day, resultado, notas, acento }) {
  const now = new Date();
  const dateStr = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const movements = day?.wod?.movements?.filter(m => m.name !== '—') || [];

  return (
    <View style={{
      width: 320,
      backgroundColor: '#0a0a12',
      borderRadius: 16,
      padding: 22,
      borderWidth: 1,
      borderColor: acento + '50',
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 22 }}>⚡</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 3 }}>WODLY</Text>
        </View>
        <Text style={{ fontSize: 11, color: '#ffffff55' }}>{dateStr}</Text>
      </View>

      {/* Día + tipo */}
      <Text style={{ fontSize: 11, fontWeight: '800', color: acento, letterSpacing: 2, marginBottom: 2 }}>
        {day?.label?.toUpperCase()}
      </Text>
      {day?.wod?.type && (
        <Text style={{ fontSize: 11, color: '#ffffff60', letterSpacing: 1, marginBottom: 12 }}>
          {day.wod.type} · {day.wod.duration} · {day?.type?.toUpperCase()}
        </Text>
      )}

      {/* Movimientos */}
      {movements.slice(0, 6).map((m, i) => (
        <View key={i} style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: '#ffffff08', borderLeftWidth: 2,
          borderLeftColor: acento, borderRadius: 6,
          paddingVertical: 6, paddingHorizontal: 10, marginBottom: 5,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: acento, minWidth: 36 }}>{m.reps}</Text>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{m.name}</Text>
            {m.weight && m.weight !== 'BW' && (
              <Text style={{ fontSize: 10, color: '#ffffff70' }}>{m.weight}</Text>
            )}
          </View>
        </View>
      ))}
      {movements.length > 6 && (
        <Text style={{ fontSize: 11, color: '#ffffff40', marginBottom: 4, marginLeft: 4 }}>
          +{movements.length - 6} movimientos más
        </Text>
      )}

      {/* Divisor */}
      <View style={{ height: 1, backgroundColor: acento + '35', marginVertical: 16 }} />

      {/* Resultado */}
      <Text style={{ fontSize: 10, color: acento, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>
        ✅  MI RESULTADO
      </Text>
      <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 1 }}>
        {resultado}
      </Text>
      {!!notas && (
        <Text style={{ fontSize: 12, color: '#ffffff70', marginTop: 8, fontStyle: 'italic', lineHeight: 18 }}>
          "{notas}"
        </Text>
      )}

      {/* Footer */}
      <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: '#ffffff12' }} />
        <Text style={{ fontSize: 10, color: '#ffffff35', letterSpacing: 3 }}>WODLY.APP</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: '#ffffff12' }} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
export default function WodScreen({ navigate }) {
  const { rms, resultados, saveResultado } = useApp();
  const t = useTheme();
  const { activeProgram } = useProgram();
  const [resultado, setResultado] = useState('');
  const [notas, setNotas]         = useState('');
  const [saved, setSaved]         = useState(false);
  const [sharing, setSharing]     = useState(false);
  const shareCardRef              = useRef(null);

  const allDaysFlat = activeProgram
    ? activeProgram.weeks.flatMap(w => w.days)
    : [];
  const todayInProgram = allDaysFlat.length > 0 && isTodayInProgram(allDaysFlat);
  const day = allDaysFlat.length > 0 ? getTodayDay(allDaysFlat) : null;

  useEffect(() => {
    if (day && resultados[day.day]) {
      setResultado(resultados[day.day].resultado || '');
      setNotas(resultados[day.day].notas || '');
    }
  }, [day?.day]);

  const guardar = async () => {
    if (!day) return;
    await saveResultado(day.day, { resultado, notas, fecha: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const compartir = async () => {
    if (!resultado || !shareCardRef.current) return;
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
  const hasResult = !!resultado;

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

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>

      {/* ShareCard renderizada fuera de pantalla para captura */}
      <View style={{ position: 'absolute', top: 0, left: -400 }} collapsable={false}>
        <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 0.95, result: 'tmpfile' }}>
          <ShareCard day={day} resultado={resultado} notas={notas} acento={t.accent} />
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
        {day.wod && day.wod.movements && (
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '30', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <Text style={{ fontSize: t.fs(12), fontWeight: '700', letterSpacing: 2, color: t.accent, marginBottom: 10 }}>⚡ WOD — {day.wod.type} {day.wod.duration}</Text>
            {day.wod.formatNote && (
              <View style={{ backgroundColor: t.bg4, borderRadius: 6, padding: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: t.fs(11), color: t.text2 }}>⚡ {day.wod.format} — {day.wod.formatNote}</Text>
              </View>
            )}
            {day.wod.movements.filter(m => m.name !== '—').map((m, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, backgroundColor: t.bg4, borderLeftWidth: 3, borderLeftColor: t.accent, borderRadius: 8, padding: 10, marginBottom: 7 }}>
                <Text style={{ minWidth: 38, fontSize: t.fs(13), fontWeight: '700', color: t.accent }}>{m.reps}</Text>
                <View>
                  <Text style={{ fontSize: t.fs(14), fontWeight: '700', color: t.text }}>{m.name}</Text>
                  {m.weight && m.weight !== 'BW' && <Text style={{ fontSize: t.fs(11), color: t.text2, marginTop: 2 }}>{m.weight}</Text>}
                </View>
              </View>
            ))}
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

        {/* ANOTAR RESULTADO */}
        <View style={{ backgroundColor: t.dark ? '#06100a' : '#e8f5e9', borderWidth: 1, borderColor: t.dark ? '#2e6e3250' : '#c8e6c9', borderRadius: 10, padding: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: t.fs(10), color: '#4caf50', letterSpacing: 2, fontWeight: '700' }}>✏️ ANOTAR RESULTADO</Text>
            {saved && <Text style={{ fontSize: t.fs(10), color: '#52b788', fontWeight: '700' }}>✓ GUARDADO</Text>}
          </View>
          <TextInput
            value={resultado} onChangeText={setResultado}
            placeholder="Nº rondas + reps (ej: 8+3)"
            placeholderTextColor={t.dark ? '#2a4a2e' : '#81c784'}
            style={{ backgroundColor: t.dark ? '#080e0a' : '#fff', borderWidth: 1, borderColor: t.dark ? '#1a3a1e' : '#c8e6c9', borderRadius: 8, color: t.dark ? '#81c784' : '#2e7d32', fontSize: t.fs(14), fontWeight: '700', padding: 12, marginBottom: 10 }}
          />
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

      </ScrollView>
    </View>
  );
}
