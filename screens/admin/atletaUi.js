import { View, Text, Image } from 'react-native';
import { useTheme } from '../../ThemeContext';
import { diasSinRegistrar } from '../../coachLogic';

// Avatar con iniciales como respaldo
export function Avatar({ nombre, url, size = 40 }) {
  const t = useTheme();
  const ini = (nombre || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg4 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: t.fs(size * 0.35), fontWeight: '800', color: t.text2 }}>{ini}</Text>
    </View>
  );
}

export function textoUltimo(ultimo, now = new Date()) {
  const d = diasSinRegistrar(ultimo, now);
  if (d === null) return 'sin registros';
  if (d === 0) return 'último registro: hoy';
  return `último registro: hace ${d} ${d === 1 ? 'día' : 'días'}`;
}
