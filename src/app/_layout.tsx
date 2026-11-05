// 앱 전체 틀: 로그인 상태를 모든 화면에 나눠 주고, 화면을 쌓아 보여 준다.
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SessionProvider } from '@/lib/session';

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTitleAlign: 'center' }}>
        <Stack.Screen name="index" options={{ title: '하루친구' }} />
        <Stack.Screen name="character" options={{ title: '캐릭터' }} />
      </Stack>
    </SessionProvider>
  );
}
