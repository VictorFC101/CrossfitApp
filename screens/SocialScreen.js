import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import { useSocial } from '../SocialContext';
import { supabase } from '../supabase';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function Avatar({ nombre, color, size = 40, t }) {
  const initials = (nombre || '?').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: '900', color }}>{initials}</Text>
    </View>
  );
}

function FeedItem({ item, t, TIPO_ICONS, TIPO_LABELS, getAmigoData, myUserId, onReaction, onComment, onDeleteComment }) {
  const amigoData = getAmigoData(item);
  const isMe = item.user_id === myUserId;
  const accentColor = isMe ? t.accent : '#4895ef';

  const renderData = () => {
    const d = item.data || {};
    switch (item.tipo) {
      case 'wod_completado':
        return (
          <View>
            {d.dia && <Text style={{ fontSize: t.fs(10), color: t.text3, marginBottom: 4 }}>📅 {d.dia}</Text>}
            {d.resultado && <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.accent }}>{d.resultado}</Text>}
            {d.notas && <Text style={{ fontSize: t.fs(12), color: t.text2, marginTop: 4, lineHeight: t.fs(18) }}>{d.notas}</Text>}
          </View>
        );
      case 'rm_nuevo': {
        const rmNames = { cj: 'Clean & Jerk', sn: 'Snatch', bs: 'Back Squat', dl: 'Deadlift', fs: 'Front Squat', sp: 'Strict Press' };
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: t.fs(13), color: t.text2 }}>{rmNames[d.movimiento] || d.movimiento}</Text>
            <Text style={{ fontSize: t.fs(26), fontWeight: '900', color: t.accent }}>
              {d.peso}<Text style={{ fontSize: t.fs(13), fontWeight: '400' }}>kg</Text>
            </Text>
          </View>
        );
      }
      case 'racha':
        return <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: '#f4a261' }}>🔥 {d.dias} días seguidos</Text>;
      case 'wod_libre_completado':
        return (
          <View>
            {d.nombre && <Text style={{ fontSize: t.fs(14), fontWeight: '700', color: t.text, marginBottom: 4 }}>{d.nombre}</Text>}
            {d.resultado && <Text style={{ fontSize: t.fs(22), fontWeight: '900', color: t.accent }}>{d.resultado}</Text>}
          </View>
        );
      case 'programa_iniciado':
        return <Text style={{ fontSize: t.fs(13), color: t.text2 }}>📋 {d.nombre || 'Nuevo programa'}</Text>;
      default:
        return null;
    }
  };

  return (
    <View style={{ backgroundColor: t.card, borderWidth: 1, borderColor: isMe ? t.accent + '30' : t.border, borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Avatar nombre={amigoData.nombre} color={accentColor} size={40} t={t} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>
            {isMe ? 'Tú' : amigoData.nombre}
            {amigoData.esAmigo && !isMe && <Text style={{ fontSize: t.fs(10), color: '#52b788' }}> · Amigo</Text>}
            {amigoData.mismoBox && !amigoData.esAmigo && !isMe && <Text style={{ fontSize: t.fs(10), color: t.text3 }}> · {amigoData.box}</Text>}
          </Text>
          <Text style={{ fontSize: t.fs(10), color: t.text3 }}>
            {TIPO_ICONS[item.tipo]} {TIPO_LABELS[item.tipo]}
          </Text>
        </View>
        <Text style={{ fontSize: t.fs(10), color: t.text3 }}>{timeAgo(item.created_at)}</Text>
      </View>

      <View style={{ backgroundColor: t.bg4, borderRadius: 8, padding: 12, marginBottom: 10 }}>
        {renderData()}
      </View>

      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        {['💪', '🔥', '👏'].map(emoji => {
          const count = item.reacciones?.filter(r => r.tipo === emoji).length || 0;
          const myReaction = item.reacciones?.find(r => r.user_id === myUserId && r.tipo === emoji);
          return (
            <TouchableOpacity key={emoji} onPress={() => onReaction(item.id, emoji)}
              style={{ backgroundColor: myReaction ? t.accent + '20' : t.bg4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: myReaction ? t.accent : t.border, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: t.fs(14) }}>{emoji}</Text>
              {count > 0 && <Text style={{ fontSize: t.fs(10), color: myReaction ? t.accent : t.text3, fontWeight: '700' }}>{count}</Text>}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={() => onComment(item)}
          style={{ backgroundColor: t.bg4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: t.border, marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: t.fs(11), color: t.text3 }}>
            💬{item.comentarios?.length > 0 ? ` ${item.comentarios.length}` : ' Comentar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* COMENTARIOS */}
      {item.comentarios?.length > 0 && (
        <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10, gap: 8 }}>
          {item.comentarios.map(c => (
            <View key={c.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Avatar nombre={c.autor?.nombre} color={t.accent} size={24} t={t} />
              <View style={{ flex: 1, backgroundColor: t.bg4, borderRadius: 8, padding: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={{ fontSize: t.fs(10), fontWeight: '700', color: t.accent }}>
                    {c.autor?.nombre || 'Usuario'}
                  </Text>
                  {c.user_id === myUserId && (
                    <TouchableOpacity onPress={() => onDeleteComment(c.id)}>
                      <Text style={{ fontSize: t.fs(10), color: '#e63946' }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={{ fontSize: t.fs(12), color: t.text2, lineHeight: t.fs(17) }}>{c.texto}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function FriendsTab({ t }) {
  const {
    amistades, solicitudesPendientes, solicitudesEnviadas,
    aceptarSolicitud, rechazarSolicitud,
    eliminarAmistad, enviarSolicitud,
    myUserId, esAmigo
  } = useSocial();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(null);
  const [enviadas, setEnviadas] = useState([]);

  useEffect(() => { loadBoxUsers(); }, [solicitudesEnviadas, amistades]);

  const loadBoxUsers = async () => {
    setSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: myProfile } = await supabase
        .from('usuarios')
        .select('box_id')
        .eq('id', user.id)
        .single();
      if (!myProfile?.box_id) return;
      const { data } = await supabase
        .from('usuarios_publicos')
        .select('*')
        .eq('box_id', myProfile.box_id)
        .neq('id', user.id);
      setSearchResults(data || []);
    } catch (e) {}
    finally { setSearching(false); }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) { loadBoxUsers(); return; }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('usuarios_publicos')
        .select('*')
        .or(`nombre.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', myUserId)
        .limit(10);
      setSearchResults(data || []);
    } catch (e) {}
    finally { setSearching(false); }
  };

  const handleSend = async (userId) => {
    setSending(userId);
    const result = await enviarSolicitud(userId);
    setSending(null);
    if (!result.success) Alert.alert('Error', result.error);
    else {
      setEnviadas(prev => [...prev, userId]);
      Alert.alert('✅ Solicitud enviada');
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 80 }}>

      {/* SOLICITUDES PENDIENTES */}
      {solicitudesPendientes.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: t.fs(10), color: t.accent, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>
            SOLICITUDES PENDIENTES ({solicitudesPendientes.length})
          </Text>
          {solicitudesPendientes.map(s => (
            <View key={s.id} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '40', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar nombre={s.solicitante?.nombre} color={t.accent} size={36} t={t} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>
                  {s.solicitante?.nombre || s.solicitante?.email || 'Usuario'}
                </Text>
                <Text style={{ fontSize: t.fs(10), color: t.text3 }}>Quiere conectar contigo</Text>
              </View>
              <TouchableOpacity onPress={() => aceptarSolicitud(s.id)}
                style={{ backgroundColor: '#52b78820', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#52b78840', marginRight: 4 }}>
                <Text style={{ fontSize: t.fs(11), color: '#52b788', fontWeight: '700' }}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => rechazarSolicitud(s.id)}
                style={{ backgroundColor: '#e6394415', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#e6394430' }}>
                <Text style={{ fontSize: t.fs(11), color: '#e63946', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* BUSCAR */}
      <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 8 }}>
        {search ? 'RESULTADOS' : 'COMPAÑEROS DE BOX'}
      </Text>
      <TextInput
        value={search}
        onChangeText={v => { setSearch(v); searchUsers(v); }}
        placeholder="Buscar por nombre o email..."
        placeholderTextColor={t.text3}
        style={{ backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 10, color: t.text, fontSize: t.fs(14), padding: 12, marginBottom: 12 }} />

      {searching ? (
        <ActivityIndicator color={t.accent} style={{ marginBottom: 12 }} />
      ) : searchResults.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: t.fs(12), color: t.text3 }}>
            {search ? 'Sin resultados' : 'No hay más compañeros en tu box'}
          </Text>
        </View>
      ) : (
        searchResults.map(user => {
          const yaAmigo = esAmigo(user.id);
          const yaEnviada = solicitudesEnviadas.includes(user.id);
          return (
            <View key={user.id} style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: yaAmigo ? '#52b78840' : t.border,
              borderRadius: 10,
              padding: 12,
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10
            }}>
              <Avatar nombre={user.nombre} color={yaAmigo ? '#52b788' : t.accent} size={36} t={t} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>
                  {user.nombre || 'Sin nombre'}
                </Text>
                <Text style={{ fontSize: t.fs(10), color: t.text3 }}>
                  {user.box_nombre || user.email}
                </Text>
              </View>
              {yaAmigo ? (
                <View style={{ backgroundColor: '#52b78820', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ fontSize: t.fs(10), color: '#52b788', fontWeight: '700' }}>✓ Amigo</Text>
                </View>
              ) : yaEnviada ? (
                <View style={{ backgroundColor: t.bg4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: t.border }}>
                  <Text style={{ fontSize: t.fs(10), color: t.text3, fontWeight: '700' }}>⏳ Enviada</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => handleSend(user.id)}
                  disabled={sending === user.id}
                  style={{ backgroundColor: t.accent + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: t.accent + '40' }}>
                  {sending === user.id
                    ? <ActivityIndicator size="small" color={t.accent} />
                    : <Text style={{ fontSize: t.fs(10), color: t.accent, fontWeight: '700' }}>+ Añadir</Text>}
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}

      {/* MIS AMIGOS */}
      {amistades.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>
            MIS AMIGOS ({amistades.length})
          </Text>
          {amistades.map(a => {
            const friend = a.solicitante?.id === myUserId ? a.receptor : a.solicitante;
            if (!friend) return null;
            return (
              <View key={a.id} style={{ backgroundColor: t.card, borderWidth: 1, borderColor: '#52b78830', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar nombre={friend.nombre} color="#52b788" size={36} t={t} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: t.fs(13), fontWeight: '700', color: t.text }}>
                    {friend.nombre || 'Sin nombre'}
                  </Text>
                  <Text style={{ fontSize: t.fs(10), color: t.text3 }}>{friend.email}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => Alert.alert('Eliminar amigo', '¿Seguro?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => eliminarAmistad(a.id) }
                  ])}
                  style={{ backgroundColor: '#e6394415', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#e6394430' }}>
                  <Text style={{ fontSize: t.fs(11), color: '#e63946' }}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

export default function SocialScreen() {
  const t = useTheme();
  const social = useSocial();
  const [tab, setTab] = useState('feed');
  const [refreshing, setRefreshing] = useState(false);
  const [commentTarget, setCommentTarget] = useState(null);
  const [commentText, setCommentText] = useState('');

  if (!social) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.accent} size="large" />
      </View>
    );
  }

  const { feed, loadingFeed, refreshFeed, getAmigoData, myUserId, TIPO_ICONS, TIPO_LABELS, solicitudesPendientes } = social;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshFeed();
    setRefreshing(false);
  };

  const handleReaction = async (feedId, tipo) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from('reacciones')
        .select('id, tipo')
        .eq('user_id', user.id)
        .eq('target_id', feedId)
        .eq('target_tipo', 'feed')
        .maybeSingle();

      if (existing) {
        if (existing.tipo === tipo) {
          await supabase.from('reacciones').delete().eq('id', existing.id);
        } else {
          await supabase.from('reacciones').update({ tipo }).eq('id', existing.id);
        }
      } else {
        await supabase.from('reacciones').insert({
          user_id: user.id,
          target_id: feedId,
          target_tipo: 'feed',
          tipo,
        });
      }
      // Recargar feed para reflejar cambios
      await refreshFeed();
    } catch (e) { console.log('handleReaction error:', e.message); }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !commentTarget) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('comentarios').insert({
        user_id: user.id,
        target_id: commentTarget.id,
        target_tipo: 'feed',
        texto: commentText.trim(),
      });
      if (error) { console.log('COMENTARIO ERROR:', error.message); return; }
      setCommentText('');
      setCommentTarget(null);
      await refreshFeed();
    } catch (e) {}
  };
  
  const handleDeleteComment = async (commentId) => {
    try {
      const { error } = await supabase.from('comentarios').delete().eq('id', commentId);
      if (error) { console.log('DELETE COMMENT ERROR:', error.message); return; }
      await refreshFeed();
    } catch (e) {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* HEADER */}
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: t.accent, padding: 16, paddingTop: 60 }}>
        <Text style={{ fontSize: t.fs(9), color: t.accent + '88', letterSpacing: 4, fontWeight: '700' }}>COMUNIDAD</Text>
        <Text style={{ fontSize: t.fs(28), fontWeight: '900', color: t.text, marginTop: 2 }}>SOCIAL</Text>
      </View>

      {/* TABS */}
      <View style={{ flexDirection: 'row', backgroundColor: t.header, borderBottomWidth: 1, borderBottomColor: t.border }}>
        {[
          { key: 'feed', label: '⚡ FEED' },
          { key: 'friends', label: `👥 AMIGOS${solicitudesPendientes.length > 0 ? ` (${solicitudesPendientes.length})` : ''}` },
        ].map(tb => (
          <TouchableOpacity key={tb.key} onPress={() => setTab(tb.key)}
            style={{ flex: 1, padding: 12, borderBottomWidth: 2, borderBottomColor: tab === tb.key ? t.accent : 'transparent', alignItems: 'center' }}>
            <Text style={{ fontSize: t.fs(11), fontWeight: '700', color: tab === tb.key ? t.accent : t.text3 }}>{tb.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* COMENTARIO MODAL */}
      {commentTarget && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border, padding: 14, zIndex: 100, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput value={commentText} onChangeText={setCommentText}
            placeholder="Escribe un comentario..." placeholderTextColor={t.text3}
            autoFocus
            style={{ flex: 1, backgroundColor: t.bg4, borderWidth: 1, borderColor: t.border, borderRadius: 20, color: t.text, fontSize: t.fs(13), paddingHorizontal: 14, paddingVertical: 10 }} />
          <TouchableOpacity onPress={handleComment}
            style={{ backgroundColor: t.accent, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: t.fs(12) }}>Enviar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCommentTarget(null); setCommentText(''); }}>
            <Text style={{ color: t.text3, fontSize: t.fs(18) }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CONTENIDO */}
      {tab === 'feed' && (
        loadingFeed ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={t.accent} size="large" />
            <Text style={{ color: t.text3, marginTop: 12, fontSize: t.fs(12) }}>Cargando feed...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 14, paddingBottom: 80 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.accent} />}>
            {feed.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 60 }}>
                <Text style={{ fontSize: t.fs(40), marginBottom: 16 }}>⚡</Text>
                <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: t.text, marginBottom: 8 }}>Sin actividad aún</Text>
                <Text style={{ fontSize: t.fs(12), color: t.text3, textAlign: 'center', lineHeight: t.fs(18) }}>
                  Completa WODs y añade amigos{'\n'}para ver actividad aquí
                </Text>
              </View>
            ) : (
              feed.map(item => (
                <FeedItem
                  key={item.id}
                  item={item}
                  t={t}
                  TIPO_ICONS={TIPO_ICONS}
                  TIPO_LABELS={TIPO_LABELS}
                  getAmigoData={getAmigoData}
                  myUserId={myUserId}
                  onReaction={handleReaction}
                  onComment={setCommentTarget}
                  onDeleteComment={handleDeleteComment}
                />
              ))
            )}
          </ScrollView>
        )
      )}

      {tab === 'friends' && <FriendsTab t={t} />}
    </View>
  );
}