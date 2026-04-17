import { View, Text, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import AdminScreen from './AdminScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { useApp } from '../AppContext';
import { useTheme, ACCENTS, FONT_SCALES } from '../ThemeContext';
import { useProgram } from '../ProgramContext';
import { parseDateFromDay } from '../dateUtils';
import { supabase } from '../supabase';

const movements = [
  { key: 'cj', name: 'C&J', color: '#e63946' },
  { key: 'sn', name: 'SNT', color: '#e63946' },
  { key: 'bs', name: 'BSQ', color: '#4895ef' },
  { key: 'dl', name: 'DL', color: '#4895ef' },
  { key: 'fs', name: 'FSQ', color: '#4895ef' },
  { key: 'sp', name: 'SP', color: '#52b788' },
];

function getProgramInfo(plan) {
  if (!plan) return { title: 'CROSSFIT', subtitle: '', range: '', weeks: 0 };
  const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const allDays = plan.weeks.flatMap(w => w.days);
  const dates = allDays.map(d => parseDateFromDay(d.day)).filter(Boolean);
  if (!dates.length) return { title: 'CROSSFIT', subtitle: '', range: '', weeks: 0 };
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const year = minDate.getFullYear();
  const numWeeks = plan.weeks.length;
  const sameMonth = minDate.getMonth() === maxDate.getMonth();
  const title = sameMonth
    ? `CROSSFIT ${MONTHS_FULL[minDate.getMonth()].toUpperCase()} ${year}`
    : `CROSSFIT ${MONTHS_SHORT[minDate.getMonth()].toUpperCase()}–${MONTHS_SHORT[maxDate.getMonth()].toUpperCase()} ${year}`;
  const range = `${minDate.getDate()} ${MONTHS_SHORT[minDate.getMonth()]} – ${maxDate.getDate()} ${MONTHS_SHORT[maxDate.getMonth()]} · ${numWeeks} semanas`;
  const tipos = [...new Set(allDays.filter(d => d.type !== 'Libre').map(d => d.type))];
  return { title, range, subtitle: tipos.join(' · '), weeks: numWeeks, year };
}

export default function ProfileScreen() {
  const { rms, resultados, userProfile, logout, loadUserProfile } = useApp();
  const t = useTheme();
  const { activeProgram } = useProgram();
  const plan = activeProgram;
  const [nombre, setNombre] = useState('');
  const [genero, setGenero] = useState('M');
  const [editando, setEditando] = useState(false);
  const [saved, setSaved] = useState(false);
  const [foto, setFoto] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const programInfo = getProgramInfo(plan);
  const [showAdmin, setShowAdmin] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef(null);

  const handleSecretTap = () => {
    tapCount.current += 1;
    console.log('TAP COUNT:', tapCount.current);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      setShowAdmin(true);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        // Foto: Supabase Storage como fuente principal, URI local como fallback
        if (userProfile?.avatar_url) {
          setFoto(userProfile.avatar_url);
        } else {
          const f = await AsyncStorage.getItem('user_foto');
          if (f) setFoto(f);
        }
        // Nombre: Supabase como fuente principal, AsyncStorage como fallback
        if (userProfile?.nombre) {
          setNombre(userProfile.nombre);
        } else {
          const n = await AsyncStorage.getItem('user_nombre');
          if (n) setNombre(n);
        }
        const g = await AsyncStorage.getItem('user_genero');
        if (g) setGenero(g);
      } catch (e) {}
    };
    load();
  }, [userProfile]);

  const guardarPerfil = async () => {
    try {
      await AsyncStorage.setItem('user_nombre', nombre);
      await AsyncStorage.setItem('user_genero', genero);
      // Sincronizar nombre con Supabase
      if (userProfile?.id) {
        await supabase.from('usuarios').update({ nombre }).eq('id', userProfile.id);
      }
      setEditando(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {}
  };

  const seleccionarFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setFoto(uri); // preview inmediato
      await AsyncStorage.setItem('user_foto', uri); // fallback garantizado
      if (!userProfile?.id) return;
      try {
        const path = `${userProfile.id}/avatar.jpg`;
        // Leer como base64 y convertir a ArrayBuffer (método fiable en React Native)
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const arrayBuffer = decode(base64);
        // Subir a Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;
        // Obtener URL pública y guardar en tabla usuarios
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(path);
        await supabase.from('usuarios').update({ avatar_url: publicUrl }).eq('id', userProfile.id);
        setFoto(publicUrl);
        // Refrescar userProfile en memoria para que avatar_url esté disponible
        await loadUserProfile(userProfile.id);
      } catch (e) {
        // Upload falló — URI local ya está guardado en AsyncStorage como fallback
      }
    }
  };

  const applyCustomColor = () => {
    const hex = customInput.startsWith('#') ? customInput : '#' + customInput;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      t.setCustom(hex);
      setShowCustom(false);
      setCustomInput('');
    }
  };

  const totalDias = plan ? plan.weeks.reduce((acc, w) =>
    acc + w.days.filter(d => d.type !== 'Libre').length, 0) : 0;
  const completados = Object.keys(resultados).length;
  const totalRMs = Object.keys(rms).filter(k => parseFloat(rms[k]) > 0).length;
  const initials = nombre ? nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() : 'TU';
  
  if (showAdmin) {
    return <AdminScreen onClose={() => setShowAdmin(false)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 20, paddingTop: 60 }}>
        <Text style={{ fontSize: t.fs(9), color: t.accent + '88', letterSpacing: 4, fontWeight: '700' }}>TU PERFIL</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <TouchableOpacity onPress={handleSecretTap}>
            <Text style={{ fontSize: t.fs(28), fontWeight: '900', letterSpacing: 2, color: t.text }}>CUENTA</Text>
          </TouchableOpacity>
          {saved && <Text style={{ fontSize: t.fs(10), color: '#52b788', fontWeight: '700', letterSpacing: 1 }}>✓ GUARDADO</Text>}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>

        {/* AVATAR + NOMBRE */}
        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <TouchableOpacity onPress={seleccionarFoto}
            style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: t.accent + '20', borderWidth: 2, borderColor: t.accent + '60', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {foto
              ? <Image source={{ uri: foto }} style={{ width: 60, height: 60, borderRadius: 30 }} />
              : <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.accent }}>{initials}</Text>}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            {editando ? (
              <TextInput value={nombre} onChangeText={setNombre} placeholder="Tu nombre"
                placeholderTextColor={t.text3} autoFocus
                style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.accent + '40', borderRadius: 8, color: t.text, fontSize: t.fs(16), fontWeight: '700', padding: 10, marginBottom: 6 }} />
            ) : (
              <Text style={{ fontSize: t.fs(18), fontWeight: '900', color: nombre ? t.text : t.text3 }}>
                {nombre || 'Tu nombre'}
              </Text>
            )}
            <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 2 }}>
              {programInfo.title} · En pareja
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => editando ? guardarPerfil() : setEditando(true)}
            style={{ backgroundColor: editando ? t.accent : t.bg4, borderWidth: 1, borderColor: editando ? t.accent : t.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: editando ? '#fff' : t.text2 }}>
              {editando ? 'GUARDAR' : 'EDITAR'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* APARIENCIA */}
        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, marginBottom: 12, fontWeight: '700' }}>🎨 APARIENCIA</Text>

          <Text style={{ fontSize: t.fs(10), color: t.text2, letterSpacing: 1, marginBottom: 8 }}>MODO</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {[{ val: true, label: '🌙 Oscuro' }, { val: false, label: '☀️ Claro' }].map(m => (
              <TouchableOpacity
                key={String(m.val)}
                onPress={() => t.setDark(m.val)}
                style={{ flex: 1, padding: 12, backgroundColor: t.dark === m.val ? t.accent + '20' : t.bg4, borderWidth: 2, borderColor: t.dark === m.val ? t.accent : t.border, borderRadius: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.dark === m.val ? t.accent : t.text2 }}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: t.fs(10), color: t.text2, letterSpacing: 1, marginBottom: 8 }}>COLOR DE ACENTO</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {ACCENTS.map(a => (
              <TouchableOpacity
                key={a.key}
                onPress={() => t.setAccent(a.key)}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: a.color, borderWidth: t.accentKey === a.key ? 3 : 1, borderColor: t.accentKey === a.key ? t.text : t.border, alignItems: 'center', justifyContent: 'center' }}>
                {t.accentKey === a.key && <Text style={{ fontSize: t.fs(14), color: '#fff' }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowCustom(s => !s)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bg4, borderWidth: t.accentKey === 'custom' ? 3 : 1, borderColor: t.accentKey === 'custom' ? t.customColor || t.accent : t.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: t.fs(16) }}>✏️</Text>
            </TouchableOpacity>
          </View>

          {showCustom && (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <TextInput
                value={customInput} onChangeText={setCustomInput}
                placeholder="#ff006e" placeholderTextColor={t.text3}
                autoCapitalize="none" maxLength={7}
                style={{ flex: 1, backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, color: t.text, fontSize: t.fs(14), fontWeight: '700', padding: 10 }} />
              <TouchableOpacity
                onPress={applyCustomColor}
                style={{ backgroundColor: t.accent, borderRadius: 8, padding: 10, paddingHorizontal: 14 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: t.fs(13) }}>OK</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.accent }} />
            <Text style={{ fontSize: t.fs(11), color: t.text2 }}>Color activo: </Text>
            <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: t.accent }}>{t.accent.toUpperCase()}</Text>
          </View>

          <Text style={{ fontSize: t.fs(10), color: t.text2, letterSpacing: 1, marginBottom: 10 }}>TAMAÑO DE LETRA</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FONT_SCALES.map(f => (
              <TouchableOpacity
                key={f.key}
                onPress={() => t.setFontScale(f.scale)}
                style={{ flex: 1, padding: 12, backgroundColor: t.fontScale === f.scale ? t.accent + '20' : t.bg4, borderWidth: 2, borderColor: t.fontScale === f.scale ? t.accent : t.border, borderRadius: 8, alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: f.scale === 1.0 ? 14 : f.scale === 1.2 ? 18 : 22, fontWeight: '900', color: t.fontScale === f.scale ? t.accent : t.text2 }}>{f.label}</Text>
                <Text style={{ fontSize: 9, color: t.fontScale === f.scale ? t.accent : t.text3, letterSpacing: 1 }}>{f.desc.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 8 }}>
            Escala actual: {Math.round(t.fontScale * 100)}% — afecta a toda la app
          </Text>
        </View>

        {/* GÉNERO */}
        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, marginBottom: 10, fontWeight: '700' }}>GÉNERO — PESOS EN WOD</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[{ key: 'M', label: '♂ MASCULINO' }, { key: 'F', label: '♀ FEMENINO' }].map(g => (
              <TouchableOpacity
                key={g.key}
                onPress={async () => { setGenero(g.key); await AsyncStorage.setItem('user_genero', g.key); }}
                style={{ flex: 1, padding: 12, backgroundColor: genero === g.key ? t.accent + '20' : t.bg4, borderWidth: 2, borderColor: genero === g.key ? t.accent : t.border, borderRadius: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: genero === g.key ? t.accent : t.text2 }}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* STATS */}
        <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>STATS DEL MES</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {[
            { val: completados, label: 'WODs COMPLETADOS' },
            { val: totalDias, label: 'TOTAL EN PROGRAMA' }
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(32), fontWeight: '900', color: t.accent }}>{s.val}</Text>
              <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginTop: 4, textAlign: 'center' }}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {[
            { val: totalRMs, label: '1RMs REGISTRADOS' },
            { val: `${totalDias > 0 ? Math.round(completados / totalDias * 100) : 0}%`, label: 'ADHERENCIA' }
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(32), fontWeight: '900', color: t.accent }}>{s.val}</Text>
              <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginTop: 4, textAlign: 'center' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* PROGRESO */}
        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700' }}>PROGRESO DEL BLOQUE</Text>
            <Text style={{ fontSize: t.fs(10), color: t.accent, fontWeight: '700' }}>{completados}/{totalDias}</Text>
          </View>
          <View style={{ height: 6, backgroundColor: t.bg2, borderRadius: 3 }}>
            <View style={{ height: 6, width: `${totalDias > 0 ? completados / totalDias * 100 : 0}%`, backgroundColor: t.accent, borderRadius: 3 }} />
          </View>
        </View>

        {/* 1RM RESUMEN */}
        <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>MIS 1RM ACTUALES</Text>
        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {movements.map(mv => {
              const val = rms[mv.key];
              const hasVal = val && parseFloat(val) > 0;
              return (
                <View key={mv.key} style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: hasVal ? t.accent + '40' : t.border, borderRadius: 8, padding: 10, minWidth: 90, alignItems: 'center' }}>
                  <Text style={{ fontSize: t.fs(9), color: t.text3, letterSpacing: 1, marginBottom: 4 }}>{mv.name}</Text>
                  <Text style={{ fontSize: t.fs(20), fontWeight: '900', color: hasVal ? t.accent : t.text3 }}>{hasVal ? val : '—'}</Text>
                  {hasVal && <Text style={{ fontSize: t.fs(8), color: t.text3, marginTop: 2 }}>kg</Text>}
                </View>
              );
            })}
          </View>
        </View>

        {/* PROGRAMA ACTIVO */}
        <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>PROGRAMA ACTIVO</Text>
        <View style={{ backgroundColor: t.accent + '10', borderWidth: 1, borderColor: t.accent + '35', borderRadius: 12, padding: 14, marginBottom: 24 }}>
          <Text style={{ fontSize: t.fs(9), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 4 }}>ACTIVO</Text>
          <Text style={{ fontSize: t.fs(18), fontWeight: '900', color: t.text, marginBottom: 4 }}>
            {programInfo.title}
          </Text>
          <Text style={{ fontSize: t.fs(11), color: t.text2 }}>{programInfo.range} · En pareja</Text>
          <Text style={{ fontSize: t.fs(11), color: t.text2, marginTop: 2 }}>{programInfo.subtitle}</Text>
        </View>

        {/* CERRAR SESIÓN */}
        <TouchableOpacity
          onPress={logout}
          style={{ borderWidth: 1, borderColor: '#e63946' + '60', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: '#e63946', letterSpacing: 1 }}>
            CERRAR SESIÓN
          </Text>
        </TouchableOpacity>
        <Text style={{ fontSize: t.fs(10), color: t.text3, textAlign: 'center', marginBottom: 20 }}>
          {userProfile?.email || ''}
        </Text>

      </ScrollView>
    </View>
  );

}