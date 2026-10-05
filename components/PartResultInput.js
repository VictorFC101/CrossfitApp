import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SCORE, RX_COLORS } from '../constants';

// Entrada de resultado de una parte puntuable, según su tipo de marcador.
//   part:  { key, label, scoreType, blockKind, wodType?, duration? }
//   state: { draft, notas, rx, legacyText }  (ver resultLogic.partStateFromSaved)
//   onChange(patch): patch parcial del estado ({ draft } | { rx } | { notas })
export default function PartResultInput({ part, state, onChange, t }) {
  const st = state || {};
  const draft = st.draft || {};
  const isRx = st.rx !== false;
  const setDraft = fields => onChange({ draft: { ...draft, ...fields } });
  const decimal = v => v.replace(/[^0-9.,]/g, '');
  const digits = v => v.replace(/[^0-9]/g, '');

  const inp = { backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, fontWeight: '700', padding: 12, textAlign: 'center', fontSize: t.fs(28) };
  const lbl = { fontSize: t.fs(9), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 6, textAlign: 'center' };
  const sep = { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12 };
  const sepTxt = { fontSize: t.fs(22), color: t.text3, fontWeight: '900' };
  const field = (label, value, onText, opts = {}) => (
    <View style={{ flex: 1 }}>
      <Text style={lbl}>{label}</Text>
      <TextInput value={value || ''} onChangeText={onText} keyboardType={opts.decimal ? 'decimal-pad' : 'numeric'}
        placeholder={opts.placeholder || '0'} placeholderTextColor={t.text3} style={inp} />
    </View>
  );

  const type = part.scoreType;
  const hasLegacyRounds = !!draft.rondas;
  const showRounds = type === SCORE.ROUNDS_REPS || hasLegacyRounds;
  const showTime = type === SCORE.TIME || type === SCORE.ROUNDS_REPS;

  const timeRow = (
    <>
      <Text style={[lbl, { marginBottom: 8 }]}>{type === SCORE.ROUNDS_REPS ? 'TIEMPO (OPCIONAL)' : 'TIEMPO REALIZADO'}</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        {field('MIN', draft.minutos, v => setDraft({ minutos: digits(v) }), { placeholder: '00' })}
        <View style={sep}><Text style={sepTxt}>:</Text></View>
        {field('SEG', draft.segundos, v => setDraft({ segundos: digits(v) }), { placeholder: '00' })}
      </View>
    </>
  );
  const roundsRow = (
    <>
      <Text style={[lbl, { marginBottom: 8 }]}>RONDAS + REPS</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        {field('RONDAS', draft.rondas, v => setDraft({ rondas: digits(v) }))}
        <View style={sep}><Text style={sepTxt}>+</Text></View>
        {field('REPS EXTRA', draft.repsExtra, v => setDraft({ repsExtra: digits(v) }))}
      </View>
    </>
  );

  return (
    <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '30', borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.accent, letterSpacing: 1, flexShrink: 1 }}>{part.label}</Text>
        {!!part.wodType && (
          <View style={{ backgroundColor: t.accent + '15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: t.fs(8), color: t.accent, fontWeight: '700' }}>
              {part.wodType}{part.duration ? ` · ${part.duration}` : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {[[true, 'Rx'], [false, 'Scaled']].map(([val, text]) => {
          const on = isRx === val;
          const c = val ? RX_COLORS.RX : RX_COLORS.SCALED;
          return (
            <TouchableOpacity key={text} onPress={() => onChange({ rx: val })}
              style={{ flex: 1, backgroundColor: on ? c + '20' : t.bg4, borderWidth: 1.5, borderColor: on ? c : t.border, borderRadius: 8, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(12), fontWeight: '900', color: on ? c : t.text3 }}>{text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!!st.legacyText && (
        <View style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, fontWeight: '700', marginBottom: 2 }}>VALOR ANTERIOR (SE CONSERVA SI NO LO CAMBIAS)</Text>
          <Text style={{ fontSize: t.fs(14), color: t.text, fontWeight: '700' }}>{st.legacyText}</Text>
        </View>
      )}

      {type === SCORE.LOAD && (
        <>
          <Text style={[lbl, { marginBottom: 8 }]}>MEJOR SERIE</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            {field('KG', draft.kg, v => setDraft({ kg: decimal(v) }), { decimal: true })}
            <View style={sep}><Text style={sepTxt}>×</Text></View>
            {field('REPS', draft.reps, v => setDraft({ reps: digits(v) }))}
          </View>
        </>
      )}
      {type === SCORE.REPS && (
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          {field('REPS', draft.reps, v => setDraft({ reps: digits(v) }))}
        </View>
      )}
      {showTime && timeRow}
      {showRounds && roundsRow}

      <TextInput value={st.notas || ''} onChangeText={v => onChange({ notas: v })}
        placeholder="Notas..." placeholderTextColor={t.text3} multiline numberOfLines={2}
        style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, fontSize: t.fs(13), padding: 12, textAlignVertical: 'top' }} />
    </View>
  );
}
