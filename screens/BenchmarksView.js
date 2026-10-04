import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useTheme } from '../ThemeContext';
import { BENCHMARKS } from '../benchmarks';
import { getBenchmarkHistory, bestOf, formatScore, formatShortDate, parseScore } from '../benchmarkLogic';

// Vista BENCHMARKS de la pantalla de marcas: catálogo con tu mejor marca, fecha e historial.
export default function BenchmarksView({ resultados, wodsLibres, genero, accentColor }) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(null);
  const esFem = genero === 'F';

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
      {BENCHMARKS.map(bm => {
        const history = getBenchmarkHistory(bm.key, resultados, wodsLibres);
        const best = bestOf(history, bm.scoring);
        const isOpen = expanded === bm.key;
        return (
          <TouchableOpacity key={bm.key} activeOpacity={0.8}
            onPress={() => setExpanded(isOpen ? null : bm.key)}
            style={{ backgroundColor: t.card, borderWidth: 1, borderColor: isOpen ? accentColor : t.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, letterSpacing: 1 }}>{bm.nombre.toUpperCase()}</Text>
                <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginTop: 2 }}>
                  {bm.tipo}{history.length ? ` · ${history.length} ${history.length === 1 ? 'intento' : 'intentos'}` : ''}
                </Text>
              </View>
              {best ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: t.fs(20), fontWeight: '900', color: accentColor }}>{formatScore(best.score, bm.scoring)}</Text>
                    <View style={{ backgroundColor: best.rx ? accentColor + '25' : t.bg4, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: t.fs(9), fontWeight: '800', color: best.rx ? accentColor : t.text3 }}>{best.rx ? 'Rx' : 'Scaled'}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: t.fs(9), color: t.text3, marginTop: 2 }}>{formatShortDate(best.fecha)}</Text>
                </View>
              ) : (
                <Text style={{ fontSize: t.fs(11), color: t.text3 }}>Sin registrar</Text>
              )}
            </View>

            {isOpen && (
              <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 12 }}>
                <Text style={{ fontSize: t.fs(12), color: t.text2, lineHeight: 18 }}>{bm.descripcion}</Text>

                <Text style={{ fontSize: t.fs(9), color: accentColor, letterSpacing: 2, fontWeight: '700', marginTop: 12, marginBottom: 6 }}>PESOS RX</Text>
                <View style={{ gap: 4 }}>
                  {[{ s: '♂', v: bm.rx.m, mine: !esFem }, { s: '♀', v: bm.rx.f, mine: esFem }].map(r => (
                    <Text key={r.s} style={{ fontSize: t.fs(12), color: r.mine ? t.text : t.text3, fontWeight: r.mine ? '800' : '500' }}>
                      {r.s} {r.v}
                    </Text>
                  ))}
                </View>

                <Text style={{ fontSize: t.fs(9), color: accentColor, letterSpacing: 2, fontWeight: '700', marginTop: 12, marginBottom: 6 }}>HISTORIAL</Text>
                {history.length === 0 ? (
                  <Text style={{ fontSize: t.fs(11), color: t.text3 }}>Aún no has registrado este benchmark. Anótalo desde el WOD del día o creando un WOD libre.</Text>
                ) : history.map((h, i) => (
                  <View key={`${h.fecha}-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: i < history.length - 1 ? 1 : 0, borderBottomColor: t.border }}>
                    <Text style={{ fontSize: t.fs(11), color: t.text3, width: 60 }}>{formatShortDate(h.fecha)}</Text>
                    <Text style={{ fontSize: t.fs(12), color: t.text, fontWeight: '700', flex: 1 }}>
                      {parseScore(h.resultado, bm.scoring) != null ? formatScore(parseScore(h.resultado, bm.scoring), bm.scoring) : h.resultado}
                    </Text>
                    <Text style={{ fontSize: t.fs(10), color: h.rx ? accentColor : t.text3, fontWeight: '700' }}>{h.rx ? 'Rx' : 'Scaled'}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
