import { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const LOGO_W = width * 0.68;

// Dimensiones reales de cada PNG
const wSrc    = Image.resolveAssetSource(require('./assets/logo-w.png'));
const textSrc = Image.resolveAssetSource(require('./assets/logo-text.png'));
const W_H     = LOGO_W * (wSrc.height / wSrc.width);
const TEXT_H  = LOGO_W * (textSrc.height / textSrc.width);
const TOTAL_H = W_H + TEXT_H;

export default function SplashAnimated({ onFinish }) {
  // Fase 1 — zoom in W
  const wScale  = useRef(new Animated.Value(0.2)).current;
  const wOp     = useRef(new Animated.Value(0)).current;

  // Fase 2 — zoom in WODLY
  const textScale = useRef(new Animated.Value(0.2)).current;
  const textOp    = useRef(new Animated.Value(0)).current;

  // Fase 3 — flash
  const flashOp = useRef(new Animated.Value(0)).current;

  // Fade out de pantalla
  const screenOp = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([

      // Fase 1: W aparece con zoom + spring
      Animated.parallel([
        Animated.spring(wScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(wOp, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),

      Animated.delay(60),

      // Fase 2: WODLY aparece con zoom + spring
      Animated.parallel([
        Animated.spring(textScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(textOp, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),

      Animated.delay(120),

      // Fase 3: flash rápido sobre todo el logo
      Animated.timing(flashOp, { toValue: 0.85, duration: 80,  useNativeDriver: true }),
      Animated.timing(flashOp, { toValue: 0,    duration: 250, useNativeDriver: true }),

      // Pausa y fade out
      Animated.delay(600),
      Animated.timing(screenOp, { toValue: 0, duration: 420, useNativeDriver: true }),

    ]).start(() => onFinish?.());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOp }]}>

      <View style={{ alignItems: 'center' }}>

        {/* ── W: zoom in ─────────────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: wScale }], opacity: wOp }}>
          <Image
            source={require('./assets/logo-w.png')}
            style={{ width: LOGO_W, height: W_H }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* ── WODLY: zoom in ──────────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: textScale }], opacity: textOp }}>
          <Image
            source={require('./assets/logo-text.png')}
            style={{ width: LOGO_W, height: TEXT_H }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* ── Flash blanco sobre el logo completo ────────────────────────── */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: LOGO_W,
            height: TOTAL_H,
            backgroundColor: '#ffffff',
            opacity: flashOp,
          }}
        />

      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
});
