# 🎵 배경음악 MP3 파일로 교체하는 방법

현재는 Web Audio API로 코드 기반 배경음악이 재생되고 있습니다.
각 화면(메인, 안력게임, 청력게임, 기억력게임, 테스트하기)마다 다른 음악이 재생됩니다.
나중에 실제 MP3 파일로 교체하려면 아래 단계를 따르세요.

## 🎼 음악 구성

- **메인 화면**: 편안한 C Major 멜로디
- **안력 게임 (3개)**: 밝고 경쾌한 G Major 멜로디
- **청력 게임 (3개)**: 신비로운 A Minor 멜로디
- **기억력 게임 (3개)**: 집중력 있는 D Major 멜로디
- **테스트하기 (3개)**: 긴장감 있는 E Minor 멜로디

총 **13개의 음악 파일**이 필요합니다 (메인 1개 + 미니게임 12개).

## 📋 교체 단계

### 1️⃣ 프로젝트를 로컬 환경에 다운로드
Figma Make에서 프로젝트를 내보내거나 코드를 복사하여 로컬 React 프로젝트로 가져옵니다.

### 2️⃣ 음악 파일 추가
프로젝트에 `public/music` 폴더를 만들고 음악 파일들을 추가합니다:

```
your-project/
├── public/
│   └── music/
│       ├── main-menu.mp3           ← 메인 화면
│       ├── vision-game-1.mp3       ← 안력 게임 1 (순서대로 클릭)
│       ├── vision-game-2.mp3       ← 안력 게임 2
│       ├── vision-game-3.mp3       ← 안력 게임 3
│       ├── hearing-game-1.mp3      ← 청력 게임 1
│       ├── hearing-game-2.mp3      ← 청력 게임 2
│       ├── hearing-game-3.mp3      ← 청력 게임 3
│       ├── memory-game-1.mp3       ← 기억력 게임 1
│       ├── memory-game-2.mp3       ← 기억력 게임 2
│       ├── memory-game-3.mp3       ← 기억력 게임 3
│       ├── test-game-1.mp3         ← 테스트하기 1
│       ├── test-game-2.mp3         ← 테스트하기 2
│       └── test-game-3.mp3         ← 테스트하기 3
├── src/
│   ├── App.tsx
│   ├── utils/
│   │   └── backgroundMusic.ts
│   └── ...
```

### 3️⃣ backgroundMusic.ts 파일 수정

`/utils/backgroundMusic.ts` 파일을 열고 다음 부분을 수정:

```typescript
// ===== 이 줄을 찾아서 =====
const USE_AUDIO_FILE = false;  // ← false를 true로 변경
```

수정 후:
```typescript
const USE_AUDIO_FILE = true;  // MP3 파일 사용 활성화
```

**그게 다입니다!** 파일 경로는 이미 설정되어 있습니다:
- `MUSIC_TRACKS` 객체에 모든 파일 경로가 정의되어 있습니다
- 파일명만 위의 폴더 구조와 일치하면 자동으로 작동합니다

### 4️⃣ 완료!
이제 앱을 실행하면:
- 메인 화면에서는 `main-menu.mp3` 재생
- 각 미니게임 진입 시 해당 게임의 음악으로 자동 전환
- 설정에서 음악 on/off 및 볼륨 조절 가능

## 💡 추가 팁

### 음악 파일 권장 사항
- **형식**: MP3 (호환성 최고) 또는 OGG
- **비트레이트**: 128kbps (파일 크기와 품질의 균형)
- **길이**: 30초~2분 (루프 재생에 적합)
- **볼륨**: 믹싱 시 적절한 볼륨으로 마스터링

### Vite 사용 시 (추천)
`public` 폴더 대신 `src/assets`에 넣고 import 방식 사용:

```typescript
import backgroundMusic from './assets/background-music.mp3';

const USE_AUDIO_FILE = true;
const AUDIO_FILE_PATH = backgroundMusic;
```

### Create React App 사용 시
`public` 폴더에 파일을 넣고 경로는 `/background-music.mp3`로 설정

### Next.js 사용 시
`public` 폴더에 파일을 넣고 경로는 `/background-music.mp3`로 설정

## 🔧 문제 해결

### 음악이 재생되지 않을 때
1. 브라우저 콘솔에서 에러 확인
2. 파일 경로가 올바른지 확인
3. 브라우저 자동재생 정책 확인 (사용자 인터랙션 필요)

### 파일이 너무 클 때
- 온라인 압축 도구 사용 (예: https://www.mp3smaller.com/)
- 비트레이트를 96kbps 또는 64kbps로 낮추기

### 다양한 음악 파일 사용하기
메인 화면, 게임 화면 등 각각 다른 음악을 사용하고 싶다면:
1. `backgroundMusic.ts`를 복사하여 `mainMenuMusic.ts`, `gameMusic.ts` 등으로 분리
2. 각 화면 컴포넌트에서 해당 음악 파일을 import하여 사용

---

더 궁금한 사항이 있으면 코드의 주석을 참고하거나 추가 질문해주세요!