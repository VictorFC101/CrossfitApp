import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useTheme } from '../ThemeContext';

export default function AuthScreen({ onAuth }) {
  const t = useTheme();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [boxCodigo, setBoxCodigo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Rellena email y contraseña');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else onAuth();
  };

  const handleRegister = async () => {
    if (!email || !password || !nombre) return Alert.alert('Error', 'Rellena todos los campos');
    if (password.length < 6) return Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
    setLoading(true);

    // Verificar código de box si se introduce
    let boxId = null;
    if (boxCodigo.trim()) {
      const { data: box } = await supabase
        .from('boxes')
        .select('id, nombre')
        .eq('codigo_invitacion', boxCodigo.trim().toUpperCase())
        .single();

      if (!box) {
        setLoading(false);
        return Alert.alert('Error', 'Código de box incorrecto');
      }
      boxId = box.id;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setLoading(false); return Alert.alert('Error', error.message); }

    if (data.user) {
      await supabase.from('usuarios').upsert({
        id: data.user.id,
        nombre,
        genero: 'M',
        email,
        rol: 'atleta',
        box_id: boxId,
        box_codigo: boxCodigo.trim().toUpperCase() || null,
      });
    }

    setLoading(false);
    Alert.alert('¡Cuenta creada!', 'Ya puedes iniciar sesión.', [
      { text: 'OK', onPress: () => setMode('login') }
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 20, paddingTop: 80 }}>
        <Text style={{ fontSize: t.fs(10), color: t.accent + '88', letterSpacing: 4, fontWeight: '700' }}>CROSSFIT APP</Text>
        <Text style={{ fontSize: t.fs(32), fontWeight: '900', letterSpacing: 2, color: t.text, marginTop: 4 }}>
          {mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
        </Text>
        <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 4 }}>
          {mode === 'login' ? 'Accede a tu programación' : 'Únete y empieza a entrenar'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>

        {/* TABS */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
          {[{ key: 'login', label: '🔑 ENTRAR' }, { key: 'register', label: '✨ REGISTRARSE' }].map(m => (
            <TouchableOpacity key={m.key} onPress={() => setMode(m.key)}
              style={{ flex: 1, padding: 12, backgroundColor: mode === m.key ? t.accent + '20' : t.bg4, borderWidth: 2, borderColor: mode === m.key ? t.accent : t.border, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: mode === m.key ? t.accent : t.text2 }}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* NOMBRE — solo registro */}
        {mode === 'register' && (
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>NOMBRE</Text>
            <TextInput value={nombre} onChangeText={setNombre}
              placeholder="Tu nombre o alias" placeholderTextColor={t.text3}
              style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '40', borderRadius: 10, color: t.text, fontSize: t.fs(15), padding: 14 }} />
          </View>
        )}

        {/* EMAIL */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>EMAIL</Text>
          <TextInput value={email} onChangeText={setEmail}
            placeholder="tu@email.com" placeholderTextColor={t.text3}
            keyboardType="email-address" autoCapitalize="none"
            style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '40', borderRadius: 10, color: t.text, fontSize: t.fs(15), padding: 14 }} />
        </View>

        {/* CONTRASEÑA */}
        <View style={{ marginBottom: mode === 'register' ? 14 : 24 }}>
          <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>CONTRASEÑA</Text>
          <TextInput value={password} onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres" placeholderTextColor={t.text3}
            secureTextEntry
            style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '40', borderRadius: 10, color: t.text, fontSize: t.fs(15), padding: 14 }} />
        </View>

        {/* CÓDIGO DE BOX — solo registro */}
        {mode === 'register' && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>
              CÓDIGO DE BOX <Text style={{ color: t.text3, fontWeight: '400' }}>(opcional)</Text>
            </Text>
            <TextInput value={boxCodigo} onChangeText={setBoxCodigo}
              placeholder="Ej: TEST2026" placeholderTextColor={t.text3}
              autoCapitalize="characters"
              style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '40', borderRadius: 10, color: t.text, fontSize: t.fs(15), padding: 14 }} />
            <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 6 }}>
              Tu coach te dará el código para unirte a su box
            </Text>
          </View>
        )}

        {/* BOTÓN PRINCIPAL */}
        <TouchableOpacity onPress={mode === 'login' ? handleLogin : handleRegister}
          disabled={loading}
          style={{ backgroundColor: loading ? t.border : t.accent, borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: t.fs(15), letterSpacing: 1 }}>
            {loading ? 'CARGANDO...' : mode === 'login' ? '▶ ENTRAR' : '✨ CREAR CUENTA'}
          </Text>
        </TouchableOpacity>

        {/* CAMBIAR MODO */}
        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={{ alignItems: 'center', padding: 12 }}>
          <Text style={{ fontSize: t.fs(12), color: t.text3 }}>
            {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <Text style={{ color: t.accent, fontWeight: '700' }}>
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </Text>
          </Text>
        </TouchableOpacity>

        {/* INFO */}
        <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, marginTop: 20 }}>
          <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>ℹ️ ROLES</Text>
          <Text style={{ fontSize: t.fs(12), color: t.text2, lineHeight: t.fs(18) }}>
            Al registrarte tendrás rol de <Text style={{ color: t.accent, fontWeight: '700' }}>Atleta</Text>. Tu coach o admin puede asignarte un rol diferente.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}