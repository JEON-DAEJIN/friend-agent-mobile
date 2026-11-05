// 캐릭터 화면. 값의 목록(아바타, 관계, 말투, 성격)은 백엔드 /api/config 의 options 에서 받아 온다.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { ErrorView, Loading } from '@/components/StatusView';
import { api, type Character } from '@/lib/api';
import { useSession } from '@/lib/session';

const MAX_TRAITS = 3;

export default function CharacterScreen() {
  const session = useSession();
  const [character, setCharacter] = useState<Character | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status !== 'ready') return;
    api<{ character: Character }>('/api/character')
      .then((r) => setCharacter(r.character))
      .catch((e) => setError(String(e.message ?? e)));
  }, [session.status]);

  if (session.status === 'loading') return <Loading />;
  if (session.status === 'error') return <ErrorView message={session.message} retry={session.retry} />;
  if (error && !character) return <ErrorView message={error} />;
  if (!character) return <Loading />;

  const options = session.config.options;
  const set = (patch: Partial<Character>) => setCharacter({ ...character, ...patch });
  const toggleTrait = (t: string) => {
    const has = character.traits.includes(t);
    if (!has && character.traits.length >= MAX_TRAITS) return;
    set({ traits: has ? character.traits.filter((x) => x !== t) : [...character.traits, t] });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api('/api/character', { method: 'PUT', body: character });
      await session.refreshMe();
      router.replace('/');
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const choices = (key: 'avatar' | 'relationship' | 'speech' | 'emoji') =>
    options[key].map((v) => <Chip key={v} label={v} selected={character[key] === v} onPress={() => set({ [key]: v })} />);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.form}>
      <Text style={styles.label}>이름</Text>
      <TextInput style={styles.input} value={character.name} onChangeText={(name) => set({ name })} maxLength={20} />

      <Text style={styles.label}>모습</Text>
      <View style={styles.row}>{choices('avatar')}</View>

      <Text style={styles.label}>나와의 관계</Text>
      <View style={styles.row}>{choices('relationship')}</View>

      <Text style={styles.label}>성격 (최대 {MAX_TRAITS}개)</Text>
      <View style={styles.row}>
        {options.traits.map((t) => (
          <Chip key={t} label={t} selected={character.traits.includes(t)} onPress={() => toggleTrait(t)} />
        ))}
      </View>

      <Text style={styles.label}>말투</Text>
      <View style={styles.row}>{choices('speech')}</View>

      <Text style={styles.label}>이모지</Text>
      <View style={styles.row}>{choices('emoji')}</View>

      <Text style={styles.label}>직업</Text>
      <TextInput style={styles.input} value={character.job} onChangeText={(job) => set({ job })} maxLength={30} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.save, saving && styles.saveOff]} onPress={save} disabled={saving}>
        <Text style={styles.saveText}>{saving ? '저장 중…' : '저장하고 대화하기'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, gap: 8, backgroundColor: '#fff' },
  label: { fontSize: 14, fontWeight: '700', marginTop: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  input: { borderWidth: 1, borderColor: '#E6E8EC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
  error: { color: '#D93D42', fontSize: 13, marginTop: 8 },
  save: { backgroundColor: '#F7585C', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 18 },
  saveOff: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
