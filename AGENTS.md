# 작업 규칙

이 저장소는 AI 친구 에이전트 서비스(하루친구)의 휴대폰 앱 실습용 템플릿이다. 백엔드는 별도 저장소 [friend-agent-template](https://github.com/88chacha/friend-agent-template)이고, 이 앱은 그 백엔드의 API를 부르는 화면만 가진다. 코딩 에이전트와 사람이 모두 이 규칙을 따른다.

## 구조
- 화면은 `src/app/` 에 있다(Expo Router). 파일 하나가 화면 하나다. `_layout.tsx` 는 화면 틀이다.
- 백엔드와 주고받는 코드는 `src/lib/api.ts`, 로그인은 `src/lib/session.tsx` 와 `src/lib/supabase.ts` 에 모아 둔다. 화면 파일에서 `fetch` 를 직접 부르지 않는다.
- 백엔드 주소는 `EXPO_PUBLIC_API_URL` 하나만 쓴다. Supabase 주소와 publishable key 는 백엔드 `/api/config` 에서 받아 온다. 앱에 Supabase 값을 따로 넣지 않는다.
- 답 스트리밍(`/api/chat`)은 `expo/fetch` 로 읽는다. React Native 기본 `fetch` 로 바꾸지 않는다.

## 비밀값과 키
- 앱에는 비밀값을 넣지 않는다. `EXPO_PUBLIC_` 로 시작하는 값은 앱 파일 안에 그대로 들어가 누구나 볼 수 있다. Supabase secret key, LLM API 키는 절대 넣지 않는다.
- `.env` 는 커밋하지 않는다.
- 서명 키(`*.jks`, `*.p12`, `*.p8`, `*.mobileprovision`)와 Google 서비스 계정 키(JSON) 파일을 만들거나 저장소에 넣지 않는다. 서명은 EAS가 관리한다. Google Play에 올릴 때는 Play Console 웹에서 직접 올린다.

## 빌드와 배포
- `eas build`, `eas submit` 은 실행 전에 어떤 프로필로 무엇을 만들고 어디에 올리는지 한 줄씩 설명하고 확인을 받는다. 무료 플랜은 월 빌드 횟수가 정해져 있다.
- `app.json` 의 `android.package`, `ios.bundleIdentifier` 는 스토어에 한 번 올리면 바꿀 수 없다. 바꾸기 전에 확인을 받는다.

## 작업 방식
- 명령을 실행하기 전에 그 명령이 무엇을 만들고 바꾸고 지우는지 한 줄씩 설명한다.
- 요청받은 화면과 기능 외에는 바꾸지 않는다. 백엔드 API가 더 필요하면 앱에서 우회하지 말고, 백엔드 저장소에 무엇이 필요한지 먼저 설명한다.
- 오류가 나면 로그를 근거로 원인을 먼저 설명하고, 확인을 받은 뒤 고친다.
- 작업을 마치기 전에 `npx tsc --noEmit` 과 `npx expo-doctor` 를 돌린다.

---

# Expo 작업 안내 (Expo 템플릿 기본 문서)

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
