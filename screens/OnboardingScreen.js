import { View, Text, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { useTheme } from '../ThemeContext';
import { useApp } from '../AppContext';
import { supabase } from '../supabase';
import { RM_MOVEMENTS } from '../constants';

const TOTAL_STEPS = 4;

export default function OnboardingScreen({ onComplete }) {
  const t = useTheme();
  const { userProfile, saveRM, completeOnboarding } = useApp();
  const [step, setStep] = useState(1);
  const [foto, setFoto] = useState(null);
  const [genero, setGenero] = useState('M');
  const [rmsLocales, setRmsLocales] = useState({});
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const nombre = userProfile?.nombre || 'Atleta';

  const seleccionarFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setFoto(uri);
      if (!userProfile?.id) return;
      setUploadingFoto(true);
      try {
        const path = `${userProfile.id}/avatar.jpg`;
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const { error } = await supabase.storage.from('avatars').upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
          await supabase.from('usuarios').update({ avatar_url: publicUrl }).eq('id', userProfile.id);
        }
      } catch (e) {}
      setUploadingFoto(false);
    }
  };

  const handleFinish = async () => {
    // Guardar género
    await supabase.from('usuarios').update({ genero }).eq('id', userProfile.id);
    // Guardar 1RMs que se hayan introducido
    const entries = Object.entries(rmsLocales).filter(([, v]) => parseFloat(v) > 0);
    for (const [key, val] of entries) {
      await saveRM(key, val);
    }
    await completeOnboarding();
    onComplete();
  };

  const initials = nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>

      {/* PROGRESS BAR */}
      <View style={{ backgroundColor: t.header, paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? t.accent : t.border }} />
          ))}
        </View>
        <Text style={{ fontSize: t.fs(9), color: t.accent + '88', letterSpacing: 3, fontWeight: '700' }}>
          PASO {step} DE {TOTAL_STEPS}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>

        {/* PASO 1 — BIENVENIDA */}
        {step === 1 && (
          <View style={{ alignItems: 'center', paddingTop: 20 }}>
            <Text style={{ fontSize: t.fs(52), marginBottom: 20 }}>👋</Text>
            <Text style={{ fontSize: t.fs(28), fontWeight: '900', color: t.text, textAlign: 'center', letterSpacing: 1, marginBottom: 12 }}>
              HOLA, {nombre.split(' ')[0].toUpperCase()}
            </Text>
            <Text style={{ fontSize: t.fs(15), color: t.accent, fontWeight: '700', letterSpacing: 2, marginBottom: 24 }}>
              BIENVENIDO A WODLY
            </Text>
            <Text style={{ fontSize: t.fs(13), color: t.text3, textAlign: 'center', lineHeight: t.fs(22), marginBottom: 40 }}>
              Vamos a configurar tu perfil en{'\n'}menos de 2 minutos.
            </Text>
            <View style={{ width: '100%', gap: 10 }}>
              {[
                { icon: '📸', label: 'Foto de perfil' },
                { icon: '⚡', label: 'Género para los pesos' },
                { icon: '🏋️', label: 'Tus 1RMs actuales' },
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14 }}>
                  <Text style={{ fontSize: t.fs(20) }}>{item.icon}</Text>
                  <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text2 }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* PASO 2 — FOTO */}
        {step === 2 && (
          <View style={{ alignItems: 'center', paddingTop: 20 }}>
            <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text, letterSpacing: 1, marginBottom: 8 }}>
              📸 FOTO DE PERFIL
            </Text>
            <Text style={{ fontSize: t.fs(13), color: t.text3, textAlign: 'center', marginBottom: 32, lineHeight: t.fs(20) }}>
              Ponle cara a tus resultados.{'\n'}Tus compañeros te reconocerán.
            </Text>
            <TouchableOpacity onPress={seleccionarFoto}
              style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: t.accent + '20', borderWidth: 3, borderColor: foto ? t.accent : t.border, borderStyle: foto ? 'solid' : 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 20 }}>
              {foto
                ? <Image source={{ uri: foto }} style={{ width: 120, height: 120, borderRadius: 60 }} />
                : <View style={{ alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: t.fs(32) }}>📷</Text>
                    <Text style={{ fontSize: t.fs(10), color: t.accent, fontWeight: '700', letterSpacing: 1 }}>SUBIR FOTO</Text>
                  </View>
              }
            </TouchableOpacity>
            {uploadingFoto && (
              <Text style={{ fontSize: t.fs(11), color: t.accent, letterSpacing: 1, marginBottom: 8 }}>Subiendo... ⏳</Text>
            )}
            {foto && (
              <TouchableOpacity onPress={seleccionarFoto}
                style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8 }}>
                <Text style={{ fontSize: t.fs(12), color: t.text2, fontWeight: '700' }}>Cambiar foto</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* PASO 3 — GÉNERO */}
        {step === 3 && (
          <View style={{ paddingTop: 20 }}>
            <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text, letterSpacing: 1, marginBottom: 8 }}>
              ⚡ GÉNERO
            </Text>
            <Text style={{ fontSize: t.fs(13), color: t.text3, lineHeight: t.fs(20), marginBottom: 32 }}>
              Lo usamos para mostrarte los pesos{'\n'}correctos en cada WOD del programa.
            </Text>
            <View style={{ gap: 12 }}>
              {[
                { key: 'M', label: '♂ MASCULINO', desc: 'Pesos estándar hombre' },
                { key: 'F', label: '♀ FEMENINO', desc: 'Pesos estándar mujer' },
              ].map(g => (
                <TouchableOpacity key={g.key} onPress={() => setGenero(g.key)}
                  style={{ backgroundColor: genero === g.key ? t.accent + '15' : t.card, borderWidth: 2, borderColor: genero === g.key ? t.accent : t.border, borderRadius: 12, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: genero === g.key ? t.accent : t.text }}>{g.label}</Text>
                    <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 4 }}>{g.desc}</Text>
                  </View>
                  {genero === g.key && (
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(14) }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* PASO 4 — 1RMs */}
        {step === 4 && (
          <View style={{ paddingTop: 20 }}>
            <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.text, letterSpacing: 1, marginBottom: 8 }}>
              🏋️ TUS 1RMs
            </Text>
            <Text style={{ fontSize: t.fs(13), color: t.text3, lineHeight: t.fs(20), marginBottom: 24 }}>
              Introduce tus marcas actuales para{'\n'}calcular porcentajes en los WODs.{'\n'}
              <Text style={{ color: t.accent }}>Todos son opcionales.</Text>
            </Text>
            <View style={{ gap: 10 }}>
              {RM_MOVEMENTS.map(mv => (
                <View key={mv.key} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: mv.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: t.fs(9), fontWeight: '900', color: mv.color, letterSpacing: 0.5 }}>{mv.name}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: t.fs(12), fontWeight: '700', color: t.text2, marginBottom: 4 }}>{mv.name}</Text>
                    <TextInput
                      value={rmsLocales[mv.key] || ''}
                      onChangeText={v => setRmsLocales(prev => ({ ...prev, [mv.key]: v }))}
                      keyboardType="decimal-pad"
                      placeholder="— kg"
                      placeholderTextColor={t.text3}
                      style={{ backgroundColor: t.bg4, borderWidth: 1, borderColor: rmsLocales[mv.key] ? mv.color + '60' : t.border, borderRadius: 8, color: t.text, fontSize: t.fs(16), fontWeight: '700', padding: 10, textAlign: 'center' }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      {/* BOTONES INFERIORES */}
      <View style={{ padding: 20, paddingBottom: 36, gap: 10, backgroundColor: t.bg, borderTopWidth: 1, borderTopColor: t.border }}>
        {step < TOTAL_STEPS ? (
          <>
            <TouchableOpacity onPress={() => setStep(s => s + 1)}
              style={{ backgroundColor: t.accent, borderRadius: 12, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: '#fff', letterSpacing: 1 }}>
                SIGUIENTE →
              </Text>
            </TouchableOpacity>
            {step === 2 && (
              <TouchableOpacity onPress={() => setStep(s => s + 1)}
                style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: t.fs(12), color: t.text3 }}>Saltar este paso</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity onPress={handleFinish}
              style={{ backgroundColor: t.accent, borderRadius: 12, padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: '#fff', letterSpacing: 1 }}>
                ¡EMPEZAR A ENTRENAR! 🚀
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFinish}
              style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(12), color: t.text3 }}>Saltar 1RMs por ahora</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

    </View>
  );
}
