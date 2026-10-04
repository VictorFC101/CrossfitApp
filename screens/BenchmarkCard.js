import { View, Text } from 'react-native';
import { useTheme } from '../ThemeContext';
import { getBenchmark } from '../benchmarks';
import { getBenchmarkHistory, bestOf, lastOf, formatScore, formatShortDate, parseScore } from '../benchmarkLogic';

// Tarjeta compacta: "Última vez: 7:45 (12 mar) · Mejor: 7:12". No pinta nada sin historial.
export default function BenchmarkCard({ benchmarkKey, resultados, wodsLibres, excludeDia }) {
  const t = useTheme();
  const bm = getBenchmark(benchmarkKey);
  if (!bm) return null;
  const history = getBenchmarkHistory(benchmarkKey, resultados, wodsLibres, { excludeDia });
  const last = lastOf(history, bm.scoring);
  if (!last) return null;
  const best = bestOf(history, bm.scoring);
  const fecha = formatShortDate(last.fecha);
  return (
    <View style={{ backgroundColor: t.accent + '12', borderWidth: 1, borderColor: t.accent + '40', borderRadius: 10, padding: 10, marginBottom: 12 }}>
      <Text style={{ fontSize: t.fs(9), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 4 }}>
        {bm.nombre.toUpperCase()} · BENCHMARK
      </Text>
      <Text style={{ fontSize: t.fs(12), color: t.text, fontWeight: '700' }}>
        Última vez: {formatScore(parseScore(last.resultado, bm.scoring), bm.scoring)}{fecha ? ` (${fecha})` : ''}
        {best ? ` · Mejor: ${formatScore(best.score, bm.scoring)}` : ''}
      </Text>
    </View>
  );
}
