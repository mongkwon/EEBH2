# TTS Fallback 구현 가이드

## 목적
음성 파일이 없거나 로드 실패 시 TTS(Text-to-Speech)로 대체하는 fallback 시스템 구현 시 주의사항

---

## ⚠️ 핵심 주의사항: AudioContext 중복 생성 금지

### 과거 문제 원인
버블게임과 단어게임에서 **음성파일 재생이 간헐적으로 안 되던 문제**는 AudioContext가 중복 생성되어서 발생했음.

```typescript
// 🚫 잘못된 예시 - 매번 새로운 AudioContext 생성
const audio = new Audio(audioFile);
const audioContext = new AudioContext(); // 중복 생성!
const source = audioContext.createMediaElementSource(audio);
```

### 현재 해결 방법
모든 게임과 효과음이 **window.sharedAudioContext**를 공유함.

```typescript
// ✅ 올바른 예시 - 공유 AudioContext 재사용
const audioContext = await getAudioContext(); // window.sharedAudioContext 반환
const audio = new Audio(audioFile);
```

---

## TTS Fallback 구현 방법

### ✅ 권장 방법 1: Web Speech API 사용 (가장 안전)

```typescript
function playTextToSpeech(text: string, lang: string = 'ko-KR') {
  // Web Speech API는 AudioContext를 사용하지 않음
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.0; // 속도
  utterance.pitch = 1.0; // 음높이
  
  speechSynthesis.speak(utterance);
}

// 사용 예시
try {
  const audio = new Audio(audioFile);
  await audio.play();
} catch (error) {
  console.log('음성 파일 재생 실패, TTS fallback 사용');
  playTextToSpeech('사과'); // ✅ AudioContext 충돌 없음
}
```

**장점:**
- AudioContext와 완전히 독립적
- 추가 리소스 로드 불필요
- 브라우저 내장 API

**단점:**
- 음질이 기계적일 수 있음
- iOS Safari에서 제한적

---

### ✅ 권장 방법 2: Audio Element만 사용

```typescript
function playTTSAudio(ttsUrl: string) {
  // Audio Element만 사용 (AudioContext 없이)
  const audio = new Audio(ttsUrl);
  audio.volume = 0.7;
  return audio.play(); // ✅ AudioContext 충돌 없음
}

// 사용 예시
try {
  await playAudioFile(mainAudioFile);
} catch (error) {
  console.log('원본 오디오 실패, TTS URL로 재생');
  await playTTSAudio('https://tts-api.com/audio?text=사과'); 
}
```

**장점:**
- 간단하고 안정적
- AudioContext 충돌 없음

**단점:**
- 외부 TTS API 필요 (네트워크 의존)

---

### ⚠️ 주의가 필요한 방법: Audio Element + AudioContext 조합

만약 스테레오 패닝, 음향 효과 등으로 AudioContext를 꼭 써야 한다면:

```typescript
async function playTTSWithAudioContext(ttsUrl: string, pan: number = 0) {
  // 🔥 반드시 window.sharedAudioContext 재사용!
  const audioContext = await getAudioContext(); // utils/sound.ts의 함수
  
  const audio = new Audio(ttsUrl);
  audio.volume = 0.7;
  
  // 한 번만 source 생성 (중복 생성 방지)
  let source = sourceNodes.get(audio);
  if (!source) {
    source = audioContext.createMediaElementSource(audio);
    sourceNodes.set(audio, source);
  }
  
  // 패너 설정
  const panner = audioContext.createStereoPanner();
  panner.pan.value = pan;
  
  source.connect(panner);
  panner.connect(audioContext.destination);
  
  await audio.play();
}
```

**주의사항:**
- ✅ `window.sharedAudioContext` 사용 필수
- ✅ `createMediaElementSource`는 Audio 객체당 한 번만 호출
- 🚫 절대 `new AudioContext()` 하지 말 것

---

## 현재 프로젝트 AudioContext 구조

### 공유 AudioContext
```typescript
// utils/sound.ts
async function getAudioContext(): Promise<AudioContext> {
  if (!window.sharedAudioContext) {
    window.sharedAudioContext = new AudioContext();
  }
  
  // iOS suspended 상태 자동 복구
  if (window.sharedAudioContext.state === 'suspended') {
    await window.sharedAudioContext.resume();
  }
  
  return window.sharedAudioContext;
}
```

### 사용 중인 곳
1. **효과음** (utils/sound.ts)
   - playClickSound, playBackSound, playSelectSound 등
   
2. **버블게임** (BubbleShooter.tsx)
   - playColorSound, playBurstSound
   
3. **단어게임** (ClassifyGame.tsx)
   - playStereoSound, playCenterSound

**모두 동일한 window.sharedAudioContext를 공유**

---

## 체크리스트

TTS fallback 구현 전 확인사항:

- [ ] Web Speech API를 우선 사용할 수 있는가?
- [ ] Audio Element만으로 충분한가?
- [ ] AudioContext가 꼭 필요한가?
- [ ] 필요하다면 `window.sharedAudioContext`를 재사용하는가?
- [ ] `new AudioContext()` 호출이 코드에 없는가?
- [ ] iOS에서 AudioContext.resume()을 await 하는가?

---

## 참고 자료

- [Web Speech API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [AudioContext - MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)
- 프로젝트 파일: `/utils/sound.ts`, `/components/games/ClassifyGame.tsx`

---

**작성일:** 2025-12-12  
**최종 수정:** 2025-12-12
