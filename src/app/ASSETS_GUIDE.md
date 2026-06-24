# 🎮 눈귀뇌하트 - 에셋 적용 가이드

이 문서는 배경음악, 효과음, 버블게임 음성, 분류게임 음성, 폰트를 실제 파일로 교체하는 방법을 안내합니다.

---

## 📁 폴더 구조

```
/public/
├── music/          ← 배경음악 MP3 파일 (15개)
├── sounds/         ← 효과음 MP3 파일 (5개)
│   └── classify/   ← 분류게임 음성 파일 (160개)
├── voices/         ← 버블게임 음성 파일 (36개)
└── fonts/          ← 폰트 파일 (3개)
```

---

## 🎵 1. 배경음악 (BGM)

### 📂 위치
`/public/music/` 폴더에 배치

### 📋 필요한 파일 목록 (총 15개)

#### 메인 화면 (2개) - 번갈아 재생
- `main1.mp3` - 메인메뉴 첫 번째 음악
- `main2.mp3` - 메인메뉴 두 번째 음악

#### 크레딧 화면 (1개)
- `credits.mp3` - 크레딧 전용 음악

#### 눈 게임 (3개)
- `bomb.mp3` - 폭탄 게임
- `shuffle.mp3` - 셔플 게임 (야바위)
- `number.mp3` - 숫자 게임

#### 귀 게임 (3개)
- `bubble.mp3` - 버블 게임
- `direction.mp3` - 방향 게임
- `classify.mp3` - 분류 게임

#### 뇌 게임 (3개)
- `card.mp3` - 카드 게임
- `coloring.mp3` - 색칠 게임
- `order.mp3` - 순서 게임

### ✅ 적용 방법

1. `/public/music/` 폴더에 위 15개 MP3 파일 배치
2. `/utils/backgroundMusic.ts` 파일 열기
3. 4번째 줄 수정:
   ```typescript
   const USE_AUDIO_FILE = true;  // false → true로 변경
   ```
4. 저장 후 앱 새로고침

### 🔄 재생 방식
- **메인메뉴**: main1.mp3 재생 완료 → main2.mp3 재생 → main1.mp3 → 반복
- **크레딧**: credits.mp3 루프 재생
- **게임**: 각 게임 전용 음악 루프 재생

---

## 🔊 2. 효과음 (SFX)

### 📂 위치
`/public/sounds/` 폴더에 배치

### 📋 필요한 파일 목록 (총 7개)

- `click.mp3` - 일반 클릭/버튼 효과음
- `back.mp3` - 뒤로가기/취소 효과음
- `select.mp3` - 선택/확인 효과음
- `start.mp3` - 게임 시작 효과음
- `hover.mp3` - 마우스 호버 효과음 (선택사항)
- `noise-weak.mp3` - 약한 노이즈 (버블게임 레벨 2, 방향게임 레벨 2, 분류게임 레벨 2)
- `noise-strong.mp3` - 강한 노이즈 (버블게임 레벨 3, 방향게임 레벨 3, 분류게임 레벨 3)

### 📊 현재 사용 위치

| 효과음 | 사용 위치 |
|--------|-----------|
| **click.mp3** | 설정 버튼, 기록 버튼, 카테고리 버튼 클릭 |
| **back.mp3** | 뒤로가기 버튼, 닫기 버튼 클릭 |
| **select.mp3** | 미니게임 선택, 게임 내 선택 액션 |
| **start.mp3** | 게임 시작, 성공 알림 |
| **hover.mp3** | 버튼 마우스 오버 (미사용 - 선택사항) |
| **noise-weak.mp3** | 버블게임 레벨 2, 방향게임 레벨 2, 분류게임 레벨 2 배경 노이즈 |
| **noise-strong.mp3** | 버블게임 레벨 3, 방향게임 레벨 3, 분류게임 레벨 3 배경 노이즈 |

### ⚙️ 현재 상태
- Web Audio API로 실시간 생성된 비프음 사용 중
- MP3 파일을 배치하고 코드 수정 시 실제 효과음으로 전환 가능

### ✅ 적용 방법 (개발자 필요)

효과음 파일을 준비한 후, `/utils/sound.ts` 파일을 수정하여 MP3 재생 방식으로 전환해야 합니다.

**예시 코드:**
```typescript
// 기존: Web Audio API
export function playClickSound(volume: number = 0.3) {
  if (!isSoundEnabled) return;
  const audio = new Audio('/sounds/click.mp3');
  audio.volume = volume;
  audio.play();
}
```

---

## 🎤 3. 버블게임 음성 (Voice)

### 📂 위치
`/public/voices/` 폴더에 배치

### 📋 필요한 파일 목록 (총 36개)

각 색상/타입별로 **4개의 음성 파일** 필요 (목소리 다른 버전)

#### 일반 색상 버블 (28개)
- `빨강-1.mp3`, `빨강-2.mp3`, `빨강-3.mp3`, `빨강-4.mp3` - **빨강**
- `주황-1.mp3`, `주황-2.mp3`, `주황-3.mp3`, `주황-4.mp3` - **주황**
- `노랑-1.mp3`, `노랑-2.mp3`, `노랑-3.mp3`, `노랑-4.mp3` - **노랑**
- `초록-1.mp3`, `초록-2.mp3`, `초록-3.mp3`, `초록-4.mp3` - **초록**
- `파랑-1.mp3`, `파랑-2.mp3`, `파랑-3.mp3`, `파랑-4.mp3` - **파랑**
- `남색-1.mp3`, `남색-2.mp3`, `남색-3.mp3`, `남색-4.mp3` - **남색**
- `보라-1.mp3`, `보라-2.mp3`, `보라-3.mp3`, `보라-4.mp3` - **보라**

#### 특수 버블 (8개)
- `무적-1.mp3`, `무적-2.mp3`, `무적-3.mp3`, `무적-4.mp3` - **무적공**
- `꽝-1.mp3`, `꽝-2.mp3`, `꽝-3.mp3`, `꽝-4.mp3` - **꽝공**

### 🎯 음성 재생 시점
1. **게임 시작 시** - 현재 버블 색상 안내 (1초 후)
2. **버블 발사 후** - 다음 버블로 전환 시 색상 안내 (800ms 후)
3. **현재 버블 클릭 시** - 즉시 색상 안내 재생

### 🔢 음성 선택 방식
- 각 색상마다 4개 중 **랜덤**으로 선택되어 재생
- 다양한 목소리로 지루함 방지

### ⚙️ 현재 상태
- Web Audio API로 색상별 다른 주파수의 비프음 사용 중
- 음성 파일 배치 후 코드 수정 시 실제 음성으로 전환

### ✅ 적용 방법

1. `/public/voices/` 폴더에 위 36개 MP3 파일 배치
2. `/utils/colorVoice.ts` 파일 열기
3. 45~47번째 줄 수정:
   ```typescript
   // 기존 코드 (45~47줄)
   function playVoiceFile(key: string): boolean {
     return false;  // ← 이 부분을 주석 처리
     
   // 수정 후
   function playVoiceFile(key: string): boolean {
     // return false;  ← 주석 처리하고
   ```
4. 49~73번째 줄의 주석 제거:
   ```typescript
   /* 실제 음성 파일 사용 시 아래 코드를 주석 해제하세요
      ↓ 이 부분의 주석을 모두 제거
   */
   ```
5. 저장 후 앱 새로고침

### 🎵 임시 비프음 주파수 (참고)

현재 Web Audio API로 생성되는 임시 소리:

| 색상 | 주파수 | 음계 |
|------|--------|------|
| 빨강 | 261.63Hz | 도 (C) |
| 주황 | 293.66Hz | 레 (D) |
| 노랑 | 329.63Hz | 미 (E) |
| 초록 | 349.23Hz | 파 (F) |
| 파랑 | 392.00Hz | 솔 (G) |
| 남색 | 440.00Hz | 라 (A) |
| 보라 | 493.88Hz | 시 (B) |
| 무적공 | 400→800Hz | 상승음 |
| 꽝공 | 600→150Hz | 하강음 |

---

## 🎧 4. 분류게임 음성 (Classify)

### 📂 위치
`/public/sounds/classify/` 폴더에 배치

### 📋 필요한 파일 목록 (총 160개)

각 단어별로 **4개의 음성 파일** 필요 (목소리 다른 버전)

#### 단어 목록 (40개 × 4버전 = 160개)
- `오리-1.mp3`, `오리-2.mp3`, `오리-3.mp3`, `오리-4.mp3`
- `우리-1.mp3`, `우리-2.mp3`, `우리-3.mp3`, `우리-4.mp3`
- `바람-1.mp3`, `바람-2.mp3`, `바람-3.mp3`, `바람-4.mp3`
- `사람-1.mp3`, `사람-2.mp3`, `사람-3.mp3`, `사람-4.mp3`
- `구름-1.mp3`, `구름-2.mp3`, `구름-3.mp3`, `구름-4.mp3`
- `그림-1.mp3`, `그림-2.mp3`, `그림-3.mp3`, `그림-4.mp3`
- `다리-1.mp3`, `다리-2.mp3`, `다리-3.mp3`, `다리-4.mp3`
- `자리-1.mp3`, `자리-2.mp3`, `자리-3.mp3`, `자리-4.mp3`
- `머리-1.mp3`, `머리-2.mp3`, `머리-3.mp3`, `머리-4.mp3`
- `무리-1.mp3`, `무리-2.mp3`, `무리-3.mp3`, `무리-4.mp3`
- `곰-1.mp3`, `곰-2.mp3`, `곰-3.mp3`, `곰-4.mp3`
- `공-1.mp3`, `공-2.mp3`, `공-3.mp3`, `공-4.mp3`
- `압력-1.mp3`, `압력-2.mp3`, `압력-3.mp3`, `압력-4.mp3`
- `악력-1.mp3`, `악력-2.mp3`, `악력-3.mp3`, `악력-4.mp3`
- `밤-1.mp3`, `밤-2.mp3`, `밤-3.mp3`, `밤-4.mp3`
- `밥-1.mp3`, `밥-2.mp3`, `밥-3.mp3`, `밥-4.mp3`
- `눈-1.mp3`, `눈-2.mp3`, `눈-3.mp3`, `눈-4.mp3`
- `논-1.mp3`, `논-2.mp3`, `논-3.mp3`, `논-4.mp3`
- `감정-1.mp3`, `감정-2.mp3`, `감정-3.mp3`, `감정-4.mp3`
- `강정-1.mp3`, `강정-2.mp3`, `강정-3.mp3`, `강정-4.mp3`
- `연구-1.mp3`, `연구-2.mp3`, `연구-3.mp3`, `연구-4.mp3`
- `연고-1.mp3`, `연고-2.mp3`, `연고-3.mp3`, `연고-4.mp3`
- `말-1.mp3`, `말-2.mp3`, `말-3.mp3`, `말-4.mp3`
- `날-1.mp3`, `날-2.mp3`, `날-3.mp3`, `날-4.mp3`
- `경찰-1.mp3`, `경찰-2.mp3`, `경찰-3.mp3`, `경찰-4.mp3`
- `명찰-1.mp3`, `명찰-2.mp3`, `명찰-3.mp3`, `명찰-4.mp3`
- `사고-1.mp3`, `사고-2.mp3`, `사고-3.mp3`, `사고-4.mp3`
- `사과-1.mp3`, `사과-2.mp3`, `사과-3.mp3`, `사과-4.mp3`
- `감독-1.mp3`, `감독-2.mp3`, `감독-3.mp3`, `감독-4.mp3`
- `감동-1.mp3`, `감동-2.mp3`, `감동-3.mp3`, `감동-4.mp3`
- `의식-1.mp3`, `의식-2.mp3`, `의식-3.mp3`, `의식-4.mp3`
- `이식-1.mp3`, `이식-2.mp3`, `이식-3.mp3`, `이식-4.mp3`
- `방안-1.mp3`, `방안-2.mp3`, `방안-3.mp3`, `방안-4.mp3`
- `방한-1.mp3`, `방한-2.mp3`, `방한-3.mp3`, `방한-4.mp3`
- `발간-1.mp3`, `발간-2.mp3`, `발간-3.mp3`, `발간-4.mp3`
- `발광-1.mp3`, `발광-2.mp3`, `발광-3.mp3`, `발광-4.mp3`
- `고리-1.mp3`, `고리-2.mp3`, `고리-3.mp3`, `고리-4.mp3`
- `거리-1.mp3`, `거리-2.mp3`, `거리-3.mp3`, `거리-4.mp3`
- `문-1.mp3`, `문-2.mp3`, `문-3.mp3`, `문-4.mp3`
- `물-1.mp3`, `물-2.mp3`, `물-3.mp3`, `물-4.mp3`

### 🎯 음성 재생 시점
1. **라운드 시작 시** - 단어 음성 재생 (500ms 후)
2. **다시듣기 버튼 클릭 시** - 같은 단어 다시 재생

### 🔢 음성 선택 방식
- 각 단어마다 4개 중 **랜덤**으로 선택되어 재생
- 다양한 목소리로 변별력 테스트

### ⚙️ 현재 상태
- 음성 파일이 없을 경우 Web Speech API (TTS)로 자동 fallback
- 음성 파일 배치 시 실제 녹음 음성으로 재생

### ✅ 적용 방법

1. `/public/sounds/classify/` 폴더에 위 160개 MP3 파일 배치
2. 파일명이 정확한지 확인 (예: `오리-1.mp3`)
3. 저장 후 앱 새로고침
4. 게임 시작 시 자동으로 음성 파일 재생

### 💡 TTS Fallback 기능
- 음성 파일이 없어도 게임 플레이 가능
- 브라우저 내장 TTS로 단어 읽기
- 실제 음성 파일로 교체하면 자연스러운 발음 제공

---

## 🔤 5. 폰트

### 📂 위치
`/public/fonts/` 폴더에 배치

### 📋 필요한 파일 목록 (총 3개)

1. **KkuBulLim (꾸불림체)** - 메인 타이틀 전용
   - 파일명: `BMkkubulimTTF-Regular.woff2`
   - 사용처: "눈귀뇌하트" 타이틀

2. **OngleipRyuryu (옹글잎류류)** - 본문 텍스트 전용
   - 파일명: `Ownglyph_ryurue-Rg.woff2`
   - 사용처: 모든 버튼, 게임 제목, 일반 텍스트

3. **OngleipRyudung (옹글잎류뚱)** - 추가 텍스트
   - 파일명: `Ownglyph_ryuttung-Rg.woff2`
   - 사용처: 특수 텍스트 (필요 시 사용)

### ✅ 적용 방법

1. `/public/fonts/` 폴더에 3개 폰트 파일 배치

2. `/styles/globals.css` 파일 (이미 적용됨):

```css
@font-face {
  font-family: 'KkuBulLim';
  src: url('/fonts/BMkkubulimTTF-Regular.woff2') format('woff2'),
       url('https://cdn.jsdelivr.net/gh/projectnoonnu/2410-1@1.0/BMkkubulimTTF-Regular.woff2') format('woff2');
  font-weight: normal;
  font-display: swap;
}

@font-face {
  font-family: 'OngleipRyuryu';
  src: url('/fonts/Ownglyph_ryurue-Rg.woff2') format('woff2'),
       url('https://cdn.jsdelivr.net/gh/projectnoonnu/2405-2@1.0/Ownglyph_ryurue-Rg.woff2') format('woff2');
  font-weight: normal;
  font-display: swap;
}

@font-face {
  font-family: 'OngleipRyudung';
  src: url('/fonts/Ownglyph_ryuttung-Rg.woff2') format('woff2'),
       url('https://cdn.jsdelivr.net/gh/projectnoonnu/2405-2@1.0/Ownglyph_ryuttung-Rg.woff2') format('woff2');
  font-weight: normal;
  font-display: swap;
}
```

3. 저장 후 앱 새로고침

### 📝 폰트 사용 방식
- **KkuBulLim**: `style={{ fontFamily: "'KkuBulLim', cursive" }}`
- **OngleipRyuryu**: CSS 글로벌 설정으로 자동 적용
- **OngleipRyudung**: `style={{ fontFamily: "'OngleipRyudung', cursive" }}`

### 🌐 폴백 (Fallback) 방식
- 각 폰트는 로컬 파일을 먼저 시도
- 로컬 파일이 없으면 CDN에서 자동으로 로드
- 오프라인 환경에서도 작동하도록 설정됨

---

## 📝 체크리스트

### 배경음악
- [ ] `/public/music/` 폴더 생성
- [ ] 15개 MP3 파일 배치 완료
- [ ] `/utils/backgroundMusic.ts`에서 `USE_AUDIO_FILE = true` 설정
- [ ] 테스트: 메인메뉴에서 음악 재생 확인
- [ ] 테스트: 게임 진입 시 음악 전환 확인

### 효과음
- [ ] `/public/sounds/` 폴더 생성
- [ ] 7개 MP3 파일 배치 완료 (click, back, select, start, hover, noise-weak, noise-strong)
- [ ] `/utils/sound.ts` 코드 수정 (개발자)
- [ ] 테스트: 버튼 클릭 시 효과음 재생 확인
- [ ] 테스트: 버블게임/방향게임/분류게임 레벨 2, 3에서 노이즈 재생 확인

### 버블게임 음성
- [ ] `/public/voices/` 폴더 생성
- [ ] 36개 MP3 파일 배치 완료 (각 색상별 4개씩)
- [ ] `/utils/colorVoice.ts`에서 주석 제거 (45~73줄)
- [ ] 테스트: 버블게임 시작 시 음성 재생 확인
- [ ] 테스트: 버블 발사 후 음성 재생 확인
- [ ] 테스트: 현재 버블 클릭 시 음성 재생 확인

### 분류게임 음성
- [ ] `/public/sounds/classify/` 폴더 생성
- [ ] 160개 MP3 파일 배치 완료 (각 단어별 4개씩)
- [ ] 테스트: 분류게임 시작 시 음성 재생 확인
- [ ] 테스트: 다시듣기 버튼 클릭 시 음성 재생 확인

### 폰트
- [ ] `/public/fonts/` 폴더 생성
- [ ] 3개 폰트 파일 배치 완료
- [ ] `/styles/globals.css` 확인 (이미 적용됨)
- [ ] 테스트: 타이틀 폰트 확인 (KkuBulLim)
- [ ] 테스트: 본문 폰트 확인 (OngleipRyuryu)

---

## 🔧 문제 해결

### 음악이 재생되지 않아요
1. 브라우저 콘솔에서 에러 메시지 확인
2. MP3 파일명이 정확한지 확인 (대소문자 구분)
3. 파일 경로 확인: `/public/music/파일명.mp3`
4. `USE_AUDIO_FILE = true` 설정 확인
5. 설정 화면에서 배경음악이 켜져 있는지 확인

### 음성이 재생되지 않아요
1. 브라우저 콘솔에서 에러 메시지 확인
2. MP3 파일명이 정확한지 확인 (`red-1.mp3`, `red-2.mp3` 등)
3. 파일 경로 확인: `/public/voices/파일명.mp3`
4. `/utils/colorVoice.ts`의 주석 제거 확인
5. 설정 화면에서 효과음이 켜져 있는지 확인

### 폰트가 적용되지 않아요
1. 브라우저 개발자 도구 → Network 탭에서 폰트 로딩 확인
2. 파일 경로 확인: `/public/fonts/폰트명.woff2`
3. 하드 새로고침: `Ctrl + Shift + R` (Windows) / `Cmd + Shift + R` (Mac)
4. CDN 폴백이 작동하는지 확인 (인터넷 연결 필요)

### 효과음이 재생되지 않아요
1. 설정에서 효과음이 켜져 있는지 확인
2. 브라우저 음소거 해제 확인
3. `/utils/sound.ts` 코드 수정이 완료되었는지 확인

---

## 📊 파일 목록 요약

### 🎵 음악 파일 (15개)
```
main1.mp3, main2.mp3, credits.mp3
bomb.mp3, shuffle.mp3, number.mp3
bubble.mp3, direction.mp3, classify.mp3
card.mp3, coloring.mp3, order.mp3
```

### 🔊 효과음 파일 (7개)
```
click.mp3, back.mp3, select.mp3, start.mp3, hover.mp3
noise-weak.mp3, noise-strong.mp3
```

### 🎤 음성 파일 (36개)
```
빨강-1.mp3, 빨강-2.mp3, 빨강-3.mp3, 빨강-4.mp3
주황-1.mp3, 주황-2.mp3, 주황-3.mp3, 주황-4.mp3
노랑-1.mp3, 노랑-2.mp3, 노랑-3.mp3, 노랑-4.mp3
초록-1.mp3, 초록-2.mp3, 초록-3.mp3, 초록-4.mp3
파랑-1.mp3, 파랑-2.mp3, 파랑-3.mp3, 파랑-4.mp3
남색-1.mp3, 남색-2.mp3, 남색-3.mp3, 남색-4.mp3
보라-1.mp3, 보라-2.mp3, 보라-3.mp3, 보라-4.mp3
무적-1.mp3, 무적-2.mp3, 무적-3.mp3, 무적-4.mp3
꽝-1.mp3, 꽝-2.mp3, 꽝-3.mp3, 꽝-4.mp3
```

### 🎧 분류게임 음성 파일 (160개)
```
오리-1.mp3, 오리-2.mp3, 오리-3.mp3, 오리-4.mp3
우리-1.mp3, 우리-2.mp3, 우리-3.mp3, 우리-4.mp3
바람-1.mp3, 바람-2.mp3, 바람-3.mp3, 바람-4.mp3
사람-1.mp3, 사람-2.mp3, 사람-3.mp3, 사람-4.mp3
구름-1.mp3, 구름-2.mp3, 구름-3.mp3, 구름-4.mp3
그림-1.mp3, 그림-2.mp3, 그림-3.mp3, 그림-4.mp3
다리-1.mp3, 다리-2.mp3, 다리-3.mp3, 다리-4.mp3
자리-1.mp3, 자리-2.mp3, 자리-3.mp3, 자리-4.mp3
머리-1.mp3, 머리-2.mp3, 머리-3.mp3, 머리-4.mp3
무리-1.mp3, 무리-2.mp3, 무리-3.mp3, 무리-4.mp3
곰-1.mp3, 곰-2.mp3, 곰-3.mp3, 곰-4.mp3
공-1.mp3, 공-2.mp3, 공-3.mp3, 공-4.mp3
압력-1.mp3, 압력-2.mp3, 압력-3.mp3, 압력-4.mp3
악력-1.mp3, 악력-2.mp3, 악력-3.mp3, 악력-4.mp3
밤-1.mp3, 밤-2.mp3, 밤-3.mp3, 밤-4.mp3
밥-1.mp3, 밥-2.mp3, 밥-3.mp3, 밥-4.mp3
눈-1.mp3, 눈-2.mp3, 눈-3.mp3, 눈-4.mp3
논-1.mp3, 논-2.mp3, 논-3.mp3, 논-4.mp3
감정-1.mp3, 감정-2.mp3, 감정-3.mp3, 감정-4.mp3
강정-1.mp3, 강정-2.mp3, 강정-3.mp3, 강정-4.mp3
연구-1.mp3, 연구-2.mp3, 연구-3.mp3, 연구-4.mp3
연고-1.mp3, 연고-2.mp3, 연고-3.mp3, 연고-4.mp3
말-1.mp3, 말-2.mp3, 말-3.mp3, 말-4.mp3
날-1.mp3, 날-2.mp3, 날-3.mp3, 날-4.mp3
경찰-1.mp3, 경찰-2.mp3, 경찰-3.mp3, 경찰-4.mp3
명찰-1.mp3, 명찰-2.mp3, 명찰-3.mp3, 명찰-4.mp3
사고-1.mp3, 사고-2.mp3, 사고-3.mp3, 사고-4.mp3
사과-1.mp3, 사과-2.mp3, 사과-3.mp3, 사과-4.mp3
감독-1.mp3, 감독-2.mp3, 감독-3.mp3, 감독-4.mp3
감동-1.mp3, 감동-2.mp3, 감동-3.mp3, 감동-4.mp3
의식-1.mp3, 의식-2.mp3, 의식-3.mp3, 의식-4.mp3
이식-1.mp3, 이식-2.mp3, 이식-3.mp3, 이식-4.mp3
방안-1.mp3, 방안-2.mp3, 방안-3.mp3, 방안-4.mp3
방한-1.mp3, 방한-2.mp3, 방한-3.mp3, 방한-4.mp3
발간-1.mp3, 발간-2.mp3, 발간-3.mp3, 발간-4.mp3
발광-1.mp3, 발광-2.mp3, 발광-3.mp3, 발광-4.mp3
고리-1.mp3, 고리-2.mp3, 고리-3.mp3, 고리-4.mp3
거리-1.mp3, 거리-2.mp3, 거리-3.mp3, 거리-4.mp3
문-1.mp3, 문-2.mp3, 문-3.mp3, 문-4.mp3
물-1.mp3, 물-2.mp3, 물-3.mp3, 물-4.mp3
```

### 🔤 폰트 파일 (3개)
```
BMkkubulimTTF-Regular.woff2        (KkuBulLim - 꾸불림체)
Ownglyph_ryurue-Rg.woff2           (OngleipRyuryu - 옹글잎류류)
Ownglyph_ryuttung-Rg.woff2         (OngleipRyudung - 옹글잎류뚱)
```

---

## 📞 추가 지원

파일 배치 후에도 문제가 발생하면:
1. 브라우저 개발자 도구 콘솔 확인
2. Network 탭에서 파일 로딩 실패 여부 확인
3. 파일 형식이 올바른지 확인 (MP3, WOFF2)
4. 파일 권한 확인 (읽기 권한 필요)

---

**마지막 업데이트:** 2025-11-22  
**총 에셋 파일 수:** 221개 (음악 15 + 효과음 7 + 버블게임 음성 36 + 분류게임 음성 160 + 폰트 3)