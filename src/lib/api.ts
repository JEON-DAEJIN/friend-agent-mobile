// 백엔드(friend-agent-template)와 주고받는 코드. 백엔드 주소는 EXPO_PUBLIC_API_URL 에서 읽는다.
import { fetch as streamingFetch } from 'expo/fetch';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

let token: string | null = null;

// 로그인하면 Supabase 토큰을 넣어 둔다. 백엔드가 AUTH=none 이면 토큰 없이 부른다.
export function setToken(value: string | null) {
  token = value;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function requireUrl() {
  if (!API_URL) {
    throw new Error('백엔드 주소가 비어 있습니다. .env 의 EXPO_PUBLIC_API_URL 을 확인하세요.');
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  requireUrl();
  const response = await fetch(API_URL + path, {
    method: options.method ?? 'GET',
    headers: headers(),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    throw new Error(`${path} 요청 실패: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

// /api/chat 은 한 줄에 이벤트 하나(JSON)씩 흘려보낸다. 답 글자는 delta, 끝나면 done, 실패하면 error.
export type ChatEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; message_id: number }
  | { type: 'error'; message: string }
  | { type: string; [key: string]: unknown };

export async function streamChat(message: string, onEvent: (event: ChatEvent) => void) {
  requireUrl();
  // 앱에서 응답을 조금씩 읽으려면 expo/fetch 를 쓴다. React Native 기본 fetch 는 스트리밍을 읽지 못한다.
  const response = await streamingFetch(API_URL + '/api/chat', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ message }),
  });
  if (!response.ok || !response.body) {
    throw new Error(`/api/chat 요청 실패: ${response.status} ${await response.text()}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line) as ChatEvent);
      newline = buffer.indexOf('\n');
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as ChatEvent);
}

// 백엔드 응답 모양
export type Config = {
  env: string;
  auth: 'none' | 'supabase';
  storage: string;
  supabase_url: string;
  supabase_publishable_key: string;
  options: Record<string, string[]>;
};

export type Me = { id: string; anonymous: boolean; email: string | null; has_character: boolean };

export type Character = {
  name: string;
  gender: string;
  age_group: string;
  job: string;
  relationship: string;
  traits: string[];
  speech: string;
  emoji: string;
  interests: string[];
  avoid: string[];
  memo: string;
  avatar: string;
};

export type Message = { id?: number; role: 'user' | 'assistant'; content: string };
