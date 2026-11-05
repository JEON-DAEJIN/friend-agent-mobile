// 불러오는 중, 오류 화면
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  );
}

export function ErrorView({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>연결하지 못했어요</Text>
      <Text style={styles.message}>{message}</Text>
      {retry ? (
        <Pressable style={styles.button} onPress={retry}>
          <Text style={styles.buttonText}>다시 시도</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700' },
  message: { fontSize: 14, color: '#5B6270', textAlign: 'center' },
  button: { backgroundColor: '#F7585C', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
