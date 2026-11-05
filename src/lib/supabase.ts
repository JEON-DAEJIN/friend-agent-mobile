// Supabase 로그인. 주소와 publishable key 는 백엔드 /api/config 에서 받아 온다(앱에 따로 넣지 않는다).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

let client: SupabaseClient | null = null;

export function getSupabase(url: string, publishableKey: string): SupabaseClient {
  if (client) return client;
  const created = createClient(url, publishableKey, {
    auth: {
      storage: AsyncStorage, // 앱을 껐다 켜도 같은 게스트 사용자로 이어지게 로그인 정보를 기기에 저장한다
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  // 앱이 화면에 있을 때만 토큰을 자동으로 새로 받는다
  AppState.addEventListener('change', (state) => {
    if (state === 'active') created.auth.startAutoRefresh();
    else created.auth.stopAutoRefresh();
  });
  client = created;
  return created;
}
