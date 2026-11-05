// 대화 화면. 캐릭터가 없으면 캐릭터 화면으로 보낸다(백엔드도 캐릭터가 있어야 대화 기록을 돌려준다).
import * as ImagePicker from 'expo-image-picker';
import { Link, Redirect, Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorView, Loading } from '@/components/StatusView';
import { api, readPhoto, streamChat, type Character, type Message } from '@/lib/api';
import { takePendingPhoto } from '@/lib/photoHandoff';
import { useSession } from '@/lib/session';

export default function ChatScreen() {
  const session = useSession();
  if (session.status === 'loading') return <Loading />;
  if (session.status === 'error') return <ErrorView message={session.message} retry={session.retry} />;
  if (!session.me.has_character) return <Redirect href="/character" />;
  return <Chat ocrEnabled={session.config.ocr_enabled === true} />;
}

// 읽은 글 앞에 붙이는 안내 문장(웹 화면과 같음). 바로 보내지 않고 입력창에 넣어 사람이 확인·수정한 뒤 보낸다.
const OCR_PREFIX = '사진에서 읽은 글이야. 여기 있는 일정 중에 알려 줘야 할 게 있으면 약속으로 저장해 줘.';

function Chat({ ocrEnabled }: { ocrEnabled: boolean }) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false); // 사진 글자를 읽는 중
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  // 사진을 백엔드 OCR로 읽어 입력창에 넣는다. 보내지는 않는다(사람이 확인·수정한 뒤 보내기 — HITL).
  const readIntoInput = async (picture: { uri: string; mimeType?: string | null; fileName?: string | null }) => {
    setReading(true);
    setError(null);
    try {
      const text = (await readPhoto(picture)).trim();
      if (!text) {
        setError('사진에서 글자를 찾지 못했어요. 밝은 곳에서 글자가 화면을 가득 채우게 다시 찍어 주세요.');
        return;
      }
      setInput(`${OCR_PREFIX}\n${text}`);
    } catch (e) {
      setError(String((e as Error).message ?? e)); // 404(OCR 꺼짐)·401(토큰 없음)·400(사진 없음)을 그대로 보여 준다
    } finally {
      setReading(false);
    }
  };

  // 카메라 화면에서 돌아와 이 화면이 다시 보이면, 보관함에 사진이 있을 때 한 번만 꺼내 읽는다
  useFocusEffect(
    useCallback(() => {
      const picture = takePendingPhoto();
      if (picture) readIntoInput(picture);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    readIntoInput({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName });
  };

  const choosePhoto = () =>
    Alert.alert('사진으로 약속 만들기', '사진을 어떻게 가져올까요?', [
      { text: '사진첩에서 고르기', onPress: pickFromLibrary },
      { text: '카메라로 찍기', onPress: () => router.push('/camera') },
      { text: '취소', style: 'cancel' },
    ]);

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

  // 마지막 메시지(답을 받는 중인 메시지)에 메모를 붙인다. reminder 는 답 글자보다 먼저, memory 는 답 글자 뒤에 오지만
  // 보내는 순간 빈 답 말풍선을 먼저 만들어 두므로 둘 다 "지금 받고 있는 마지막 답"에 붙이면 된다.
  const addNotesToLast = (notes: string[]) =>
    setMessages((prev) => {
      const next = prev.slice();
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, notes: [...(last.notes ?? []), ...notes] };
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
        // 새로 기억한 것이 없으면 added 가 빈 목록이라 메모를 붙이지 않는다(인사·질문에는 안 붙음)
        if (event.type === 'memory' && Array.isArray(event.added) && event.added.length > 0)
          addNotesToLast(event.added.map((text) => `🧠 기억했어요: ${text}`));
        if (event.type === 'reminder' && event.summary) addNotesToLast([`⏰ ${String(event.summary)}`]);
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
      {/* Android Expo 앱은 edge-to-edge라 자판이 올라와도 창 크기가 줄지 않는다. behavior 가 없으면 입력창이 자판 밑에 깔리므로
          두 플랫폼 모두 padding 을 준다(Expo 문서 Keyboard handling, SDK 58 실습에서 Android 입력창이 가려져 고침). */}
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? <Text style={styles.empty}>첫 메시지를 보내 보세요.</Text> : null}
          {messages.map((m, i) => (
            <View key={m.id ?? `local-${i}`} style={m.role === 'user' ? styles.mineRow : styles.theirsRow}>
              <View style={[styles.bubble, m.role === 'user' ? styles.mine : styles.theirs]}>
                <Text style={m.role === 'user' ? styles.mineText : styles.theirsText}>{m.content || '…'}</Text>
              </View>
              {m.notes?.map((note, j) => (
                <Text key={j} style={styles.note}>
                  {note}
                </Text>
              ))}
            </View>
          ))}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
        {reading ? <Text style={styles.reading}>사진 속 글자를 읽는 중…</Text> : null}
        <View style={styles.inputRow}>
          {ocrEnabled ? (
            <Pressable
              style={[styles.photo, (busy || reading) && styles.sendOff]}
              onPress={choosePhoto}
              disabled={busy || reading}
              accessibilityLabel="사진으로 약속 만들기"
            >
              <Text style={styles.photoText}>📷</Text>
            </Pressable>
          ) : null}
          {/* 읽은 글이 여러 줄이라 확인·수정하기 쉽게 여러 줄 입력으로 둔다(보내기는 오른쪽 버튼) */}
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="메시지 보내기"
            editable={!busy && !reading}
            multiline
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
  // 말풍선과 그 아래 메모를 한 줄(row)로 묶어 좌우 정렬은 줄이 맡는다
  mineRow: { alignSelf: 'flex-end', alignItems: 'flex-end', maxWidth: '82%' },
  theirsRow: { alignSelf: 'flex-start', alignItems: 'flex-start', maxWidth: '82%' },
  bubble: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 },
  mine: { backgroundColor: '#F7585C' },
  theirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6E8EC' },
  note: { color: '#8A909C', fontSize: 12, marginTop: 4, marginLeft: 4 },
  mineText: { color: '#fff', fontSize: 15 },
  theirsText: { color: '#1F2430', fontSize: 15 },
  error: { color: '#D93D42', fontSize: 13, marginTop: 8 },
  inputRow: { flexDirection: 'row', gap: 8, padding: 10, borderTopWidth: 1, borderColor: '#E6E8EC', backgroundColor: '#fff' },
  input: { flex: 1, maxHeight: 140, borderWidth: 1, borderColor: '#E6E8EC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
  photo: { borderWidth: 1, borderColor: '#E6E8EC', borderRadius: 10, paddingHorizontal: 10, justifyContent: 'center' },
  photoText: { fontSize: 20 },
  reading: { color: '#5B6270', fontSize: 13, paddingHorizontal: 14, paddingTop: 6, backgroundColor: '#fff' },
  send: { backgroundColor: '#F7585C', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  sendOff: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '700' },
  headerLink: { color: '#D93D42', fontWeight: '700', fontSize: 15, paddingHorizontal: 8 },
});
