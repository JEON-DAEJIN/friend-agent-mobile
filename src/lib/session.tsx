// 앱이 켜질 때 한 번: 백엔드 설정 읽기 → (필요하면) 익명 로그인 → 내 정보 읽기.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { api, setToken, type Config, type Me } from './api';
import { getSupabase } from './supabase';

type Session =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; config: Config; me: Me; refreshMe: () => Promise<void> };

const SessionContext = createContext<Session>({ status: 'loading' });

export function useSession() {
  return useContext(SessionContext);
}

async function signIn(config: Config) {
  if (config.auth !== 'supabase') return; // 백엔드가 로그인을 쓰지 않으면 건너뛴다
  const supabase = getSupabase(config.supabase_url, config.supabase_publishable_key);
  let { data } = await supabase.auth.getSession();
  if (!data.session) {
    const result = await supabase.auth.signInAnonymously();
    if (result.error) {
      throw new Error(`익명 로그인 실패: ${result.error.message}. Supabase에서 Allow anonymous sign-ins 가 켜져 있는지 확인하세요.`);
    }
    data = { session: result.data.session };
  }
  setToken(data.session?.access_token ?? null);
  supabase.auth.onAuthStateChange((_event, session) => setToken(session?.access_token ?? null));
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: 'loading' });

  const start = useCallback(async () => {
    setSession({ status: 'loading' });
    try {
      const config = await api<Config>('/api/config');
      await signIn(config);
      const me = await api<Me>('/api/me');
      const refreshMe = async () => {
        const fresh = await api<Me>('/api/me');
        setSession({ status: 'ready', config, me: fresh, refreshMe });
      };
      setSession({ status: 'ready', config, me, refreshMe });
    } catch (error) {
      setSession({ status: 'error', message: String((error as Error).message ?? error), retry: start });
    }
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
