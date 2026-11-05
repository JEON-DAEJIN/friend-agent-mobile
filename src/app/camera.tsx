// 카메라 화면. 종이 일정표를 그 자리에서 찍어 대화 화면으로 넘긴다(글자 읽기는 대화 화면이 백엔드 /api/ocr 로 한다).
// expo-camera 는 Expo Go에 들어 있다(SDK 58). 미리보기는 실제 폰에서만 보이고 에뮬레이터·시뮬레이터에서는 나오지 않는다.
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { setPendingPhoto } from '@/lib/photoHandoff';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  // 권한 정보를 불러오는 중
  if (!permission) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.message}>카메라 권한을 확인하는 중…</Text>
      </View>
    );
  }

  // 권한이 없을 때: 앱이 멈추지 않고, 다시 묻거나(아직 물어볼 수 있을 때) 폰 설정으로 안내한다
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.message}>일정표를 찍으려면 카메라 권한이 필요해요.</Text>
        {permission.canAskAgain ? (
          <Pressable style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>카메라 권한 허용하기</Text>
          </Pressable>
        ) : (
          <>
            <Text style={styles.hint}>폰 설정 &gt; 앱 &gt; Expo Go &gt; 권한에서 카메라를 켜 주세요.</Text>
            <Pressable style={styles.button} onPress={() => Linking.openSettings()}>
              <Text style={styles.buttonText}>설정 열기</Text>
            </Pressable>
          </>
        )}
        <Pressable style={styles.textButton} onPress={() => router.back()}>
          <Text style={styles.textButtonText}>닫기</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const shoot = async () => {
    if (!camera.current || !ready || busy) return;
    setBusy(true);
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.7 });
      // 찍은 사진을 보관함에 넣고 대화 화면으로 돌아간다. 대화 화면이 다시 보일 때 꺼내서 OCR을 부른다.
      if (picture?.uri) {
        setPendingPhoto({ uri: picture.uri, mimeType: 'image/jpeg', fileName: 'camera.jpg' });
        router.back();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.frame}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setReady(true)} />
      {/* 미리보기 위에 겹쳐 그리는 안내와 버튼 */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <Text style={styles.guide}>글자가 화면 안에 들어오게 찍어 주세요</Text>
        <View style={styles.controls}>
          <Pressable style={styles.side} onPress={() => router.back()}>
            <Text style={styles.sideText}>닫기</Text>
          </Pressable>
          <Pressable
            style={[styles.shutter, (!ready || busy) && styles.shutterOff]}
            onPress={shoot}
            disabled={!ready || busy}
            accessibilityLabel="사진 찍기"
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.side} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  guide: {
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 15,
  },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingBottom: 24 },
  side: { width: 64, alignItems: 'center' },
  sideText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterOff: { opacity: 0.4 },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14, backgroundColor: '#fff' },
  message: { fontSize: 16, color: '#1F2430', textAlign: 'center' },
  hint: { fontSize: 14, color: '#5B6270', textAlign: 'center' },
  button: { backgroundColor: '#F7585C', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  textButton: { padding: 8 },
  textButtonText: { color: '#5B6270', fontSize: 15 },
});
