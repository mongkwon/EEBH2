import { useState, useEffect, useRef } from "react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { playBackSound, playClickSound, playSelectSound, getSoundEnabled } from "../../utils/sound";
import { saveGameRecord, getGameRecord, recordAchievement } from "../../utils/gameRecord";
import { getEnergy, useEnergy, hasEnergy } from "../../utils/globalEnergy";
import { getTargetScore, setMeasuredScore, getAccumulatedScore, addScore, isAchieved } from "../../utils/directionGameDailyGoal";
import { LevelButton } from "./LevelButton";
import { Heart } from "lucide-react";
import { GameRulesButton } from "../GameRulesButton";
import { GameRulesModal, RuleSection, RuleList } from "../GameRulesModal";
import { Settings } from "../Settings";
import pauseIcon from "figma:asset/8acb1e015c5c90586e07679819984941b38f74af.png";
import resumeIcon from "figma:asset/62327073bfb38b1feb704b5c6f1eb2a36789eee8.png";
import restartIcon from "figma:asset/d1a45328f3c2f5290d250ff17f71584c907a61a7.png";
import pauseMenuBg from "figma:asset/54f8a82ff3f9348da47c92cd7e8e9b17adc71522.png";
import pauseExitIcon from "figma:asset/7b6920cff9236248c28a92364a77c6df5be27012.png";
import exitIcon from "figma:asset/74b1288f91a03a19fc199ba8e3ce487eebb3c1fb.png";
import settingsIcon from "figma:asset/f50441ac52c2a907e8c436ef7897926c378fa505.png";
import questionCardImage from "figma:asset/9c5e54f96f7bd7798e37bb78c04453181fa52e72.png";
import characterImage from "figma:asset/18277f1a9ee6981eefcd4e5119847f592d0e7329.png";
import characterWalkingGif from "figma:asset/3d0adf0476a92261ff45695e7f61540d58927422.png";
import bananaObstacle from "figma:asset/158983f026f78ecef0af3cf4a446fe7428034920.png";
import hurdleObstacle from "figma:asset/a7874aa50de80d2ae5b5035544e261e24d1d6795.png";
import levelButtonBg from "figma:asset/c40d55ea1f04b7d786be1a07004ba9eb2d39490d.png";
import replayButtonBg from "figma:asset/76896cc73d11fff23bc0ef71e56e9001acc1b9ee.png";
import correctPathGif from "figma:asset/5507741470b8ce3a76cca7ebd817259b145b99d0.png";
import scoreStarIcon from "figma:asset/539c2a8bf466fe0b7e46f9ccca0d7887792cfb96.png";

// Window 인터페이스 확장
declare global {
  interface Window {
    sharedAudioContext?: AudioContext;
  }
}

interface DirectionGameProps {
  onBack: () => void;
}

type GameState = "ready" | "countdown" | "playing" | "gameOver";
type Direction = "left" | "right";
type ObstacleType = "banana" | "hurdle";
type TargetPitch = "high" | "low"; // 레벨 3용: 높은소리/낮은소리

interface PathTile {
  correctDirection: Direction;
  revealed: boolean;
  y: number; // 화면상 y 위치 (%)
  x: number; // 레인 위치 (-1: 왼쪽, 0: 중앙, 1: 오른쪽, 등)
  selectedDirection?: Direction; // 사용자가 실제로 선택한 방향
  obstacleType?: ObstacleType; // 오답일 경우 표시될 장애물 타입
  showScoreText?: boolean; // 점수 텍스트 표시 여부
  scoreValue?: number; // 획득한 점수
  showHeartText?: boolean; // 하트 감소 텍스트 표시 여부
  targetPitch?: TargetPitch; // 레벨 3용: 어떤 소리를 선택해야 하는지
  highPitchSide?: Direction; // 레벨 3용: 높은 소리가 어느 쪽에 있는지
}

export function DirectionGame({ onBack }: DirectionGameProps) {
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [gameState, setGameState] = useState<GameState>("ready");
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [recommendedLevel, setRecommendedLevel] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentDirection, setCurrentDirection] = useState<Direction>("left");
  const [isListening, setIsListening] = useState(false);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [countdown, setCountdown] = useState(3); // 카운트다운 state
  
  // 맵 오프셋 (캐릭터는 앙 고정, 맵이 좌우로 이동)
  const [mapOffsetX, setMapOffsetX] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  // 경로 타일들
  const [pathTiles, setPathTiles] = useState<PathTile[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  // 애니메이션 상태
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCharacterHit, setIsCharacterHit] = useState(false);
  
  // 전역 에너지 시스템
  const [energy, setEnergy] = useState(getEnergy());
  const [showNoEnergyAlert, setShowNoEnergyAlert] = useState(false);
  
  // 일일 목표점수 시스템
  const [dailyTargetScore, setDailyTargetScore] = useState<number | null>(null);
  const [dailyAccumulatedScore, setDailyAccumulatedScore] = useState<number>(0);
  const [previousAccumulatedScore, setPreviousAccumulatedScore] = useState<number>(0);
  const [animatedAccumulatedScore, setAnimatedAccumulatedScore] = useState<number>(0);
  const [showGoalAchieved, setShowGoalAchieved] = useState(false);
  const isGameOverRef = useRef<boolean>(false);
  
  // 개발자 모드 (제목 5번 클릭 시 활성화)
  const [devMode, setDevMode] = useState(false);
  const [devClickCount, setDevClickCount] = useState(0);
  const devClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const oscillatorRef2 = useRef<OscillatorNode | null>(null); // 레벨 3용 두 번째 oscillator
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const whiteNoiseRef = useRef<AudioBufferSourceNode | null>(null);
  const soundTimeoutRef = useRef<number | null>(null);
  
  // 백그라운드 노이즈용 별도 AudioContext
  const noiseAudioContextRef = useRef<AudioContext | null>(null);
  const noiseGainNodeRef = useRef<GainNode | null>(null);
  
  // 백그라운드 노이즈용 별도 Audio 엘리먼트 (나중에 mp3 파일로 교체 가능)
  const backgroundNoiseRef = useRef<HTMLAudioElement | null>(null);
  
  const dragStartXRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 게임 진행 타이머 refs
  const prepareRoundTimeoutRef = useRef<number | null>(null);
  const tileRevealTimeoutRef = useRef<number | null>(null);
  const scoreTextTimeoutRef = useRef<number | null>(null);
  const nextStepTimeoutRef = useRef<number | null>(null);
  const heartTextTimeoutRef = useRef<number | null>(null);
  const blinkTimeout1Ref = useRef<number | null>(null);
  const blinkTimeout2Ref = useRef<number | null>(null);
  const blinkTimeout3Ref = useRef<number | null>(null);
  const gameOverTimeoutRef = useRef<number | null>(null);
  const wrongNextStepTimeoutRef = useRef<number | null>(null);
  const startGameTimeoutRef = useRef<number | null>(null);
  const pausedIsAnimatingRef = useRef<boolean>(false); // 일시정지 시 애니메이션 상태 저장
  const isProcessingRef = useRef<boolean>(false); // 더블클릭 방지용 플래그

  // 레벨별 노이즈 설정
  const getNoiseVolume = () => {
    if (currentLevel === 1) return 0; // 노이즈 없음
    if (currentLevel === 2) return 0.15; // 약한 노이즈
    return 0.4; // 강한 노이즈
  };

  // 백그라운드 노이즈 (게임 진행 중 계속 재생)
  const startBackgroundNoise = (level: number) => {
    // 모든 레벨에서 백그라운드 노이즈 없음 (레벨 2는 소리 재생 시에만 노이즈)
    stopBackgroundNoise();
  };

  // 백그라운드 노이즈 정지
  const stopBackgroundNoise = () => {
    // HTML Audio 노이즈 정지
    if (backgroundNoiseRef.current) {
      backgroundNoiseRef.current.pause();
      backgroundNoiseRef.current.currentTime = 0;
      backgroundNoiseRef.current = null;
    }
  };

  // 백그라운드 노이즈 일시정지
  const pauseBackgroundNoise = () => {
    // HTML Audio 노이즈 일시정지
    if (backgroundNoiseRef.current) {
      backgroundNoiseRef.current.pause();
    }
  };

  // 백그라운드 노이즈 재개
  const resumeBackgroundNoise = () => {
    // HTML Audio 노이즈 재개
    if (backgroundNoiseRef.current) {
      backgroundNoiseRef.current.play();
    }
  };

  // 방향 사운드 재생 (노이즈 제거 버전)
  const playDirectionSound = async (direction: Direction, highPitchSide?: Direction, level?: number) => {
    stopSound();
    
    setIsSoundPlaying(true);
    
    if (!window.sharedAudioContext) {
      window.sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioContext = window.sharedAudioContext;
    audioContextRef.current = audioContext; // AudioContext를 ref에 저장

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const gameLevel = level !== undefined ? level : currentLevel;
    
    // 레벨 3: 좌우에 동시에 다른 주파수 소리
    if (gameLevel === 3 && highPitchSide) {
      // 왼쪽 소리
      const oscLeft = audioContext.createOscillator();
      oscLeft.type = "sine";
      oscLeft.frequency.setValueAtTime(highPitchSide === "left" ? 1000 : 400, audioContext.currentTime);
      
      const pannerLeft = audioContext.createStereoPanner();
      pannerLeft.pan.setValueAtTime(-1, audioContext.currentTime);
      
      const gainLeft = audioContext.createGain();
      gainLeft.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscLeft.connect(gainLeft);
      gainLeft.connect(pannerLeft);
      pannerLeft.connect(audioContext.destination);
      
      // 오른쪽 소리
      const oscRight = audioContext.createOscillator();
      oscRight.type = "sine";
      oscRight.frequency.setValueAtTime(highPitchSide === "right" ? 1000 : 400, audioContext.currentTime);
      
      const pannerRight = audioContext.createStereoPanner();
      pannerRight.pan.setValueAtTime(1, audioContext.currentTime);
      
      const gainRight = audioContext.createGain();
      gainRight.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscRight.connect(gainRight);
      gainRight.connect(pannerRight);
      pannerRight.connect(audioContext.destination);
      
      oscLeft.start(audioContext.currentTime);
      oscRight.start(audioContext.currentTime);
      
      oscillatorRef.current = oscLeft; // 왼쪽 소리
      oscillatorRef2.current = oscRight; // 오른쪽 소리
      
      // 0.3초 후 자동으로 소리 정지
      if (soundTimeoutRef.current) {
        clearTimeout(soundTimeoutRef.current);
      }
      soundTimeoutRef.current = window.setTimeout(() => {
        try {
          oscLeft.stop();
          oscRight.stop();
        } catch (e) {}
        stopSound();
        setIsSoundPlaying(false);
      }, 300);
      
      return;
    }
    
    // 레벨 1, 2: 기존 방식
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(750, audioContext.currentTime);
    oscillatorRef.current = oscillator;
    
    const panner = audioContext.createStereoPanner();
    panner.pan.setValueAtTime(direction === "right" ? 1 : -1, audioContext.currentTime);
    pannerRef.current = panner;
    
    const mainGain = audioContext.createGain();
    mainGain.gain.setValueAtTime(0.3, audioContext.currentTime);
    
    oscillator.connect(mainGain);
    mainGain.connect(panner);
    panner.connect(audioContext.destination);
    
    // 레벨 2: white noise 추가
    if (gameLevel === 2) {
      // White noise 버퍼 생성
      const bufferSize = audioContext.sampleRate * 0.3; // 0.3초 분량
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = buffer.getChannelData(0);
      
      // 랜덤 노이즈 데이터 생성
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      // AudioBufferSource 생성
      const whiteNoise = audioContext.createBufferSource();
      whiteNoise.buffer = buffer;
      
      // GainNode로 볼륨 조절
      const noiseGain = audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.15, audioContext.currentTime); // 약한 노이즈
      
      whiteNoise.connect(noiseGain);
      noiseGain.connect(audioContext.destination);
      
      whiteNoise.start(audioContext.currentTime);
      
      whiteNoiseRef.current = whiteNoise;
    }
    
    oscillator.start(audioContext.currentTime);
    
    // 0.3초 후 자동으로 소리 정지
    if (soundTimeoutRef.current) {
      clearTimeout(soundTimeoutRef.current);
    }
    soundTimeoutRef.current = window.setTimeout(() => {
      stopSound();
      setIsSoundPlaying(false);
    }, 300);
  };

  const stopSound = () => {
    // 타임아웃 클리어
    if (soundTimeoutRef.current) {
      clearTimeout(soundTimeoutRef.current);
      soundTimeoutRef.current = null;
    }
    
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {
        // 이미 정지된 경우 무시
      }
      oscillatorRef.current = null;
    }
    
    // 레벨 3용 두 번째 oscillator 정지
    if (oscillatorRef2.current) {
      try {
        oscillatorRef2.current.stop();
      } catch (e) {
        // 이미 정지된 경우 무시
      }
      oscillatorRef2.current = null;
    }
    
    // white noise 정지
    if (whiteNoiseRef.current) {
      try {
        whiteNoiseRef.current.stop();
      } catch (e) {
        // 이미 정지된 경우 무시
      }
      whiteNoiseRef.current = null;
    }
    
    if (pannerRef.current) {
      pannerRef.current = null;
    }
    
    // 공유 AudioContext는 닫지 않음
    audioContextRef.current = null;
  };

  // 딩동 효과음
  const playDingDongSound = async () => {
    if (!getSoundEnabled()) return; // 효과음이 꺼져있으면 재생하지 않음
    
    if (!window.sharedAudioContext) {
      window.sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioContext = window.sharedAudioContext;

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // 첫 번째 음 (딩)
    const osc1 = audioContext.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(800, audioContext.currentTime);
    
    const gain1 = audioContext.createGain();
    gain1.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.2);
    
    // 두 번째 음 (동)
    const osc2 = audioContext.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(600, audioContext.currentTime + 0.15);
    
    const gain2 = audioContext.createGain();
    gain2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    
    osc2.start(audioContext.currentTime + 0.15);
    osc2.stop(audioContext.currentTime + 0.4);
  };

  // 아템 먹는 효과음 (짧고 경쾌한 띠링 소리)
  const playItemSound = async () => {
    if (!getSoundEnabled()) return; // 효과음이 꺼져있으면 재생하지 않음
    
    if (!window.sharedAudioContext) {
      window.sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioContext = window.sharedAudioContext;

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1800, audioContext.currentTime + 0.1);
    
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  };

  // 새로운 타일 생성
  const generateNewTile = (currentLanePosition: number, level?: number): PathTile => {
    const obstacleType: ObstacleType = Math.random() > 0.5 ? "banana" : "hurdle";
    const gameLevel = level !== undefined ? level : currentLevel;
    
    // 레벨 3: 좌우 다른 소리 (높은소리/낮은소리)
    if (gameLevel === 3) {
      const targetPitch: TargetPitch = Math.random() > 0.5 ? "high" : "low";
      const highPitchSide: Direction = Math.random() > 0.5 ? "right" : "left";
      const correctDirection: Direction = targetPitch === "high" ? highPitchSide : (highPitchSide === "left" ? "right" : "left");
      
      return {
        correctDirection,
        revealed: false,
        y: 40,
        x: currentLanePosition,
        obstacleType,
        targetPitch,
        highPitchSide
      };
    }
    
    // 레벨 1, 2: 기존 방식
    const correctDirection: Direction = Math.random() > 0.5 ? "right" : "left";
    return {
      correctDirection,
      revealed: false,
      y: 40,
      x: currentLanePosition,
      obstacleType
    };
  };
  
  // 모든 타이머 정리 함수
  const clearAllTimers = () => {
    if (soundTimeoutRef.current !== null) {
      clearTimeout(soundTimeoutRef.current);
      soundTimeoutRef.current = null;
    }
    if (prepareRoundTimeoutRef.current !== null) {
      clearTimeout(prepareRoundTimeoutRef.current);
      prepareRoundTimeoutRef.current = null;
    }
    if (tileRevealTimeoutRef.current !== null) {
      clearTimeout(tileRevealTimeoutRef.current);
      tileRevealTimeoutRef.current = null;
    }
    if (scoreTextTimeoutRef.current !== null) {
      clearTimeout(scoreTextTimeoutRef.current);
      scoreTextTimeoutRef.current = null;
    }
    if (nextStepTimeoutRef.current !== null) {
      clearTimeout(nextStepTimeoutRef.current);
      nextStepTimeoutRef.current = null;
    }
    if (heartTextTimeoutRef.current !== null) {
      clearTimeout(heartTextTimeoutRef.current);
      heartTextTimeoutRef.current = null;
    }
    if (blinkTimeout1Ref.current !== null) {
      clearTimeout(blinkTimeout1Ref.current);
      blinkTimeout1Ref.current = null;
    }
    if (blinkTimeout2Ref.current !== null) {
      clearTimeout(blinkTimeout2Ref.current);
      blinkTimeout2Ref.current = null;
    }
    if (blinkTimeout3Ref.current !== null) {
      clearTimeout(blinkTimeout3Ref.current);
      blinkTimeout3Ref.current = null;
    }
    if (gameOverTimeoutRef.current !== null) {
      clearTimeout(gameOverTimeoutRef.current);
      gameOverTimeoutRef.current = null;
    }
    if (wrongNextStepTimeoutRef.current !== null) {
      clearTimeout(wrongNextStepTimeoutRef.current);
      wrongNextStepTimeoutRef.current = null;
    }
    if (startGameTimeoutRef.current !== null) {
      clearTimeout(startGameTimeoutRef.current);
      startGameTimeoutRef.current = null;
    }
  };

  // 다음 라운드 준비
  const prepareNextRound = (previousChoice?: Direction, tilesOverride?: PathTile[], level?: number) => {
    // 더블클릭 방지 플래그 해제
    isProcessingRef.current = false;
    
    // 현재 레인 위치 계산
    // 첫 타일은 중앙(0)에서 시작, 이는 이전 타일의 위치 + 실제 선 방향
    let currentLanePosition = 0;
    
    // tilesOverride가 전달되면 그것을 사용, 아니면 현재 state 사용
    const currentTiles = tilesOverride !== undefined ? tilesOverride : pathTiles;
    
    if (currentTiles.length > 0) {
      // 이전 타일이 있으면, 그 타일의 x 위치에서 실제 선택한 방향만큼 이동
      const lastTile = currentTiles[currentTiles.length - 1];
      if (previousChoice) {
        // 이전에 선택한 방향이 전달된 경우 (정답/오답 상관없이)
        currentLanePosition = lastTile.x + (previousChoice === "right" ? 1 : -1);
      } else {
        // 첫 라운드: 현재 타일 위치 그대로
        currentLanePosition = lastTile.x;
      }
    }
    
    // 다음 라운드로 넘어가므로 이전 타일들의 revealed를 false로 리셋 (장애물 숨김)
    setPathTiles(prev => prev.map(tile => ({ ...tile, revealed: false })));
    
    const newTile = generateNewTile(currentLanePosition, level);
    setPathTiles(prev => [...prev, newTile]);
    setCurrentDirection(newTile.correctDirection);
    setIsListening(false);
    
    setTimeout(() => {
      playDirectionSound(newTile.correctDirection, newTile.highPitchSide, level);
      setIsListening(true);
    }, 500);
  };

  const startGame = (level?: number) => {
    
    // level 파라미터가 전달되면 즉시 사용
    const gameLevel = level !== undefined ? level : currentLevel;
    if (level !== undefined) {
      setCurrentLevel(level);
    }
    
    // 게임 시작 전 누적 점수 저장 및 게임 오버 플래그 초기화
    setPreviousAccumulatedScore(dailyAccumulatedScore);
    setShowGoalAchieved(false);
    isGameOverRef.current = false;
    isProcessingRef.current = false; // 더블클릭 방지 플래그 초기화
    
    setScore(0);
    setHearts(3);
    setCurrentStep(0);
    setMapOffsetX(0);
    setPathTiles([]);
    setGameState("countdown");
    setCountdown(3);
    setIsPaused(false);
    setIsAnimating(false);
    //  배열을 명시적으로 전달, level도 전달
    // setTimeout(() => {
    //   prepareNextRound(undefined, [], gameLevel);
    // }, 0);
    // 백그라운드 노이즈 시작 - gameLevel 사용
    // startBackgroundNoise(gameLevel);
  };

  // 방향 선택 처리
  const handleDirectionChoice = (choice: Direction) => {
    // 더블클릭 방지: ref로 즉시 차단
    if (isProcessingRef.current || !isListening || isAnimating) return;
    
    // 즉시 처리 중으로 표시 (상태 업데이트보다 빠름)
    isProcessingRef.current = true;
    
    playClickSound();
    setIsAnimating(true);
    setIsListening(false);
    stopSound();
    
    const currentTile = pathTiles[currentStep];
    const isCorrect = choice === currentTile.correctDirection;
    
    // 맵 이동 애니메이션 - 레인 하나의 너비만큼 이동
    // 현재 컨테이너 너비 가져오기
    const container = containerRef.current;
    const currentWidth = container ? container.offsetWidth : 400;
    const laneWidth = currentWidth / 3;
    const moveAmount = choice === "left" ? laneWidth : -laneWidth;
    setMapOffsetX(prev => prev + moveAmount);
    
    // 타일 공개 및 앞으로 이동
    setTimeout(() => {
      setPathTiles(prev => {
        const updated = [...prev];
        updated[currentStep] = { ...updated[currentStep], revealed: true, selectedDirection: choice };
        // 모든 타일을 아래로 이동
        return updated.map(tile => ({
          ...tile,
          y: tile.y + 30 // 한 칸 아래로
        }));
      });
      
      if (isCorrect) {
        // 정답
        playDingDongSound();
        playItemSound(); // 아이템 먹는 효과음 추가
        const earnedScore = currentLevel * 10;
        setScore(prev => prev + earnedScore);
        
        // 타일에 점수 텍스트 표시 추가
        setPathTiles(prev => {
          const updated = [...prev];
          updated[currentStep] = { 
            ...updated[currentStep], 
            showScoreText: true, 
            scoreValue: earnedScore 
          };
          return updated;
        });
        
        // 점수 텍스트는 600ms 후에 숨기기
        scoreTextTimeoutRef.current = window.setTimeout(() => {
          setPathTiles(prev => {
            const updated = [...prev];
            if (updated[currentStep]) {
              updated[currentStep] = { ...updated[currentStep], showScoreText: false };
            }
            return updated;
          });
        }, 4000);
        
        nextStepTimeoutRef.current = window.setTimeout(() => {
          setCurrentStep(prev => prev + 1);
          // 맵은 이동한 위치 유지 (중앙으로 돌아가지 않음)
          setIsAnimating(false);
          prepareNextRound(choice);
        }, 800);
      } else {
        // 오답
        playBackSound(); // 오답 효과음
        playClickSound();
        
        // 타일에 하트 감소 텍스트 표시 추가
        setPathTiles(prev => {
          const updated = [...prev];
          updated[currentStep] = { 
            ...updated[currentStep], 
            showHeartText: true 
          };
          return updated;
        });
        
        // 하트 감소 텍스트는 2.5초 후에 숨기기
        heartTextTimeoutRef.current = window.setTimeout(() => {
          setPathTiles(prev => {
            const updated = [...prev];
            if (updated[currentStep]) {
              updated[currentStep] = { ...updated[currentStep], showHeartText: false };
            }
            return updated;
          });
        }, 2500);
        
        // 캐릭터 피격 효과 - 깜빡이기
        blinkTimeout1Ref.current = window.setTimeout(() => setIsCharacterHit(true), 0);
        blinkTimeout2Ref.current = window.setTimeout(() => setIsCharacterHit(false), 200);
        blinkTimeout3Ref.current = window.setTimeout(() => setIsCharacterHit(true), 400);
        window.setTimeout(() => setIsCharacterHit(false), 600);
        
        setHearts(prev => {
          const newHearts = prev - 1;
          if (newHearts <= 0) {
            gameOverTimeoutRef.current = window.setTimeout(() => {
              // 🔥 하트 0 시 점수 저장 및 누적 (한 번만 저장)
              if (!isGameOverRef.current) {
                isGameOverRef.current = true;
                
                saveGameRecord("directionGame", score, currentLevel);
                
                // 측정 중이거나 목표점수가 0점일 때: 계속 측정
                const currentTargetScore = getTargetScore();
                if (currentTargetScore === null || currentTargetScore === 0) {
                  setMeasuredScore(score);
                  const newTarget = score > 0 ? score * 3 : 0;
                  setDailyTargetScore(newTarget);
                  setDailyAccumulatedScore(score);
                  setShowGoalAchieved(false);
                } else {
                  // 🎯 게임 종료 시점에 점수 합산
                  const { achieved, newAccumulated } = addScore(score);
                  setDailyAccumulatedScore(newAccumulated);
                  
                  if (achieved) {
                    recordAchievement("directionGame");
                    setShowGoalAchieved(true);
                  } else {
                    setShowGoalAchieved(false);
                  }
                }
              }
              
              setGameState("gameOver");
            }, 1000);
          } else {
            wrongNextStepTimeoutRef.current = window.setTimeout(() => {
              setCurrentStep(prevStep => prevStep + 1);
              // 맵은 이동한 위치 유지 (중앙으로 아가지 않음)
              setIsAnimating(false);
              prepareNextRound(choice);
            }, 800);
          }
          return newHearts;
        });
      }
    }, 300);
  };

  // 드래그 처리
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== "playing" || !isListening || isAnimating) return;
    dragStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (gameState !== "playing" || !isListening || isAnimating) return;
    if (dragStartXRef.current === null) return;
    
    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - dragStartXRef.current;
    
    if (Math.abs(deltaX) > 50) {
      const swipeDirection: Direction = deltaX > 0 ? "left" : "right"; // 반대로 변경
      handleDirectionChoice(swipeDirection);
    }
    
    dragStartXRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (gameState !== "playing" || !isListening || isAnimating) return;
    dragStartXRef.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (gameState !== "playing" || !isListening || isAnimating) return;
    if (dragStartXRef.current === null) return;
    
    const deltaX = e.clientX - dragStartXRef.current;
    
    if (Math.abs(deltaX) > 50) {
      const swipeDirection: Direction = deltaX > 0 ? "left" : "right"; // 반대로 변경
      handleDirectionChoice(swipeDirection);
    }
    
    dragStartXRef.current = null;
  };

  const togglePause = () => {
    playClickSound();
    if (gameState !== "playing") return;
    
    if (!isPaused) {
      stopSound();
      clearAllTimers(); // 모든 타이머 정리
      pausedIsAnimatingRef.current = isAnimating; // 애니메이션 상태 저장
      setIsPaused(true);
      // 백그라운드 노이즈 일시정지
      pauseBackgroundNoise();
    } else {
      setIsPaused(false);
      if (isListening && pathTiles.length > currentStep) {
        const currentTile = pathTiles[currentStep];
        playDirectionSound(currentDirection, currentTile.highPitchSide);
      }
      // 백그라운드 노이즈 재개
      resumeBackgroundNoise();
    }
  };

  const handleResume = () => {
    playClickSound();
    setIsPaused(false);
    
    // 애니메이션 중이었다면 다음 라운드로 넘어가는 타이머 설정
    if (pausedIsAnimatingRef.current) {
      // 정답이었는지 오답이었는지 확인
      const currentTile = pathTiles[currentStep];
      if (currentTile && currentTile.revealed && currentTile.selectedDirection) {
        const isCorrect = currentTile.selectedDirection === currentTile.correctDirection;
        
        if (isCorrect) {
          // 정답이었던 경우
          nextStepTimeoutRef.current = window.setTimeout(() => {
            setCurrentStep(prev => prev + 1);
            setIsAnimating(false);
            prepareNextRound(currentTile.selectedDirection);
          }, 500);
        } else {
          // 오답이었던 경우
          if (hearts <= 0) {
            gameOverTimeoutRef.current = window.setTimeout(() => {
              setGameState("gameOver");
            }, 500);
          } else {
            wrongNextStepTimeoutRef.current = window.setTimeout(() => {
              setCurrentStep(prevStep => prevStep + 1);
              setIsAnimating(false);
              prepareNextRound(currentTile.selectedDirection);
            }, 500);
          }
        }
      }
      pausedIsAnimatingRef.current = false;
    }
    
    // 백그라운드 노이즈만 재개 (소리는 재생하지 않음)
    resumeBackgroundNoise();
  };

  const handleRestart = () => {
    playClickSound();
    setIsPaused(false);
    stopSound();
    stopBackgroundNoise();
    clearAllTimers(); // 타이머 정리
    startGame();
  };

  const handleExit = () => {
    playBackSound();
    stopSound();
    stopBackgroundNoise();
    clearAllTimers(); // 타이머 정리
    onBack();
  };

  useEffect(() => {
    return () => {
      stopSound();
      clearAllTimers(); // 컴포넌트 언마운트 시 타이머 정리
      // 게임 종료 시 백그라운드 노이즈 정지
      stopBackgroundNoise();
    };
  }, []);

  useEffect(() => {
    if (isPaused) {
      stopSound();
      clearAllTimers(); // 일시정지 시 타이머 정리
      // 일시정지 시 백그라운드 노이즈 일시정지
      pauseBackgroundNoise();
    }
  }, [isPaused]);

  // 카운트다운 로직
  useEffect(() => {
    if (gameState !== "countdown") return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // 카운트다운 종료 후 게임 시작
      setGameState("playing");
      
      // 백그라운드 노이즈 시작
      startBackgroundNoise(currentLevel);
      
      // 첫 라운드 시작
      setTimeout(() => {
        prepareNextRound(undefined, [], currentLevel);
      }, 0);
    }
  }, [gameState, countdown, currentLevel]);

  useEffect(() => {
    const currentRef = containerRef.current;
    if (currentRef) {
      setContainerWidth(currentRef.offsetWidth);
    }
  }, []);

  // 게임 오버 시 기록 저장
  useEffect(() => {
    if (gameState === "gameOver" && score > 0 && !isGameOverRef.current) {
      isGameOverRef.current = true;
      
      const record = localStorage.getItem("directionGame");
      const currentRecord = record ? JSON.parse(record) : { highScore: 0 };
      
      if (score > currentRecord.highScore) {
        localStorage.setItem("directionGame", JSON.stringify({ highScore: score }));
      }
      
      // 목표점수가 없으면 측정 시작
      if (dailyTargetScore === null || dailyTargetScore === 0) {
        setMeasuredScore(score);
        const newTarget = score > 0 ? score * 3 : 0;
        setDailyTargetScore(newTarget);
        setDailyAccumulatedScore(score);
      } else {
        // 목표점수가 설정되어 있으면 점수 추가
        const { achieved, newAccumulated } = addScore(score);
        setDailyAccumulatedScore(newAccumulated);
        
        if (achieved) {
          recordAchievement("directionGame");
          setShowGoalAchieved(true);
        } else {
          setShowGoalAchieved(false);
        }
      }
      
      // 게임 기록 저장
      saveGameRecord("directionGame", score, currentLevel);
    }
  }, [gameState, score, currentLevel, dailyTargetScore]);

  // 컴포넌트 마운트 시 추천 레벨 계산
  useEffect(() => {
    const records = getGameRecord("directionGame");
    const scores = [
      records.level1 || 0,
      records.level2 || 0,
      records.level3 || 0
    ];
    
    // 가장 낮은 점수를 가진 레벨 찾기
    const minScore = Math.min(...scores);
    const recommendedIdx = scores.findIndex(score => score === minScore);
    setRecommendedLevel(recommendedIdx + 1);
    
    // 일일 목표점수 초기화
    const target = getTargetScore();
    setDailyTargetScore(target);
    const accumulated = getAccumulatedScore();
    setDailyAccumulatedScore(accumulated);
    setPreviousAccumulatedScore(accumulated);
    setAnimatedAccumulatedScore(accumulated);
  }, []);
  
  // 게임 상태가 ready로 돌아올 때 누적점수 갱신
  useEffect(() => {
    if (gameState === "ready") {
      const accumulated = getAccumulatedScore();
      setDailyAccumulatedScore(accumulated);
      setPreviousAccumulatedScore(accumulated);
      setAnimatedAccumulatedScore(accumulated);
    }
  }, [gameState]);
  
  // 게임 오버 시 누적 점수 애니메이션
  useEffect(() => {
    if (gameState === "gameOver") {
      setAnimatedAccumulatedScore(previousAccumulatedScore);
      
      const duration = 1000;
      const startTime = Date.now();
      const startScore = previousAccumulatedScore;
      const endScore = dailyAccumulatedScore;
      const diff = endScore - startScore;
      
      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentScore = Math.floor(startScore + diff * eased);
        
        setAnimatedAccumulatedScore(currentScore);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [gameState, previousAccumulatedScore, dailyAccumulatedScore]);

  // 개발자 모드: 'q' 키로 게임 즉시 종료 (점수 0, 하트 0), 'w' 키로 게임 즉시 종료 (점수 30, 하트 0)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const isDevMode = localStorage.getItem('devMode') === 'true';
      if (isDevMode && gameState === 'playing') {
        if (e.key === 'q' || e.key === 'Q') {
          // 즉시 게임 종료 (점수 0, 하트 0)
          setScore(0);
          setHearts(0);
          setGameState("gameOver");
          setShowGoalAchieved(false);
        } else if (e.key === 'w' || e.key === 'W') {
          // 즉시 게임 종료 (점수 30, 하트 0) - 실제 30점 획득으로 처리
          const finalScore = 30;
          setScore(finalScore);
          
          // 게임 기록 저장
          saveGameRecord("directionGame", finalScore, currentLevel);
          
          // 측정 중이거나 목표점수가 0점일 때: 측정값 설정 및 목표점수 설정
          const currentTargetScore = getTargetScore();
          if (currentTargetScore === null || currentTargetScore === 0) {
            setMeasuredScore(finalScore);
            const newTarget = finalScore * 3; // 30 * 3 = 90
            setDailyTargetScore(newTarget);
            setDailyAccumulatedScore(finalScore);
            setShowGoalAchieved(false);
          } else {
            // 🎯 게임 종료 시점에 점수 합산
            const { achieved, newAccumulated } = addScore(finalScore);
            setDailyAccumulatedScore(newAccumulated);
            
            if (achieved) {
              recordAchievement("directionGame");
              setShowGoalAchieved(true);
            } else {
              setShowGoalAchieved(false);
            }
          }
          
          setHearts(0);
          setGameState("gameOver");
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, currentLevel]);

  return (
    <div className="h-screen overflow-hidden bg-amber-50 p-4 pb-[env(safe-area-inset-bottom)] flex flex-col pt-[max(env(safe-area-inset-top),3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          {/* Ready 상태일 때만 뒤가기 버튼 */}
          {gameState === "ready" && (
            <button
              onClick={handleExit}
              className="bg-transparent hover:bg-transparent border-none p-2 cursor-pointer"
            >
              <ImageWithFallback
                src={exitIcon}
                alt="exit"
                className="h-8 w-8 object-contain"
              />
            </button>
          )}
          
          {gameState === "ready" && (
            <>
              <h1 
                className="text-gray-700 ml-4 text-4xl cursor-pointer" 
                style={{ fontFamily: 'OngleipRyudung' }}
                onClick={() => {
                  setDevClickCount(prev => {
                    const newCount = prev + 1;
                    
                    // 타이머 초기화
                    if (devClickTimerRef.current) {
                      clearTimeout(devClickTimerRef.current);
                    }
                    
                    // 2초 후 카운트 리셋
                    devClickTimerRef.current = setTimeout(() => {
                      setDevClickCount(0);
                    }, 2000);
                    
                    // 5번 클릭 시 개발자 모드 활성화
                    if (newCount >= 5) {
                      setDevMode(true);
                      playClickSound();
                      setDevClickCount(0);
                      if (devClickTimerRef.current) {
                        clearTimeout(devClickTimerRef.current);
                      }
                    }
                    
                    return newCount;
                  });
                }}
              >
                방향 게임{devMode && " 🔧"}
              </h1>
              {devMode && (
                <>
                  <button
                    onClick={() => {
                      localStorage.removeItem('directionGame_dailyGoal');
                      const newTarget = getTargetScore();
                      setDailyTargetScore(newTarget);
                      setDailyAccumulatedScore(0);
                      setAnimatedAccumulatedScore(0);
                      playClickSound();
                      alert('목표점수 데이터가 초기화되었습니다!');
                    }}
                    className="text-xl px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    style={{ fontFamily: "OngleipRyudung" }}
                  >
                    목표점수 초기화
                  </button>
                  <button
                    onClick={() => {
                      const dailyGoalData = localStorage.getItem('directionGame_dailyGoal');
                      if (dailyGoalData) {
                        const data = JSON.parse(dailyGoalData);
                        data.accumulatedScore = 0;
                        data.achieved = false;
                        localStorage.setItem('directionGame_dailyGoal', JSON.stringify(data));
                        setDailyAccumulatedScore(0);
                        setAnimatedAccumulatedScore(0);
                        playClickSound();
                        alert('누적 점수가 초기화되었습니다!');
                      }
                    }}
                    className="text-xl px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                    style={{ fontFamily: "OngleipRyudung" }}
                  >
                    누적 점수 초기화
                  </button>

                </>
              )}
            </>
          )}
          
          {/* Playing, Countdown 또는 GameOver 상태일 때는 일시정지 버튼과 설정 버튼 */}
          {((gameState === "playing" && !isPaused) || gameState === "gameOver" || gameState === "countdown") && (
            <div className="flex items-center gap-2">
              <button
                onClick={togglePause}
                disabled={gameState === "countdown"}
                className={`bg-transparent hover:bg-transparent border-none p-2 transition-transform hover:scale-110 active:scale-95 ${gameState === "countdown" ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <ImageWithFallback
                  src={pauseIcon}
                  alt="일시정지"
                  className="h-10 w-10 object-contain"
                />
              </button>
              
              <button
                onClick={() => {
                  playClickSound();
                  setShowSettings(true);
                }}
                disabled={gameState === "countdown"}
                className={`bg-transparent hover:bg-transparent border-none p-2 transition-transform hover:scale-110 active:scale-95 ${gameState === "countdown" ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <ImageWithFallback
                  src={settingsIcon}
                  alt="설정"
                  className="h-10 w-10 object-contain"
                />
              </button>
            </div>
          )}

          {gameState === "playing" && isPaused && (
            <div className="w-12" />
          )}
        </div>
        
        {(gameState === "playing" || gameState === "gameOver" || gameState === "countdown") && (
          <>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-7 h-7 ${
                      i < hearts
                        ? "text-[#cd6c58]"
                        : "fill-gray-300 text-gray-300"
                    }`}
                    fill={i < hearts ? "#cd6c58" : undefined}
                  />
                ))}
              </div>
              
              <div className="bg-white/80 px-6 py-2 rounded-lg">
                <span className="text-2xl">점수: {score}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Ready 상태일 때 게임 설명 */}
      {gameState === "ready" && (
        <>
          <p className="text-2xl text-gray-700 text-center mb-2">
            *이어폰(헤드폰) 착용 필수<br />
            소리가 나는 방향의 박스를 선택하여 올바른 길을 선택하세요!<br />
            잘못된 방향의 박스를 선택하면 하트를 잃습니다.
          </p>
          <p className="text-2xl text-center mb-1" style={{ color: '#e5a652' }}>
            일일 목표점수: {dailyTargetScore === null || dailyTargetScore === 0 ? '측정중...' : `${dailyTargetScore}점`}
          </p>
          <p className="text-2xl text-center mb-4" style={{ color: '#e5a652' }}>
            일일 누적점수: {animatedAccumulatedScore}점
          </p>
        </>
      )}

      {/* Ready Screen */}
      {gameState === "ready" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="relative flex flex-col items-center justify-center">
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <LevelButton
                level={1}
                levelName="모노"
                isRecommended={recommendedLevel === 1}
                buttonBgImage={levelButtonBg}
                devMode={devMode}
                color="#e5a652"
                disabled={!hasEnergy()}
                onClick={() => {
                  // 개발자 모드일 때는 기회 체크 스킵
                  if (devMode) {
                    playSelectSound();
                    setSelectedLevel(1);
                    startGame(1);
                    return;
                  }
                  
                  if (!devMode && !hasEnergy()) {
                    setShowNoEnergyAlert(true);
                    setTimeout(() => setShowNoEnergyAlert(false), 2000);
                    return;
                  }
                  
                  if (devMode || useEnergy()) {
                    setEnergy(getEnergy());
                    playSelectSound();
                    setSelectedLevel(1);
                    startGame(1);
                  }
                }}
              />
              
              <LevelButton
                level={2}
                levelName="모노, 노이즈"
                isRecommended={recommendedLevel === 2}
                buttonBgImage={levelButtonBg}
                devMode={devMode}
                color="#e5a652"
                disabled={!hasEnergy()}
                onClick={() => {
                  // 개발자 모드일 때는 기회 체크 스킵
                  if (devMode) {
                    playSelectSound();
                    setSelectedLevel(2);
                    startGame(2);
                    return;
                  }
                  
                  if (!devMode && !hasEnergy()) {
                    setShowNoEnergyAlert(true);
                    setTimeout(() => setShowNoEnergyAlert(false), 2000);
                    return;
                  }
                  
                  if (devMode || useEnergy()) {
                    setEnergy(getEnergy());
                    playSelectSound();
                    setSelectedLevel(2);
                    startGame(2);
                  }
                }}
              />
              
              <LevelButton
                level={3}
                levelName="스테레오"
                isRecommended={recommendedLevel === 3}
                buttonBgImage={levelButtonBg}
                devMode={devMode}
                color="#e5a652"
                disabled={!hasEnergy()}
                onClick={() => {
                  // 개발자 모드일 때는 기회 체크 스킵
                  if (devMode) {
                    playSelectSound();
                    setSelectedLevel(3);
                    startGame(3);
                    return;
                  }
                  
                  if (!devMode && !hasEnergy()) {
                    setShowNoEnergyAlert(true);
                    setTimeout(() => setShowNoEnergyAlert(false), 2000);
                    return;
                  }
                  
                  if (devMode || useEnergy()) {
                    setEnergy(getEnergy());
                    playSelectSound();
                    setSelectedLevel(3);
                    startGame(3);
                  }
                }}
              />
            </div>
            
            <p className="text-2xl text-gray-700 mt-4 text-center">난이도를 선택하세요</p>
            
            <GameRulesButton
              onClick={() => {
                playClickSound();
                setShowRules(true);
              }}
              backgroundColor="#e5a652"
              textColor="#ffffff"
            />
          </div>
        </div>
      )}

      {/* 카운트다운 화면 */}
      {gameState === "countdown" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-9xl" style={{ fontFamily: 'OngleipRyudung', color: '#e5a652' }}>
            {countdown}
          </div>
        </div>
      )}

      {(gameState === "playing" || gameState === "gameOver") && (
        <div 
          className="flex-1 flex flex-col items-center justify-center relative min-h-0"
        >
          {/* 고정 높이 영역 - 메시지 */}
          <div className="mb-2 h-8 flex items-center justify-center">
            {!isListening && !isAnimating && (
              <div className="text-3xl animate-pulse" style={{ color: '#e5a652' }}>
                방향에 집중하세요!
              </div>
            )}
            
            {isListening && !isAnimating && (
              <div className="text-3xl animate-pulse" style={{ color: '#e5a652' }}>
                {currentLevel === 3 && pathTiles.length > currentStep && pathTiles[currentStep].targetPitch
                  ? pathTiles[currentStep].targetPitch === "high"
                    ? "높은 소리 방향의 물음표 박스를 선택하세요!"
                    : "낮은 소리 방향의 물음표 박스를 선택하세요!"
                  : "물음표 박스를 선택하세요!"}
              </div>
            )}
          </div>
          
          {/* 일일 목표점수 표시 */}
          {gameState === "playing" && (
            <div className="flex items-center justify-center gap-2 mb-2">
              {dailyTargetScore !== null && dailyTargetScore > 0 && dailyAccumulatedScore >= dailyTargetScore ? (
                <div className="text-2xl" style={{ color: '#e5a652' }}>일일 목표점수 도달 완료!</div>
              ) : (
                <>
                  <div className="text-gray-700 text-2xl">일일 목표점수</div>
                  <div className="text-gray-700 text-2xl">
                    {dailyTargetScore === null || dailyTargetScore === 0 
                      ? '측정중...' 
                      : `${previousAccumulatedScore + score}/${dailyTargetScore}점`}
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* 게임 영역 */}
          <div 
            className="relative w-full max-w-md aspect-[3/4] overflow-hidden flex-shrink"
            ref={containerRef}
          >
            {/* 경로 타일들과 레인 - 맵 전체를 좌우로 이동 */}
            <div 
              className="absolute transition-transform duration-300"
              style={{
                transform: `translateX(${mapOffsetX}px)`,
                width: '300%', // 맵을 3배 넓게
                left: '-100%', // 중앙에 배치
                height: '100%'
              }}
            >
              {/* 배 레인 그리드 - 캐릭터 주변만 동적으로 렌더링 */}
              <div className="absolute inset-0">
                {(() => {
                  // 현재 캐릭터의 레인 위치
                  const currentX = pathTiles.length > 0 ? pathTiles[pathTiles.length - 1].x : 0;
                  // 세로선은 레인 사이에 위치
                  // 화면에 3개 레인이 보이므로, 좌우로 더 많은 선 렌더링
                  const lines = [];
                  for (let i = -3; i <= 2; i++) {
                    const lineX = currentX + i + 0.5; // 레인 사이 위치
                    // 각 세로선의 위치는 앙(50%) + (lineX * 11.11%)
                    const leftPercent = 50 + (lineX * 11.11);
                    lines.push(
                      <div 
                        key={`line-${lineX}`}
                        className="absolute top-0 bottom-0 w-1 z-10"
                        style={{ left: `${leftPercent}%`, backgroundColor: '#e8d576', transform: 'translateX(-50%)' }}
                      />
                    );
                  }
                  return lines;
                })()}
              </div>
              
              {pathTiles.map((tile, index) => {
                const isCurrentTile = index === currentStep;
                const isPastTile = index < currentStep;
                
                // 타일의 레인 위치 계산 (x = 0이 중앙, -1이 왼쪽, 1이 오른쪽)
                // 각 레인은 전체의 11.11% (100% / 9칸)
                const laneOffset = tile.x * 11.11; // x 값에 따라 이동
                
                return (
                  <div
                    key={index}
                    className="absolute transition-all duration-500 ease-out"
                    style={{
                      top: `${tile.y}%`,
                      left: `${33.33 + laneOffset}%`, // x 위치에 따라 좌우 이동
                      width: '33.33%' // 원래 화면 넓이만큼
                    }}
                  >
                    <div className="flex w-full h-24">
                      {/* 왼쪽 칸 */}
                      <button
                        onClick={() => handleDirectionChoice("left")}
                        className="w-1/3 h-full flex items-center justify-center"
                        disabled={!isCurrentTile || !isListening || isAnimating}
                      >
                        {tile.revealed ? (
                          // revealed일 때: 사용자가 선택한 방향에 따라 표시
                          tile.selectedDirection === "left" ? (
                            // 왼쪽을 선택했을 때
                            tile.correctDirection === "left" ? (
                              // 정답: gif 표시 with 애니메이션
                              <div className="w-full h-full flex items-center justify-center p-1 relative">
                                <div className="animate-[scale_0.3s_ease-out]" style={{
                                  animation: 'scaleUp 0.3s ease-out'
                                }}>
                                  <style>{`
                                    @keyframes scaleUp {
                                      0% { transform: scale(1); }
                                      50% { transform: scale(1.2); }
                                      100% { transform: scale(1); }
                                    }
                                  `}</style>
                                  <ImageWithFallback
                                    src={correctPathGif}
                                    alt="correct"
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              </div>
                            ) : (
                              // 오답: 장애물
                              <div className="w-full h-full flex items-center justify-center p-1">
                                <ImageWithFallback
                                  src={tile.obstacleType === "banana" ? bananaObstacle : hurdleObstacle}
                                  alt="obstacle"
                                  className="w-full h-full object-contain scale-110"
                                />
                              </div>
                            )
                          ) : (
                            // 오른쪽을 선택했을 때: 왼쪽 칸은 장애물 or 빈 공간
                            tile.correctDirection === "left" ? (
                              // 정답이 왼쪽이었으면 장애물
                              <div className="w-full h-full flex items-center justify-center p-1">
                                <ImageWithFallback
                                  src={tile.obstacleType === "banana" ? bananaObstacle : hurdleObstacle}
                                  alt="obstacle"
                                  className="w-full h-full object-contain scale-110"
                                />
                              </div>
                            ) : (
                              // 정답이 오른쪽이면 왼쪽은 장애물
                              <div className="w-full h-full flex items-center justify-center p-1">
                                <ImageWithFallback
                                  src={tile.obstacleType === "banana" ? bananaObstacle : hurdleObstacle}
                                  alt="obstacle"
                                  className="w-full h-full object-contain scale-110"
                                />
                              </div>
                            )
                          )
                        ) : isCurrentTile ? (
                          <div className="w-full h-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 p-2">
                            <ImageWithFallback
                              src={questionCardImage}
                              alt="question"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : isPastTile ? (
                          <div className="w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageWithFallback
                              src={questionCardImage}
                              alt="question"
                              className="w-full h-full object-cover opacity-50"
                            />
                          </div>
                        )}
                      </button>
                      
                      {/* 중앙 칸 */}
                      <div className="w-1/3 h-full flex items-center justify-center border-b-2 border-transparent" />
                      
                      {/* 오른쪽 칸 */}
                      <button
                        onClick={() => handleDirectionChoice("right")}
                        className="w-1/3 h-full flex items-center justify-center"
                        disabled={!isCurrentTile || !isListening || isAnimating}
                      >
                        {tile.revealed ? (
                          // revealed일 때: 사용자가 선택한 방향에 따라 표시
                          tile.selectedDirection === "right" ? (
                            // 오른쪽을 선택했을 때
                            tile.correctDirection === "right" ? (
                              // 정답: gif 표시 with 애니메이션
                              <div className="w-full h-full flex items-center justify-center p-1 relative">
                                <div className="animate-[scale_0.3s_ease-out]" style={{
                                  animation: 'scaleUp 0.3s ease-out'
                                }}>
                                  <style>{`
                                    @keyframes scaleUp {
                                      0% { transform: scale(1); }
                                      50% { transform: scale(1.2); }
                                      100% { transform: scale(1); }
                                    }
                                  `}</style>
                                  <ImageWithFallback
                                    src={correctPathGif}
                                    alt="correct"
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              </div>
                            ) : (
                              // 오답: 장애물
                              <div className="w-full h-full flex items-center justify-center p-1">
                                <ImageWithFallback
                                  src={tile.obstacleType === "banana" ? bananaObstacle : hurdleObstacle}
                                  alt="obstacle"
                                  className="w-full h-full object-contain scale-110"
                                />
                              </div>
                            )
                          ) : (
                            // 왼쪽을 선택했을 때: 오른쪽 칸은 장애물 or 빈 공간
                            tile.correctDirection === "right" ? (
                              // 정답이 오른쪽이었으면 장애물
                              <div className="w-full h-full flex items-center justify-center p-1">
                                <ImageWithFallback
                                  src={tile.obstacleType === "banana" ? bananaObstacle : hurdleObstacle}
                                  alt="obstacle"
                                  className="w-full h-full object-contain scale-110"
                                />
                              </div>
                            ) : (
                              // 정답이 왼쪽이면 오른쪽은 장애물
                              <div className="w-full h-full flex items-center justify-center p-1">
                                <ImageWithFallback
                                  src={tile.obstacleType === "banana" ? bananaObstacle : hurdleObstacle}
                                  alt="obstacle"
                                  className="w-full h-full object-contain scale-110"
                                />
                              </div>
                            )
                          )
                        ) : isCurrentTile ? (
                          <div className="w-full h-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 p-2">
                            <ImageWithFallback
                              src={questionCardImage}
                              alt="question"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : isPastTile ? (
                          <div className="w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageWithFallback
                              src={questionCardImage}
                              alt="question"
                              className="w-full h-full object-cover opacity-50"
                            />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* 캐릭터 - 중앙에 고정 */}
            <div
              className={`absolute transition-all duration-300 z-20 ${isCharacterHit ? 'opacity-30' : 'opacity-100'}`}
              style={{
                left: '50%',
                bottom: '10%',
                transform: 'translate(-50%, 0)'
              }}
            >
              <ImageWithFallback
                src={isAnimating ? characterWalkingGif : characterImage}
                alt="character"
                className="w-20 h-24 object-contain"
              />
            </div>
            
            {/* 점수 텍스트 - 캐릭터 위에 표시 */}
            {pathTiles[currentStep]?.showScoreText && pathTiles[currentStep]?.scoreValue && (
              <div 
                className="absolute pointer-events-none z-30 flex items-center gap-1"
                style={{
                  left: '50%',
                  bottom: '35%',
                  transform: 'translateX(-50%)',
                  animation: 'floatUp 2.5s ease-out forwards',
                }}
              >
                <style>{`
                  @keyframes floatUp {
                    0% { 
                      transform: translateX(-50%) translateY(0px); 
                      opacity: 1; 
                    }
                    100% { 
                      transform: translateX(-50%) translateY(-40px); 
                      opacity: 0; 
                    }
                  }
                `}</style>
                <ImageWithFallback
                  src={scoreStarIcon}
                  alt="star"
                  className="w-12 h-12 object-contain"
                />
                <span style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#FFD700',
                  textShadow: '3px 3px 6px rgba(0,0,0,0.7)'
                }}>
                  +{pathTiles[currentStep].scoreValue}
                </span>
              </div>
            )}
            
            {/* 하트 감소 텍스트 - 캐릭터 위에 표시 */}
            {pathTiles[currentStep]?.showHeartText && (
              <div 
                className="absolute pointer-events-none z-30 flex items-center gap-1"
                style={{
                  left: '50%',
                  bottom: '35%',
                  transform: 'translateX(-50%)',
                  animation: 'floatUpHeart 2.5s ease-out forwards',
                }}
              >
                <style>{`
                  @keyframes floatUpHeart {
                    0% { 
                      transform: translateX(-50%) translateY(0px); 
                      opacity: 1; 
                    }
                    100% { 
                      transform: translateX(-50%) translateY(-80px); 
                      opacity: 0; 
                    }
                  }
                `}</style>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="#e5a652"
                  stroke="#e5a652"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    flexShrink: 0
                  }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span style={{
                  fontSize: '56px',
                  fontWeight: 'bold',
                  color: '#FFD700',
                  textShadow: '3px 3px 6px rgba(0,0,0,0.7)',
                  fontFamily: "'OngleipRyudung', sans-serif"
                }}>
                  -1
                </span>
              </div>
            )}
          </div>
          
          {/* 다시듣기 버튼 - 게임 영역 아래 */}
          <div className="mt-6 h-16 flex items-center justify-center flex-shrink-0">
            {isListening && !isAnimating && !isSoundPlaying && score >= currentLevel * 5 && (
              <button
                onClick={() => {
                  playClickSound();
                  // 점수 차감
                  const replayCost = currentLevel * 5;
                  setScore(prev => prev - replayCost);
                  playDirectionSound(currentDirection);
                }}
                className="relative hover:scale-105 active:scale-95 transition-transform"
              >
                <ImageWithFallback
                  src={replayButtonBg}
                  alt="다시듣기"
                  className="h-16 w-auto object-contain"
                />
                <span className="absolute inset-0 flex items-center justify-center text-xl" style={{ color: '#ffffff' }}>
                  다시듣기 -{currentLevel * 5}점
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {isPaused && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div 
            className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat animate-in zoom-in-95 duration-200"
            style={{ backgroundImage: `url(${pauseMenuBg})` }}
          >
            <h2 className="text-center mb-6 mt-4 text-4xl" style={{ color: '#eae4d3' }}>일시정지</h2>
            
            <div className="space-y-0">
              <button
                onClick={handleResume}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={resumeIcon}
                  alt="resume"
                  className="h-12 w-12 object-contain"
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>이어서</span>
              </button>

              <button
                onClick={handleRestart}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={restartIcon}
                  alt="restart"
                  className="h-12 w-12 object-contain"
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>처음부터</span>
              </button>

              <button
                onClick={handleExit}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={pauseExitIcon}
                  alt="exit"
                  className="h-12 w-12 object-contain"
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>나가기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === "gameOver" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div 
            className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat animate-in zoom-in-95 duration-200"
            style={{ backgroundImage: `url(${pauseMenuBg})` }}
          >
            {showGoalAchieved ? (
              <>
                <h2 className="text-center mb-4 mt-4 text-4xl" style={{ color: '#eae4d3' }}>목표 달성!</h2>
                <div className="text-center mb-6 text-2xl" style={{ color: '#d4c5a0' }}>
                  일일 목표점수: {dailyTargetScore}점
                </div>
              </>
            ) : (
              <>
                <h2 className="text-center mb-2 mt-4 text-4xl" style={{ color: '#eae4d3' }}>게임 종료!</h2>
                <div className="text-center mb-2 text-2xl" style={{ color: '#d4c5a0' }}>
                  일일 목표점수: {dailyTargetScore === null || dailyTargetScore === 0 ? '측정중...' : `${dailyTargetScore}점`}
                </div>
                <div className="text-center mb-6 text-2xl" style={{ color: '#eae4d3' }}>
                  일일 누적점수: {animatedAccumulatedScore}점
                </div>
              </>
            )}
            
            <div className="space-y-0">
              <button
                onClick={handleRestart}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={restartIcon}
                  alt="restart"
                  className="h-12 w-12 object-contain"
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>처음부터</span>
              </button>

              <button
                onClick={handleExit}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={pauseExitIcon}
                  alt="exit"
                  className="h-12 w-12 object-contain"
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>나가기</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 게임 설명 모달 */}
      <GameRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        title="방향 게임 설명"
        primaryColor="#e5a652"
        backgroundColor="#fef3c7"
        scrollbarColor="#e5a652"
        scrollbarTrackColor="#fef3c7"
        onCloseSound={playClickSound}
      >
        <p className="mb-2">*이어폰(헤드폰) 착용 필수</p>
        <p className="mb-2">소리가 나는 방향의 박스를 선택하여 올바른 길을 선택하세요!</p>
        <p className="mb-6">잘못된 방향의 박스를 선택하면 하트를 잃습니다.</p>
        <div className="border-t border-gray-300 my-4"></div>

        <RuleSection title="게임 방법" titleColor="#e5a652">
          <p className="mb-4">헤드폰이나 이어폰을 착용하고 게임을 시작하세요</p>
          <RuleList items={[
            "소리가 나는 방향을 듣고 소리가 나는 방향의 박스를 선택하세요",
            "같은 소리를 다시 듣고 싶다면 '다시듣기' 버튼을 누르세요",
            "잘못된 방향의 박스를 선택하면 하트가 1개 줄어듭니다",
            "하트가 모두 사라지면 게임이 종료됩니다"
          ]} />
        </RuleSection>

        <RuleSection title="점수" titleColor="#e5a652">
          <RuleList items={[
            <><strong>레벨 1</strong>: 정답당 10점</>,
            <><strong>레벨 2</strong>: 정답당 20점</>,
            <><strong>레벨 3</strong>: 정답당 30점</>
          ]} />
        </RuleSection>
      </GameRulesModal>

      {/* 설정 모달 */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
      
      {/* 에너지 없음 알림 */}
      {showNoEnergyAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
            <p className="text-2xl mb-6" style={{ fontFamily: 'OngleipRyudung', color: '#675c4e' }}>
              에너지가<br />부족합니다!
            </p>
            <button
              onClick={() => {
                playClickSound();
                setShowNoEnergyAlert(false);
              }}
              className="bg-[#e5a652] text-white px-8 py-3 rounded-lg text-xl hover:bg-[#d49542] transition-colors"
              style={{ fontFamily: 'OngleipRyudung' }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}