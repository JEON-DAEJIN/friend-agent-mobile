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

// 사진 속 글자 읽기(POST /api/ocr). 사진을 multipart 폼의 photo 칸에 담아 보내고 {"text": "읽은 글"} 을 받는다. 로그인 토큰 필요.
// 주의: multipart 는 경계 문자열이 들어간 Content-Type 을 요청이 직접 만들어야 한다. 위 headers() 처럼 JSON용
// Content-Type 을 붙이면 백엔드가 사진을 찾지 못해 400이 나므로, 여기서는 로그인 토큰만 붙인다.
//
// 왜 fetch 가 아니라 XMLHttpRequest 인가(N057 실습, SDK 58 + Expo Go에서 실제로 겪음):
//  1) SDK 58은 expo/fetch 를 전역 fetch 자리에 넣어 둔다. 여기에 옛 React Native 식 { uri, name, type } 을 담으면
//     "Unsupported FormDataPart implementation" 오류가 난다.
//  2) expo-file-system 의 File(Blob)로 담으면 이번엔 JavaScript 가 파일 바이트를 직접 읽다가 Expo Go에서
//     "FileSystemFile.bytes … missing 'READ' permission" 으로 막혔다(카메라로 찍은 사진).
//  3) React Native 의 XMLHttpRequest 는 { uri, name, type } 을 받아 네이티브 쪽이 파일을 직접 읽어 보내므로
//     JavaScript 의 파일 읽기 허가가 필요 없다.
export function readPhoto(photo: { uri: string; mimeType?: string | null; fileName?: string | null }): Promise<string> {
  requireUrl();
  const form = new FormData();
  form.append('photo', {
    uri: photo.uri,
    name: photo.fileName ?? 'photo.jpg',
    type: photo.mimeType ?? 'image/jpeg',
  } as unknown as Blob);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_URL + '/api/ocr');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`); // Content-Type 은 넣지 않는다(경계 문자열은 전송 통로가 만든다)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve((JSON.parse(xhr.responseText) as { text: string }).text);
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error(`/api/ocr 요청 실패: ${xhr.status} ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('/api/ocr 요청 실패: 네트워크 오류(백엔드 주소·와이파이 확인)'));
    xhr.send(form);
  });
}

// /api/chat 은 한 줄에 이벤트 하나(JSON)씩 흘려보낸다. 답 글자는 delta, 끝나면 done, 실패하면 error.
export type ChatEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; message_id: number }
  | { type: 'error'; message: string }
  | { type: 'memory'; added: string[] } // 기억 정리 결과. 답 글자(delta)가 다 온 뒤에 온다
  | { type: 'reminder'; action: string; summary: string } // 도구가 약속을 만들었을 때. 답 글자보다 먼저 온다
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
  ocr_enabled?: boolean; // 백엔드에서 사진 글자 읽기(OCR_ENABLED)가 켜져 있는지. 꺼져 있으면 /api/ocr 은 404
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

// notes: 그 턴에 흘러온 memory·reminder 이벤트로 만든 메모(예: "🧠 기억했어요: …", "⏰ …").
// 저장된 메시지가 아니라 스트리밍 이벤트라서 /api/messages 로 다시 불러온 지난 대화에는 없다.
export type Message = { id?: number; role: 'user' | 'assistant'; content: string; notes?: string[] };
