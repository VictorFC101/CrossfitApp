import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../ThemeContext';
import { useProgram } from '../ProgramContext';
import { getInitialIdx, isTodayInProgram } from '../dateUtils';

export default function TimerScreen() {
  const t = useTheme();
  const { activeProgram } = useProgram();

  // Calcular WOD del día real desde el programa activo
  const allDays = activeProgram
    ? activeProgram.weeks.flatMap((w, wi) =>
        w.days.map((d, di) => ({ ...d, weekIndex: wi, dayIndex: di }))
      )
    : [];
  const todayInProgram = allDays.length > 0 && isTodayInProgram(allDays);
  const todayIdx = todayInProgram ? getInitialIdx(allDays) : -1;
  const todayDay = todayIdx >= 0 ? allDays[todayIdx] : null;
  const wodMovements = todayDay?.wod?.movements?.filter(m => m.name !== '—') || [];
  const [mode, setMode] = useState('AMRAP');
  const [customMins, setCustomMins] = useState('20');
  const [emomMins, setEmomMins] = useState('1');
  const [emomRounds, setEmomRounds] = useState('10');
  const [seconds, setSeconds] = useState(1200);
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  const [currentEmomRound, setCurrentEmomRound] = useState(1);
  const [editing, setEditing] = useState(false);
  const intervalRef = useRef(null);

  const totalRounds = parseInt(emomRounds || '10');
  const emomRoundSecs = parseInt(emomMins || '1') * 60;
  const totalSecs = mode === 'EMOM' ? emomRoundSecs * totalRounds : parseInt(customMins || '20') * 60;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            if (mode === 'EMOM') {
              setCurrentEmomRound(r => {
                if (r >= totalRounds) { clearInterval(intervalRef.current); setRunning(false); return r; }
                return r + 1;
              });
              return emomRoundSecs;
            }
            clearInterval(intervalRef.current);
            setRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, emomRoundSecs, totalRounds]);

  const toggle = () => setRunning(r => !r);
  const reset = () => { setRunning(false); setRounds(0); setCurrentEmomRound(1); setSeconds(mode === 'EMOM' ? emomRoundSecs : parseInt(customMins || '20') * 60); };
  const applyTime = (mins) => { const m = parseInt(mins); if (!m || m <= 0) return; setRunning(false); setSeconds(m * 60); setRounds(0); setEditing(false); };
  const changeMode = (m) => { setMode(m); setRunning(false); setRounds(0); setCurrentEmomRound(1); if (m === 'AMRAP') { setCustomMins('20'); setSeconds(1200); } if (m === 'FOR TIME') { setCustomMins('25'); setSeconds(1500); } if (m === 'EMOM') { setSeconds(parseInt(emomMins || '1') * 60); } };
  const applyEmom = () => { setRunning(false); setCurrentEmomRound(1); setRounds(0); setSeconds(parseInt(emomMins || '1') * 60); setEditing(false); };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const progress = totalSecs > 0 ? seconds / (mode === 'EMOM' ? emomRoundSecs : totalSecs) : 1;
  const timerStatus = running ? 'EN CURSO' : seconds === 0 ? '¡TIEMPO!' : '  LISTO  ';
  const accentColor = t.accent;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: accentColor, padding: 20, paddingTop: 60 }}>
        <Text style={{ fontSize: t.fs(10), color: accentColor + '88', letterSpacing: 4, fontWeight: '700' }}>TEMPORIZADOR WOD</Text>
        <Text style={{ fontSize: t.fs(32), fontWeight: '900', letterSpacing: 2, color: t.text, marginTop: 4 }}>TIMER</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20, width: '100%' }}>
          {['AMRAP', 'FOR TIME', 'EMOM'].map(m => (
            <TouchableOpacity key={m} onPress={() => changeMode(m)}
              style={{ flex: 1, padding: 10, backgroundColor: mode === m ? accentColor + '20' : t.bg4, borderWidth: 2, borderColor: mode === m ? accentColor : t.border, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(10), fontWeight: '700', color: mode === m ? accentColor : t.text3, letterSpacing: 1 }}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode !== 'EMOM' && (
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, width: '100%', marginBottom: 20 }}>
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, marginBottom: 10 }}>DURACIÓN</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {['10', '15', '20', '25', '30'].map(m => (
                <TouchableOpacity key={m} onPress={() => { setCustomMins(m); applyTime(m); }}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: customMins === m ? accentColor + '20' : t.bg4, borderWidth: 1, borderColor: customMins === m ? accentColor : t.border, borderRadius: 8 }}>
                  <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: customMins === m ? accentColor : t.text2 }}>{m} min</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setEditing(e => !e)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: editing ? accentColor + '20' : t.bg4, borderWidth: 1, borderColor: editing ? accentColor : t.border, borderRadius: 8 }}>
                <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: editing ? accentColor : t.text2 }}>✎ Custom</Text>
              </TouchableOpacity>
            </View>
            {editing && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput value={customMins} onChangeText={setCustomMins} keyboardType="numeric" placeholder="min" placeholderTextColor={t.text3}
                  style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: accentColor + '40', borderRadius: 8, color: t.text, fontSize: t.fs(18), fontWeight: '700', padding: 10, width: 80, textAlign: 'center' }} />
                <Text style={{ color: t.text2, fontSize: t.fs(13) }}>minutos</Text>
                <TouchableOpacity onPress={() => applyTime(customMins)} style={{ flex: 1, backgroundColor: accentColor, borderRadius: 8, padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: t.fs(13) }}>APLICAR</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {mode === 'EMOM' && (
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: accentColor + '30', borderRadius: 12, padding: 14, width: '100%', marginBottom: 20 }}>
            <Text style={{ fontSize: t.fs(10), color: accentColor, letterSpacing: 2, marginBottom: 14, fontWeight: '700' }}>CONFIGURAR EMOM</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 1, marginBottom: 6 }}>MIN / RONDA</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {['1', '2', '3'].map(m => (
                    <TouchableOpacity key={m} onPress={() => setEmomMins(m)}
                      style={{ flex: 1, padding: 8, backgroundColor: emomMins === m ? accentColor + '20' : t.bg4, borderWidth: 1, borderColor: emomMins === m ? accentColor : t.border, borderRadius: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: emomMins === m ? accentColor : t.text2 }}>{m}'</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 1, marginBottom: 6 }}>TOTAL RONDAS</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {['8', '10', '12'].map(r => (
                    <TouchableOpacity key={r} onPress={() => setEmomRounds(r)}
                      style={{ flex: 1, padding: 8, backgroundColor: emomRounds === r ? accentColor + '20' : t.bg4, borderWidth: 1, borderColor: emomRounds === r ? accentColor : t.border, borderRadius: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: emomRounds === r ? accentColor : t.text2 }}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <TextInput value={emomMins} onChangeText={setEmomMins} keyboardType="numeric" placeholderTextColor={t.text3} placeholder="min"
                style={{ flex: 1, backgroundColor: t.bg4, borderWidth: 1, borderColor: accentColor + '40', borderRadius: 8, color: t.text, fontSize: t.fs(16), fontWeight: '700', padding: 10, textAlign: 'center' }} />
              <Text style={{ color: t.text2, fontSize: t.fs(14) }}>×</Text>
              <TextInput value={emomRounds} onChangeText={setEmomRounds} keyboardType="numeric" placeholderTextColor={t.text3} placeholder="rondas"
                style={{ flex: 1, backgroundColor: t.bg4, borderWidth: 1, borderColor: accentColor + '40', borderRadius: 8, color: t.text, fontSize: t.fs(16), fontWeight: '700', padding: 10, textAlign: 'center' }} />
              <Text style={{ color: t.text2, fontSize: t.fs(14) }}>=</Text>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: accentColor }}>{parseInt(emomMins || 0) * parseInt(emomRounds || 0)} min</Text>
              </View>
            </View>
            <TouchableOpacity onPress={applyEmom} style={{ backgroundColor: accentColor, borderRadius: 8, padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(13), letterSpacing: 1 }}>APLICAR EMOM</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'EMOM' && (
          <View style={{ backgroundColor: accentColor + '12', borderWidth: 1, borderColor: accentColor + '40', borderRadius: 12, padding: 14, width: '100%', marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: t.fs(10), color: accentColor, letterSpacing: 2, fontWeight: '700' }}>RONDA ACTUAL</Text>
              <Text style={{ fontSize: t.fs(36), fontWeight: '900', color: t.text, marginTop: 2 }}>{currentEmomRound} <Text style={{ fontSize: t.fs(16), color: t.text3 }}>/ {totalRounds}</Text></Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 1 }}>TOTAL</Text>
              <Text style={{ fontSize: t.fs(20), fontWeight: '900', color: accentColor }}>{parseInt(emomMins || 0) * parseInt(emomRounds || 0)} min</Text>
            </View>
          </View>
        )}

        <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 4, borderColor: t.border }} />
          <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 4,
            borderTopColor: progress > 0.75 ? accentColor : 'transparent',
            borderRightColor: progress > 0.5 ? accentColor : 'transparent',
            borderBottomColor: progress > 0.25 ? accentColor : 'transparent',
            borderLeftColor: seconds > 0 ? accentColor : 'transparent',
            transform: [{ rotate: '-90deg' }] }} />
          <Text style={{ fontSize: t.fs(52), fontWeight: '900', color: running ? t.text : t.text2, letterSpacing: 2 }}>{display}</Text>
          <Text style={{ fontSize: t.fs(10), color: seconds === 0 ? '#52b788' : t.text3, letterSpacing: 3, marginTop: 4 }}>{timerStatus}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center', marginBottom: 32 }}>
          <TouchableOpacity onPress={reset} style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: accentColor, backgroundColor: accentColor + '15', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: t.fs(20), color: accentColor }}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggle} style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: seconds === 0 ? t.border : accentColor, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: t.fs(28), color: '#fff' }}>{running ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setRounds(r => r + 1)} style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: accentColor, backgroundColor: accentColor + '15', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: t.fs(18), color: accentColor, fontWeight: '700' }}>+1</Text>
          </TouchableOpacity>
        </View>

        {mode !== 'EMOM' && (
          <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 20, width: '100%', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, marginBottom: 10 }}>RONDAS COMPLETADAS</Text>
            <Text style={{ fontSize: t.fs(64), fontWeight: '900', color: t.text, lineHeight: t.fs(68) }}>{rounds}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, width: '100%' }}>
              <TouchableOpacity onPress={() => setRounds(r => Math.max(0, r - 1))} style={{ flex: 1, padding: 12, backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, alignItems: 'center' }}>
                <Text style={{ color: t.text2, fontWeight: '700', fontSize: t.fs(13) }}>− Ronda</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRounds(r => r + 1)} style={{ flex: 1, padding: 12, backgroundColor: accentColor, borderRadius: 8, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: t.fs(13) }}>+ Ronda</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, width: '100%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2 }}>WOD HOY</Text>
            {todayDay && (
              <Text style={{ fontSize: t.fs(9), color: accentColor, fontWeight: '700', letterSpacing: 1 }}>
                {todayDay.wod?.type} · {todayDay.wod?.duration}
              </Text>
            )}
          </View>
          {!activeProgram || allDays.length === 0 ? (
            <Text style={{ fontSize: t.fs(12), color: t.text3, textAlign: 'center', paddingVertical: 8 }}>
              Cargando programa...
            </Text>
          ) : !todayInProgram || !todayDay ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ fontSize: t.fs(20), marginBottom: 6 }}>🕊️</Text>
              <Text style={{ fontSize: t.fs(12), color: t.text3, textAlign: 'center' }}>
                Sin WOD programado hoy
              </Text>
            </View>
          ) : wodMovements.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ fontSize: t.fs(12), color: t.text3, textAlign: 'center' }}>
                {todayDay.type === 'Libre' ? '🕊️ Sesión libre' : 'Sin movimientos definidos'}
              </Text>
            </View>
          ) : (
            wodMovements.map((m, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, borderLeftWidth: 3, borderLeftColor: accentColor, padding: 8, marginBottom: 6, backgroundColor: t.bg4, borderRadius: 6 }}>
                <Text style={{ minWidth: 30, fontSize: t.fs(13), fontWeight: '700', color: accentColor }}>{m.reps}</Text>
                <View>
                  <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>{m.name}</Text>
                  {m.weight && m.weight !== 'BW' && (
                    <Text style={{ fontSize: t.fs(10), color: t.text2, marginTop: 1 }}>{m.weight}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}