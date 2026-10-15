import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { supabase } from '../supabase';
import { useApp } from '../AppContext';
import { scoringForWod, rankLeaderboard, effectiveScoring, formatMark, gapToFirst, detailParts, relativeTime } from '../leaderboardLogic';

const iniciales = (nombre) =>
  (nombre || '?').split(' ').filter(Boolean).map(p => p[0]).join('').substring(0, 2).toUpperCase();

const primerNombre = (r) => (r.es_yo ? 'Tú' : ((r.nombre || 'Atleta').split(' ')[0]));
const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

// Alturas de las barras del podio según la posición (empates = misma altura)
const ALTURA_PODIO = { 1: 84, 2: 62, 3: 48 };

function Avatar({ r, size, t }) {
  return r.avatar_url ? (
    <Image source={{ uri: r.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.accent + '25', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: t.fs(size > 36 ? 13 : 11), fontWeight: '900', color: t.accent }}>{iniciales(r.nombre)}</Text>
    </View>
  );
}

// Podio: 2º · 1º · 3º. Con solo 2 clasificados, 2º · 1º.
function Podio({ lista, scoring, t }) {
  const top = lista.filter(r => r.pos != null && r.pos <= 3);
  const primeros = top.slice(0, 3);
  const orden = primeros.length >= 3 ? [primeros[1], primeros[0], primeros[2]] : [primeros[1], primeros[0]];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
      {orden.map(r => {
        const primero = r.pos === 1;
        const marca = formatMark(r, scoring);
        return (
          <View key={r.user_id} style={{ flex: 1, alignItems: 'center' }}>
            <Avatar r={r} size={primero ? 44 : 36} t={t} />
            <Text numberOfLines={1} style={{ fontSize: t.fs(11), fontWeight: r.es_yo ? '900' : '600', color: r.es_yo ? t.accent : t.text, marginTop: 4, marginBottom: 4, maxWidth: '100%' }}>
              {primerNombre(r)}
            </Text>
            <View style={{ alignSelf: 'stretch', height: ALTURA_PODIO[r.pos] || 48, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: primero ? t.accent + '30' : t.bg2, borderWidth: 1, borderBottomWidth: 0, borderColor: primero ? t.accent : t.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: t.fs(10), fontWeight: '800', color: t.text3 }}>{r.pos}º</Text>
              <Text numberOfLines={1} style={{ fontSize: t.fs(primero ? 18 : 15), fontWeight: '900', color: primero ? t.accent : t.text }}>{marca.short}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Clasificación del box para un WOD. Solo lectura: se recarga al montar, al cambiar el día y con refreshKey.
export default function LeaderboardCard({ day, programaId, refreshKey }) {
  const t = useTheme();
  const { userProfile } = useApp();
  const [rows, setRows] = useState(null); // null = cargando
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('rx');
  const dia = day?.day;

  useEffect(() => {
    if (!dia) return undefined;
    let cancelado = false;
    setError(false);
    supabase.rpc('wod_leaderboard', { p_dia: dia, p_programa_id: programaId ?? null })
      .then(({ data, error: err }) => {
        if (cancelado) return;
        if (err) { setError(true); setRows([]); return; }
        setRows(data || []);
      })
      .catch(() => { if (!cancelado) { setError(true); setRows([]); } });
    return () => { cancelado = true; };
  }, [dia, programaId, refreshKey]);

  const scoringWod = useMemo(() => scoringForWod(day?.wod), [day]);
  const ranking = useMemo(() => rankLeaderboard(rows || [], scoringWod), [rows, scoringWod]);
  // Mismo tipo de marca que usa el ranking (puede inferirse de los resultados)
  const scoring = useMemo(() => effectiveScoring(rows || [], scoringWod), [rows, scoringWod]);
  const lista = ranking[tab];
  const clasificados = lista.filter(r => r.pos != null);
  const primero = clasificados[0] || null;
  const [abierto, setAbierto] = useState(null); // user_id con el detalle desplegado

  const Tab = ({ id, label, count }) => {
    const activo = tab === id;
    return (
      <TouchableOpacity onPress={() => setTab(id)}
        style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: activo ? t.accent + '20' : t.card, borderWidth: 1, borderColor: activo ? t.accent : t.border, borderRadius: 8 }}>
        <Text style={{ fontSize: t.fs(12), fontWeight: '800', color: activo ? t.accent : t.text2 }}>{label} ({count})</Text>
      </TouchableOpacity>
    );
  };

  const vacio = rows && rows.length === 0 && !error;

  return (
    <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, marginTop: 14 }}>
      <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>🏆 Clasificación del box</Text>

      {rows === null && <ActivityIndicator color={t.accent} style={{ marginVertical: 12 }} />}

      {error && (
        <Text style={{ fontSize: t.fs(12), color: t.text3 }}>No se pudo cargar la clasificación. Inténtalo más tarde.</Text>
      )}

      {vacio && (
        <>
          <Text style={{ fontSize: t.fs(12), color: t.text3 }}>
            {userProfile?.box_id ? 'Nadie ha registrado este WOD todavía. ¡Sé el primero!' : 'Únete a un box para ver la clasificación'}
          </Text>
        </>
      )}

      {rows && rows.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <Tab id="rx" label="Rx" count={ranking.rx.length} />
            <Tab id="scaled" label="Scaled" count={ranking.scaled.length} />
          </View>
          {lista.length === 0 && (
            <Text style={{ fontSize: t.fs(12), color: t.text3 }}>Nadie en esta categoría todavía.</Text>
          )}
          {clasificados.length >= 2 && <Podio lista={lista} scoring={scoring} t={t} />}
          {lista.map(r => {
            const marca = formatMark(r, scoring);
            const ilegible = r.pos == null;
            const subtitulo = r.es_yo && r.pos !== 1 ? (gapToFirst(r, primero, scoring) || relativeTime(r.fecha)) : relativeTime(r.fecha);
            const abierta = abierto === r.user_id;
            const detalle = abierta ? detailParts(r, scoring) : [];
            return (
              <View key={r.user_id} style={{ borderRadius: 8, backgroundColor: r.es_yo ? t.accent + '18' : 'transparent', borderWidth: r.es_yo ? 1 : 0, borderColor: t.accent + '60' }}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setAbierto(abierta ? null : r.user_id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8 }}>
                  <Text style={{ width: 24, fontSize: t.fs(13), fontWeight: '900', color: t.text2, textAlign: 'center' }}>{r.pos ?? '–'}</Text>
                  <Avatar r={r} size={32} t={t} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: t.fs(13), fontWeight: r.es_yo ? '900' : '600', color: r.es_yo ? t.accent : t.text }}>
                      {r.es_yo ? 'Tú' : (r.nombre || 'Atleta')}
                    </Text>
                    {!!subtitulo && <Text numberOfLines={1} style={{ fontSize: t.fs(10), color: t.text3, marginTop: 1 }}>{subtitulo}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end', maxWidth: '45%' }}>
                    <Text numberOfLines={1} style={{ fontSize: t.fs(ilegible ? 12 : 16), fontWeight: '900', color: ilegible ? t.text3 : t.text }}>{marca.main}</Text>
                    {!!marca.sub && <Text numberOfLines={1} style={{ fontSize: t.fs(10), color: t.text3 }}>{marca.sub}</Text>}
                  </View>
                </TouchableOpacity>
                {abierta && (
                  <View style={{ paddingHorizontal: 12, paddingBottom: 10, paddingLeft: 78, gap: 2 }}>
                    {detalle.length === 0 && <Text style={{ fontSize: t.fs(11), color: t.text3 }}>Sin más detalle.</Text>}
                    {detalle.map((p, i) => (
                      <Text key={i} style={{ fontSize: t.fs(11), color: t.text2 }}>
                        {p.label ? `${capitalizar(p.label)}: ` : ''}{p.text}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}
