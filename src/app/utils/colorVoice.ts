// Window 인터페이스 확장
declare global {
  interface Window {
    sharedAudioContext?: AudioContext;
  }
}

// 음성 파일 경로 (각 색상별로 4개씩)
const VOICE_FILES: { [key: string]: string[] } = {
  '#FF0000': ['sounds/bubble/빨강-1.mp3', 'sounds/bubble/빨강-2.mp3', 'sounds/bubble/빨강-3.mp3', 'sounds/bubble/빨강-4.mp3'],           // 빨강
  '#FFA500': ['sounds/bubble/주황-1.mp3', 'sounds/bubble/주황-2.mp3', 'sounds/bubble/주황-3.mp3', 'sounds/bubble/주황-4.mp3'],  // 주황
  '#FFFF00': ['sounds/bubble/노랑-1.mp3', 'sounds/bubble/노랑-2.mp3', 'sounds/bubble/노랑-3.mp3', 'sounds/bubble/노랑-4.mp3'],  // 노랑
  '#00FF00': ['sounds/bubble/초록-1.mp3', 'sounds/bubble/초록-2.mp3', 'sounds/bubble/초록-3.mp3', 'sounds/bubble/초록-4.mp3'],     // 초록
  '#0000FF': ['sounds/bubble/파랑-1.mp3', 'sounds/bubble/파랑-2.mp3', 'sounds/bubble/파랑-3.mp3', 'sounds/bubble/파랑-4.mp3'],        // 파랑
  '#4B0082': ['sounds/bubble/남색-1.mp3', 'sounds/bubble/남색-2.mp3', 'sounds/bubble/남색-3.mp3', 'sounds/bubble/남색-4.mp3'],  // 남색
  '#9B59B6': ['sounds/bubble/보라-1.mp3', 'sounds/bubble/보라-2.mp3', 'sounds/bubble/보라-3.mp3', 'sounds/bubble/보라-4.mp3'],  // 보라
  'invincible': ['sounds/bubble/무적-1.mp3', 'sounds/bubble/무적-2.mp3', 'sounds/bubble/무적-3.mp3', 'sounds/bubble/무적-4.mp3'], // 무적
  'bomb': ['sounds/bubble/꽝-1.mp3', 'sounds/bubble/꽝-2.mp3', 'sounds/bubble/꽝-3.mp3', 'sounds/bubble/꽝-4.mp3']            // 꽝
};

// 색상별 한국어 이름 (TTS용)
const COLOR_NAMES: { [key: string]: string } = {
  '#FF0000': '빨강',
  '#FFA500': '주황',
  '#FFFF00': '노랑',
  '#00FF00': '초록',
  '#0000FF': '파랑',
  '#4B0082': '남색',
  '#9B59B6': '보라',
  'invincible': '무적',
  'bomb': '꽝'
};

// 전역 AudioContext 가져오기 (다른 게임과 공유)
async function getAudioContext(): Promise<AudioContext> {
  if (!window.sharedAudioContext) {
    window.sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  const audioContext = window.sharedAudioContext;

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
    console.log('✅ AudioContext resumed (colorVoice)');
  }

  return audioContext;
}

// 음성 파일 재생 (실제 파일이 있을 때)
async function playVoiceFile(
  key: string,
  version?: number,
  pan?: 'left' | 'right' | 'center',
  onBeforePlay?: (duration: number) => void,
  maxRetries: number = 5
): Promise<{ success: boolean; version?: number; duration?: number }> {
  const filePaths = VOICE_FILES[key];
  if (!filePaths || filePaths.length === 0) return { success: false };

  // 버전 선택
  const selectedVersion = version !== undefined ? version : Math.floor(Math.random() * filePaths.length) + 1;
  const selectedIndex = selectedVersion - 1;
  const selectedPath = filePaths[selectedIndex];

  console.log(`🎵 음성 재생 시도: ${selectedPath} (pan: ${pan || 'center'})`);

  // 재시도 로직
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`🔄 음성 재생 재시도 ${attempt}/${maxRetries - 1}: ${selectedPath}`);
    }

    // 각 시도마다 새로운 Audio 객체와 AudioContext 노드 생성
    let currentAudio: HTMLAudioElement | null = null;
    let currentSource: MediaElementAudioSourceNode | null = null;

    const result = await new Promise<{ success: boolean; version?: number; duration?: number }>((resolve) => {
      currentAudio = new Audio(selectedPath);
      currentAudio.volume = 0.7;
      
      let resolved = false;
      
      // 타임아웃 설정 (5초)
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log(`⏱️ 타임아웃: ${selectedPath}`);
          // 정리
          if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
          }
          resolve({ success: false });
        }
      }, 5000);
      
      // 메타데이터 로드 시
      currentAudio.addEventListener('loadedmetadata', async () => {
        if (resolved) return;

        // 재생 직전에 콜백 호출 (노이즈 시작용)
        if (onBeforePlay) {
          onBeforePlay(currentAudio!.duration);
        }

        // Web Audio API를 사용하여 스테레오 패닝 구현
        if (pan && pan !== 'center') {
          try {
            const audioContext = await getAudioContext();
            
            // 각 시도마다 새로운 source 생성
            currentSource = audioContext.createMediaElementSource(currentAudio!);
            
            // 스테레오 패너 생성
            const panner = audioContext.createStereoPanner();
            panner.pan.value = pan === 'left' ? -1 : 1;
            
            // 볼륨 조절
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 0.7;
            
            // 연결: source -> panner -> gain -> destination
            currentSource.connect(panner);
            panner.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            console.log(`✅ 스테레오 패닝 설정 완료: ${pan === 'left' ? '왼쪽' : '오른쪽'}`);
          } catch (audioError) {
            console.log('⚠️ AudioContext 설정 실패 (일반 재생 시도):', audioError);
            // AudioContext 설정 실패해도 일반 재생은 시도
          }
        }

        currentAudio!.play()
          .then(() => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              console.log(`✅ 음성 파일 재생 성공: ${selectedPath} (시도: ${attempt + 1})`);
              resolve({ success: true, version: selectedVersion, duration: currentAudio!.duration });
            }
          })
          .catch((err) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              console.log(`❌ play() 실패: ${selectedPath}`, err);
              // 정리
              if (currentAudio) {
                currentAudio.pause();
                currentAudio.src = '';
              }
              resolve({ success: false });
            }
          });
      });

      // 에러 발생 시
      currentAudio.addEventListener('error', (e) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.log(`❌ audio 로드 에러: ${selectedPath}`, e);
          // 정리
          if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
          }
          resolve({ success: false });
        }
      });
    });

    // 성공하면 즉시 반환
    if (result.success) {
      return result;
    }

    // 실패 시 정리 및 짧은 딜레이 후 재시도
    currentAudio = null;
    currentSource = null;
    
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // 모든 재시도 실패
  console.log(`❌ 음성 파일 재생 실패 (${maxRetries}회 시도): ${selectedPath}`);
  return { success: false };
}

// 색상 음성 재생 (메인 함수)
export async function playColorVoice(
  color: string,
  type: 'normal' | 'invincible' | 'bomb' = 'normal',
  version?: number,
  pan?: 'left' | 'right' | 'center',
  onBeforePlay?: (duration: number) => void
): Promise<{ success: boolean; version: number | undefined; duration: number | undefined }> {
  let key: string;
  if (type === 'invincible') {
    key = 'invincible';
  } else if (type === 'bomb') {
    key = 'bomb';
  } else {
    key = color;
  }

  // 음성 파일 재생 시도
  const result = await playVoiceFile(key, version, pan, onBeforePlay);
  
  return { success: result.success, version: result.version, duration: result.duration };
}

// 음성 파일 프리로드 (게임 시작 시 호출)
export async function preloadVoiceFiles() {
  // 아무것도 하지 않음 (단어게임과 동일)
}
