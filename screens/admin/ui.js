import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useTheme } from '../../ThemeContext';

// box_id del admin/coach actual (para crear productos y planes)
export function useMiBoxId() {
  const [boxId, setBoxId] = useState(null);
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('usuarios').select('box_id').eq('id', user.id).maybeSingle();
        if (vivo) setBoxId(data?.box_id ?? null);
      } catch (_) { /* sin box */ }
    })();
    return () => { vivo = false; };
  }, []);
  return boxId;
}

export function PanelHeader({ titulo, onClose, accion }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 56,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text, letterSpacing: 2 }}>{titulo}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {accion}
        <TouchableOpacity onPress={onClose} style={{ backgroundColor: t.bg4, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: t.border }}>
          <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>← VOLVER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function Estado({ loading, error, vacio, textoVacio, onReintentar }) {
  const t = useTheme();
  if (loading) return <ActivityIndicator color={t.accent} style={{ marginTop: 40 }} />;
  if (error) {
    return (
      <View style={{ alignItems: 'center', marginTop: 40, gap: 10 }}>
        <Text style={{ color: t.text2, fontSize: t.fs(13), textAlign: 'center' }}>{error}</Text>
        <Btn label="REINTENTAR" onPress={onReintentar} />
      </View>
    );
  }
  if (vacio) return <Text style={{ color: t.text3, fontSize: t.fs(13), textAlign: 'center', marginTop: 40 }}>{textoVacio}</Text>;
  return null;
}

export function Btn({ label, onPress, primario, peligro, disabled }) {
  const t = useTheme();
  const color = peligro ? t.danger || '#e63946' : primario ? t.accent : t.text2;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}
      style={{ backgroundColor: primario ? t.accent : t.bg4, borderWidth: 1, borderColor: primario ? t.accent : peligro ? color : t.border,
        borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: primario ? t.bg : color }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Campo({ label, value, onChangeText, placeholder, keyboardType, multiline }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: t.fs(10), color: t.text3, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={t.text3}
        keyboardType={keyboardType} multiline={multiline}
        style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 10, color: t.text,
          fontSize: t.fs(13), minHeight: multiline ? 60 : undefined }} />
    </View>
  );
}

export function Chips({ opciones, valor, onChange }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
      {opciones.map(o => {
        const sel = valor === o.value;
        return (
          <TouchableOpacity key={String(o.value)} onPress={() => onChange(o.value)}
            style={{ backgroundColor: sel ? t.accent : t.bg4, borderWidth: 1, borderColor: sel ? t.accent : t.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: sel ? t.bg : t.text2 }}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function cardStyle(t) {
  return { backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, marginBottom: 12 };
}

// Confirmación multiplataforma (Alert con botones no funciona en web)
import { Alert, Platform } from 'react-native';
export function confirmar(titulo, mensaje, textoOk, onOk) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-undef
    if (typeof window !== 'undefined' && window.confirm(`${titulo}\n${mensaje}`)) onOk();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoOk, style: 'destructive', onPress: onOk },
  ]);
}
