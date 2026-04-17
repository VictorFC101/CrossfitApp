import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useApp } from '../AppContext';
import { useTheme } from '../ThemeContext';
import { RM_CATEGORIES } from '../constants';

const CATEGORY_NAMES = Object.keys(RM_CATEGORIES);

const INTENSITY_ZONES = [
  { label: 'Técnica',  range: [0.50, 0.65], color: '#52b788' },
  { label: 'Fuerza',   range: [0.65, 0.80], color: '#4895ef' },
  { label: 'Potencia', range: [0.80, 0.90], color: '#f4a261' },
  { label: 'Máximo',   range: [0.90, 1.00], color: '#e63946' },
];

export default function RMScreen() {
  const { rms, saveRM } = useApp();
  const t = useTheme();
  const [activeCategory, setActiveCategory] = useState('Halterofilia');
  const [expanded, setExpanded] = useState(null);
  const [saved, setSaved] = useState(null);

  const category = RM_CATEGORIES[activeCategory];
  const accentColor = category.color;

  const handleSave = async (key, val) => {
    await saveRM(key, val);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleTabChange = (name) => {
    setActiveCategory(name);
    setExpanded(null);
  };

  // Cuenta cuántos 1RM tiene guardados en esta categoría
  const countFilled = (catName) =>
    RM_CATEGORIES[catName].movements.filter(mv => parseFloat(rms[mv.key]) > 0).length;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* HEADER */}
      <View style={{ backgroundColor: t.header, borderBottomWidth: 2, borderBottomColor: accentColor, padding: 20, paddingTop: 60 }}>
        <Text style={{ fontSize: t.fs(10), color: accentColor + '88', letterSpacing: 4, fontWeight: '700' }}>TUS MARCAS PERSONALES</Text>
        <Text style={{ fontSize: t.fs(32), fontWeight: '900', letterSpacing: 2, color: t.text, marginTop: 4 }}>MIS 1RM</Text>
        <Text style={{ fontSize: t.fs(11), color: t.text3, marginTop: 4 }}>Se sincronizan automáticamente con el WOD</Text>

        {/* TABS */}
        <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
          {CATEGORY_NAMES.map(name => {
            const isActive = name === activeCategory;
            const cat = RM_CATEGORIES[name];
            const filled = countFilled(name);
            return (
              <TouchableOpacity
                key={name}
                onPress={() => handleTabChange(name)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: isActive ? cat.color + '20' : t.bg4,
                  borderWidth: 1.5,
                  borderColor: isActive ? cat.color : t.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontSize: t.fs(11),
                  fontWeight: '800',
                  letterSpacing: 0.5,
                  color: isActive ? cat.color : t.text3,
                }}>
                  {name.toUpperCase()}
                </Text>
                <Text style={{ fontSize: t.fs(9), color: isActive ? cat.color + 'aa' : t.text3, marginTop: 2 }}>
                  {filled}/{cat.movements.length} marcas
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
        {category.movements.map((mv) => {
          const isOpen = expanded === mv.key;
          const val = parseFloat(rms[mv.key]);
          const hasRM = val > 0;
          const isSaved = saved === mv.key;

          return (
            <TouchableOpacity
              key={mv.key}
              onPress={() => setExpanded(isOpen ? null : mv.key)}
              activeOpacity={0.85}
              style={{
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: isOpen ? accentColor + '60' : t.border,
                borderRadius: 12,
                marginBottom: 10,
                overflow: 'hidden',
              }}
            >
              {/* FILA PRINCIPAL */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{
                      backgroundColor: accentColor + '20',
                      borderRadius: 6,
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                    }}>
                      <Text style={{ fontSize: t.fs(9), fontWeight: '800', color: accentColor, letterSpacing: 1 }}>
                        {mv.short}
                      </Text>
                    </View>
                    <Text style={{ fontSize: t.fs(15), fontWeight: '900', color: t.text, letterSpacing: 0.5 }}>
                      {mv.name}
                    </Text>
                  </View>
                  <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 4 }}>
                    {hasRM ? `1RM guardado: ${rms[mv.key]} kg` : 'Sin marca registrada'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                  <Text style={{ fontSize: t.fs(26), fontWeight: '900', color: hasRM ? accentColor : t.text3 }}>
                    {hasRM ? rms[mv.key] : '—'}
                  </Text>
                  <Text style={{ fontSize: t.fs(9), color: t.text3 }}>KG</Text>
                </View>
              </View>

              {/* PANEL EXPANDIDO */}
              {isOpen && (
                <View style={{ paddingHorizontal: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: t.border }}>

                  {/* INPUT */}
                  <View style={{ marginTop: 12, marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: t.fs(10), color: accentColor, letterSpacing: 2, fontWeight: '700' }}>
                        ACTUALIZAR 1RM
                      </Text>
                      {isSaved && (
                        <Text style={{ fontSize: t.fs(10), color: '#52b788', fontWeight: '700' }}>✓ GUARDADO</Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        value={rms[mv.key] || ''}
                        onChangeText={(v) => handleSave(mv.key, v)}
                        keyboardType="numeric"
                        placeholder="kg"
                        placeholderTextColor={t.text3}
                        style={{
                          flex: 1,
                          backgroundColor: t.bg4,
                          borderWidth: 1,
                          borderColor: accentColor + '40',
                          borderRadius: 8,
                          color: t.text,
                          fontSize: t.fs(18),
                          fontWeight: '700',
                          padding: 12,
                        }}
                      />
                      <View style={{
                        justifyContent: 'center',
                        paddingHorizontal: 12,
                        backgroundColor: accentColor + '15',
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: accentColor + '30',
                      }}>
                        <Text style={{ fontSize: t.fs(13), color: accentColor, fontWeight: '700' }}>KG</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: t.fs(10), color: t.text3, marginTop: 6 }}>
                      Se actualiza en el WOD automáticamente
                    </Text>
                  </View>

                  {/* TABLA DE PESOS */}
                  {hasRM && (
                    <View>
                      <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, marginBottom: 8 }}>
                        TABLA DE PESOS
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {mv.pcts.map((p) => (
                          <View key={p} style={{
                            backgroundColor: t.bg4,
                            borderWidth: 1,
                            borderColor: t.border,
                            borderRadius: 8,
                            padding: 10,
                            minWidth: 90,
                            alignItems: 'center',
                          }}>
                            <Text style={{ fontSize: t.fs(11), color: t.text3, marginBottom: 2 }}>
                              {Math.round(p * 100)}%
                            </Text>
                            <Text style={{ fontSize: t.fs(16), fontWeight: '900', color: accentColor }}>
                              {Math.round(val * p)}
                              <Text style={{ fontSize: t.fs(10), color: t.text3 }}> kg</Text>
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* ZONAS DE INTENSIDAD */}
                      <View style={{ marginTop: 14 }}>
                        <Text style={{ fontSize: t.fs(10), color: t.text3, letterSpacing: 2, marginBottom: 8 }}>
                          ZONAS DE INTENSIDAD
                        </Text>
                        {INTENSITY_ZONES.map((z) => (
                          <View key={z.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <Text style={{ fontSize: t.fs(10), color: t.text3, width: 55 }}>{z.label}</Text>
                            <View style={{ flex: 1, height: 6, backgroundColor: t.border, borderRadius: 3 }}>
                              <View style={{
                                height: 6,
                                width: `${(z.range[1] - z.range[0]) * 100 * 1.4}%`,
                                backgroundColor: z.color,
                                borderRadius: 3,
                                opacity: 0.8,
                              }} />
                            </View>
                            <Text style={{ fontSize: t.fs(10), color: z.color, width: 70, textAlign: 'right' }}>
                              {Math.round(val * z.range[0])}–{Math.round(val * z.range[1])} kg
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
