import { View, Text, ScrollView } from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabase';
import { useTheme } from '../../ThemeContext';
import { PanelHeader, Estado, Chips, cardStyle } from './ui';
import { Avatar, textoUltimo } from './atletaUi';
import { agruparPorSemana, adherenciaSemana, resultadosComoMapa, libresParaBenchmarks, libresComoResultados } from '../../coachLogic';
import { buildRmsByReps, formatRmLabel } from '../../rmLogic';
import { RM_NAMES, RM_REPS, COACH_SIN_PERMISO } from '../../constants';
import { BENCHMARKS } from '../../benchmarks';
import { getBenchmarkHistory, bestOf, formatScore, formatShortDate } from '../../benchmarkLogic';
import { enrichProgram, rowToProgram } from '../../programLogic';

const TABS = [
  { value: 'resultados', label: 'Resultados' },
  { value: 'rms', label: 'RMs' },
  { value: 'benchmarks', label: 'Benchmarks' },
];

function Insignia({ texto, color }) {
  const t = useTheme();
  return (
    <View style={{ borderWidth: 1, borderColor: color, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
      <Text style={{ fontSize: t.fs(9), fontWeight: '700', color }}>{texto}</Text>
    </View>
  );
}

function Vacio({ texto }) {
  const t = useTheme();
  return <Text style={{ color: t.text3, fontSize: t.fs(13), textAlign: 'center', marginTop: 30 }}>{texto}</Text>;
}

function TabResultados({ resultados, tituloDe }) {
  const t = useTheme();
  const grupos = useMemo(() => agruparPorSemana(resultados), [resultados]);
  if (!grupos.length) return <Vacio texto="Este atleta aún no tiene resultados." />;
  return grupos.map(g => (
    <View key={g.clave}>
      <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 1, fontWeight: '700', marginBottom: 8, marginTop: 4 }}>
        SEMANA DEL {formatShortDate(g.lunes).toUpperCase()}
      </Text>
      {g.items.map((r, i) => {
        const titulo = tituloDe(r);
        return (
          <View key={`${r.dia}-${r.fecha}-${i}`} style={cardStyle(t)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: t.text2 }}>{r.dia}</Text>
              <Insignia texto={r.rx === false ? 'Scaled' : 'Rx'} color={r.rx === false ? t.text3 : t.accent} />
            </View>
            {!!titulo && <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>{titulo}</Text>}
            <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: t.text, marginTop: 4 }}>{r.resultado}</Text>
            {Array.isArray(r.partes) && r.partes.map((p, j) => (
              <Text key={j} style={{ fontSize: t.fs(11), color: t.text2, marginTop: 2 }}>
                {p.label}: {p.resultado}{p.rx === false ? ' (Scaled)' : ''}{p.notas ? ` — ${p.notas}` : ''}
              </Text>
            ))}
            {!!r.notas && (
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: t.fs(9), color: t.text3, fontWeight: '700', letterSpacing: 1 }}>NOTAS DEL ATLETA</Text>
                <Text style={{ fontSize: t.fs(12), color: t.text2, fontStyle: 'italic', marginTop: 2 }}>"{r.notas}"</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  ));
}

function TabRms({ rms, historial }) {
  const t = useTheme();
  const [mov, setMov] = useState(null);
  const actuales = useMemo(() => buildRmsByReps(
    [...(rms || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))), [rms]);
  const movs = Object.keys(actuales);
  const activo = mov && actuales[mov] ? mov : movs[0];
  if (!movs.length) return <Vacio texto="Este atleta aún no ha registrado RMs." />;
  const hist = (historial || []).filter(h => h.movimiento === activo)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return (
    <>
      <Chips opciones={movs.map(m => ({ value: m, label: RM_NAMES[m] || m }))} valor={activo} onChange={setMov} />
      <View style={cardStyle(t)}>
        <Text style={{ fontSize: t.fs(10), color: t.text3, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>MARCAS ACTUALES</Text>
        {RM_REPS.map(r => (
          <View key={r} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
            <Text style={{ fontSize: t.fs(13), color: t.text2 }}>{formatRmLabel(r)}</Text>
            <Text style={{ fontSize: t.fs(13), fontWeight: '800', color: t.text }}>{actuales[activo]?.[r] ? `${actuales[activo][r]} kg` : '—'}</Text>
          </View>
        ))}
      </View>
      <View style={cardStyle(t)}>
        <Text style={{ fontSize: t.fs(10), color: t.text3, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>PROGRESO</Text>
        {hist.length === 0 && <Text style={{ fontSize: t.fs(12), color: t.text3 }}>Sin historial.</Text>}
        {hist.map((h, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
            <Text style={{ fontSize: t.fs(12), color: t.text3 }}>{formatShortDate(h.fecha)} · {formatRmLabel(h.reps)}</Text>
            <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: t.text }}>{h.peso} kg</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function TabBenchmarks({ resultados, libres }) {
  const t = useTheme();
  const filas = useMemo(() => {
    const mapa = resultadosComoMapa(resultados);
    const libresBm = libresParaBenchmarks(libres);
    return BENCHMARKS.map(b => {
      const hist = getBenchmarkHistory(b.key, mapa, libresBm);
      const mejor = bestOf(hist, b.scoring);
      return mejor ? { b, mejor, intentos: hist.length } : null;
    }).filter(Boolean);
  }, [resultados, libres]);
  if (!filas.length) return <Vacio texto="Este atleta aún no tiene benchmarks registrados." />;
  return filas.map(({ b, mejor, intentos }) => (
    <View key={b.key} style={[cardStyle(t), { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
      <View>
        <Text style={{ fontSize: t.fs(14), fontWeight: '900', color: t.text }}>{b.nombre}</Text>
        <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>{formatShortDate(mejor.fecha)} · {intentos} {intentos === 1 ? 'intento' : 'intentos'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: t.accent }}>{formatScore(mejor.score, b.scoring)}</Text>
        <Insignia texto={mejor.rx ? 'Rx' : 'Scaled'} color={mejor.rx ? t.accent : t.text3} />
      </View>
    </View>
  ));
}

export default function AdminAtletaDetalle({ atleta, onClose }) {
  const t = useTheme();
  const [tab, setTab] = useState('resultados');
  const [det, setDet] = useState(null);
  const [programa, setPrograma] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: e } = await supabase.rpc('coach_athlete_detail', { p_user_id: atleta.id });
    if (e) {
      setError(e.code === '42501' ? COACH_SIN_PERMISO : 'No se pudo cargar el detalle del atleta.');
      setLoading(false); return;
    }
    setDet(data || { resultados: [], rms: [], rms_historial: [] });
    setLoading(false);
    // Programa (opcional): si el coach no puede leerlo se omite sin error
    if (atleta.programa_id) {
      try {
        const { data: row } = await supabase.from('programas').select('id,name,data').eq('id', atleta.programa_id).maybeSingle();
        if (row) setPrograma(enrichProgram(rowToProgram(row)));
      } catch (_) { /* sin acceso al programa */ }
    }
  }, [atleta.id, atleta.programa_id]);
  useEffect(() => { cargar(); }, [cargar]);

  const dias = useMemo(() => (programa?.weeks || []).flatMap(w => w.days || []), [programa]);
  const resultados = det?.resultados || [];
  const resultadosTodos = useMemo(() => [...resultados, ...libresComoResultados(det?.wods_libres)], [resultados, det]);
  const adherencia = useMemo(
    () => adherenciaSemana(dias, resultados.filter(r => !r.programa_id || r.programa_id === atleta.programa_id).map(r => r.dia)),
    [dias, resultados, atleta.programa_id]);

  const tituloDe = (r) => {
    if (!programa || (r.programa_id && r.programa_id !== programa.id)) return '';
    const d = dias.find(x => x.day === r.dia);
    if (!d) return '';
    return d.wod?.title || d.wod?.name || [d.wod?.type, d.wod?.duration].filter(Boolean).join(' ') || d.strength?.title || '';
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PanelHeader titulo="ATLETA" onClose={onClose} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        <View style={[cardStyle(t), { flexDirection: 'row', gap: 12, alignItems: 'center' }]}>
          <Avatar nombre={atleta.nombre} url={atleta.avatar_url} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text }}>{atleta.nombre}</Text>
            {!!atleta.programa_nombre && <Text style={{ fontSize: t.fs(12), color: t.text2, marginTop: 2 }}>{atleta.programa_nombre}</Text>}
            <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>{textoUltimo(atleta.ultimo_resultado)}</Text>
            {adherencia && (
              <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: t.accent, marginTop: 4 }}>
                Esta semana: {adherencia.hechos}/{adherencia.programados} entrenos
              </Text>
            )}
          </View>
        </View>
        <Chips opciones={TABS} valor={tab} onChange={setTab} />
        <Estado loading={loading} error={error} onReintentar={cargar} />
        {!loading && !error && det && (
          tab === 'resultados' ? <TabResultados resultados={resultadosTodos} tituloDe={tituloDe} />
          : tab === 'rms' ? <TabRms rms={det.rms} historial={det.rms_historial} />
          : <TabBenchmarks resultados={resultados} libres={det.wods_libres} />
        )}
      </ScrollView>
    </View>
  );
}
