# 하루친구 휴대폰 앱 (Expo)

AI 친구 에이전트 서비스 **하루친구**의 휴대폰 앱 실습용 템플릿입니다. 백엔드는 별도 저장소 [friend-agent-template](https://github.com/88chacha/friend-agent-template)에 있고, 이 앱은 그 백엔드의 API를 부르는 화면만 가집니다. 웹 화면과 같은 백엔드, 같은 사용자 데이터를 씁니다.

## 들어 있는 것

| 화면과 파일 | 하는 일 |
| --- | --- |
| `src/app/index.tsx` | 대화 화면. 지난 대화를 불러오고, 보낸 메시지의 답을 글자가 이어 나오게(스트리밍) 보여 줌 |
| `src/app/character.tsx` | 캐릭터 화면. 캐릭터가 없으면 앱을 켤 때 이 화면부터 나옴 |
| `src/lib/api.ts` | 백엔드 API 호출과 답 스트리밍 읽기 |
| `src/lib/session.tsx`, `src/lib/supabase.ts` | 앱을 켤 때 백엔드 설정을 읽고, 백엔드가 Supabase 로그인을 쓰면 익명 로그인 |
| `eas.json` | EAS 클라우드 빌드 설정(`preview`: 바로 설치하는 Android APK, `production`: 스토어용) |

기억과 약속 화면, 알림 푸시, 구글 로그인은 들어 있지 않습니다. 직접 더해 보는 과제입니다.

## 준비

- Node.js 22.13 이상 또는 24.3 이상 (내 컴퓨터에는 이것만 있으면 됩니다. Android Studio, Xcode, 에뮬레이터는 필요 없습니다)
- 휴대폰에 **Expo Go** 앱 (Android: Play 스토어, iPhone: App Store). 이 템플릿은 Expo SDK 58이라 Expo Go 설정 화면의 SDK 버전도 58이어야 합니다. 다르면 "버전이 맞지 않는다"는 오류가 뜹니다
- 배포한 백엔드 주소. 없으면 강사가 알려 준 시연용 주소
- 빌드할 때: Expo 계정(무료)

## 내 폰에서 실행하기

```bash
npm install
cp .env.example .env          # .env 의 EXPO_PUBLIC_API_URL 에 백엔드 주소를 넣는다
npx expo start                # 화면의 QR 코드를 폰으로 찍는다 (Android: Expo Go 앱, iPhone: 카메라 앱)
```

노트북과 폰이 같은 와이파이에 있어야 합니다. 연결이 안 되면(강의실 와이파이 등) `npx expo start --tunnel` 로 실행합니다.

처음 열면 캐릭터 화면이 나옵니다. 저장하면 대화 화면으로 넘어갑니다. "연결하지 못했어요"가 뜨면 화면에 나온 이유를 봅니다. 자주 나오는 원인은 다음과 같습니다.

| 화면에 나온 이유 | 확인할 것 |
| --- | --- |
| 백엔드 주소가 비어 있습니다 | `.env` 의 `EXPO_PUBLIC_API_URL`. 고친 뒤 `npx expo start --clear` |
| 익명 로그인 실패 | 백엔드가 쓰는 Supabase 프로젝트에서 Allow anonymous sign-ins 가 켜져 있는지 |
| `/api/config 요청 실패` | 백엔드 주소가 맞는지, 브라우저로 `<주소>/health` 가 열리는지 |

## 앱 이름과 패키지 이름 바꾸기

`app.json` 에서 바꿉니다.

- `name`: 폰에 보이는 앱 이름 (예: `하루친구 (지수)`)
- `android.package`, `ios.bundleIdentifier`: 스토어에서 앱을 구분하는 이름 (예: `kr.modulabs.harufriend.jisu`). 스토어에 한 번 올리면 바꿀 수 없습니다.

## 빌드하기 (EAS)

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure      # 처음 한 번. 이 프로젝트를 내 Expo 계정에 연결
npx eas-cli@latest build --profile preview --platform android
```

빌드는 Expo의 클라우드 서버에서 돌고, 끝나면 설치 링크와 QR 코드가 나옵니다. Android 폰에서 링크를 열면 APK를 바로 설치할 수 있습니다. 빌드 전에 `eas.json` 의 `EXPO_PUBLIC_API_URL` 을 내 백엔드 주소로 바꿉니다. 빌드 서버는 `.env` 를 받지 않기 때문입니다.

- 무료 플랜은 월 빌드 횟수가 정해져 있고 대기열이 있습니다. 빌드는 꼭 필요할 때만 합니다.
- Claude에 Expo 커넥터를 연결하면 빌드 상태와 로그를 Claude에서 확인할 수 있습니다.

## 스토어 내부 테스트에 올리기 (선택)

- **Android**: Play Console에서 앱을 만들고, `--profile production` 으로 만든 AAB 파일을 내부 테스트 트랙에 **웹에서 직접** 올립니다. 테스터 링크로 설치합니다. 내부 테스트는 자동으로 스토어에 공개되지 않습니다.
- **iOS**: TestFlight로 배포하려면 Apple 개발자 계정이 필요합니다. 실습에서는 강사가 올린 대표 앱을 테스터로 받아 봅니다.

## 백엔드와 맞춰야 하는 것

이 앱이 쓰는 백엔드 API: `GET /api/config`, `GET /api/me`, `GET·PUT /api/character`, `GET /api/messages`, `POST /api/chat`(한 줄에 이벤트 하나씩 오는 스트리밍). 백엔드 템플릿에서 이 API가 바뀌면 `src/lib/api.ts` 를 함께 고칩니다.

| 이 앱 | 확인한 백엔드 |
| --- | --- |
| 2026-10-29 | friend-agent-template `main` (2026-10-29) |
