import React, { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSettings } from '@/context/SettingsContext';
import { Feather } from '@expo/vector-icons';
import { fetch } from 'expo/fetch';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(36),
      role: 'user',
      content: text,
    };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setLoading(true);

    const aiId = (Date.now() + 1).toString(36);
    setMessages((prev) => [...prev, { id: aiId, role: 'assistant', content: '' }]);

    try {
      const res = await fetch(`${settings.aiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.aiApiKey}`,
        },
        body: JSON.stringify({
          model: settings.aiModel,
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      });

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              full += delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === aiId ? { ...m, content: full } : m))
              );
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, content: `Lỗi: ${e.message ?? 'Không kết nối được'}` } : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([]);
  };

  const s = styles(colors, insets);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={clearChat} hitSlop={12}>
          <Feather name="refresh-ccw" size={20} color={colors.mutedForeground} />
        </Pressable>
        <Text style={s.headerTitle}>remcute</Text>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
          <Feather name="settings" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={[...messages].reverse()}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          loading ? (
            <View style={[s.bubble, s.aiBubble]}>
              <Text style={[s.bubbleText, { color: colors.mutedForeground }]}>…</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[s.bubble, item.role === 'user' ? s.userBubble : s.aiBubble]}>
            <Text
              style={[
                s.bubbleText,
                { color: item.role === 'user' ? colors.userBubbleText : colors.aiBubbleText },
              ]}
            >
              {item.content || '…'}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="zap" size={36} color={colors.primary} />
            <Text style={s.emptyText}>Xin chào! Tôi là remcute{'\n'}Hỏi tôi bất cứ điều gì</Text>
          </View>
        }
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[s.inputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Nhắn tin..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={4000}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <Pressable
            style={[s.sendBtn, { opacity: !input.trim() || loading ? 0.4 : 1 }]}
            onPress={send}
            disabled={!input.trim() || loading}
          >
            <Feather name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: c.primary,
      letterSpacing: -0.3,
    },
    list: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
    bubble: {
      maxWidth: '80%',
      marginVertical: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: c.radius,
    },
    userBubble: { alignSelf: 'flex-end', backgroundColor: c.userBubble },
    aiBubble: { alignSelf: 'flex-start', backgroundColor: c.aiBubble },
    bubbleText: { fontSize: 15, lineHeight: 22 },
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
    emptyText: {
      fontSize: 16,
      color: c.mutedForeground,
      textAlign: 'center',
      lineHeight: 24,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.background,
      gap: 8,
    },
    input: {
      flex: 1,
      minHeight: 42,
      maxHeight: 120,
      backgroundColor: c.card,
      borderRadius: 21,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: c.text,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
