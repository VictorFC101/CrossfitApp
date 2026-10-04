import { View, Text } from 'react-native';

// ── Tarjeta de resultados para compartir ──────────────────────
export function ShareResultCard({ shareable, acento }) {
  if (!shareable) return null;
  const { title, dateLabel, typeLabel, durationLabel, movements, resultado, resultParts, chip, notas, breakdown } = shareable;
  const { time: timePart, rounds: ron, reps: rep } = resultParts;
  const roundsSeg  = ron ? `${ron}+${rep}` : '';
  const hasBreakdown = (breakdown || []).length >= 2;
  const hasParsed = !!(timePart || roundsSeg);
  const isRx = chip === 'RX';
  const isLibre = chip === 'LIBRE';
  const chipColor = isLibre ? '#a0a0b8' : isRx ? '#52b788' : '#f4a261';
  const typeLine = [typeLabel, durationLabel].filter(Boolean).join(' · ');

  return (
    <View style={{ width: 320, backgroundColor: '#0a0a12', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: acento + '40' }}>

      {/* Cabecera */}
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 18 }}>⚡</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 3 }}>WODLY</Text>
        </View>
        <Text style={{ fontSize: 11, color: '#ffffff45' }}>{dateLabel}</Text>
      </View>

      {/* Línea acento */}
      <View style={{ height: 2, backgroundColor: acento + '70', marginHorizontal: 20, borderRadius: 1 }} />

      {/* Día + tipo */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1, marginBottom: 3 }}>
          {(title || '').toUpperCase()}
        </Text>
        {!!typeLine && (
          <Text style={{ fontSize: 10, color: '#ffffff50', letterSpacing: 1 }}>
            {typeLine}
          </Text>
        )}
      </View>

      {/* Movimientos */}
      {(movements || []).length > 0 && (
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

        {hasBreakdown ? (
          (breakdown).map((b, i) => (
            <View key={i} style={{ backgroundColor: acento + '12', borderWidth: 1, borderColor: acento + '30', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: 1 }} numberOfLines={1} adjustsFontSizeToFit>{b.resultado}</Text>
              <Text style={{ fontSize: 9, color: acento, letterSpacing: 2, fontWeight: '700', marginTop: 6 }}>{(b.label || '').toUpperCase()}</Text>
            </View>
          ))
        ) : !hasParsed && !!resultado ? (
          <View style={{ backgroundColor: acento + '12', borderWidth: 1, borderColor: acento + '30', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: 1 }} numberOfLines={2} adjustsFontSizeToFit>{resultado}</Text>
            <Text style={{ fontSize: 9, color: acento, letterSpacing: 2, fontWeight: '700', marginTop: 6 }}>RESULTADO</Text>
          </View>
        ) : (
          <>
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
          </>
        )}

        {/* Rx / Scaled */}
        {!!chip && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: chipColor + '15', borderWidth: 1, borderColor: chipColor + '55', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: chipColor, letterSpacing: 1 }}>{isRx ? '✓ Rx' : isLibre ? 'LIBRE' : '⚡ Scaled'}</Text>
            </View>
          </View>
        )}
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

export default ShareResultCard;
