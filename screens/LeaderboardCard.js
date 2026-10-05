import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { supabase } from '../supabase';
import { useApp } from '../AppContext';
import { scoringForWod, rankLeaderboard } from '../leaderboardLogic';

const iniciales = (nombre) =>
  (nombre || '?').split(' ').filter(Boolean).map(p => p[0]).join('').substring(0, 2).toUpperCase();

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

  const scoring = useMemo(() => scoringForWod(day?.wod), [day]);
  const ranking = useMemo(() => rankLeaderboard(rows || [], scoring), [rows, scoring]);
  const lista = ranking[tab];

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
          {lista.map(r => (
            <View key={r.user_id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8, backgroundColor: r.es_yo ? t.accent + '18' : 'transparent', borderWidth: r.es_yo ? 1 : 0, borderColor: t.accent + '60' }}>
              <Text style={{ width: 24, fontSize: t.fs(13), fontWeight: '900', color: t.text2, textAlign: 'center' }}>{r.pos ?? '–'}</Text>
              {r.avatar_url ? (
                <Image source={{ uri: r.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16 }} />
              ) : (
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.accent + '25', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: t.fs(11), fontWeight: '900', color: t.accent }}>{iniciales(r.nombre)}</Text>
                </View>
              )}
              <Text numberOfLines={1} style={{ flex: 1, fontSize: t.fs(13), fontWeight: r.es_yo ? '900' : '600', color: t.text }}>
                {r.nombre || 'Atleta'}{r.es_yo ? ' (Tú)' : ''}
              </Text>
              <Text style={{ fontSize: t.fs(13), fontWeight: '800', color: t.text }}>{r.resultado || '—'}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}
