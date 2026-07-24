import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/context/SettingsContext';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, addToken, removeToken } = useSettings();

  const [baseUrl, setBaseUrl] = useState(settings.aiBaseUrl);
  const [apiKey, setApiKey] = useState(settings.aiApiKey);
  const [model, setModel] = useState(settings.aiModel);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenValue, setNewTokenValue] = useState('');

  const save = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateSettings({ aiBaseUrl: baseUrl.trim(), aiApiKey: apiKey.trim(), aiModel: model.trim() });
    router.back();
  };

  const handleAddToken = async () => {
    if (!newTokenName.trim() || !newTokenValue.trim()) return;
    await addToken(newTokenName.trim(), newTokenValue.trim());
    setNewTokenName('');
    setNewTokenValue('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemove = (id: string, name: string) => {
    Alert.alert('Xoá token', `Xoá "${name}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => removeToken(id),
      },
    ]);
  };

  const s = styles(colors, insets);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Cài đặt</Text>
        <Pressable onPress={save} hitSlop={12}>
          <Text style={s.saveBtn}>Lưu</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* AI Config */}
        <Text style={s.sectionLabel}>CẤU HÌNH AI</Text>
        <View style={s.card}>
          <Field label="Base URL" value={baseUrl} onChange={setBaseUrl} colors={colors} placeholder="https://..." />
          <View style={s.divider} />
          <Field label="API Key" value={apiKey} onChange={setApiKey} colors={colors} placeholder="sk-..." secure />
          <View style={s.divider} />
          <Field label="Model" value={model} onChange={setModel} colors={colors} placeholder="gpt-4o-mini" />
        </View>

        {/* Custom Tokens */}
        <Text style={s.sectionLabel}>TOKEN BÊN THỨ 3</Text>
        {settings.customTokens.length > 0 && (
          <View style={s.card}>
            {settings.customTokens.map((t, i) => (
              <React.Fragment key={t.id}>
                {i > 0 && <View style={s.divider} />}
                <View style={s.tokenRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tokenName}>{t.name}</Text>
                    <Text style={s.tokenVal} numberOfLines={1}>{'•'.repeat(Math.min(t.value.length, 24))}</Text>
                  </View>
                  <Pressable onPress={() => handleRemove(t.id, t.name)} hitSlop={10}>
                    <Feather name="trash-2" size={18} color={colors.destructive} />
                  </Pressable>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Add Token */}
        <View style={s.card}>
          <Text style={s.addLabel}>Thêm token mới</Text>
          <TextInput
            style={s.addInput}
            placeholder="Tên dịch vụ (vd: Stripe)"
            placeholderTextColor={colors.mutedForeground}
            value={newTokenName}
            onChangeText={setNewTokenName}
          />
          <TextInput
            style={s.addInput}
            placeholder="Giá trị token"
            placeholderTextColor={colors.mutedForeground}
            value={newTokenValue}
            onChangeText={setNewTokenValue}
            secureTextEntry
          />
          <Pressable
            style={[s.addBtn, { opacity: !newTokenName || !newTokenValue ? 0.4 : 1 }]}
            onPress={handleAddToken}
            disabled={!newTokenName || !newTokenValue}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={s.addBtnText}>Thêm</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label, value, onChange, colors, placeholder, secure,
}: {
  label: string; value: string; onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>; placeholder?: string; secure?: boolean;
}) {
  return (
    <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={{ fontSize: 14, color: colors.text }}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={!!secure}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
    },
    headerTitle: { fontSize: 18, fontWeight: '600' as const, color: c.text },
    saveBtn: { fontSize: 16, fontWeight: '600' as const, color: c.primary },
    content: { padding: 20, paddingBottom: insets.bottom + 40, gap: 8 },
    sectionLabel: {
      fontSize: 11, fontWeight: '600' as const, color: c.mutedForeground,
      letterSpacing: 0.8, marginTop: 16, marginBottom: 8, marginLeft: 4,
    },
    card: {
      backgroundColor: c.card, borderRadius: c.radius,
      borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, overflow: 'hidden',
    },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginHorizontal: 16 },
    tokenRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16,
    },
    tokenName: { fontSize: 14, fontWeight: '500' as const, color: c.text, marginBottom: 2 },
    tokenVal: { fontSize: 12, color: c.mutedForeground },
    addLabel: { fontSize: 13, fontWeight: '600' as const, color: c.text, padding: 16, paddingBottom: 8 },
    addInput: {
      marginHorizontal: 16, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, color: c.text, backgroundColor: c.background,
    },
    addBtn: {
      margin: 16, marginTop: 4, backgroundColor: c.primary, borderRadius: 10,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12,
    },
    addBtnText: { color: '#fff', fontWeight: '600' as const, fontSize: 14 },
  });
