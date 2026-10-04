import { View, Platform, Alert } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
// react-native-view-shot y expo-sharing no tienen implementación web útil
// (captura/compartir imagen no disponible en navegador) — se cargan solo en nativo.
const ViewShot = Platform.OS !== 'web' ? require('react-native-view-shot').default : View;
const Sharing = Platform.OS !== 'web' ? require('expo-sharing') : null;
import ShareResultCard from '../ShareResultCard';

const raf = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(fn, 16));

// Comparte un resultado como imagen. La tarjeta se monta fuera de pantalla solo
// mientras dura la captura (apta para listas con muchas filas).
export function useShareResult({ acento } = {}) {
  const [target, setTarget] = useState(null);
  const [sharing, setSharing] = useState(false);
  const shotRef = useRef(null);
  const resolveReady = useRef(null);
  const busy = useRef(false);

  // Cuando el host ha montado la tarjeta, esperamos dos frames para que el layout termine.
  useEffect(() => {
    if (target && resolveReady.current) {
      const resolve = resolveReady.current;
      resolveReady.current = null;
      raf(() => raf(() => resolve()));
    }
  }, [target]);

  const share = useCallback(async (shareable) => {
    if (Platform.OS === 'web') {
      Alert.alert('No disponible', 'Compartir el resultado como imagen no está disponible en la versión web.');
      return;
    }
    if (!shareable || busy.current) return;
    busy.current = true;
    setSharing(true);
    try {
      const ready = new Promise((resolve) => { resolveReady.current = resolve; });
      setTarget(shareable);
      await ready;
      if (!shotRef.current) return;
      const uri = await shotRef.current.capture();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartir resultado WOD',
      });
    } catch (_) {}
    finally {
      busy.current = false;
      resolveReady.current = null;
      setSharing(false);
      setTarget(null);
    }
  }, []);

  const ShareHost = useCallback(() => {
    if (!target) return null;
    return (
      <View style={{ position: 'absolute', top: 0, left: -400 }} collapsable={false}>
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 0.95, result: 'tmpfile' }}>
          <ShareResultCard shareable={target} acento={acento} />
        </ViewShot>
      </View>
    );
  }, [target, acento]);

  return { share, sharing, ShareHost };
}

export default useShareResult;
