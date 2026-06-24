// Sound utility functions using Web Audio API

// 전역 AudioContext 사용 (게임들과 동일)
declare global {
  interface Window {
    sharedAudioContext?: AudioContext;
  }
}

let isSoundEnabled = true;
let musicVolume = 0.3;
let soundVolume = 0.3; // 효과음 볼륨 추가

// 로컬스토리지에서 사운드 설정 불러오기
function loadSoundSettings() {
  try {
    const savedSound = localStorage.getItem('soundEnabled');
    if (savedSound !== null) {
      isSoundEnabled = savedSound === 'true';
    }
    const savedVolume = localStorage.getItem('musicVolume');
    if (savedVolume !== null) {
      musicVolume = parseFloat(savedVolume);
    }
    const savedSoundVolume = localStorage.getItem('soundVolume');
    if (savedSoundVolume !== null) {
      soundVolume = parseFloat(savedSoundVolume);
    }
  } catch (error) {
    console.error('Error loading sound settings:', error);
  }
}

// 로컬스토리지에 사운드 설정 저장하기
function saveSoundSettings() {
  try {
    localStorage.setItem('soundEnabled', isSoundEnabled.toString());
    localStorage.setItem('musicVolume', musicVolume.toString());
    localStorage.setItem('soundVolume', soundVolume.toString());
  } catch (error) {
    console.error('Error saving sound settings:', error);
  }
}

// 초기화 시 설정 불러오기
loadSoundSettings();

// Initialize audio context (lazy initialization) - ASYNC로 변경
async function getAudioContext(): Promise<AudioContext> {
  if (!window.sharedAudioContext) {
    window.sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  // iOS에서 AudioContext가 suspended 상태이면 resume 시도 (await 필수!)
  if (window.sharedAudioContext.state === 'suspended') {
    try {
      await window.sharedAudioContext.resume();
      console.log('✅ AudioContext resumed:', window.sharedAudioContext.state);
    } catch (err) {
      console.warn('❌ AudioContext resume failed:', err);
    }
  }
  
  return window.sharedAudioContext;
}

// Set sound enabled state
export function setSoundEnabled(enabled: boolean) {
  isSoundEnabled = enabled;
  saveSoundSettings();
}

// Get sound enabled state
export function getSoundEnabled(): boolean {
  return isSoundEnabled;
}

// Music volume functions
export function setMusicVolume(volume: number) {
  musicVolume = volume;
  saveSoundSettings();
}

export function getMusicVolume(): number {
  return musicVolume;
}

// Sound volume functions
export function setSoundVolume(volume: number) {
  soundVolume = volume;
  saveSoundSettings();
}

export function getSoundVolume(): number {
  return soundVolume;
}

// Play a click sound
export async function playClickSound(volume?: number) {
  if (!isSoundEnabled) return;
  
  const actualVolume = volume !== undefined ? volume : soundVolume;
  
  try {
    const ctx = await getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(actualVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch (error) {
    console.error('Error playing click sound:', error);
  }
}

// Play a back/cancel sound
export async function playBackSound(volume?: number) {
  if (!isSoundEnabled) return;
  
  const actualVolume = volume !== undefined ? volume : soundVolume;
  
  try {
    const ctx = await getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 600;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(actualVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  } catch (error) {
    console.error('Error playing back sound:', error);
  }
}

// Play a selection sound
export async function playSelectSound(volume?: number) {
  if (!isSoundEnabled) return;
  
  const actualVolume = volume !== undefined ? volume : soundVolume;
  
  try {
    const ctx = await getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 1000;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(actualVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (error) {
    console.error('Error playing select sound:', error);
  }
}

// Play a success/start sound
export async function playStartSound(volume?: number) {
  if (!isSoundEnabled) return;
  
  const actualVolume = volume !== undefined ? volume : soundVolume;
  
  try {
    const ctx = await getAudioContext();
    
    // Create two oscillators for a chord effect
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.frequency.value = 800;
    osc2.frequency.value = 1200;
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    gainNode.gain.setValueAtTime(actualVolume * 0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 0.3);
  } catch (error) {
    console.error('Error playing start sound:', error);
  }
}

// Play a hover sound (subtle)
export async function playHoverSound(volume?: number) {
  if (!isSoundEnabled) return;
  
  const actualVolume = volume !== undefined ? volume : soundVolume * 0.5;
  
  try {
    const ctx = await getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 400;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(actualVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  } catch (error) {
    console.error('Error playing hover sound:', error);
  }
}

// Play a shuffle sound (컵 섞는 효과음)
export async function playShuffleSound(speed: number = 400, volume?: number) {
  if (!isSoundEnabled) return;
  
  const actualVolume = volume !== undefined ? volume : soundVolume * 0.8;
  
  try {
    // Validate speed parameter
    if (!speed || !isFinite(speed) || speed <= 0) {
      console.warn('Invalid speed parameter for playShuffleSound:', speed);
      speed = 400; // fallback to default
    }
    
    const ctx = await getAudioContext();
    
    // 속도에 따라 지속시간 조정 (빠를수록 짧게)
    const duration = Math.max(0.06, speed / 3500);
    
    // 주파수 스윕으로 "휙" 소리 만들기
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine'; // 부드러운 파형
    
    // 🔥 폭탄게임 이미지 생성과 동일한 주파수 사용 (800Hz → 400Hz)
    const startFreq = 800;
    const endFreq = 400;
    
    // 주파수 스윕 (폭탄게임과 동일)
    oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
    
    // 로우패스 필터 (부드럽게)
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3000; // 고주파 제거로 부드럽게
    lowpass.Q.value = 0.5;
    
    // 게인 노드
    const gainNode = ctx.createGain();
    
    // 🔥 속도에 관계없이 일정한 볼륨 사용
    const adjustedVolume = actualVolume;
    
    // 빠른 페이드인, 부드러운 페이드아웃
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(adjustedVolume, ctx.currentTime + duration * 0.15);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    
    // 연결
    oscillator.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // 재생
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    console.error('Error playing shuffle sound:', error);
  }
}