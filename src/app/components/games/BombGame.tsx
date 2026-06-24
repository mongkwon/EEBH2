import {
  getEnergy,
  useEnergy,
  hasEnergy,
} from "../../utils/globalEnergy";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Heart } from "lucide-react";
import { GameRulesButton } from "../GameRulesButton";
import {
  GameRulesModal,
  RuleSection,
  RuleList,
} from "../GameRulesModal";
import {
  playBackSound,
  playClickSound,
  playSelectSound,
} from "../../utils/sound";
import { LevelButton } from "./LevelButton";
import {
  getTargetScore,
  setMeasuredScore,
  getAccumulatedScore,
  addScore,
} from "../../utils/bombGameDailyGoal";
import {
  getGameRecord,
  saveGameRecord,
  recordAchievement,
  recordGamePlayed,
} from "../../utils/gameRecord";

// 폭탄 프레임 이미지 import
import bombFrame0 from "figma:asset/927959947cb354594974ac0c3e23f47c3fc63436.png";
import bombFrame1 from "figma:asset/1b0985cf2498dfb390de73a7aac0f1e7be6dcb6c.png";
import bombFrame2 from "figma:asset/b9290ad0b70631d1970d2ce9fe27c9094b624551.png";
import bombFrame3 from "figma:asset/167cf21e4273d4541aa0dfe288e78f41d0520e4e.png";
import bombFrame4 from "figma:asset/718bbaf07d80f1feb26acd6dfd922224049cc7b8.png";
import bombFrame5 from "figma:asset/a614bd36ef5e3e91b1059fa05323734026ae04b0.png";
import bombFrame6 from "figma:asset/69e989dff67abb1921668fe034d3ae80d2ac99ad.png";
import bombFrame7 from "figma:asset/9e997e20913932eabd9d72018f5ba049bd75f122.png";
import bombFrame8 from "figma:asset/aeeef5723f00a46a4d8820753b83e8952ec55300.png";
import bombFrame9 from "figma:asset/73aa36d0dfdc4a722f70f92e36bb72573e52e97a.png";
import bombFrame10 from "figma:asset/b11f8f27f0b5fbbf0b7798855191cb6b5e3f4bf6.png";
import bombFrame11 from "figma:asset/ab3a1ce26905242ba3b2a17affc472f31bc7cd4c.png";

// UI 아이콘 import
import pauseIcon from "figma:asset/8acb1e015c5c90586e07679819984941b38f74af.png";
import resumeIcon from "figma:asset/62327073bfb38b1feb704b5c6f1eb2a36789eee8.png";
import restartIcon from "figma:asset/d1a45328f3c2f5290d250ff17f71584c907a61a7.png";
import pauseMenuBg from "figma:asset/54f8a82ff3f9348da47c92cd7e8e9b17adc71522.png";
import pauseExitIcon from "figma:asset/7b6920cff9236248c28a92364a77c6df5be27012.png";
import exitIcon from "figma:asset/74b1288f91a03a19fc199ba8e3ce487eebb3c1fb.png";
import levelButtonBg from "figma:asset/a29e3c84c9c958413e3e5b27055c8415d775b5fe.png";
import bombScoreIcon from "figma:asset/399adba23998dd03505039248a26901c996cb91f.png";
import explosionEffect from "figma:asset/56dd3abd053ac5bbb00ae4fb94fcb64339c04ad8.png"; // 폭발 효과 이미지

// 프레임 배열 생성: 0~39는 기본 폭탄, 40~50은 폭발 애니메이션
const bombFrames = [
  bombFrame0,
  bombFrame1,
  bombFrame2,
  bombFrame3,
  bombFrame4,
  bombFrame5,
  bombFrame6,
  bombFrame7,
  bombFrame8,
  bombFrame9,
  bombFrame10,
  bombFrame11,
];

// 총 12프레임 배열 (각 이미지를 순차적으로 사용)
const createFrameSequence = (): string[] => {
  const sequence: string[] = [];

  // 0~47 프레임: bombFrame0 반복 (48프레임)
  for (let i = 0; i < 48; i++) {
    sequence.push(bombFrame0);
  }

  // 48~59 프레임: bombFrame1~11 각각 1번씩 + bombFrame11 한번 더 (12프레임)
  sequence.push(
    bombFrame1,
    bombFrame2,
    bombFrame3,
    bombFrame4,
    bombFrame5,
    bombFrame6,
    bombFrame7,
    bombFrame8,
    bombFrame9,
    bombFrame10,
    bombFrame11,
    bombFrame11,
  );

  return sequence;
};

const FRAME_SEQUENCE = createFrameSequence();
const TOTAL_FRAMES = FRAME_SEQUENCE.length; // 60

interface BombGameProps {
  onBack: () => void;
}

interface Bomb {
  id: number;
  x: number;
  y: number;
  createdAt: number;
  isExploding: boolean;
  explosionStartTime?: number; // 폭발 시작 시간
  explosionBaseScale?: number; // 폭발 시 기본 크기 저장
  vx: number; // x 방향 속도
  vy: number; // y 방향 속도
  frameIndex: number; // 현재 프레임 인덱스
  lastFrameUpdateTime: number; // 마지막 프레임 업데이트 시간
  pausedFrameIndex?: number; // 🔥 일시정지 시점의 프레임 인덱스
}

interface ScoreText {
  id: number;
  x: number;
  y: number;
  value: number;
  createdAt: number;
  scale: number; // 폭탄 크기 비율 추가
}

interface HeartText {
  id: number;
  x: number;
  y: number;
  createdAt: number;
  scale: number; // 폭탄 크기 비율 추가
}

type GameState = "ready" | "countdown" | "playing" | "gameOver";

export function BombGame({ onBack }: BombGameProps) {
  const [gameState, setGameState] =
    useState<GameState>("ready");
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [currentDifficulty, setCurrentDifficulty] = useState(1); // 현재 난이도 관리
  const [recommendedLevel, setRecommendedLevel] = useState<
    number | null
  >(null);
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [bombsCaught, setBombsCaught] = useState(0); // 잡은 폭탄 개수 추가
  const [isPaused, setIsPaused] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [gameResetKey, setGameResetKey] = useState(0); // 게임 리셋 키 추가
  const [scoreTexts, setScoreTexts] = useState<ScoreText[]>([]); // 점수 텍스트 배열
  const [heartTexts, setHeartTexts] = useState<HeartText[]>([]); // 하트 감소 텍스트 배열
  const [showGoalAchieved, setShowGoalAchieved] =
    useState(false); // 목표 점수 달성 팝업
  const [countdown, setCountdown] = useState(3); // 카운트다운 숫자

  const [renderTime, setRenderTime] = useState<number>(
    Date.now(),
  );
  const [pauseCount, setPauseCount] = useState(0); // 일시정지 횟수 추적

  // 전역 에너지 시스템
  const [energy, setEnergy] = useState(getEnergy());
  const [showNoEnergyAlert, setShowNoEnergyAlert] =
    useState(false);

  // 일일 목표점수 시스템
  const [dailyTargetScore, setDailyTargetScore] = useState<
    number | null
  >(null);
  const [dailyAccumulatedScore, setDailyAccumulatedScore] =
    useState<number>(0);
  const [
    previousAccumulatedScore,
    setPreviousAccumulatedScore,
  ] = useState<number>(0); // 게임 시작 전 누적 점수
  const [
    animatedAccumulatedScore,
    setAnimatedAccumulatedScore,
  ] = useState<number>(0); // 애니메이션용 누적 점수

  // 개발자 모드 (제목 5번 클릭 시 활성화)
  const [devMode, setDevMode] = useState(false);
  const [devClickCount, setDevClickCount] = useState(0);
  const devClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🔧 id를 ref로 관리 (state 아님)
  const nextBombIdRef = useRef(0);

  const gameLoopRef = useRef<number | null>(null);
  const lastBombTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number>(0); // 일시정지 시작 시간
  const totalPausedTimeRef = useRef<number>(0); // 총 일시정지 시간
  const isPausedRef = useRef<boolean>(false); // 일시정지 상태 ref
  const isGameOverRef = useRef<boolean>(false); // 게임 종료 상태 ref (목표 달성 즉시 체크용)

  // 사이클 관리를 위한 ref
  const cycleStartTimeRef = useRef<number>(0);
  const spawnTimesRef = useRef<number[]>([]);
  const nextSpawnIndexRef = useRef<number>(0);

  // 난이도별 설정
  const getConfig = (difficulty?: number) => {
    const level = difficulty ?? currentDifficulty;
    switch (level) {
      case 1:
        return {
          cycleDuration: 10000,
          bombsPerCycle: 10,
          targetScore: 100,
        }; // 10초에 10개
      case 2:
        return {
          cycleDuration: 10000,
          bombsPerCycle: 10,
          targetScore: 100,
        }; // 10초에 10개
      case 3:
        return {
          cycleDuration: 7000,
          bombsPerCycle: 10,
          targetScore: 100,
        }; // 7초에 10개
      default:
        return {
          cycleDuration: 10000,
          bombsPerCycle: 10,
          targetScore: 100,
        };
    }
  };

  const config = getConfig();
  const BOMB_LIFETIME = 5000; // 5초

  // 사이클 내 랜덤 생성 시간 배열 생성 (각 구간 내에서 랜덤)
  const generateSpawnTimes = (
    cycleDuration: number,
    count: number,
  ): number[] => {
    const times: number[] = [];
    const slotDuration = cycleDuration / count; // 각 구간의 길이

    for (let i = 0; i < count; i++) {
      // 각 구간의 시작 시간
      const slotStart = i * slotDuration;
      // 구간 내에서 랜덤한 시 (구간의 ±40% 범위)
      const randomOffset =
        (Math.random() - 0.5) * slotDuration * 0.8;
      const time = slotStart + slotDuration / 2 + randomOffset;

      // 0과 cycleDuration 사이로 제한
      times.push(
        Math.max(0, Math.min(cycleDuration - 1, time)),
      );
    }

    return times.sort((a, b) => a - b); // 간 순으로 정렬
  };

  // 게임 시작
  const startGame = (level?: number) => {
    setGameState("countdown"); // 카운트다운 상태로 시작
    setCountdown(3); // 카운트다운 초기화
    setScore(0);
    setHearts(3);
    setBombs([]);
    setBombsCaught(0); // 잡은 폭탄 개수 초기화
    nextBombIdRef.current = 0; // 🔧 id 리셋
    lastBombTimeRef.current = Date.now();
    setGameResetKey((prev) => prev + 1); // 게임 리셋 키 업데이트
    totalPausedTimeRef.current = 0; // 일시정지 시간 초기화
    pauseStartTimeRef.current = 0; // 일시정지 시작 시간 초기화
    isPausedRef.current = false; // 일시정지 상태 초기화
    isGameOverRef.current = false; // 게임 종료 상태 초기화
    setPreviousAccumulatedScore(getAccumulatedScore()); // 🔥 게임 시작 전 누적 점수 저장

    const targetLevel = level ?? currentDifficulty;
    if (level) {
      setCurrentDifficulty(level);
    }

    // 사이클 시작 시간 설정은 카운트다운 후에 함 (useEffect에서 처리)
    const levelConfig = getConfig(targetLevel);
    spawnTimesRef.current = generateSpawnTimes(
      levelConfig.cycleDuration,
      levelConfig.bombsPerCycle,
    );
    nextSpawnIndexRef.current = 0;
  };

  // 랜덤 위치 생성 (겹치지 않게)
  const getRandomPosition = (
    existingBombs: Bomb[],
  ): { x: number; y: number } => {
    const margin = 10; // 10% 여백
    const minDistance = 15; // 최소 거리 (%)
    const maxAttempts = 50; // 최대 시도 횟수

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = margin + Math.random() * (100 - margin * 2);
      const y = margin + Math.random() * (100 - margin * 2);

      // 기존 폭탄들과 거리 체크
      let isValidPosition = true;
      for (const bomb of existingBombs) {
        const distance = Math.sqrt(
          Math.pow(x - bomb.x, 2) + Math.pow(y - bomb.y, 2),
        );
        if (distance < minDistance) {
          isValidPosition = false;
          break;
        }
      }

      if (isValidPosition) {
        return { x, y };
      }
    }

    // 최대 시도 횟수를 과하면 그냥 랜덤 위치 반환
    return {
      x: margin + Math.random() * (100 - margin * 2),
      y: margin + Math.random() * (100 - margin * 2),
    };
  };

  // 폭탄 생성
  const spawnBomb = () => {
    //  생 효과음
    playBombSpawnSound();

    setBombs((prevBombs) => {
      const position = getRandomPosition(prevBombs);
      const id = nextBombIdRef.current++; // 🔧 여기서만 id 증가

      // 일시정지 시간 제외된 현재 시간
      const adjustedNow =
        Date.now() - totalPausedTimeRef.current;

      const newBomb: Bomb = {
        id,
        x: position.x,
        y: position.y,
        createdAt: adjustedNow,
        isExploding: false,
        vx: (Math.random() - 0.5) * 1.2, // x 방향 속도 (더 르게)
        vy: (Math.random() - 0.5) * 1.2, // y 방향 속도 (더 빠르게)
        frameIndex: 0, // 프레임 인덱스 초기화
        lastFrameUpdateTime: adjustedNow, // 프레임 업데이트 시간도 adjustedNow로 초기화
      };

      return [...prevBombs, newBomb];
    });
  };

  // 폭탄 생성 효과음
  const playBombSpawnSound = () => {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // 팝업 사운드 (높은 음에서 낮은 음으로)
    const osc = audioContext.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      400,
      audioContext.currentTime + 0.1,
    );

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.15, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.1,
    );

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.1);

    // 정리
    setTimeout(() => {
      audioContext.close();
    }, 150);
  };

  // 폭탄 클릭 (잡기)
  const catchBomb = useCallback(
    (bombId: number, x: number, y: number, bomb: Bomb) => {
      // 🔥 이미 게임이 종료되었으면 무시
      if (isGameOverRef.current) return;

      playClickSound();
      // 현재 시간으로 정확한 scale 계산
      const currentTime = Date.now();
      const bombScale = getBombScale(bomb, currentTime);

      // 레벨별 점수 차등: 레벨 1은 10점, 레벨 2는 20점, 레벨 3은 30점
      const pointsPerCatch = currentDifficulty * 10;

      // 점수 업데이트 및 일일 목표점수 달성 체크
      setScore((prev) => {
        const newScore = prev + pointsPerCatch;

        // 일일 목표��수 시스템: 점수 추가 및 목표 달성 체크
        const currentTargetScore = getTargetScore();
        if (
          currentTargetScore !== null &&
          currentTargetScore > 0
        ) {
          const currentAccumulated =
            getAccumulatedScore() + newScore;

          // 목표점수 도달 시 즉시 게임 종료
          if (
            currentAccumulated >= currentTargetScore &&
            currentAccumulated <
              currentTargetScore + pointsPerCatch &&
            !isGameOverRef.current
          ) {
            isGameOverRef.current = true;

            // 점수 저장 및 목표 달성 처리
            saveGameRecord(
              "bombGame",
              newScore,
              currentDifficulty,
            );
            const { achieved } = addScore(newScore);
            setDailyAccumulatedScore(getAccumulatedScore());

            // achieved 체크 제거 - recordAchievement 내부에서 중복 방지 처리
            recordAchievement("bombGame");
            setShowGoalAchieved(true);

            // 즉시 게임 오버 상태로 전환
            setTimeout(() => {
              setGameState("gameOver");
            }, 100);

            return newScore;
          }
        }

        return newScore;
      });

      setBombsCaught((prev) => prev + 1); // 잡은 폭탄 개수 증가

      // 점수 텍스트 추가 (크기는 항상 1로 고정)
      const newScoreText: ScoreText = {
        id: Date.now(),
        x,
        y,
        value: pointsPerCatch,
        createdAt: Date.now(),
        scale: 1, // 항상 고정 크기
      };
      setScoreTexts((prev) => [...prev, newScoreText]);

      // 1.2초 후에 점수 텍스트 제거
      setTimeout(() => {
        setScoreTexts((prev) =>
          prev.filter((text) => text.id !== newScoreText.id),
        );
      }, 1200);

      // 폭탄 즉시 제거
      setBombs((prev) => prev.filter((b) => b.id !== bombId));
    },
    [currentDifficulty],
  );

  // 폭탄 폭발
  const explodeBomb = (bomb: Bomb) => {
    // 일시정지 상태면 실행 안 함
    if (isPausedRef.current) return;

    // 이미 폭발 중이면 무시
    if (bomb.isExploding) return;

    const scale = getBombScale(bomb);

    // 폭발 효과음 재생
    playExplosionSound();

    // 폭발 애니메이션 시작: 프레임을 60으로 설정 (폭발 효과 이미��)
    setBombs((prev) =>
      prev.map((b) =>
        b.id === bomb.id
          ? {
              ...b,
              isExploding: true,
              explosionStartTime: Date.now(),
              explosionBaseScale: getBombScale(b),
              frameIndex: 60, // 폭발 효과 이미지 표시
            }
          : b,
      ),
    );

    // 🔥 0.5초 후 하트 감소 (폭발 효과가 충분히 보인 후)
    setTimeout(() => {
      // 일시정지 상태면 실행 안 함
      if (isPausedRef.current) return;

      setHearts((prev) => {
        const newHearts = prev - 1;
        if (newHearts <= 0) {
          // 🔧 최신 score 값을 가져오기 위해 setScore 사용
          setScore((currentScore) => {
            // 이미 게임 오버 처리되었으면 중복 실행 방지
            if (isGameOverRef.current) {
              return currentScore;
            }

            isGameOverRef.current = true;
            saveGameRecord(
              "bombGame",
              currentScore,
              currentDifficulty,
            );

            // 측정 중이거나 목표점수가 0점일 때: 계속 측정
            const currentTargetScore = getTargetScore(); // 최신
            if (
              currentTargetScore === null ||
              currentTargetScore === 0
            ) {
              setMeasuredScore(currentScore);
              const newTarget =
                currentScore > 0 ? currentScore * 3 : 0;
              setDailyTargetScore(newTarget);
              setDailyAccumulatedScore(currentScore); // 🔥 측정 판 종료 시 누적 점수 즉시 저장
              setPreviousAccumulatedScore(currentScore); // 🔥 측정 판 종료 시 이전 누적 점수도 업데이트
              setShowGoalAchieved(false); // 측정 중일 때는 목표 달성 아님
              setGameState("gameOver");
            } else {
              // 🎯 게임 종료 시점에 점수 합산
              const { achieved, newAccumulated } =
                addScore(currentScore);
              setDailyAccumulatedScore(newAccumulated);

              // achieved 체크 제거 - recordAchievement 내부에서 중복 방지 처리
              if (achieved) {
                recordAchievement("bombGame");
                setShowGoalAchieved(true); // 목표 달성 표시
              } else {
                setShowGoalAchieved(false);
              }
              setGameState("gameOver");
            }

            return currentScore; // score 변경 없이 반환
          });
        }
        return newHearts;
      });
    }, 500);

    // 0.5초 후 폭탄 제거 + 하트 감소 텍스트 표시
    setTimeout(() => {
      // 일시지 상면 실행 안
      if (isPausedRef.current) return;

      // 하트 감소 텍스 가 (폭탄이 사라진 후)
      const newHeartText: HeartText = {
        id: Date.now(),
        x: bomb.x,
        y: bomb.y,
        createdAt: Date.now(),
        scale: 1, // 항상 고정 크기
      };
      setHeartTexts((prev) => [...prev, newHeartText]);

      // 1.2초 후에 하트 텍스트 제거
      setTimeout(() => {
        setHeartTexts((prev) =>
          prev.filter((text) => text.id !== newHeartText.id),
        );
      }, 1200);

      setBombs((prev) => prev.filter((b) => b.id !== bomb.id));
    }, 500);
  };

  // 폭발 효과음
  const playExplosionSound = () => {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // 낮은 주파수 폭음
    const osc1 = audioContext.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(
      150,
      audioContext.currentTime,
    );
    osc1.frequency.exponentialRampToValueAtTime(
      50,
      audioContext.currentTime + 0.5,
    );

    const gain1 = audioContext.createGain();
    gain1.gain.setValueAtTime(0.5, audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5,
    );

    osc1.connect(gain1);
    gain1.connect(audioContext.destination);

    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.5);

    // 화이트 노이즈 추가 (폭발 느낌)
    const bufferSize = audioContext.sampleRate * 0.3;
    const buffer = audioContext.createBuffer(
      1,
      bufferSize,
      audioContext.sampleRate,
    );
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseGain = audioContext.createGain();
    noiseGain.gain.setValueAtTime(
      0.3,
      audioContext.currentTime,
    );
    noiseGain.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.3,
    );

    noiseSource.connect(noiseGain);
    noiseGain.connect(audioContext.destination);

    noiseSource.start(audioContext.currentTime);

    // 정리
    setTimeout(() => {
      audioContext.close();
    }, 600);
  };

  // 카운트다운 로직
  useEffect(() => {
    if (gameState !== "countdown") return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // 카운트다운 종료 후 게임 시작
      setGameState("playing");
      cycleStartTimeRef.current = Date.now();
      lastBombTimeRef.current = Date.now();
    }
  }, [gameState, countdown]);

  // 게임 루프
  useEffect(() => {
    if (gameState !== "playing") return;

    const loopId = Math.random().toString(36).substring(7); // 🔥 고유 ID 생성
    console.log(`🚀 새 게임 루프 시작! ID: ${loopId}`);

    const gameLoop = () => {
      // 🔥 일시정지 중이면 아무것도 안 하고 다음 프레임만 요청
      if (isPausedRef.current) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const now = Date.now();
      const adjustedNow = now - totalPausedTimeRef.current;

      //  사이클 시작 또는 초기화
      if (
        cycleStartTimeRef.current === 0 ||
        spawnTimesRef.current.length === 0 ||
        nextSpawnIndexRef.current >= config.bombsPerCycle
      ) {
        // 새 사이클 시작
        cycleStartTimeRef.current = adjustedNow;
        spawnTimesRef.current = generateSpawnTimes(
          config.cycleDuration,
          config.bombsPerCycle,
        );
        nextSpawnIndexRef.current = 0;
      }

      // 현재 사이클 내 경과 시간
      const cycleElapsed =
        adjustedNow - cycleStartTimeRef.current;

      // 다음 폭탄 생성 시간 체
      if (
        nextSpawnIndexRef.current < spawnTimesRef.current.length
      ) {
        const nextSpawnTime =
          spawnTimesRef.current[nextSpawnIndexRef.current];
        if (cycleElapsed >= nextSpawnTime) {
          spawnBomb();
          nextSpawnIndexRef.current++;
        }
      }

      // 폭탄 수명 체크 (일시정지 시간 제외)
      setBombs((currentBombs) => {
        const bombsToExplode: Bomb[] = [];

        // 폭탄 위치 업데이트 및 수명 체크 및 프레임 업데이트
        const updatedBombs = currentBombs.map((bomb) => {
          let updatedBomb = { ...bomb };

          // 프레임 업데이트 (총 64프레임을 12 FPS로 재생: 약 83ms다) - 일시정지 시간 제외
          const frameDuration = 83; // ms (1000ms / 12 fps)
          const timeSinceLastFrame =
            adjustedNow - bomb.lastFrameUpdateTime;

          if (timeSinceLastFrame >= frameDuration) {
            if (bomb.isExploding) {
              // 폭발 중: 프레임 60에서 폭발 효과 표시 (프레임 61로 가면 폭발 효과)
              if (bomb.frameIndex <= 61) {
                updatedBomb.frameIndex = bomb.frameIndex + 1;
                updatedBomb.lastFrameUpdateTime = adjustedNow;
              }
            } else {
              // 일반 폭탄: 프레임 0~59를 반복
              updatedBomb.frameIndex =
                (bomb.frameIndex + 1) % 60;
              updatedBomb.lastFrameUpdateTime = adjustedNow;
            }
          }

          // 폭발 중이면 위치 업데이트 안 함
          if (bomb.isExploding) return updatedBomb;

          // 쉬움(난이도 1)일 때는 폭탄이 움직이지 않음
          if (currentDifficulty === 1) {
            // 수명 체크만 수행
            if (adjustedNow - bomb.createdAt >= BOMB_LIFETIME) {
              bombsToExplode.push(updatedBomb);
            }
            return updatedBomb;
          }

          // 보통, 어려움일 때만 폭탄 움직임
          // 새 위치 계산
          let newX = updatedBomb.x + updatedBomb.vx;
          let newY = updatedBomb.y + updatedBomb.vy;
          let newVx = updatedBomb.vx;
          let newVy = updatedBomb.vy;

          // 벽에 부딪히면 튕김 (10% 여백 고려)
          const margin = 10;
          if (newX <= margin || newX >= 100 - margin) {
            newVx = -newVx; // x 방향 반전
            newX = newX <= margin ? margin : 100 - margin; // 경계 내로 제한
          }

          if (newY <= margin || newY >= 100 - margin) {
            newVy = -newVy; // y 방향 반전
            newY = newY <= margin ? margin : 100 - margin; // 경계 내로 제한
          }

          // 수명 체크
          if (adjustedNow - bomb.createdAt >= BOMB_LIFETIME) {
            bombsToExplode.push({
              ...updatedBomb,
              x: newX,
              y: newY,
              vx: newVx,
              vy: newVy,
            });
          }

          return {
            ...updatedBomb,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
          };
        });

        // 터져야 할 폭탄들을 폭발시킴
        bombsToExplode.forEach((bomb) => explodeBomb(bomb));

        return updatedBombs;
      });

      setRenderTime(now);

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState]); // 🔥 의존성을 gameState만으로 변경!

  // 컴포넌트 마운트 시 추천 벨 계산 + 기회 불러오기
  useEffect(() => {
    const records = getGameRecord("bombGame");
    const scores = [
      records.level1 || 0,
      records.level2 || 0,
      records.level3 || 0,
    ];

    // 가장 낮은 점수를 가진 레벨 찾기
    const minScore = Math.min(...scores);
    const recommendedIdx = scores.findIndex(
      (score) => score === minScore,
    );
    setRecommendedLevel(recommendedIdx + 1);

    // 전역 에너지 불러오기
    setEnergy(getEnergy());

    // 일일 목표점수 설정
    setDailyTargetScore(getTargetScore());
    setDailyAccumulatedScore(getAccumulatedScore());
    setPreviousAccumulatedScore(getAccumulatedScore()); // 게임 시작 전 누적 점수 저장
  }, []);

  // 게임 오버 시 누적 점수 애니메이션
  useEffect(() => {
    if (gameState === "gameOver") {
      // 애니메이션 시작: previousAccumulatedScore에서 dailyAccumulatedScore까지
      setAnimatedAccumulatedScore(previousAccumulatedScore);

      const duration = 1000; // 1초 동안 애니메이션
      const startTime = Date.now();
      const startScore = previousAccumulatedScore;
      const endScore = dailyAccumulatedScore;
      const diff = endScore - startScore;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // easeOutQuad 이징 함수
        const easedProgress =
          1 - (1 - progress) * (1 - progress);
        const currentScore = Math.round(
          startScore + diff * easedProgress,
        );

        setAnimatedAccumulatedScore(currentScore);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [
    gameState,
    previousAccumulatedScore,
    dailyAccumulatedScore,
  ]);

  // 개발자 모드: 'q' 키로 게임 즉시 종료 (점수 0, 하트 0), 'w' 키로 게임 즉시 종료 (점수 30, 하트 0)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const isDevMode =
        localStorage.getItem("devMode") === "true";
      if (isDevMode && gameState === "playing") {
        if (e.key === "q" || e.key === "Q") {
          // 즉시 게임 종료 (점수 0, 하트 0)
          setScore(0);
          setHearts(0);
          setGameState("gameOver");
          setShowGoalAchieved(false);
        } else if (e.key === "w" || e.key === "W") {
          // 즉시 게임 종료 (점수 30, 하트 0) - 실제 30점 획득으로 처리
          const finalScore = 30;
          setScore(finalScore);

          // 게임 기록 저장
          saveGameRecord(
            "bombGame",
            finalScore,
            currentDifficulty,
          );

          // 측정 중이거나 목표점수가 0점일 때: 측정값 설정 및 목표점수 설정
          const currentTargetScore = getTargetScore();
          if (
            currentTargetScore === null ||
            currentTargetScore === 0
          ) {
            setMeasuredScore(finalScore);
            const newTarget = finalScore * 3; // 30 * 3 = 90
            setDailyTargetScore(newTarget);
            setDailyAccumulatedScore(finalScore); // 누적점수 30점
            setShowGoalAchieved(false);
          } else {
            // 목표점수가 설정되어 있으면 누적 점수에 추가
            const newAccumulatedScore =
              getAccumulatedScore() + finalScore;
            setDailyAccumulatedScore(newAccumulatedScore);

            // 목표 달성 여부 확인
            if (newAccumulatedScore >= currentTargetScore) {
              recordAchievement("bombGame");
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

    window.addEventListener("keydown", handleKeyPress);
    return () =>
      window.removeEventListener("keydown", handleKeyPress);
  }, [gameState, currentDifficulty]);

  // 재시작
  const restart = () => {
    playSelectSound();
    setGameState("playing");
    setCurrentDifficulty(selectedLevel); // 원래 난이도로 리셋
    setScore(0);
    setHearts(3);
    setBombs([]);
    setBombsCaught(0); // 잡은 폭탄 개수 초기화
    nextBombIdRef.current = 0; // ID 리셋
    lastBombTimeRef.current = Date.now();
    setGameResetKey((prev) => prev + 1); // 게임 리셋 키 업데이트
    totalPausedTimeRef.current = 0; // 일시정지 시간 초기화
    pauseStartTimeRef.current = 0; // 일시정지 시작 시간 초기화
    setPauseCount(0); // 일시정지 카운터 초기화
    isGameOverRef.current = false; // 게임 종료 상태 초기화
    setShowGoalAchieved(false); // 목표 달성 팝업 초기화
    isPausedRef.current = false; // 일시정지 상태 초기화
    setPreviousAccumulatedScore(getAccumulatedScore()); // 🔥 게임 시작 전 누적 점수 저장

    // 사이클 초기화
    cycleStartTimeRef.current = 0;
    spawnTimesRef.current = [];
    nextSpawnIndexRef.current = 0;
  };

  // 폭탄의 남은 시간 계산 (0-1 사이의 비율) - 일시정지 시 제외
  const getBombTimeRatio = (bomb: Bomb): number => {
    const elapsed =
      renderTime - totalPausedTimeRef.current - bomb.createdAt;
    return Math.min(elapsed / BOMB_LIFETIME, 1);
  };

  // 폭탄 크기 계산 (마지막 1초는 줄어드는 효과) - 일시정지 시간 제외
  const getBombScale = (
    bomb: Bomb,
    currentTime?: number,
  ): number => {
    const now =
      currentTime !== undefined ? currentTime : renderTime;
    const elapsed =
      now - totalPausedTimeRef.current - bomb.createdAt;
    const growStartTime = 500; // 0.5초부터 커지기 시작
    const shrinkStartTime = 3000; // 3초부터 줄어들기 시작

    let scale;
    if (elapsed < growStartTime) {
      // 0~0.5초: 0.8배 유지
      scale = 0.8;
    } else if (elapsed < shrinkStartTime) {
      // 0.5~3초: 0.8배에서 1.3배로 커짐
      const growDuration = shrinkStartTime - growStartTime; // 2500ms
      const ratio = (elapsed - growStartTime) / growDuration;
      scale = 0.8 + ratio * 0.5; // 0.8 -> 1.3
    } else {
      // 3~5초: 1.3배에서 0.8배로 줄어듦
      const shrinkRatio = (elapsed - shrinkStartTime) / 2000;
      scale = 1.3 - shrinkRatio * 0.5; // 1.3 -> 0.8
    }

    // iOS 떨림 방지: 0.01 단위로 스냅 (부드러움과 성능의 균형)
    return Math.round(scale * 100) / 100;
  };

  // 폭발 애니메이션 scale 계산 (폭탄의 원래 크기에서 커졌다가 작아짐)
  const getExplosionScale = (bomb: Bomb): number => {
    if (!bomb.explosionBaseScale || !bomb.explosionStartTime)
      return 1;

    // 폭발 애니메이션은 0.5초 동안 진행 (일시정지 시간 제외)
    const adjustedRenderTime =
      renderTime - totalPausedTimeRef.current;
    const elapsed =
      adjustedRenderTime - bomb.explosionStartTime;
    const explosionDuration = 500; // 0.5초
    const ratio = Math.min(elapsed / explosionDuration, 1);

    let scale;
    // 0~0.25초: 원래 크기에서 1.3배로 빠르게 커짐
    // 0.25~0.5초: 1.3배에서 0으로 빠르게 작아짐
    if (ratio < 0.5) {
      // 커지는 단계 (0~0.25초)
      const growRatio = ratio / 0.5;
      scale = bomb.explosionBaseScale * (1 + growRatio * 0.3);
    } else {
      // 작아지는 단계 (0.25~0.5초)
      const shrinkRatio = (ratio - 0.5) / 0.5;
      scale =
        bomb.explosionBaseScale * (1.3 - shrinkRatio * 1.3);
    }

    // iOS 떨림 방지: 0.01 단위로 스냅 (부드러움과 성능의 균형)
    return Math.round(scale * 100) / 100;
  };

  // 폭발 애니메이션 투명도 계산
  const getExplosionOpacity = (bomb: Bomb): number => {
    if (!bomb.explosionStartTime) return 1;

    // 일시정지 시간 제외
    const adjustedRenderTime =
      renderTime - totalPausedTimeRef.current;
    const elapsed =
      adjustedRenderTime - bomb.explosionStartTime;
    const explosionDuration = 500; // 0.5초
    const ratio = Math.min(elapsed / explosionDuration, 1);

    // 0~0.5초: 처음부터 끝까지 점점 투명해짐
    return 1 - ratio;
  };

  return (
    <div className="h-screen overflow-hidden bg-amber-50 p-4 pb-[env(safe-area-inset-bottom)] flex flex-col pt-[max(env(safe-area-inset-top),3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          {/* Ready 상태일 때만 뒤로가 버튼 */}
          {gameState === "ready" && (
            <button
              onClick={() => {
                playBackSound();
                onBack();
              }}
              className="bg-transparent hover:bg-transparent border-none p-2 cursor-pointer"
            >
              <ImageWithFallback
                src={exitIcon}
                alt="exit"
                style={{
                  width: "2rem",
                  height: "2rem",
                  objectFit: "contain",
                }}
              />
            </button>
          )}

          {gameState === "ready" && (
            <div className="flex items-center gap-2">
              <h1
                className="text-gray-700 ml-4 text-4xl"
                style={{
                  fontFamily: "OngleipRyudung",
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => {
                  setDevClickCount((prev) => {
                    const newCount = prev + 1;

                    // 타이머 초기화
                    if (devClickTimerRef.current) {
                      clearTimeout(devClickTimerRef.current);
                    }

                    // 2초 후 카운트 리셋
                    devClickTimerRef.current = setTimeout(
                      () => {
                        setDevClickCount(0);
                      },
                      2000,
                    );

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
                폭탄 게임{devMode && " 🔧"}
              </h1>
              {devMode && (
                <>
                  <button
                    onClick={() => {
                      localStorage.removeItem(
                        "bombGame_dailyGoal",
                      );
                      const newTarget = getTargetScore(); // localStorage 제거 후 다시 확인
                      setDailyTargetScore(newTarget);
                      setDailyAccumulatedScore(0); // 누적 점수도 0으로 초기화
                      playClickSound();
                      alert(
                        "목표점수 데이터가 초기화되었습니다!",
                      );
                    }}
                    className="text-xl px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    style={{ fontFamily: "OngleipRyudung" }}
                  >
                    목표점수 초기화
                  </button>
                  <button
                    onClick={() => {
                      const dailyGoalData =
                        localStorage.getItem(
                          "bombGame_dailyGoal",
                        );
                      if (dailyGoalData) {
                        const data = JSON.parse(dailyGoalData);
                        data.accumulatedScore = 0;
                        data.achieved = false; // 🔥 달성 플래그도 초기화
                        localStorage.setItem(
                          "bombGame_dailyGoal",
                          JSON.stringify(data),
                        );
                        setDailyAccumulatedScore(0); // 🔥 state 업데이트
                        playClickSound();
                        alert("누적 점수가 초기화되었습니다!");
                      }
                    }}
                    className="text-xl px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                    style={{ fontFamily: "OngleipRyudung" }}
                  >
                    누적 점수 초기화
                  </button>
                </>
              )}
            </div>
          )}

          {/* Playing/Countdown 상태일 때 왼쪽에 일시정지 버튼 */}
          {(gameState === "playing" ||
            gameState === "gameOver" ||
            gameState === "countdown") &&
            !isPaused && (
              <button
                onClick={() => {
                  // 카운트다운 중에는 일시정지 불가
                  if (gameState === "countdown") return;

                  playClickSound();

                  // 🔥 즉시 ref 업데이트 (게임 루프를 즉시 멈춤)
                  isPausedRef.current = true;

                  setIsPaused(true);
                  pauseStartTimeRef.current = Date.now();
                }}
                className="bg-transparent hover:bg-transparent border-none p-2 cursor-pointer"
                style={{
                  cursor:
                    gameState === "countdown"
                      ? "default"
                      : "pointer",
                  opacity: gameState === "countdown" ? 0.5 : 1,
                }}
              >
                <ImageWithFallback
                  src={pauseIcon}
                  alt="pause"
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    objectFit: "contain",
                  }}
                />
              </button>
            )}

          {gameState === "playing" && isPaused && (
            <div className="w-12" />
          )}

          {gameState === "gameOver" && <div className="w-12" />}

          {gameState === "countdown" && (
            <div className="w-12" />
          )}
        </div>

        {/* Playing/Countdown 상태일 때만 하트와 점수 표시 */}
        {(gameState === "playing" ||
          gameState === "gameOver" ||
          gameState === "countdown") && (
          <>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <Heart
                    key={i}
                    style={{
                      width: "1.75rem",
                      height: "1.75rem",
                      fill: i < hearts ? "#cd6c58" : "#d1d5db",
                      color: i < hearts ? "#cd6c58" : "#d1d5db",
                    }}
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
            여기저기 나타나는 폭탄을 잡으세요!
            <br />
            시간이 지나면 폭탄이 터지고 하트를 잃습니다.
          </p>
          <p
            className="text-2xl text-center mb-1 mt-6"
            style={{ color: "#4e7557" }}
          >
            일일 목표점수:{" "}
            {dailyTargetScore === null || dailyTargetScore === 0
              ? "측정중..."
              : `${dailyTargetScore}점`}
          </p>
          <p
            className="text-2xl text-center mb-4"
            style={{ color: "#4e7557" }}
          >
            일일 누적점수: {dailyAccumulatedScore}점
          </p>
        </>
      )}

      {/* Ready Screen - 레벨 선택 */}
      {gameState === "ready" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="relative flex flex-col items-center justify-center">
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <LevelButton
                level={1}
                levelName="멈춤"
                isRecommended={recommendedLevel === 1}
                buttonBgImage={levelButtonBg}
                devMode={devMode}
                color="#4e7557"
                disabled={!hasEnergy()}
                onClick={() => {
                  // 개발자 모드일 때는 기회 ��크 스킵
                  if (devMode) {
                    playSelectSound();
                    setSelectedLevel(1);
                    startGame();
                    return;
                  }

                  // 에너지 체크 및 차감
                  if (!devMode && !hasEnergy()) {
                    setShowNoEnergyAlert(true);
                    setTimeout(
                      () => setShowNoEnergyAlert(false),
                      2000,
                    );
                    return;
                  }

                  // 에너지 차감
                  if (devMode || useEnergy()) {
                    recordGamePlayed("bombGame");
                    setEnergy(getEnergy());
                    playSelectSound();
                    setSelectedLevel(1);
                    startGame();
                  }
                }}
              />

              <LevelButton
                level={2}
                levelName="움직임"
                isRecommended={recommendedLevel === 2}
                buttonBgImage={levelButtonBg}
                devMode={devMode}
                color="#4e7557"
                disabled={!hasEnergy()}
                onClick={() => {
                  // 개발자 모드일 때는 기회 체크 스킵
                  if (devMode) {
                    playSelectSound();
                    setSelectedLevel(2);
                    startGame(2);
                    return;
                  }

                  // 에너지 체크 및 차감
                  if (!devMode && !hasEnergy()) {
                    setShowNoEnergyAlert(true);
                    setTimeout(
                      () => setShowNoEnergyAlert(false),
                      2000,
                    );
                    return;
                  }

                  // 에너지 차감
                  if (devMode || useEnergy()) {
                    recordGamePlayed("bombGame");
                    setEnergy(getEnergy());
                    playSelectSound();
                    setSelectedLevel(2);
                    startGame(2);
                  }
                }}
              />

              <LevelButton
                level={3}
                levelName="움직임+빠른 생성"
                isRecommended={recommendedLevel === 3}
                buttonBgImage={levelButtonBg}
                devMode={devMode}
                color="#4e7557"
                disabled={!hasEnergy()}
                onClick={() => {
                  // 개발자 모드일 때는 기회 체크 스킵
                  if (devMode) {
                    playSelectSound();
                    setSelectedLevel(3);
                    startGame(3);
                    return;
                  }

                  // 에너지 체크 및 차감
                  if (!devMode && !hasEnergy()) {
                    setShowNoEnergyAlert(true);
                    setTimeout(
                      () => setShowNoEnergyAlert(false),
                      2000,
                    );
                    return;
                  }

                  // 에너지 차감
                  if (devMode || useEnergy()) {
                    recordGamePlayed("bombGame");
                    setEnergy(getEnergy());
                    playSelectSound();
                    setSelectedLevel(3);
                    startGame(3);
                  }
                }}
              />
            </div>

            <p className="text-2xl text-gray-700 mt-4">
              난이도를 선택하세요
            </p>

            <GameRulesButton
              onClick={() => {
                playClickSound();
                setShowRules(true);
              }}
              backgroundColor="#4e7557"
              textColor="#ffffff"
            />
          </div>
        </div>
      )}

      {/* Countdown Screen */}
      {gameState === "countdown" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="text-9xl"
              style={{
                fontFamily: "OngleipRyudung",
                color: "#4e7557",
              }}
            >
              {countdown}
            </div>
          </div>
        </div>
      )}

      {/* Game Screen */}
      {(gameState === "playing" ||
        gameState === "gameOver") && (
        <div className="flex-1 flex flex-col relative">
          {/* 게임 안내 텍스트 */}
          <div
            className="text-center mb-3 flex-col justify-center flex-shrink-0"
            style={{ height: "5rem" }}
          >
            <div
              style={{ height: "2rem" }}
              className="flex items-center justify-center"
            >
              <p className="text-gray-700 text-3xl">
                폭탄을 잡으세요!
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {dailyTargetScore !== null &&
              dailyTargetScore > 0 &&
              dailyAccumulatedScore >= dailyTargetScore ? (
                <div
                  className="text-2xl"
                  style={{ color: "#4e7557" }}
                >
                  일일 목표점수 도달 완료!
                </div>
              ) : (
                <>
                  <div className="text-gray-700 text-2xl">
                    일일 목표점수
                  </div>
                  <div className="text-gray-700 text-2xl">
                    {dailyTargetScore === null ||
                    dailyTargetScore === 0
                      ? "측정중..."
                      : `${previousAccumulatedScore + score}/${dailyTargetScore}점`}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            {bombs.map((bomb) => {
              const timeRatio = getBombTimeRatio(bomb);
              // 탄 크기: 시간이 지날수록 0.6배에서 1.5배로 커짐
              const scale = bomb.isExploding
                ? getExplosionScale(bomb)
                : getBombScale(bomb);

              // 폭탄이 생성된 지 300ms 이내일 때만 애니메이션 적용 (일시정지 시간 고려)
              const bombAge =
                renderTime -
                totalPausedTimeRef.current -
                bomb.createdAt;
              const shouldAnimate = bombAge < 300;

              // 이미지 경로 확정
              // frameIndex가 58�� 넘으면 폭발 효과 이미지 사용
              const bombImageSrc =
                bomb.frameIndex > 58
                  ? explosionEffect
                  : FRAME_SEQUENCE[bomb.frameIndex];

              return (
                <div
                  key={`bomb-${bomb.id}-${bomb.createdAt}`}
                  className="absolute"
                  style={{
                    left: `${bomb.x}%`,
                    top: `${bomb.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: "5rem",
                    height: "5rem",
                    transition: bomb.isExploding
                      ? "transform 0.5s ease-out"
                      : "none",
                  }}
                >
                  {!bomb.isExploding ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPaused) {
                          catchBomb(
                            bomb.id,
                            bomb.x,
                            bomb.y,
                            bomb,
                          );
                        }
                      }}
                      disabled={isPaused}
                      className="relative cursor-pointer hover:scale-110 transition-transform"
                      style={{
                        width: "100%",
                        height: "100%",
                        transform: `scale(${scale})`,
                        animation: shouldAnimate
                          ? "bombPopIn 0.3s ease-out"
                          : "none",
                      }}
                    >
                      <style>{`
                        @keyframes bombPopIn {
                          0% { 
                            transform: scale(0.3);
                            opacity: 0.5;
                          }
                          50% {
                            transform: scale(${scale * 1.15});
                          }
                          100% { 
                            transform: scale(${scale});
                            opacity: 1;
                          }
                        }
                      `}</style>
                      <ImageWithFallback
                        key={`bomb-${bomb.id}-${bomb.createdAt}`}
                        src={`${bombImageSrc}?t=${bomb.createdAt}`}
                        alt="bomb"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          pointerEvents: "none",
                          imageRendering:
                            "-webkit-optimize-contrast",
                        }}
                      />

                      {/* 점수 텍스트 */}
                      {bomb.showScoreText &&
                        bomb.scoreValue && (
                          <div
                            className="absolute pointer-events-none z-30 flex items-center gap-1"
                            style={{
                              left: "50%",
                              bottom: "100%",
                              transform: "translateX(-50%)",
                              animation:
                                "floatUp 1.2s ease-out forwards",
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
                            <span
                              style={{
                                fontSize: "48px",
                                fontWeight: "bold",
                                color: "#4e7557",
                                textShadow:
                                  "2px 2px 4px rgba(0,0,0,0.3)",
                              }}
                            >
                              +{bomb.scoreValue}
                            </span>
                            <ImageWithFallback
                              src={bombScoreIcon}
                              alt="score"
                              className="w-10 h-10 object-contain"
                            />
                          </div>
                        )}
                    </button>
                  ) : (
                    <div
                      className="pointer-events-none"
                      style={{
                        transform: `scale(${scale})`,
                        opacity: getExplosionOpacity(bomb),
                      }}
                    >
                      <ImageWithFallback
                        key={`explosion-${bomb.id}-${bomb.explosionStartTime}`}
                        src={`${bombImageSrc}?t=${bomb.explosionStartTime}`}
                        alt="explosion"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          imageRendering:
                            "-webkit-optimize-contrast",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* 점수 텍스트 표시 */}
            {scoreTexts.map((text) => {
              // 화면 끝에서 잘리지 않도록 위치 조정
              const isLeftEdge = text.x < 20;
              const isRightEdge = text.x > 80;
              const isTopEdge = text.y < 20;
              const isBottomEdge = text.y > 80;

              // X축 변환: 왼쪽 끝이면 오른쪽으로, 오른쪽 끝이면 왼쪽으로, 중간이면 가운데 정렬
              const translateX = isRightEdge
                ? "-100%"
                : isLeftEdge
                  ? "0%"
                  : "-50%";
              // Y축 변환: 위쪽 끝이면 아래로, 아래쪽 끝이면 위로, 중간이면 가운데 정렬
              const translateY = isBottomEdge
                ? "-100%"
                : isTopEdge
                  ? "0%"
                  : "-50%";

              return (
                <div
                  key={text.id}
                  className="absolute pointer-events-none z-30 flex items-center gap-1"
                  style={{
                    left: `${text.x}%`,
                    top: `${text.y}%`,
                    transform: `translate(${translateX}, ${translateY}) scale(${text.scale})`,
                    animation: "floatUp 1.2s ease-out forwards",
                  }}
                >
                  <style>{`
                  @keyframes floatUp {
                    0% { 
                      transform: translate(${translateX}, ${translateY}) scale(${text.scale}) translateY(0px); 
                      opacity: 1; 
                    }
                    100% { 
                      transform: translate(${translateX}, ${translateY}) scale(${text.scale}) translateY(-40px); 
                      opacity: 0; 
                    }
                  }
                `}</style>
                  <ImageWithFallback
                    src={bombScoreIcon}
                    alt="score"
                    className="w-10 h-10 object-contain"
                  />
                  <span
                    style={{
                      fontSize: "48px",
                      fontWeight: "bold",
                      color: "#4e7557",
                      textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    +{text.value}
                  </span>
                </div>
              );
            })}

            {/* 하트 감소 텍스트 표시 */}
            {heartTexts.map((text) => {
              // 화면 끝에서 잘리지 않도록 위치 조정
              const isLeftEdge = text.x < 20;
              const isRightEdge = text.x > 80;
              const isTopEdge = text.y < 20;
              const isBottomEdge = text.y > 80;

              // X축 변환: 왼쪽 끝이면 오른쪽으로, 오른쪽 끝이면 왼쪽으로, 중간이면 가운 정렬
              const translateX = isRightEdge
                ? "-100%"
                : isLeftEdge
                  ? "0%"
                  : "-50%";
              // Y축 변환: 위쪽 끝이면 아래로, 아래쪽 끝이면 위로, 중간이면 가운데 정렬
              const translateY = isBottomEdge
                ? "-100%"
                : isTopEdge
                  ? "0%"
                  : "-50%";

              return (
                <div
                  key={text.id}
                  className="absolute pointer-events-none z-30 flex items-center gap-1"
                  style={{
                    left: `${text.x}%`,
                    top: `${text.y}%`,
                    transform: `translate(${translateX}, ${translateY}) scale(${text.scale})`,
                    animation:
                      "floatUpHeart 1.2s ease-out forwards",
                  }}
                >
                  <style>{`
                  @keyframes floatUpHeart {
                    0% { 
                      transform: translate(${translateX}, ${translateY}) scale(${text.scale}) translateY(0px); 
                      opacity: 1; 
                    }
                    100% { 
                      transform: translate(${translateX}, ${translateY}) scale(${text.scale}) translateY(-40px); 
                      opacity: 0; 
                    }
                  }
                `}</style>
                  <Heart
                    className="w-10 h-10"
                    style={{
                      fill: "#4e7557",
                      color: "#4e7557",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "48px",
                      fontWeight: "bold",
                      color: "#4e7557",
                      textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    -1
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pause Menu Overlay */}
          {isPaused && !showGoalAchieved && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
              <div
                className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat animate-in zoom-in-95 duration-200"
                style={{
                  backgroundImage: `url(${pauseMenuBg})`,
                }}
              >
                <h2
                  className="text-center mb-8 mt-4 text-4xl"
                  style={{ color: "#eae4d3" }}
                >
                  일시정지
                </h2>

                <div className="space-y-0">
                  <button
                    onClick={() => {
                      playClickSound();
                      totalPausedTimeRef.current =
                        totalPausedTimeRef.current +
                        (Date.now() -
                          pauseStartTimeRef.current);
                      setPauseCount((prev) => prev + 1); // 일시정지 카운터 증가
                      isPausedRef.current = false; // 🔥 즉시 ref 업데이트
                      setIsPaused(false);
                    }}
                    className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
                  >
                    <ImageWithFallback
                      src={resumeIcon}
                      alt="resume"
                      className="h-12 w-12 object-contain"
                    />
                    <span
                      className="text-3xl"
                      style={{ color: "#eae4d3" }}
                    >
                      이어서
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      playSelectSound();
                      setIsPaused(false);
                      restart();
                    }}
                    className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
                  >
                    <ImageWithFallback
                      src={restartIcon}
                      alt="restart"
                      className="h-12 w-12 object-contain"
                    />
                    <span
                      className="text-3xl"
                      style={{ color: "#eae4d3" }}
                    >
                      처음부터
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      playBackSound();
                      setIsPaused(false);
                      onBack();
                    }}
                    className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
                  >
                    <ImageWithFallback
                      src={pauseExitIcon}
                      alt="exit"
                      className="h-12 w-12 object-contain"
                    />
                    <span
                      className="text-3xl"
                      style={{ color: "#eae4d3" }}
                    >
                      나가기
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === "gameOver" && (
        <>
          {/* 모달 */}
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div
              className="p-8 max-w-md w-full mx-4 bg-contain bg-center bg-no-repeat animate-in zoom-in-95 duration-200"
              style={{ backgroundImage: `url(${pauseMenuBg})` }}
            >
              {showGoalAchieved ? (
                // 목표 달성 시
                <>
                  <h2
                    className="text-center mb-4 mt-4 text-4xl"
                    style={{ color: "#eae4d3" }}
                  >
                    목표 달성!
                  </h2>
                  <div
                    className="text-center mb-2 text-2xl"
                    style={{ color: "#d4c5a0" }}
                  >
                    일일 목표점수: {dailyTargetScore}점
                  </div>
                  <div
                    className="text-center mb-6 text-2xl"
                    style={{ color: "#eae4d3" }}
                  >
                    일일 누적 점수: {animatedAccumulatedScore}점
                  </div>
                </>
              ) : (
                // 목표 미달성 시
                <>
                  <h2
                    className="text-center mb-2 mt-4 text-4xl"
                    style={{ color: "#eae4d3" }}
                  >
                    게임 종료!
                  </h2>
                  <div
                    className="text-center mb-2 text-2xl"
                    style={{ color: "#d4c5a0" }}
                  >
                    일일 목표점수:{" "}
                    {dailyTargetScore === null ||
                    dailyTargetScore === 0
                      ? "측정중..."
                      : `${dailyTargetScore}점`}
                  </div>
                  <div
                    className="text-center mb-6 text-2xl"
                    style={{ color: "#eae4d3" }}
                  >
                    일일 누적 점수: {animatedAccumulatedScore}점
                  </div>
                </>
              )}

              <div className="space-y-0">
                <button
                  onClick={restart}
                  className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
                >
                  <ImageWithFallback
                    src={restartIcon}
                    alt="restart"
                    className="h-12 w-12 object-contain flex-shrink-0"
                  />
                  <span
                    className="text-3xl whitespace-nowrap"
                    style={{ color: "#eae4d3" }}
                  >
                    처음부터
                  </span>
                </button>

                <button
                  onClick={() => {
                    playBackSound();
                    onBack();
                  }}
                  className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
                >
                  <ImageWithFallback
                    src={pauseExitIcon}
                    alt="exit"
                    className="h-12 w-12 object-contain flex-shrink-0"
                  />
                  <span
                    className="text-3xl whitespace-nowrap"
                    style={{ color: "#eae4d3" }}
                  >
                    나가기
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 게임 설명 모달 */}
      <GameRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        title="폭탄 게임 설명"
        primaryColor="#4e7557"
        backgroundColor="#d4e9d8"
        scrollbarColor="#4e7557"
        scrollbarTrackColor="#d4e9d8"
        onCloseSound={playClickSound}
      >
        <RuleSection title="게임 방법" titleColor="#4e7557">
          <RuleList
            items={[
              "화면 곳곳 랜덤하게 나타나는 폭탄을 선택해서 잡으세요!",
              "시간이 지나 폭탄이 터면 하트가 1개 줄어듭니다",
              "하트가 모두 사라지면 게임이 종료됩니다",
            ]}
          />
        </RuleSection>

        <RuleSection title="점수" titleColor="#4e7557">
          <RuleList
            items={[
              <>
                <strong>쉬움</strong>: 폭탄당 10점
              </>,
              <>
                <strong>보통</strong>: 폭탄당 20점
              </>,
              <>
                <strong>어려움</strong>: 폭탄당 30점
              </>,
            ]}
          />
        </RuleSection>
      </GameRulesModal>

      {/* 기회 없음 알림 모달 */}
      {showNoEnergyAlert && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 animate-in fade-in duration-200"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div
            className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat animate-in zoom-in-95 duration-200"
            style={{ backgroundImage: `url(${pauseMenuBg})` }}
          >
            <h2
              className="text-center mb-6 mt-4 text-3xl"
              style={{ color: "#eae4d3" }}
            >
              에너지가
              <br />
              부족합니다
            </h2>
            <div
              className="text-center mb-8 text-2xl"
              style={{ color: "#d4c5a0" }}
            >
              내일 자정에 초기화됩니다
            </div>

            <button
              onClick={() => {
                playClickSound();
                setShowNoEnergyAlert(false);
              }}
              className="w-full bg-transparent hover:opacity-80 py-3 px-6 transition-opacity"
            >
              <span
                className="text-3xl"
                style={{ color: "#eae4d3" }}
              >
                확인
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}