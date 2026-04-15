import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useApp } from '../AppContext';
import { useTheme } from '../ThemeContext';

const movements = [
  { key: 'cj', name: 'CLEAN & JERK', pcts: [0.65, 0.72, 0.78, 0.80, 0.85, 0.90] },
  { key: 'sn', name: 'SNATCH', pcts: [0.60, 0.68, 0.75, 0.80, 0.85, 0.90] },
  { key: 'bs', name: 'BACK SQUAT', pcts: [0.70, 0.78, 0.83, 0.85, 0.90, 0.95] },
  { key: 'dl', name: 'DEADLIFT', pcts: [0.72, 0.80, 0.85, 0.88, 0.92, 0.95] },
  { key: 'fs', name: 'FRONT SQUAT', pcts: [0.70, 0.78, 0.82, 0.85, 0.90, 0.95] },
  { key: 'sp', name: 'STRICT PRESS', pcts: [0.70, 0.75, 0.80, 0.82, 0.85, 0.90] },
];

export default function RMScreen() {
  const { rms, saveRM } = useApp();
  const t = useTheme();
  const [expanded, setExpanded] = useState('cj');
  const [saved, setSaved] = useState(null);

  const handleSave = async (key, val) => {
    await saveRM(key, val);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 20, paddingTop: 60 }}>
        <Text style={{ fontSize: t.fs(10), color: t.accent + '88', letterSpacing: 4, fontWeight: '700' }}>TUS MARCAS PERSONALES</Text>
        <Text style={{ fontSize: t.fs(32), fontWeight: '900', letterSpacing: 2, color: t.text, marginTop: 4 }}>MIS 1RM</Text>
        <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 4 }}>Se sincronizan automáticamente con el WOD</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        {movements.map((mv) => {
          const isOpen = expanded === mv.key;
          const val = parseFloat(rms[mv.key]);
          const hasRM = val > 0;
          const isSaved = saved === mv.key;

          return (
            <TouchableOpacity key={mv.key} onPress={() => setExpanded(isOpen ? null : mv.key)}
              style={{ backgroundColor: t.card, borderWidth: 1, borderColor: isOpen ? t.accent + '50' : t.border, borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
                <View>
                  <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, letterSpacing: 1 }}>{mv.name}</Text>
                  {hasRM
                    ? <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>1RM guardado: {rms[mv.key]} kg</Text>
                    : <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>Sin marca registrada</Text>
                  }
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: t.fs(28), fontWeight: '900', color: hasRM ? t.accent : t.text3 }}>
                    {hasRM ? rms[mv.key] : '—'}
                  </Text>
                  <Text style={{ fontSize: t.fs(9), color: t.text3 }}>KG</Text>
                </View>
              </View>

              {isOpen && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: t.border }}>

                  <View style={{ marginTop: 12, marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700' }}>ACTUALIZAR 1RM</Text>
                      {isSaved && <Text style={{ fontSize: t.fs(10), color: '#52b788', fontWeight: '700' }}>✓ GUARDADO</Text>}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        value={rms[mv.key] || ''}
                        onChangeText={(v) => handleSave(mv.key, v)}
                        keyboardType="numeric"
                        placeholder="kg"
                        placeholderTextColor={t.text3}
                        style={{ flex: 1, backgroundColor: t.bg4, borderWidth: 1, borderColor: t.accent + '40', borderRadius: 8, color: t.text, fontSize: t.fs(18), fontWeight: '700', padding: 12 }}
                      />
                      <View style={{ justifyContent: 'center', paddingHorizontal: 12, backgroundColor: t.accent + '15', borderRadius: 8, borderWidth: 1, borderColor: t.accent + '30' }}>
                        <Text style={{ fontSize: t.fs(13), color: t.accent, fontWeight: '700' }}>KG</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 6 }}>
                      Se actualiza en el WOD automáticamente
                    </Text>
                  </View>

                  {hasRM && (
                    <View>
                      <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, marginBottom: 8 }}>TABLA DE PESOS</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {mv.pcts.map((p) => (
                          <View key={p} style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 10, minWidth: 90, alignItems: 'center' }}>
                            <Text style={{ fontSize: t.fs(11), color: t.text3, marginBottom: 2 }}>{Math.round(p * 100)}%</Text>
                            <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.accent }}>
                              {Math.round(val * p)}<Text style={{ fontSize: t.fs(10), color: t.text3 }}> kg</Text>
                            </Text>
                          </View>
                        ))}
                      </View>

                      <View style={{ marginTop: 14 }}>
                        <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, marginBottom: 8 }}>ZONAS DE INTENSIDAD</Text>
                        {[
                          { label: 'Técnica', range: [0.50, 0.65], color: '#52b788' },
                          { label: 'Fuerza', range: [0.65, 0.80], color: '#4895ef' },
                          { label: 'Potencia', range: [0.80, 0.90], color: '#f4a261' },
                          { label: 'Máximo', range: [0.90, 1.00], color: '#e63946' },
                        ].map((z) => (
                          <View key={z.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <Text style={{ fontSize: t.fs(10), color: t.text3, width: 55 }}>{z.label}</Text>
                            <View style={{ flex: 1, height: 6, backgroundColor: t.border, borderRadius: 3 }}>
                              <View style={{ height: 6, width: `${(z.range[1] - z.range[0]) * 100 * 1.4}%`, backgroundColor: z.color, borderRadius: 3, opacity: 0.8 }} />
                            </View>
                            <Text style={{ fontSize: t.fs(10), color: z.color, width: 70, textAlign: 'right' }}>
                              {Math.round(val * z.range[0])}–{Math.round(val * z.range[1])} kg
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}