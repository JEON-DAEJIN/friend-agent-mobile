// 여러 값 가운데 고르는 버튼
import { Pressable, StyleSheet, Text } from 'react-native';

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.selected]}>
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1.5, borderColor: '#E6E8EC', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  selected: { borderColor: '#F7585C', backgroundColor: '#FFE9E9' },
  text: { fontSize: 14, color: '#1F2430' },
  selectedText: { color: '#D93D42', fontWeight: '700' },
});
