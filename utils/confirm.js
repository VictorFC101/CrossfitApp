// Diálogos multiplataforma: en react-native-web Alert.alert es un no-op,
// así que los botones con onPress nunca se ejecutan. En web usamos window.confirm/alert.
import { Alert, Platform } from 'react-native';

// Pide confirmación y ejecuta onOk si el usuario acepta.
// destructive: estilo rojo del botón en iOS (por defecto true).
export function confirmar(titulo, mensaje, textoOk, onOk, { destructive = true } = {}) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-undef
    if (typeof window !== 'undefined' && window.confirm(`${titulo}\n${mensaje}`)) onOk();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoOk, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);
}

// Muestra un aviso con un único botón y ejecuta onOk al cerrarlo.
export function avisar(titulo, mensaje, onOk, textoOk = 'OK') {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-undef
    if (typeof window !== 'undefined') window.alert(`${titulo}\n${mensaje}`);
    if (onOk) onOk();
    return;
  }
  Alert.alert(titulo, mensaje, [{ text: textoOk, onPress: onOk }]);
}
