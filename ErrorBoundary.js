import { Component } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from './ThemeContext';

function ErrorFallback({ onRetry }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
      <Text style={{ color: t.text, fontSize: t.fs(18), fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
        Algo ha fallado
      </Text>
      <Text style={{ color: t.text3, fontSize: t.fs(13), textAlign: 'center', marginBottom: 24 }}>
        Tus datos están guardados. Vuelve a intentarlo.
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{ backgroundColor: t.accent, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 }}
      >
        <Text style={{ color: '#fff', fontSize: t.fs(14), fontWeight: '800', letterSpacing: 1 }}>REINTENTAR</Text>
      </TouchableOpacity>
    </View>
  );
}

// Evita la "pantalla en blanco": cualquier error de render muestra un fallback con Reintentar,
// que remonta el árbol completo (providers incluidos) y recarga desde caché + red.
export default class ErrorBoundary extends Component {
  state = { hasError: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.warn('ErrorBoundary:', error?.message, info?.componentStack);
  }

  retry = () => this.setState(s => ({ hasError: false, attempt: s.attempt + 1 }));

  render() {
    if (this.state.hasError) return <ErrorFallback onRetry={this.retry} />;
    return <View key={this.state.attempt} style={{ flex: 1 }}>{this.props.children}</View>;
  }
}
