// 대화 화면. 캐릭터가 없으면 캐릭터 화면으로 보낸다(백엔드도 캐릭터가 있어야 대화 기록을 돌려준다).
import { Link, Redirect, Stack } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorView, Loading } from '@/components/StatusView';
import { api, streamChat, type Character, type Message } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function ChatScreen() {
  const session = useSession();
  if (session.status === 'loading') return <Loading />;
  if (session.status === 'error') return <ErrorView message={session.message} retry={session.retry} />;
  if (!session.me.has_character) return <Redirect href="/character" />;
  return <Chat />;
}

function Chat() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, history] = await Promise.all([
          api<{ character: Character }>('/api/character'),
          api<Message[]>('/api/messages'),
        ]);
        setCharacter(c.character);
        setMessages(history.map(({ id, role, content }) => ({ id, role, content })));
      } catch (e) {
        setError(String((e as Error).message ?? e));
      }
    })();
  }, []);

  // 마지막 메시지(답을 받는 중인 메시지)의 글자를 이어 붙인다
  const appendToLast = (text: string) =>
    setMessages((prev) => {
      const next = prev.slice();
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, content: last.content + text };
      return next;
    });

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    try {
      await streamChat(text, (event) => {
        if (event.type === 'delta') appendToLast(String(event.text));
        if (event.type === 'error') setError(String(event.message));
      });
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    // 헤더를 화면 안에 직접 그린다. iOS 26부터 기본 헤더가 화면 위에 겹쳐 배치되어 대화 목록 윗부분을 가리기 때문이다.
    <SafeAreaView style={styles.frame} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, title: character ? `${character.avatar} ${character.name}` : '하루친구' }} />
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {character ? `${character.avatar} ${character.name}` : '하루친구'}
        </Text>
        <View style={[styles.headerSide, styles.headerRight]}>
          <Link href="/character" style={styles.headerLink}>
            캐릭터
          </Link>
        </View>
      </View>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? <Text style={styles.empty}>첫 메시지를 보내 보세요.</Text> : null}
          {messages.map((m, i) => (
            <View key={m.id ?? `local-${i}`} style={[styles.bubble, m.role === 'user' ? styles.mine : styles.theirs]}>
              <Text style={m.role === 'user' ? styles.mineText : styles.theirsText}>{m.content || '…'}</Text>
            </View>
          ))}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="메시지 보내기"
            editable={!busy}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable style={[styles.send, (busy || !input.trim()) && styles.sendOff]} onPress={send} disabled={busy}>
            <Text style={styles.sendText}>{busy ? '…' : '보내기'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: '#fff' },
  screen: { flex: 1, backgroundColor: '#FAFAFB' },
  header: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: '#E6E8EC', backgroundColor: '#fff' },
  headerSide: { width: 72 },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1F2430' },
  list: { padding: 16, gap: 8 },
  empty: { textAlign: 'center', color: '#5B6270', marginTop: 24 },
  bubble: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#F7585C' },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6E8EC' },
  mineText: { color: '#fff', fontSize: 15 },
  theirsText: { color: '#1F2430', fontSize: 15 },
  error: { color: '#D93D42', fontSize: 13, marginTop: 8 },
  inputRow: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderColor: '#E6E8EC', backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#E6E8EC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
  send: { backgroundColor: '#F7585C', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  sendOff: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '700' },
  headerLink: { color: '#D93D42', fontWeight: '700', fontSize: 15, paddingHorizontal: 8 },
});
