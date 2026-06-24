import {
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Heart } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Button } from "../ui/button";
import { GameRulesButton } from "../GameRulesButton";
import {
  GameRulesModal,
  RuleSection,
  RuleList,
} from "../GameRulesModal";
import { Settings } from "../Settings";
import {
  playSelectSound,
  playBackSound,
  playClickSound,
  getSoundEnabled,
} from "../../utils/sound";
import {
  playColorVoice,
  preloadVoiceFiles,
} from "../../utils/colorVoice";
import {
  saveGameRecord,
  getGameRecord,
  recordAchievement,
} from "../../utils/gameRecord";
import {
  getEnergy,
  useEnergy,
  hasEnergy,
} from "../../utils/globalEnergy";
import {
  getTargetScore,
  setMeasuredScore,
  getAccumulatedScore,
  addScore,
  isAchieved,
} from "../../utils/bubbleShooterDailyGoal";
import { LevelButton } from "./LevelButton";
import exitIcon from "figma:asset/74b1288f91a03a19fc199ba8e3ce487eebb3c1fb.png";
import pauseIcon from "figma:asset/8acb1e015c5c90586e07679819984941b38f74af.png";
import resumeIcon from "figma:asset/62327073bfb38b1feb704b5c6f1eb2a36789eee8.png";
import restartIcon from "figma:asset/d1a45328f3c2f5290d250ff17f71584c907a61a7.png";
import pauseMenuBg from "figma:asset/54f8a82ff3f9348da47c92cd7e8e9b17adc71522.png";
import pauseExitIcon from "figma:asset/7b6920cff9236248c28a92364a77c6df5be27012.png";
import settingsIcon from "figma:asset/f50441ac52c2a907e8c436ef7897926c378fa505.png";
import levelButtonBg from "figma:asset/c40d55ea1f04b7d786be1a07004ba9eb2d39490d.png";
import replayButtonBg from "figma:asset/76896cc73d11fff23bc0ef71e56e9001acc1b9ee.png";
import blackBubbleImg from "figma:asset/43d7d4a1c79aed2a483f18c82746e8d120bba98c.png";
import rainbowBubbleImg from "figma:asset/9a4571f52c2b79f150972072806c757d525dc91d.png";
import whiteBubbleImg from "figma:asset/d29d8cf3edc5dd4fe4b0a22167919f8814eda141.png";
import redBubbleImg from "figma:asset/81ceb6ea24e3cd22ab1bba84436338dad75ffcc0.png";
import orangeBubbleImg from "figma:asset/84b5a6c87b328a003c51f21c9ac2320af95746a2.png";
import yellowBubbleImg from "figma:asset/a86a72484f6bef7ee3aaeff365c1edd33d6079b9.png";
import greenBubbleImg from "figma:asset/bed822862ea31957212b4323d8c7225f062f568c.png";
import indigoBubbleImg from "figma:asset/0eff6c1fb509c6a90ea501ae6bd50b23759594c3.png";
import purpleBubbleImg from "figma:asset/6e3b175436420cce48f6dc177ba3ff802b77c505.png";
import blueBubbleImg from "figma:asset/49cf2d00a921f4b35a77b5c3485c5404081ac78f.png";

// Window 인터페이스 확장
declare global {
  interface Window {
    sharedAudioContext?: AudioContext;
  }
}

interface BubbleShooterProps {
  onBack: () => void;
}

interface Bubble {
  x: number;
  y: number;
  color: string;
  row: number;
  col: number;
  type?: "normal" | "invincible" | "bomb"; // 일반, 무적공, 꽝공
}

interface ShootingBubble {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  type?: "normal" | "invincible" | "bomb";
}

interface FallingBubble extends Bubble {
  vy: number; // 떨어지는 속도
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number; // 0-1, 1에서 시작해서 0으로
  size: number;
}

// 색상 배열: 빨강, 주황, 노랑, 초록, 파랑, 남색, 보라
const COLORS = [
  "#FF0000",
  "#FFA500",
  "#FFFF00",
  "#00FF00",
  "#0000FF",
  "#4B0082",
  "#9B59B6",
];
const BUBBLE_RADIUS = 16;
const ROWS = 15;
const COLS = 12;
const TOP_PADDING = 20; // 상단 패딩 (공이 잘리지 않도록)
const ROW_HEIGHT = BUBBLE_RADIUS * 2.2; // 버블 간격을 원래대로
const BUBBLE_SPACING = BUBBLE_RADIUS * 2.0; // 가로 간격도 원래대로
const DANGER_LINE_Y = 440 - ROW_HEIGHT; // 위험선 Y 좌표 (한 칸 위로 조정)
const GAME_OVER_ROW = 13; // 14번째 행 (0부터 시작하므로 13)
const GAME_OVER_LINE_Y =
  GAME_OVER_ROW * ROW_HEIGHT + BUBBLE_RADIUS * 2 + TOP_PADDING; // 14번째 행 바로 아래
const REFERENCE_WIDTH = 400; // 기준 캔버스 너비 (홀�� 행이 딱 맞는 너비: (COLS * 2 + 2) * BUBBLE_RADIUS)
const REFERENCE_HEIGHT = 600; // 기준 캔버스 높이

type GameState = "ready" | "countdown" | "playing" | "gameOver";

// 육각형 그리드에서 인접한 6개 위치를 반환하는 헬퍼 함수
// offset을 고려하여 실제 홀짝 패턴을 계산
const getHexNeighbors = (
  row: number,
  col: number,
  offset: number = 0,
): Array<{ row: number; col: number }> => {
  // offset을 고려한 실제 홀짝 패턴
  const isEvenPattern = (row + offset) % 2 === 0;

  if (isEvenPattern) {
    // 짝수 패턴 (왼쪽 정렬)
    return [
      { row: row - 1, col: col - 1 }, // 왼쪽 위
      { row: row - 1, col: col }, // 오른쪽 위
      { row: row, col: col - 1 }, // 왼쪽
      { row: row, col: col + 1 }, // 오른쪽
      { row: row + 1, col: col - 1 }, // 왼쪽 아래
      { row: row + 1, col: col }, // 오른쪽 아래
    ];
  } else {
    // 홀수 패턴 (오른쪽으로 반칸 이동)
    return [
      { row: row - 1, col: col }, // 왼쪽 위
      { row: row - 1, col: col + 1 }, // 오른쪽 위
      { row: row, col: col - 1 }, // 왼쪽
      { row: row, col: col + 1 }, // 오른쪽
      { row: row + 1, col: col }, // 왼쪽 아래
      { row: row + 1, col: col + 1 }, // 오른쪽 아래
    ];
  }
};

// 색상별 소리 주파수 매핑
const COLOR_FREQUENCIES: { [key: string]: number } = {
  "#FF0000": 261.63, // 빨강 - C (도)
  "#FFA500": 293.66, // 주황 - D (레)
  "#FFFF00": 329.63, // 노랑 - E (미)
  "#00FF00": 349.23, // 초록 - F (파)
  "#0000FF": 392.0, // 파랑 - G (솔)
  "#4B0082": 440.0, // 남색 - A (라)
  "#9B59B6": 493.88, // 보라 - B (시)
};

export function BubbleShooter({ onBack }: BubbleShooterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] =
    useState<GameState>("ready");
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [recommendedLevel, setRecommendedLevel] = useState<
    number | null
  >(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [fallingBubbles, setFallingBubbles] = useState<
    FallingBubble[]
  >([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentBubble, setCurrentBubble] = useState<string>(
    COLORS[0],
  );
  const [currentBubbleType, setCurrentBubbleType] = useState<
    "normal" | "invincible" | "bomb"
  >("normal");
  const [nextBubble, setNextBubble] = useState<string>(
    COLORS[0],
  );
  const [nextBubbleType, setNextBubbleType] = useState<
    "normal" | "invincible" | "bomb"
  >("normal");
  const nextBubbleRef = useRef<string>(COLORS[0]);
  const nextBubbleTypeRef = useRef<
    "normal" | "invincible" | "bomb"
  >("normal");
  const [shootingBubble, setShootingBubble] =
    useState<ShootingBubble | null>(null);
  const [mousePos, setMousePos] = useState<{
    x: number;
    y: number;
  }>({ x: REFERENCE_WIDTH / 2, y: 0 });
  const [score, setScore] = useState<number>(0);
  const [hearts, setHearts] = useState<number>(3);
  const [turnCount, setTurnCount] = useState<number>(0);
  const [gridOffset, setGridOffset] = useState<number>(0); // 그리드의 offset 추적 (0 또는 1, 새 줄 추가 시마다 토글)
  const animationFrameRef = useRef<number>();
  const [isPaused, setIsPaused] = useState(false);
  const dangerTimeRef = useRef<number>(0);
  const lastDangerCheckRef = useRef<number>(0);
  const [dangerTimer, setDangerTimer] = useState<number>(0); // 위험선 타이머 표시용
  const lastNewRowTimeRef = useRef<number>(0); // 마지막 새 줄 추가 시간
  const [isVoicePlaying, setIsVoicePlaying] = useState(false); // 음성 재생 중 여부
  const [currentVoiceVersion, setCurrentVoiceVersion] =
    useState<number | undefined>(undefined); // 현재 라운드의 음성 버전
  const [targetSide, setTargetSide] = useState<
    "left" | "right"
  >("left"); // 레벨 3용: 목표 방향
  const [leftColor, setLeftColor] = useState<string>(""); // 레벨 3용: 왼쪽에서 들린 색상
  const [rightColor, setRightColor] = useState<string>(""); // 레벨 3용: 오른쪽에서 들린 색상

  const [showRules, setShowRules] = useState(false); // 게임 설명 표시 여부
  const [showSettings, setShowSettings] = useState(false); // 설정 모달 표시 여부
  const [showHeartLoss, setShowHeartLoss] = useState(false); // 하트 감소 효과 표시 여부
  const [countdown, setCountdown] = useState(3); // 카운트다운 state

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
  const [showGoalAchieved, setShowGoalAchieved] =
    useState(false); // 목표 달성 알림 표시 여부
  const isGameOverRef = useRef<boolean>(false); // 게임 오버 플래그
  const [savedGameState, setSavedGameState] = useState<{
    score: number;
    hearts: number;
    bubbles: Bubble[];
    currentBubble: string;
    currentBubbleType: "normal" | "invincible" | "bomb";
    level: number;
    turnCount: number;
  } | null>(null);

  // 개발자 모드 (제목 5번 클릭 시 활성화)
  const [devMode, setDevMode] = useState(false);
  const [devClickCount, setDevClickCount] = useState(0);
  const devClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // attachBubble 함수를 ref에 저장하여 항상 최신 버전 참조
  const attachBubbleRef = useRef<
    | ((
        x: number,
        y: number,
        color: string,
        type: "normal" | "invincible" | "bomb",
        collidedBubble?: Bubble,
      ) => void)
    | null
  >(null);

  // 노이즈 관련 ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const whiteNoiseRef = useRef<AudioBufferSourceNode | null>(
    null,
  );
  const noiseGainRef = useRef<GainNode | null>(null);

  // 버블 이미지 로드
  const blackBubbleImage = useRef<HTMLImageElement | null>(
    null,
  );
  const rainbowBubbleImage = useRef<HTMLImageElement | null>(
    null,
  );
  const whiteBubbleImage = useRef<HTMLImageElement | null>(
    null,
  );
  const redBubbleImage = useRef<HTMLImageElement | null>(null);
  const orangeBubbleImage = useRef<HTMLImageElement | null>(
    null,
  );
  const yellowBubbleImage = useRef<HTMLImageElement | null>(
    null,
  );
  const greenBubbleImage = useRef<HTMLImageElement | null>(
    null,
  );
  const indigoBubbleImage = useRef<HTMLImageElement | null>(
    null,
  );
  const purpleBubbleImage = useRef<HTMLImageElement | null>(
    null,
  );
  const blueBubbleImage = useRef<HTMLImageElement | null>(null);

  // 컴포넌트 마운트 시 음성 파일 프리로드
  useEffect(() => {
    preloadVoiceFiles();

    // 일일 목표점수 초기화
    const target = getTargetScore();
    setDailyTargetScore(target);
    const accumulated = getAccumulatedScore();
    setDailyAccumulatedScore(accumulated);
    setPreviousAccumulatedScore(accumulated);
    setAnimatedAccumulatedScore(accumulated);
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
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // easeOutCubic 이징 함수
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentScore = Math.floor(
          startScore + diff * eased,
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

      // 레벨 3: 특수 공이거나 일반 공
      if (currentLevel === 3) {
        // 🎵 레벨 3: 모든 공(일반/무적/꽝) 좌우 스테레오로 재생
        const side = Math.random() < 0.5 ? "left" : "right";
        setTargetSide(side);

        setIsVoicePlaying(true);
        setTimeout(async () => {
          const config = getLevelConfig(currentLevel);
          const levelColors = config.colorIndices.map(
            (idx) => COLORS[idx],
          );

          let selectedLeftColor: string;
          let selectedLeftType: "normal" | "invincible" | "bomb";
          let selectedRightColor: string;
          let selectedRightType: "normal" | "invincible" | "bomb";

          // 현재 버블이 특수 공인 경우, 한쪽은 특수 공 음성
          if (currentBubbleType === "invincible" || currentBubbleType === "bomb") {
            const specialSide = Math.random() < 0.5 ? "left" : "right";
            const randomColor = levelColors[
              Math.floor(Math.random() * levelColors.length)
            ];

            if (specialSide === "left") {
              selectedLeftColor = currentBubble;
              selectedLeftType = currentBubbleType;
              selectedRightColor = randomColor;
              selectedRightType = "normal";
            } else {
              selectedLeftColor = randomColor;
              selectedLeftType = "normal";
              selectedRightColor = currentBubble;
              selectedRightType = currentBubbleType;
            }
          } else {
            // 일반 공인 경우, 양쪽 모두 랜덤 색상
            selectedLeftColor =
              levelColors[
                Math.floor(Math.random() * levelColors.length)
              ];
            let rightColor =
              levelColors[
                Math.floor(Math.random() * levelColors.length)
              ];

            // 같은 색이면 다른 색 선택
            while (
              rightColor === selectedLeftColor &&
              levelColors.length > 1
            ) {
              rightColor =
                levelColors[
                  Math.floor(Math.random() * levelColors.length)
                ];
            }

            selectedRightColor = rightColor;
            selectedLeftType = "normal";
            selectedRightType = "normal";
          }

          // 좌우 같은 버전 번호 선택
          const version = Math.floor(Math.random() * 4) + 1;
          setCurrentVoiceVersion(version);

          // 좌우 색상 저장
          setLeftColor(selectedLeftColor);
          setRightColor(selectedRightColor);

          console.log(
            `🎵 버블게임 레벨 3 스테레오 재생 (게임시작): 왼쪽=${selectedLeftColor}(${selectedLeftType})-${version}, 오른쪽=${selectedRightColor}(${selectedRightType})-${version}, 타겟=${side}`,
          );

          // 동시에 좌우 재생
          const [leftResult, rightResult] = await Promise.all([
            playColorVoice(
              selectedLeftColor,
              selectedLeftType,
              version,
              "left",
            ),
            playColorVoice(
              selectedRightColor,
              selectedRightType,
              version,
              "right",
            ),
          ]);

          // 둘 다 성공한 경우에만 진행
          if (leftResult.success && rightResult.success) {
            console.log(`✅ 스테레오 재생 성공`);

            // 타겟 쪽의 색상과 타입으로 설정
            const targetColor =
              side === "left"
                ? selectedLeftColor
                : selectedRightColor;
            const targetType =
              side === "left"
                ? selectedLeftType
                : selectedRightType;
            
            setCurrentBubble(targetColor);
            setCurrentBubbleType(targetType);

            // 음성 재생 시간(0.5초) 후 상태 업데이트
            setTimeout(() => {
              setIsVoicePlaying(false);
            }, 500);
          } else {
            // 재생 실패 시에도 게임 진행
            console.log(
              `❌ 스테레오 재생 실패: 왼쪽=${leftResult.success}, 오른쪽=${rightResult.success}`,
            );
            const targetColor =
              side === "left"
                ? selectedLeftColor
                : selectedRightColor;
            const targetType =
              side === "left"
                ? selectedLeftType
                : selectedRightType;
            
            setCurrentBubble(targetColor);
            setCurrentBubbleType(targetType);
            setIsVoicePlaying(false);
          }
        }, 1000);
      } else {
        // 레벨 1, 2: 기존 방식
        setIsVoicePlaying(true);
        setTimeout(async () => {
          // 레벨 2: 노이즈 먼저 재생
          if (currentLevel === 2) {
            playShortNoise();
          }
          // 색상 음성 재생 (재시도 포함)
          const result = await playColorVoice(
            currentBubble,
            currentBubbleType,
            undefined,
            "center",
          );

          // 재생 성공한 경우에만 진행
          if (result.success) {
            setCurrentVoiceVersion(result.version);
            console.log(
              `🎵 버블게임 레벨 ${currentLevel} 음성 재생 성공: ${currentBubble}-${result.version} (타입: ${currentBubbleType})`,
            );

            // 음성 재생 시간 후 상태 업데이트 (duration이 있으면 사용, 없으면 0.5초)
            setTimeout(
              () => {
                setIsVoicePlaying(false);
              },
              (result.duration || 0.5) * 1000,
            );
          } else {
            // 재생 실패 시에도 게임 진행 (조용히 실패)
            console.log(
              `❌ 버블게임 음성 재생 실패: ${currentBubble}`,
            );
            setIsVoicePlaying(false);
          }
        }, 1000);
      }
    }
  }, [
    gameState,
    countdown,
    currentLevel,
    currentBubble,
    currentBubbleType,
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
            "bubbleShooter",
            finalScore,
            currentLevel,
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
              recordAchievement("bubbleShooter");
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
  }, [gameState, currentLevel]);

  useEffect(() => {
    const img = new Image();
    img.src = blackBubbleImg;
    img.onload = () => {
      blackBubbleImage.current = img;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = rainbowBubbleImg;
    img.onload = () => {
      rainbowBubbleImage.current = img;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = whiteBubbleImg;
    img.onload = () => {
      whiteBubbleImage.current = img;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = redBubbleImg;
    img.onload = () => {
      redBubbleImage.current = img;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = orangeBubbleImg;
    img.onload = () => {
      orangeBubbleImage.current = img;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = yellowBubbleImg;
    img.onload = () => {
      yellowBubbleImage.current = img;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = greenBubbleImg;
    img.onload = () => {
      greenBubbleImage.current = img;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = indigoBubbleImg;
    img.onload = () => {
      indigoBubbleImage.current = img;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = purpleBubbleImg;
    img.onload = () => {
      purpleBubbleImage.current = img;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = blueBubbleImg;
    img.onload = () => {
      blueBubbleImage.current = img;
    };
  }, []);

  // nextBubble과 nextBubbleType이 변경될 때 ref 업데이트
  useEffect(() => {
    nextBubbleRef.current = nextBubble;
    nextBubbleTypeRef.current = nextBubbleType;
  }, [nextBubble, nextBubbleType]);

  // 레벨별 색상 개수 및 사용 색상 인덱스
  const getLevelConfig = (level: number) => {
    switch (level) {
      case 1:
        // 빨강(0), 초록(3), 파랑(4), 보라(6) - 4개
        return {
          colorIndices: [0, 3, 4, 6],
          initialRows: 3,
          hasInvincible: false,
          hasBomb: false,
        };
      case 2:
        // 빨강(0), 주황(1), 초록(3), 파(4), 보라(6) - 5개
        return {
          colorIndices: [0, 1, 3, 4, 6],
          initialRows: 3,
          hasInvincible: true,
          hasBomb: false,
        };
      case 3:
        // 빨강(0), 주황(1), 노랑(2), 초록(3), 파랑(4), 남색(5), 보라(6)
        return {
          colorIndices: [0, 1, 2, 3, 4, 5, 6],
          initialRows: 3,
          hasInvincible: true,
          hasBomb: true,
        };
      default:
        return {
          colorIndices: [0, 3, 4, 6],
          initialRows: 3,
          hasInvincible: false,
          hasBomb: false,
        };
    }
  };

  // 색상에 맞는 이미지 가져오기
  const getColorImage = (
    color: string,
  ): HTMLImageElement | null => {
    switch (color) {
      case "#FF0000":
        return redBubbleImage.current;
      case "#FFA500":
        return orangeBubbleImage.current;
      case "#FFFF00":
        return yellowBubbleImage.current;
      case "#00FF00":
        return greenBubbleImage.current;
      case "#0000FF":
        return blueBubbleImage.current;
      case "#4B0082":
        return indigoBubbleImage.current;
      case "#9B59B6":
        return purpleBubbleImage.current;
      case "#FFD700": // 무적공 (금색)
        return rainbowBubbleImage.current;
      case "#000000": // 꽝공 (검은색)
        return whiteBubbleImage.current;
      default:
        return null;
    }
  };

  // 색상 소리 재생
  const playColorSound = async (color: string) => {
    const frequency = COLOR_FREQUENCIES[color];
    if (!frequency) return;

    try {
      if (!window.sharedAudioContext) {
        window.sharedAudioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const audioContext = window.sharedAudioContext;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        now + 0.5,
      );

      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } catch (error) {
      console.warn("색상 소리 재생 실패:", error);
    }
  };

  // 버블 터지는 효과음 (공유 AudioContext 사용)
  const playBurstSound = async (count: number) => {
    try {
      // 기존 AudioContext 재사용 또는 새로 생성
      if (!window.sharedAudioContext) {
        window.sharedAudioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const audioContext = window.sharedAudioContext;

      // AudioContext가 suspended 상태면 resume
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 터지는 개수에 따라 주파수 변화
      const baseFreq = 800;
      const freqMultiplier = Math.min(count / 3, 3); // 최대 3배
      oscillator.frequency.value = baseFreq * freqMultiplier;
      oscillator.type = "square";

      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        now + 0.15,
      );

      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (error) {
      console.warn("버블 터지는 효과음 재생 실패:", error);
    }
  };

  // 파티클 생성
  const createParticles = (
    bubble: Bubble,
    count: number = 8,
  ): Particle[] => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 2; // 파티클 속도
      particles.push({
        x: bubble.x,
        y: bubble.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: bubble.color,
        life: 1.0,
        size: 3 + Math.random() * 3,
      });
    }
    return particles;
  };

  // 랜덤 버블 생성 (타입 포함)
  // forShooting이 true일 때만 특수 버블이 나올 수 있음
  const generateRandomBubble = (
    level: number,
    forShooting: boolean = false,
  ): {
    color: string;
    type: "normal" | "invincible" | "bomb";
  } => {
    const config = getLevelConfig(level);
    const levelColors = config.colorIndices.map(
      (idx) => COLORS[idx],
    );

    // 쏘는 공이 아니면 무조건 일반 버블만
    if (!forShooting) {
      return {
        color:
          levelColors[
            Math.floor(Math.random() * levelColors.length)
          ],
        type: "normal",
      };
    }

    // 쏘는 공일 때만 특수 버블 확률 적용
    const rand = Math.random();

    // 레벨별 확률: 2레벨(무적공 10%), 3레벨(꽝공 10%, 무적공 10%)
    if (config.hasBomb && rand < 0.1) {
      // 0~0.1: 꽝공 (10%)
      return { color: "#000000", type: "bomb" };
    } else if (config.hasInvincible && rand >= 0.1 && rand < 0.2) {
      // 0.1~0.2: 무적공 (10%)
      return { color: "#FFD700", type: "invincible" };
    } else if (config.hasInvincible && !config.hasBomb && rand < 0.1) {
      // 2레벨 전용: 0~0.1 무적공 (10%)
      return { color: "#FFD700", type: "invincible" };
    } else {
      return {
        color:
          levelColors[
            Math.floor(Math.random() * levelColors.length)
          ],
        type: "normal",
      };
    }
  };

  // 게임 시작
  const startGame = (level: number) => {
    setCurrentLevel(level);

    // 게임 시작 전 누적 점수 저장 및 게임 오버 플래그 초기화
    setPreviousAccumulatedScore(dailyAccumulatedScore);
    setShowGoalAchieved(false);
    isGameOverRef.current = false;

    const config = getLevelConfig(level);

    const initialBubbles: Bubble[] = [];
    for (let row = 0; row < config.initialRows; row++) {
      for (let col = 0; col < COLS; col++) {
        const offsetX = row % 2 === 0 ? 0 : BUBBLE_RADIUS;
        const bubble = generateRandomBubble(
          selectedLevel,
          false,
        ); // 초��� 배치 - 일반 버블만
        initialBubbles.push({
          x: col * BUBBLE_SPACING + BUBBLE_RADIUS + offsetX,
          y: row * ROW_HEIGHT + BUBBLE_RADIUS + TOP_PADDING,
          color: bubble.color,
          type: bubble.type,
          row,
          col,
        });
      }
    }
    setBubbles(initialBubbles);

    // 그리드 offset 초기화
    // row % 2 패턴을 유지하므로 offset은 0으로 시작
    setGridOffset(0);

    const firstBubble = generateRandomBubble(
      selectedLevel,
      true,
    ); // 쏘는 공 - 특수 버블 가능
    const secondBubble = generateRandomBubble(
      selectedLevel,
      true,
    ); // 쏘는 공 - 특수 버블 가능
    setCurrentBubble(firstBubble.color);
    setCurrentBubbleType(firstBubble.type);
    setNextBubble(secondBubble.color);
    setNextBubbleType(secondBubble.type);
    setShootingBubble(null);
    setScore(0);
    setHearts(3);
    setTurnCount(0);
    setGridOffset(0); // 그리드 offset 초기화 (짝수 행으로 시작)
    dangerTimeRef.current = 0;
    lastDangerCheckRef.current = Date.now();
    lastNewRowTimeRef.current = Date.now(); // 새 줄 추가 타이머 초기화
    setCountdown(3); // 카운트다운 초기화
    setGameState("countdown"); // 카운트다운 상태로 시작
  };

  // 새 줄 추가 함수
  const addNewRow = useCallback(() => {
    setGridOffset((prevOffset) => {
      const currentGridOffset = prevOffset;

      setBubbles((prevBubbles) => {
        const newRow: Bubble[] = [];
        const newRowIndex = 0;

        // 모든 버블을 한 줄 아래로 이동
        const shiftedBubbles = prevBubbles.map((b) => ({
          ...b,
          y: b.y + ROW_HEIGHT,
          row: b.row + 1,
        }));

        // 새 row=0 줄 추가
        const newRowOffsetPattern = (currentGridOffset + 1) % 2;
        for (let col = 0; col < COLS; col++) {
          const offsetX =
            newRowOffsetPattern === 0 ? 0 : BUBBLE_RADIUS;
          const bubble = generateRandomBubble(
            currentLevel,
            false,
          );
          newRow.push({
            x: col * BUBBLE_SPACING + BUBBLE_RADIUS + offsetX,
            y:
              newRowIndex * ROW_HEIGHT +
              BUBBLE_RADIUS +
              TOP_PADDING,
            color: bubble.color,
            type: bubble.type,
            row: newRowIndex,
            col,
          });
        }

        const newBubbles = [...newRow, ...shiftedBubbles];

        // 게임 오버 체크 - 13행에 버블이 존재하면 즉시 게임오버
        if (newBubbles.some((b) => b.row >= GAME_OVER_ROW)) {
          setGameState("gameOver");
        }

        return newBubbles;
      });

      // gridOffset 토글
      return (currentGridOffset + 1) % 2;
    });
  }, [currentLevel]);

  // 짧은 노이즈 재생 - Web Audio API 사용
  const playShortNoise = (duration: number = 0.3) => {
    if (!getSoundEnabled()) return;

    console.log(`🔊 노이즈 재생 시작: 0.5초 (고정)`);
    try {
      if (!window.sharedAudioContext) {
        window.sharedAudioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      const audioContext = window.sharedAudioContext;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      // 항상 0.5초 고정
      const noiseDuration = 0.5;

      // 0.5초 분량의 white noise 버퍼 생성
      const bufferSize =
        audioContext.sampleRate * noiseDuration;
      const buffer = audioContext.createBuffer(
        1,
        bufferSize,
        audioContext.sampleRate,
      );
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
      const now = audioContext.currentTime;
      noiseGain.gain.setValueAtTime(0.15, now); // 약한 노이즈

      whiteNoise.connect(noiseGain);
      noiseGain.connect(audioContext.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + noiseDuration);

      console.log(`✅ 0.5초 노이즈 재생`);
    } catch (error) {
      console.log("노이즈 생성 실패:", error);
    }
  };

  // 위험선 체크
  useEffect(() => {
    if (gameState !== "playing" || isPaused) {
      // 게임이 중지되면 타이머 리셋
      dangerTimeRef.current = 0;
      setDangerTimer(0);
      return;
    }

    // 인터벌 시작 시 lastDangerCheckRef 초기화
    lastDangerCheckRef.current = Date.now();

    const interval = setInterval(() => {
      const hasDangerBubbles = bubbles.some(
        (b) => b.y > DANGER_LINE_Y,
      );

      if (hasDangerBubbles) {
        const now = Date.now();
        const elapsed =
          (now - lastDangerCheckRef.current) / 1000;
        dangerTimeRef.current += elapsed;

        // 타이머 즉시 업데이트
        setDangerTimer(dangerTimeRef.current);

        if (dangerTimeRef.current >= 10) {
          // 하트 감소 효과 표시
          playBackSound(); // 하트 감소 효과음
          setShowHeartLoss(true);
          setTimeout(() => setShowHeartLoss(false), 2500);

          setHearts((prev) => {
            const newHearts = prev - 1;
            if (newHearts <= 0) {
              // 🔥 하트 0 시 점수 저장 및 누적
              saveGameRecord(
                "bubbleShooter",
                score,
                currentLevel,
              );

              // 측정 중이거나 목표점수가 0점일 때: 계속 측정
              const currentTargetScore = getTargetScore();
              if (
                currentTargetScore === null ||
                currentTargetScore === 0
              ) {
                setMeasuredScore(score);
                const newTarget = score > 0 ? score * 3 : 0;
                setDailyTargetScore(newTarget);
                setShowGoalAchieved(false);
              } else {
                // 🎯 게임 종료 시점에 점수 합산
                const { achieved, newAccumulated } =
                  addScore(score);
                setDailyAccumulatedScore(newAccumulated);

                if (achieved) {
                  recordAchievement("bubbleShooter");
                  setShowGoalAchieved(true);
                } else {
                  setShowGoalAchieved(false);
                }
              }

              setGameState("gameOver");
            }
            return newHearts;
          });
          dangerTimeRef.current = 0;
          setDangerTimer(0);
        }
      } else {
        dangerTimeRef.current = 0;
        setDangerTimer(0);
      }

      lastDangerCheckRef.current = Date.now();
    }, 100); // 100ms마다 체크하여 더 즉각적��로 반응

    return () => clearInterval(interval);
  }, [gameState, bubbles, isPaused]);

  // 시간 기반 새 줄 추가
  useEffect(() => {
    if (gameState !== "playing" || isPaused || showSettings) {
      return;
    }

    // 재개 시 타이머 리셋 (일시정지 중에 경과된 시간은 카운트하지 않음)
    lastNewRowTimeRef.current = Date.now();

    // 레벨별 새 줄 추가 주기 (초 단위)
    const getNewRowInterval = (level: number) => {
      switch (level) {
        case 1:
          return 12000; // 12초
        case 2:
          return 12000; // 12초
        case 3:
          return 12000; // 12초
        default:
          return 12000;
      }
    };

    const checkNewRow = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastNewRowTimeRef.current;
      const interval = getNewRowInterval(currentLevel);

      if (elapsed >= interval) {
        addNewRow();
        lastNewRowTimeRef.current = now;
      }
    }, 100); // 100ms마다 체크

    return () => clearInterval(checkNewRow);
  }, [
    gameState,
    isPaused,
    showSettings,
    currentLevel,
    addNewRow,
  ]);

  // 캔버스 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 캔버스 크기 설정 (고해상도 디스플레이 대응)
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // CSS 크기는 원래대로 유지
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // 고해상도 스케일 적용
    ctx.scale(dpr, dpr);

    // 이미지 스무딩 활성화 (고품질 렌더링)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 스케일 팩터 계산 - 기준 크기 대비 실제 캔버스 크기 비율
    const scaleX = rect.width / REFERENCE_WIDTH;
    const scaleY = rect.height / REFERENCE_HEIGHT;

    // 클리어
    ctx.clearRect(0, 0, rect.width, rect.height);

    // 위험선 그리기 (노란색 - 10초 지속 시 하트 소모)
    const dangerLineY =
      (DANGER_LINE_Y / REFERENCE_HEIGHT) * rect.height;
    ctx.beginPath();
    ctx.moveTo(0, dangerLineY);
    ctx.lineTo(rect.width, dangerLineY);
    ctx.strokeStyle = "#FFA500";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 게임오버선 그리기 (빨간색 - 14번째 행 바로 아래, 넘으면 즉시 게임오버)
    const gameOverLineY =
      (GAME_OVER_LINE_Y / REFERENCE_HEIGHT) * rect.height;
    ctx.beginPath();
    ctx.moveTo(0, gameOverLineY);
    ctx.lineTo(rect.width, gameOverLineY);
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 디버깅용 그리드 가이드라인 (개발 중에만 사용)
    const SHOW_GRID = false; // false로 설정하면 그리드 숨김
    if (SHOW_GRID && gameState === "playing") {
      ctx.globalAlpha = 0.2;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const offsetX = row % 2 === 0 ? 0 : BUBBLE_RADIUS;
          const gridX =
            (col * BUBBLE_SPACING + BUBBLE_RADIUS + offsetX) *
            scaleX;
          const gridY =
            (row * ROW_HEIGHT + BUBBLE_RADIUS + TOP_PADDING) *
            scaleY;

          // 그리드 점 표시
          ctx.beginPath();
          ctx.arc(gridX, gridY, 2, 0, Math.PI * 2);
          ctx.fillStyle = row % 2 === 0 ? "#0000FF" : "#FF00FF"; // 짝수행 파랑, 홀수행 분홍
          ctx.fill();

          // row, col 텍스트
          ctx.fillStyle = "#000000";
          ctx.font = "8px Arial";
          ctx.fillText(`${row},${col}`, gridX + 3, gridY - 3);
        }
      }
      ctx.globalAlpha = 1.0;
    }

    // 버블 그리기
    bubbles.forEach((bubble) => {
      const scaledX = bubble.x * scaleX;
      const scaledY = bubble.y * scaleY;
      const scaledRadius = BUBBLE_RADIUS * scaleX; // X ��케일 사용

      if (bubble.type === "invincible") {
        // 무적공 - 무지개 이미지
        if (rainbowBubbleImage.current) {
          ctx.drawImage(
            rainbowBubbleImage.current,
            scaledX - scaledRadius,
            scaledY - scaledRadius,
            scaledRadius * 2,
            scaledRadius * 2,
          );
        } else {
          // 이미지 로드 전에는 색으로 표시
          ctx.beginPath();
          ctx.arc(
            scaledX,
            scaledY,
            scaledRadius,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = "#FFD700";
          ctx.fill();
          ctx.strokeStyle = "#FFA500";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else if (bubble.type === "bomb") {
        // 꽝공 - 하얀색 이미지
        if (whiteBubbleImage.current) {
          ctx.drawImage(
            whiteBubbleImage.current,
            scaledX - scaledRadius,
            scaledY - scaledRadius,
            scaledRadius * 2,
            scaledRadius * 2,
          );
        } else {
          // 이미지 로드 전에는 검은색에 빨 X로 표시
          ctx.beginPath();
          ctx.arc(
            scaledX,
            scaledY,
            scaledRadius,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = "#000000";
          ctx.fill();
          ctx.strokeStyle = "#FF0000";
          ctx.lineWidth = 3;
          ctx.stroke();
          // X 표시
          ctx.beginPath();
          ctx.moveTo(scaledX - 10, scaledY - 10);
          ctx.lineTo(scaledX + 10, scaledY + 10);
          ctx.moveTo(scaledX + 10, scaledY - 10);
          ctx.lineTo(scaledX - 10, scaledY + 10);
          ctx.strokeStyle = "#FF0000";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else {
        // 일반 버블 - 색상에 맞는 이미지로 표시
        const colorImage = getColorImage(bubble.color);
        if (colorImage) {
          ctx.drawImage(
            colorImage,
            scaledX - scaledRadius,
            scaledY - scaledRadius,
            scaledRadius * 2,
            scaledRadius * 2,
          );
        } else {
          // 이미지 로드 전에는 색상으로 표시
          ctx.beginPath();
          ctx.arc(
            scaledX,
            scaledY,
            scaledRadius,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = bubble.color;
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    });

    // 떨어지는 버블 그리기
    fallingBubbles.forEach((bubble) => {
      const scaledX = bubble.x * scaleX;
      const scaledY = bubble.y * scaleY;
      const scaledRadius = BUBBLE_RADIUS * scaleX; // X 스케일 사용

      if (bubble.type === "invincible") {
        // 무적공 - 무지개 이미지
        if (rainbowBubbleImage.current) {
          ctx.drawImage(
            rainbowBubbleImage.current,
            scaledX - scaledRadius,
            scaledY - scaledRadius,
            scaledRadius * 2,
            scaledRadius * 2,
          );
        } else {
          // 이미지 로드 전에는 색으로 표시
          ctx.beginPath();
          ctx.arc(
            scaledX,
            scaledY,
            scaledRadius,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = "#FFD700";
          ctx.fill();
          ctx.strokeStyle = "#FFA500";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else if (bubble.type === "bomb") {
        // 꽝공 - 하얀색 이미지
        if (whiteBubbleImage.current) {
          ctx.drawImage(
            whiteBubbleImage.current,
            scaledX - scaledRadius,
            scaledY - scaledRadius,
            scaledRadius * 2,
            scaledRadius * 2,
          );
        } else {
          // 이미지 로드 전에는 검은색에 ��간 X로 표시
          ctx.beginPath();
          ctx.arc(
            scaledX,
            scaledY,
            scaledRadius,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = "#000000";
          ctx.fill();
          ctx.strokeStyle = "#FF0000";
          ctx.lineWidth = 3;
          ctx.stroke();
          // X 표시
          ctx.beginPath();
          ctx.moveTo(scaledX - 10, scaledY - 10);
          ctx.lineTo(scaledX + 10, scaledY + 10);
          ctx.moveTo(scaledX + 10, scaledY - 10);
          ctx.lineTo(scaledX - 10, scaledY + 10);
          ctx.strokeStyle = "#FF0000";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else {
        // 일반 버블 - 색상에 맞는 이미지로 표시
        const colorImage = getColorImage(bubble.color);
        if (colorImage) {
          ctx.drawImage(
            colorImage,
            scaledX - scaledRadius,
            scaledY - scaledRadius,
            scaledRadius * 2,
            scaledRadius * 2,
          );
        } else {
          // 이미지 로드 전에는 색상으로 표시
          ctx.beginPath();
          ctx.arc(
            scaledX,
            scaledY,
            scaledRadius,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = bubble.color;
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    });

    // 발사 중인 버블 그리기
    if (shootingBubble) {
      const scaledX = shootingBubble.x * scaleX;
      const scaledY = shootingBubble.y * scaleY;
      const scaledRadius = BUBBLE_RADIUS * scaleX;

      if (shootingBubble.type === "invincible") {
        // 무적공 - 무지개 이미지
        if (rainbowBubbleImage.current) {
          ctx.drawImage(
            rainbowBubbleImage.current,
            scaledX - scaledRadius,
            scaledY - scaledRadius,
            scaledRadius * 2,
            scaledRadius * 2,
          );
        } else {
          // 이미지 로드 전에는 금색으로 표시
          ctx.beginPath();
          ctx.arc(
            scaledX,
            scaledY,
            scaledRadius,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = "#FFD700";
          ctx.fill();
          ctx.strokeStyle = "#FFA500";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else if (shootingBubble.type === "bomb") {
        // 꽝공 - 하얀색 이미지
        if (whiteBubbleImage.current) {
          ctx.drawImage(
            whiteBubbleImage.current,
            scaledX - scaledRadius,
            scaledY - scaledRadius,
            scaledRadius * 2,
            scaledRadius * 2,
          );
        } else {
          // 이미지 로드 전에는 검은색에 빨간 X로 표시
          ctx.beginPath();
          ctx.arc(
            scaledX,
            scaledY,
            scaledRadius,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = "#000000";
          ctx.fill();
          ctx.strokeStyle = "#FF0000";
          ctx.lineWidth = 3;
          ctx.stroke();
          // X 표시
          ctx.beginPath();
          ctx.moveTo(scaledX - 10, scaledY - 10);
          ctx.lineTo(scaledX + 10, scaledY + 10);
          ctx.moveTo(scaledX + 10, scaledY - 10);
          ctx.lineTo(scaledX - 10, scaledY + 10);
          ctx.strokeStyle = "#FF0000";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else {
        // 일반 버블 - 실제 색상 이미지로 표시
        const colorImage = getColorImage(shootingBubble.color);
        if (colorImage) {
          ctx.drawImage(
            colorImage,
            scaledX - scaledRadius,
            scaledY - scaledRadius,
            scaledRadius * 2,
            scaledRadius * 2,
          );
        } else {
          // 이미지 로드 전에는 실제 색상으로 표시
          ctx.beginPath();
          ctx.arc(
            scaledX,
            scaledY,
            scaledRadius,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = shootingBubble.color;
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // ��준선 그리기
    if (
      !shootingBubble &&
      gameState === "playing" &&
      !isPaused
    ) {
      const shooterX = (REFERENCE_WIDTH / 2) * scaleX;
      const shooterY = (REFERENCE_HEIGHT - 60) * scaleY;
      const scaledRadius = BUBBLE_RADIUS * scaleX;

      // 마우스 위치를 스케일된 좌표로 변환
      const scaledMouseX = mousePos.x * scaleX;
      const scaledMouseY = mousePos.y * scaleY;

      // 스케일된 좌표계에서 각도 계산
      const rawAngle = Math.atan2(
        scaledMouseY - shooterY,
        scaledMouseX - shooterX,
      );

      // 발사 가능한 각도 범위로 제한 (위쪽으로만)
      const minAngle = -Math.PI * 0.9;
      const maxAngle = -Math.PI * 0.1;
      const clampedAngle = Math.max(
        minAngle,
        Math.min(maxAngle, rawAngle),
      );

      // 조준선 길이
      const lineLength = 200 * scaleX;

      // 조준선 - 까만 점선
      ctx.beginPath();
      ctx.moveTo(shooterX, shooterY);
      ctx.lineTo(
        shooterX + Math.cos(clampedAngle) * lineLength,
        shooterY + Math.sin(clampedAngle) * lineLength,
      );
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 현재 버블 그리기 - 대기 중��는 모두 검은색으로 표시
      if (blackBubbleImage.current) {
        ctx.drawImage(
          blackBubbleImage.current,
          shooterX - scaledRadius,
          shooterY - scaledRadius,
          scaledRadius * 2,
          scaledRadius * 2,
        );
      } else {
        // 이미지 로드 전에는 검은색으로 표시
        ctx.beginPath();
        ctx.arc(
          shooterX,
          shooterY,
          scaledRadius,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 파티클 그리기
    particles.forEach((particle) => {
      const scaledX = particle.x * scaleX;
      const scaledY = particle.y * scaleY;
      const scaledSize = particle.size * scaleX;

      ctx.globalAlpha = particle.life;
      ctx.beginPath();
      ctx.arc(scaledX, scaledY, scaledSize, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });
  }, [
    bubbles,
    fallingBubbles,
    shootingBubble,
    currentBubble,
    currentBubbleType,
    gameState,
    isPaused,
    particles,
    mousePos,
  ]);

  // 버블 이동 애니메이션
  useEffect(() => {
    if (!shootingBubble) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 16.67; // 60fps 기준으로 정규화
      lastTime = currentTime;

      setShootingBubble((prev) => {
        if (!prev) return null;

        // deltaTime을 곱하여 프레임레이트 독립적으로 만듦
        let newX = prev.x + prev.dx * deltaTime;
        let newY = prev.y + prev.dy * deltaTime;
        let newDx = prev.dx;
        let newDy = prev.dy;

        // 기준 좌표계에서 계산 (스케일 적용 안 함)
        const referenceCanvasWidth = REFERENCE_WIDTH;
        const referenceCanvasHeight = REFERENCE_HEIGHT;

        // 벽 반사
        if (
          newX - BUBBLE_RADIUS <= 0 ||
          newX + BUBBLE_RADIUS >= referenceCanvasWidth
        ) {
          newDx = -newDx;
          newX = prev.x + newDx;
        }

        // 상단 도달
        if (newY - BUBBLE_RADIUS <= TOP_PADDING) {
          if (attachBubbleRef.current) {
            attachBubbleRef.current(
              newX,
              newY,
              prev.color,
              prev.type || "normal",
              undefined,
              gridOffset,
            );
          }
          return null;
        }

        // 하단 도달 - 버블이 화면 밖으로 나가면 실패 처리 (다음 턴으로 진행)
        if (newY > referenceCanvasHeight - 50) {
          // 다�� 버블로 전환
          const newNextBubble = generateRandomBubble(
            currentLevel,
            true,
          );
          setCurrentBubble(nextBubble);
          setCurrentBubbleType(nextBubbleType);
          setNextBubble(newNextBubble.color);
          setNextBubbleType(newNextBubble.type);
          // 효과음 후에 색상 안내 재생 (800ms 딜레이)
          setIsVoicePlaying(true);
          setTimeout(async () => {
            // 레벨 2: 노이즈 먼저 재생
            if (currentLevel === 2) {
              playShortNoise();
            }
            // 색상 음성 재생 (재시도 포함)
            const result = await playColorVoice(
              nextBubble,
              nextBubbleType,
              undefined,
              "center",
            );

            // 재생 성공한 경우에만 진행
            if (result.success) {
              setCurrentVoiceVersion(result.version);

              // 음성 재생 시간 후 상태 업데이트
              setTimeout(
                () => {
                  setIsVoicePlaying(false);
                },
                (result.duration || 0.5) * 1000,
              );
            } else {
              // 재생 실패 시에도 게임 진행
              setIsVoicePlaying(false);
            }
          }, 800);
          return null;
        }

        // 다른 버블과 충돌 체크
        for (const bubble of bubbles) {
          const distance = Math.sqrt(
            Math.pow(newX - bubble.x, 2) +
              Math.pow(newY - bubble.y, 2),
          );

          // 충돌 거리 (버블 반경의 2.0배 - 두 버블이 닿으면 중심간 거리가 2r)
          if (distance < BUBBLE_RADIUS * 2.0) {
            if (attachBubbleRef.current) {
              // 충돌한 버블 정보와 현재 gridOffset을 함께 전달
              attachBubbleRef.current(
                newX,
                newY,
                prev.color,
                prev.type || "normal",
                bubble,
                gridOffset,
              );
            }
            return null;
          }
        }

        return {
          ...prev,
          x: newX,
          y: newY,
          dx: newDx,
          dy: newDy,
        };
      });

      animationFrameRef.current =
        requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    shootingBubble,
    bubbles,
    currentLevel,
    nextBubble,
    nextBubbleType,
    gridOffset,
  ]);

  // 떨어지는 버블 애니메이션
  useEffect(() => {
    if (
      fallingBubbles.length === 0 ||
      gameState !== "playing" ||
      isPaused
    )
      return;

    let lastTime = performance.now();
    let fallingAnimationRef: number;

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 16.67; // 60fps 기준으로 정규화
      lastTime = currentTime;

      setFallingBubbles((prev) => {
        const updated = prev.map((bubble) => ({
          ...bubble,
          y: bubble.y + bubble.vy * deltaTime,
          vy: bubble.vy + 0.3 * deltaTime, // 중력 가속도 (deltaTime 적용)
        }));

        // 화면 밖으로 나간 버블은 제거
        return updated.filter(
          (bubble) =>
            bubble.y < REFERENCE_HEIGHT + BUBBLE_RADIUS,
        );
      });

      fallingAnimationRef = requestAnimationFrame(animate);
    };

    fallingAnimationRef = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(fallingAnimationRef);
    };
  }, [fallingBubbles.length > 0, gameState, isPaused]);

  // 파티클 애니메이션
  useEffect(() => {
    if (particles.length === 0 || isPaused) return;

    let lastTime = performance.now();
    let animationId: number;

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 16.67; // 60fps 기준으로 정규화
      lastTime = currentTime;

      setParticles((prev) => {
        if (prev.length === 0) return prev;

        const updated = prev.map((particle) => ({
          ...particle,
          x: particle.x + particle.vx * deltaTime,
          y: particle.y + particle.vy * deltaTime,
          vy: particle.vy + 0.2 * deltaTime, // 중력
          life: particle.life - 0.05 * deltaTime, // 파티클 수명 감소 속도
        }));

        // life가 0 이하인 파티클 제거
        return updated.filter((particle) => particle.life > 0);
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [particles.length > 0, isPaused]);

  // 연결되지 않은 버블 찾기 (떨어지는 버블)
  const findFloatingBubbles = useCallback(
    (allBubbles: Bubble[], offset: number = 0): Bubble[] => {
      // 최상단 행에 연결된 버블 찾기
      const connected = new Set<Bubble>();
      const toCheck: Bubble[] = [];

      // 0번 행 버블들을 시작점으로
      allBubbles.forEach((b) => {
        if (b.row === 0) {
          connected.add(b);
          toCheck.push(b);
        }
      });

      // BFS로 연결된 모든 버블 찾기
      while (toCheck.length > 0) {
        const current = toCheck.pop()!;

        const neighbors = getHexNeighbors(
          current.row,
          current.col,
          offset,
        );
        neighbors.forEach(({ row, col }) => {
          const neighbor = allBubbles.find(
            (b) => b.row === row && b.col === col,
          );
          if (neighbor && !connected.has(neighbor)) {
            // 물리적 거리도 체크하여 실제로 인접한지 확인
            const distance = Math.sqrt(
              Math.pow(neighbor.x - current.x, 2) +
                Math.pow(neighbor.y - current.y, 2),
            );
            const maxDistance = BUBBLE_RADIUS * 3.0; // 여유를 두어 3.0배

            if (distance <= maxDistance) {
              connected.add(neighbor);
              toCheck.push(neighbor);
            }
          }
        });
      }

      // 연결되지 않은 버블들 반환
      return allBubbles.filter((b) => !connected.has(b));
    },
    [],
  );

  const findMatching = useCallback(
    (
      bubble: Bubble,
      allBubbles: Bubble[],
      offset: number = 0,
    ): Bubble[] => {
      if (bubble.type !== "normal") return [];

      const matching: Bubble[] = [];
      const checked = new Set<string>();
      const toCheck = [bubble];
      const startKey = `${bubble.row},${bubble.col}`;
      checked.add(startKey);
      matching.push(bubble);

      while (toCheck.length > 0) {
        const current = toCheck.pop()!;

        // 그리드 기반으로 인접한 버블만 확인
        const neighbors = getHexNeighbors(
          current.row,
          current.col,
          offset,
        );
        neighbors.forEach(({ row, col }) => {
          const neighborKey = `${row},${col}`;
          if (checked.has(neighborKey)) return;

          const neighbor = allBubbles.find(
            (b) => b.row === row && b.col === col,
          );
          if (neighbor) {
            // 색상 비교 시 대소문자 무시하고 공백 제거
            const normalizedNeighborColor = neighbor.color
              .toUpperCase()
              .trim();
            const normalizedBubbleColor = bubble.color
              .toUpperCase()
              .trim();

            // 물리적 거리도 체크하여 실제로 인접한지 확인 (3.0배 반경 이내)
            const distance = Math.sqrt(
              Math.pow(neighbor.x - current.x, 2) +
                Math.pow(neighbor.y - current.y, 2),
            );
            const maxDistance = BUBBLE_RADIUS * 3.0; // 여유를 두어 3.0배

            if (
              normalizedNeighborColor ===
                normalizedBubbleColor &&
              neighbor.type === "normal" &&
              distance <= maxDistance
            ) {
              checked.add(neighborKey);
              matching.push(neighbor);
              toCheck.push(neighbor);
            }
          }
        });
      }

      return matching;
    },
    [],
  );

  const findMatchingWithInvincible = useCallback(
    (
      bubble: Bubble,
      allBubbles: Bubble[],
      offset: number = 0,
    ): Bubble[] => {
      if (bubble.type !== "normal") return [];

      const matching: Bubble[] = [];
      const checked = new Set<string>();
      const toCheck = [bubble];
      const startKey = `${bubble.row},${bubble.col}`;
      checked.add(startKey);
      matching.push(bubble);

      while (toCheck.length > 0) {
        const current = toCheck.pop()!;

        // 그리드 기반으로 인접한 버블만 확인
        const neighbors = getHexNeighbors(
          current.row,
          current.col,
          offset,
        );

        neighbors.forEach(({ row, col }) => {
          const neighborKey = `${row},${col}`;
          if (checked.has(neighborKey)) return;

          const neighbor = allBubbles.find(
            (b) => b.row === row && b.col === col,
          );
          if (neighbor) {
            // 물리적 거리도 체크하여 실제로 인접한지 확인 (3.0배 반경 이내)
            const distance = Math.sqrt(
              Math.pow(neighbor.x - current.x, 2) +
                Math.pow(neighbor.y - current.y, 2),
            );
            const maxDistance = BUBBLE_RADIUS * 3.0; // 여유를 두어 3.0배

            if (distance > maxDistance) {
              return;
            }

            // 같은 색의 일반 버블이거나, 무적공이면 매칭에 포함
            // 색상 비교 시 대소문자 무시하고 공백 제거
            const normalizedNeighborColor = neighbor.color
              .toUpperCase()
              .trim();
            const normalizedBubbleColor = bubble.color
              .toUpperCase()
              .trim();

            if (
              neighbor.type === "normal" &&
              normalizedNeighborColor === normalizedBubbleColor
            ) {
              checked.add(neighborKey);
              matching.push(neighbor);
              toCheck.push(neighbor);
            } else if (neighbor.type === "invincible") {
              checked.add(neighborKey);
              matching.push(neighbor);
              // 무적공도 toCheck에 추가하여 무적공 너머로 같은 색 탐색 가능
              toCheck.push(neighbor);
            }
          }
        });
      }

      return matching;
    },
    [],
  );

  const attachBubble = useCallback(
    (
      x: number,
      y: number,
      color: string,
      type: "normal" | "invincible" | "bomb",
      collidedBubble?: Bubble,
      currentOffset?: number,
    ) => {
      setBubbles((currentBubbles) => {
        // 현재 그리드의 offset 패턴 (기본값 0)
        const gridOffset =
          currentOffset !== undefined ? currentOffset : 0;

        // 1단계: 발사 시작점 정의
        const shooterX = REFERENCE_WIDTH / 2;
        const shooterY = REFERENCE_HEIGHT - 60;

        // 2단계: 발사 경로상에서 가장 먼저 만나는 버블 찾기
        const dirX = x - shooterX;
        const dirY = y - shooterY;
        const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
        const normDirX = dirX / dirLength;
        const normDirY = dirY / dirLength;

        // 충돌한 버블이 전달되었으면 우선 ��용
        let closestBubble: Bubble | null =
          collidedBubble || null;
        let closestDistance = Infinity;

        // 충돌한 버블이 없으면 경로상 가장 가까운 버블 찾기
        if (!collidedBubble) {
          currentBubbles.forEach((bubble) => {
            const toBubbleX = bubble.x - shooterX;
            const toBubbleY = bubble.y - shooterY;
            const projectionLength =
              toBubbleX * normDirX + toBubbleY * normDirY;

            if (projectionLength < 0) return;

            const closestX =
              shooterX + normDirX * projectionLength;
            const closestY =
              shooterY + normDirY * projectionLength;
            const distanceToPath = Math.sqrt(
              Math.pow(bubble.x - closestX, 2) +
                Math.pow(bubble.y - closestY, 2),
            );

            if (distanceToPath < BUBBLE_RADIUS * 2.0) {
              const actualDistance = Math.sqrt(
                toBubbleX * toBubbleX + toBubbleY * toBubbleY,
              );
              if (actualDistance < closestDistance) {
                closestDistance = actualDistance;
                closestBubble = bubble;
              }
            }
          });
        }

        // 3단계: 가장 가까운 버블의 인접 위치 �� 충돌 지점에서 가까운 곳 선택
        let bestRow = -1;
        let bestCol = -1;
        let minDistance = Infinity;

        if (closestBubble) {
          const neighbors = getHexNeighbors(
            closestBubble.row,
            closestBubble.col,
            gridOffset,
          );

          neighbors.forEach(({ row, col }) => {
            if (
              row < 0 ||
              row >= ROWS ||
              col < 0 ||
              col >= COLS
            )
              return;
            const occupied = currentBubbles.some(
              (b) => b.row === row && b.col === col,
            );
            if (occupied) return;

            // gridOffset을 고려하여 offset 계산
            const offsetX =
              (row + gridOffset) % 2 === 0 ? 0 : BUBBLE_RADIUS;
            const gridX =
              col * BUBBLE_SPACING + BUBBLE_RADIUS + offsetX;
            const gridY =
              row * ROW_HEIGHT + BUBBLE_RADIUS + TOP_PADDING;

            const distance = Math.sqrt(
              Math.pow(x - gridX, 2) + Math.pow(y - gridY, 2),
            );

            // 가장 가까운 위치 선택 (단순하게)
            if (distance < minDistance) {
              minDistance = distance;
              bestRow = row;
              bestCol = col;
            }
          });
        }

        // 4단계: 위의 방법으로 못 찾았으면 (맨 위 행에 붙는 경우 등) 다른 방법 시도
        if (bestRow === -1 || bestCol === -1) {
          // 발사 위치에서 가장 가까운 빈 그리드 찾기
          const estimatedRow = Math.round(
            (y - TOP_PADDING - BUBBLE_RADIUS) / ROW_HEIGHT,
          );
          // gridOffset을 고려하여 col 추정
          const rowOffsetX =
            (estimatedRow + gridOffset) % 2 === 0
              ? 0
              : BUBBLE_RADIUS;
          const estimatedCol = Math.round(
            (x - BUBBLE_RADIUS - rowOffsetX) / BUBBLE_SPACING,
          );

          // 추정 위치 주변 탐색 (가까운 곳부터 ��게)
          for (
            let searchRadius = 0;
            searchRadius <= 3 &&
            (bestRow === -1 || bestCol === -1);
            searchRadius++
          ) {
            for (
              let dr = -searchRadius;
              dr <= searchRadius;
              dr++
            ) {
              for (
                let dc = -searchRadius;
                dc <= searchRadius;
                dc++
              ) {
                const row = estimatedRow + dr;
                const col = estimatedCol + dc;

                // 범위 체크
                if (
                  row < 0 ||
                  row >= ROWS ||
                  col < 0 ||
                  col >= COLS
                )
                  continue;

                // 이미 버블이 있는지 확인
                const occupied = currentBubbles.some(
                  (b) => b.row === row && b.col === col,
                );
                if (occupied) continue;

                // 맨 위 행이거나, 주변에 버블이 있어야 함
                const neighbors = getHexNeighbors(
                  row,
                  col,
                  gridOffset,
                );
                const hasNeighbor =
                  row === 0 ||
                  neighbors.some(({ row: nRow, col: nCol }) => {
                    if (
                      nRow < 0 ||
                      nRow >= ROWS ||
                      nCol < 0 ||
                      nCol >= COLS
                    )
                      return false;
                    return currentBubbles.some(
                      (b) => b.row === nRow && b.col === nCol,
                    );
                  });

                if (!hasNeighbor) continue;

                // 그리드 위치의 실제 좌표 계산 (gridOffset 고려)
                const offsetX =
                  (row + gridOffset) % 2 === 0
                    ? 0
                    : BUBBLE_RADIUS;
                const gridX =
                  col * BUBBLE_SPACING +
                  BUBBLE_RADIUS +
                  offsetX;
                const gridY =
                  row * ROW_HEIGHT +
                  BUBBLE_RADIUS +
                  TOP_PADDING;

                // 발사 위치와의 거리 계산
                const distance = Math.sqrt(
                  Math.pow(x - gridX, 2) +
                    Math.pow(y - gridY, 2),
                );

                if (distance < minDistance) {
                  minDistance = distance;
                  bestRow = row;
                  bestCol = col;
                }
              }
            }
          }
        }

        // 5단계: 그래도 못 찾았으면 최상단 빈 칸에 무조건 배치
        if (bestRow === -1 || bestCol === -1) {
          // 전체 그리드를 순회하며 첫 번째 빈 칸 찾기
          outerLoop: for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
              const occupied = currentBubbles.some(
                (b) => b.row === row && b.col === col,
              );

              if (!occupied) {
                bestRow = row;
                bestCol = col;
                break outerLoop;
              }
            }
          }
        }

        // 적합한 위치를 찾지 못한 경우 (보드가 가득 찬 경우) 게임 오버
        if (bestRow === -1 || bestCol === -1) {
          setGameState("gameOver");
          return currentBubbles;
        }

        // 새 버블 추가 (육각형 패턴 적용, gridOffset 고려)
        const offsetX =
          (bestRow + gridOffset) % 2 === 0 ? 0 : BUBBLE_RADIUS;
        const newBubble: Bubble = {
          x: bestCol * BUBBLE_SPACING + BUBBLE_RADIUS + offsetX,
          y: bestRow * ROW_HEIGHT + BUBBLE_RADIUS + TOP_PADDING,
          color,
          type,
          row: bestRow,
          col: bestCol,
        };

        let newBubbles = [...currentBubbles, newBubble];
        let pointsEarned = 0;

        // 꽝공 처리 - 절대 안 깨지는 공, 필드에 그대로 남음
        if (type === "bomb") {
          // 꽝공은 아무것도 제거하지 않고 필드에 그대로 남음
          // newBubbles에 이미 추가되어 있음
        } else if (type === "invincible") {
          // 무적공(무지개공) 처리 - 조커 역할, 인접한 색의 역할을 할 수 있음

          // 1단계: 새로 추가된 무적공과 연결된 모든 무적공 찾기 (무적공 클러스터)
          const invincibleCluster: Bubble[] = [newBubble];
          const checkedInvincible = new Set<string>();
          const toCheckInvincible = [newBubble];
          checkedInvincible.add(
            `${newBubble.row},${newBubble.col}`,
          );

          while (toCheckInvincible.length > 0) {
            const current = toCheckInvincible.pop()!;
            const neighbors = getHexNeighbors(
              current.row,
              current.col,
              gridOffset,
            );

            neighbors.forEach(({ row, col }) => {
              const key = `${row},${col}`;
              if (checkedInvincible.has(key)) return;

              const neighbor = newBubbles.find(
                (b) => b.row === row && b.col === col,
              );
              if (neighbor && neighbor.type === "invincible") {
                checkedInvincible.add(key);
                invincibleCluster.push(neighbor);
                toCheckInvincible.push(neighbor);
              }
            });
          }

          // 2단계: 무적공 클러스터 전체와 인접한 일반 버블들을 색상별로 그룹화
          const adjacentBubbles: Bubble[] = [];
          const adjacentSet = new Set<string>();

          invincibleCluster.forEach((invBubble) => {
            const neighbors = getHexNeighbors(
              invBubble.row,
              invBubble.col,
              gridOffset,
            );
            neighbors.forEach(({ row, col }) => {
              const key = `${row},${col}`;
              if (adjacentSet.has(key)) return;

              const neighbor = newBubbles.find(
                (b) => b.row === row && b.col === col,
              );
              if (neighbor && neighbor.type === "normal") {
                adjacentSet.add(key);
                adjacentBubbles.push(neighbor);
              }
            });
          });

          // 3단계: 인접한 버블들의 색상별로 그룹 찾기
          const colorGroups: { [color: string]: Bubble[] } = {};
          adjacentBubbles.forEach((b) => {
            if (b.type === "normal") {
              if (!colorGroups[b.color]) {
                colorGroups[b.color] = [];
              }
              // 해당 색상의 모든 연결된 버블 찾기
              const matchingBubbles = findMatching(
                b,
                newBubbles,
                gridOffset,
              );
              matchingBubbles.forEach((mb) => {
                if (!colorGroups[b.color].includes(mb)) {
                  colorGroups[b.color].push(mb);
                }
              });
            }
          });

          // 4단계: 무적공 클러스터 개수 + 같은 색 버블 개수가 3개 이상인 그룹 찾기
          let largestGroup: Bubble[] = [];
          let bestColorCount = 0;

          Object.entries(colorGroups).forEach(
            ([color, group]) => {
              const totalCount =
                invincibleCluster.length + group.length;
              if (
                totalCount >= 3 &&
                group.length > bestColorCount
              ) {
                largestGroup = group;
                bestColorCount = group.length;
              }
            },
          );

          // 5단계: 3개 이상인 그룹이 있으면 제거 (무적공 클러스터 전체 포함)
          if (
            largestGroup.length > 0 &&
            invincibleCluster.length + largestGroup.length >= 3
          ) {
            // 무적공들의 색상을 largestGroup의 색상으로 변경 (파티클 효과를 위해)
            const targetColor =
              largestGroup.length > 0 ? largestGroup[0].color : "#FFD700";
            invincibleCluster.forEach((invBubble) => {
              invBubble.color = targetColor;
            });

            // 터지는 효과 생성
            const burstingBubbles = [
              ...largestGroup,
              ...invincibleCluster,
            ];
            const newParticles: Particle[] = [];
            burstingBubbles.forEach((bubble) => {
              newParticles.push(...createParticles(bubble, 6));
            });
            setParticles((prev) => [...prev, ...newParticles]);
            playBurstSound(burstingBubbles.length);

            newBubbles = newBubbles.filter(
              (b) =>
                !largestGroup.includes(b) &&
                !invincibleCluster.includes(b),
            );
            pointsEarned +=
              burstingBubbles.length * (currentLevel * 10); // 레벨별 점수: 1레벨=10점, 2레벨=20점, 3레벨=30점
          }
          // 무적공이 제거 조건을 만족하�� 못하면 필드에 남아있음
        } else if (type === "normal") {
          // 같은 색 버블 찾기 및 제거
          const matchingBubbles = findMatchingWithInvincible(
            newBubble,
            newBubbles,
            gridOffset,
          );
          if (matchingBubbles.length >= 3) {
            // 터지는 ��과 생성
            const newParticles: Particle[] = [];
            matchingBubbles.forEach((bubble) => {
              newParticles.push(...createParticles(bubble, 6));
            });
            setParticles((prev) => [...prev, ...newParticles]);
            playBurstSound(matchingBubbles.length);

            newBubbles = newBubbles.filter(
              (b) => !matchingBubbles.includes(b),
            );
            pointsEarned +=
              matchingBubbles.length * (currentLevel * 10); // 레벨별 점수: 1레벨=10점, 2레벨=20점, 3레벨=30점
          }
          // 3개 미만이면 필드에 그냥 남아있음 (newBubble이 이미 newBubbles에 포함되어 있음)
        }

        // 떨어지는 버블 찾기 및 제거
        const floatingBubbles = findFloatingBubbles(
          newBubbles,
          gridOffset,
        );
        if (floatingBubbles.length > 0) {
          // 즉시 ��거하지 않고 떨어지는 애니메이션으로 전환
          const falling: FallingBubble[] = floatingBubbles.map(
            (b) => ({
              ...b,
              vy: 2, // 초기 떨어지는 속도
            }),
          );
          setFallingBubbles((prev) => [...prev, ...falling]);

          newBubbles = newBubbles.filter(
            (b) => !floatingBubbles.includes(b),
          );
          pointsEarned +=
            floatingBubbles.length * (currentLevel * 10); // 레벨별 점수: 1레벨=10점, 2레벨=20점, 3레벨=30점
        }

        // 게임 오버 체크 (발사 위치까지 버블이 내려옴)
        // 버블 y 좌표는 REFERENCE_HEIGHT 기준이므로 canvas.height가 아닌 REFERENCE_HEIGHT 사용
        if (newBubbles.some((b) => b.row >= GAME_OVER_ROW)) {
          setGameState("gameOver");
        }

        // 턴 카운트만 증가 (새 줄 추가는 시간 기반으로 별도 처리)
        setTurnCount((prevCount) => prevCount + 1);
        /*
        // 레벨별 새 줄 추가 주기 (레벨이 높을수록 ��르게)
        const turnsPerNewRow = currentLevel === 1 ? 3 : 2; // 레벨 2와 3은 2턴마다
        if (newTurnCount % turnsPerNewRow === 0) {
          // setTimeout으로 새 줄 추가를 지연시켜 상태 업데이트 충돌 방지
          setTimeout(() => {
            setGridOffset(prevOffset => {
              const currentGridOffset = prevOffset;
              
              setBubbles(prevBubbles => {
                const newRow: Bubble[] = [];
                const newRowIndex = 0;
                
                // 모든 버블을 한 줄 아래로 이동
                // x 좌표는 그대로 유지하고, y만 아래로 이동, row만 증가
                const shiftedBubbles = prevBubbles.map(b => {
                  return {
                    ...b,
                    y: b.y + ROW_HEIGHT,
                    row: b.row + 1
                  };
                });

                // 새 row=0 줄 추가
                // gridOffset을 토글한 패턴으로 추가 (지그재그 유지)
                const newRowOffsetPattern = (currentGridOffset + 1) % 2;
                for (let col = 0; col < COLS; col++) {
                  const offsetX = newRowOffsetPattern === 0 ? 0 : BUBBLE_RADIUS;
                  const bubble = generateRandomBubble(currentLevel, false);
                  newRow.push({
                    x: col * BUBBLE_SPACING + BUBBLE_RADIUS + offsetX,
                    y: newRowIndex * ROW_HEIGHT + BUBBLE_RADIUS + TOP_PADDING,
                    color: bubble.color,
                    type: bubble.type,
                    row: newRowIndex,
                    col
                  });
                }

                return [...newRow, ...shiftedBubbles];
              });
              
              // gridOffset 토글 (새 줄이 추가되면서 패턴이 바뀜)
              return (currentGridOffset + 1) % 2;
            });
          }, 100);
        }
        
        return newTurnCount;
      });
      */

        // 다음 버블로 전환
        const newNextBubble = generateRandomBubble(
          currentLevel,
          true,
        ); // 새로운 다음 공 생성
        const currentNextBubble = nextBubbleRef.current;
        const currentNextBubbleType = nextBubbleTypeRef.current;
        setCurrentBubble(currentNextBubble); // 다음 공을 현재 공으로
        setCurrentBubbleType(currentNextBubbleType);
        setNextBubble(newNextBubble.color); // 새로운 다음 공
        setNextBubbleType(newNextBubble.type);
        setShootingBubble(null);

        // 현재 버블 색 음성 안내 재생 (터지는 효과음 후에 재생되도록 800ms 딜레이)
        if (currentLevel === 3) {
          // 🎵 레벨 3: 모든 공(일반/무적/꽝) 좌우 스테레오로 재생
          const side = Math.random() < 0.5 ? "left" : "right";
          setTargetSide(side);

          setIsVoicePlaying(true);
          setTimeout(async () => {
            const config = getLevelConfig(currentLevel);
            const levelColors = config.colorIndices.map(
              (idx) => COLORS[idx],
            );

            let selectedLeftColor: string;
            let selectedLeftType: "normal" | "invincible" | "bomb";
            let selectedRightColor: string;
            let selectedRightType: "normal" | "invincible" | "bomb";

            // 현재 버블이 특수 공인 경우, 한쪽은 특수 공 음성
            if (currentNextBubbleType === "invincible" || currentNextBubbleType === "bomb") {
              const specialSide = Math.random() < 0.5 ? "left" : "right";
              const randomColor = levelColors[
                Math.floor(Math.random() * levelColors.length)
              ];

              if (specialSide === "left") {
                selectedLeftColor = currentNextBubble;
                selectedLeftType = currentNextBubbleType;
                selectedRightColor = randomColor;
                selectedRightType = "normal";
              } else {
                selectedLeftColor = randomColor;
                selectedLeftType = "normal";
                selectedRightColor = currentNextBubble;
                selectedRightType = currentNextBubbleType;
              }
            } else {
              // 일반 공인 경우, 양쪽 모두 랜덤 색상
              selectedLeftColor =
                levelColors[
                  Math.floor(Math.random() * levelColors.length)
                ];
              let rightColor =
                levelColors[
                  Math.floor(Math.random() * levelColors.length)
                ];

              // 같은 색이면 다른 색 선택
              while (
                rightColor === selectedLeftColor &&
                levelColors.length > 1
              ) {
                rightColor =
                  levelColors[
                    Math.floor(Math.random() * levelColors.length)
                  ];
              }

              selectedRightColor = rightColor;
              selectedLeftType = "normal";
              selectedRightType = "normal";
            }

            // 좌우 같은 버전 번호 선택
            const version = Math.floor(Math.random() * 4) + 1;
            setCurrentVoiceVersion(version);

            // 좌우 색상 저장
            setLeftColor(selectedLeftColor);
            setRightColor(selectedRightColor);

            console.log(
              `🎵 버블게임 레벨 3 스테레오 재생 (터짐 후): 왼쪽=${selectedLeftColor}(${selectedLeftType})-${version}, 오른쪽=${selectedRightColor}(${selectedRightType})-${version}, 타겟=${side}`,
            );

            // 동시에 좌우 재생
            const [leftResult, rightResult] = await Promise.all([
              playColorVoice(
                selectedLeftColor,
                selectedLeftType,
                version,
                "left",
              ),
              playColorVoice(
                selectedRightColor,
                selectedRightType,
                version,
                "right",
              ),
            ]);

            // 둘 다 성공한 경우에만 진행
            if (leftResult.success && rightResult.success) {
              console.log(`✅ 스테레오 재생 성공 (터짐 후)`);

              // 타겟 쪽의 색상과 타입으로 설정
              const targetColor =
                side === "left"
                  ? selectedLeftColor
                  : selectedRightColor;
              const targetType =
                side === "left"
                  ? selectedLeftType
                  : selectedRightType;
              
              setCurrentBubble(targetColor);
              setCurrentBubbleType(targetType);

              // 음성 재생 시간(0.5초) 후 상태 업데이트
              setTimeout(() => {
                setIsVoicePlaying(false);
              }, 500);
            } else {
              // 재생 실패 시에도 게임 진행
              console.log(
                `❌ 스테레오 재생 실패 (터짐 후): 왼쪽=${leftResult.success}, 오른쪽=${rightResult.success}`,
              );
              const targetColor =
                side === "left"
                  ? selectedLeftColor
                  : selectedRightColor;
              const targetType =
                side === "left"
                  ? selectedLeftType
                  : selectedRightType;
              
              setCurrentBubble(targetColor);
              setCurrentBubbleType(targetType);
              setIsVoicePlaying(false);
            }
          }, 800);
        } else {
          // 레벨 1, 2: 기존 방식
          setIsVoicePlaying(true);
          setTimeout(async () => {
            // 레벨 2: 노이즈 먼저 재생
            if (currentLevel === 2) {
              playShortNoise();
            }
            // 색상 음성 재생 (재시도 포함)
            const result = await playColorVoice(
              currentNextBubble,
              currentNextBubbleType,
              undefined,
              "center",
            );

            // 재생 성공한 경우에만 진행
            if (result.success) {
              setCurrentVoiceVersion(result.version);
              console.log(
                `🎵 버블게임 레벨 ${currentLevel} 음성 재생 성공 (터짐 후): ${currentNextBubble}-${result.version} (타입: ${currentNextBubbleType})`,
              );

              // 음성 재생 시간 후 상태 업데이트
              setTimeout(
                () => {
                  setIsVoicePlaying(false);
                },
                (result.duration || 0.5) * 1000,
              );
            } else {
              // 재생 실패 시에도 게임 진행
              console.log(
                `❌ 버블게임 음성 재생 실패 (터짐 후): ${currentNextBubble}`,
              );
              setIsVoicePlaying(false);
            }
          }, 800);
        }

        // 점수 추가 (자동 레벨업 제거됨)
        setScore((prevScore) => {
          const newScore = prevScore + pointsEarned;

          // 🎯 목표점수 달성 여부 즉시 확�� - 이미 달성한 경우에는 체크하지 않음
          const currentTargetScore = getTargetScore();
          if (
            !isAchieved() &&
            currentTargetScore !== null &&
            currentTargetScore > 0
          ) {
            const newAccumulated =
              previousAccumulatedScore + newScore;

            // 목표 달성 시 즉시 게임 종료
            if (
              newAccumulated >= currentTargetScore &&
              !isGameOverRef.current
            ) {
              isGameOverRef.current = true;

              // 게임 기록 저장
              saveGameRecord(
                "bubbleShooter",
                newScore,
                currentLevel,
              );

              // 점수 합산 및 달성 기록
              const achieved = addScore(newScore);
              setDailyAccumulatedScore(getAccumulatedScore());

              if (achieved) {
                recordAchievement("bubbleShooter");
                setShowGoalAchieved(true);
              }

              // 즉시 게임 오버 상태로 전환
              setTimeout(() => {
                setGameState("gameOver");
              }, 100);
            }
          }

          return newScore;
        });

        return newBubbles;
      });
    },
    [
      currentLevel,
      findFloatingBubbles,
      findMatching,
      findMatchingWithInvincible,
      nextBubble,
      nextBubbleType,
    ],
  ); // score 제거 - ��수형 업데이트 사용하므로 불필요

  // attachBubble을 ref에 저장
  useEffect(() => {
    attachBubbleRef.current = attachBubble;
  }, [attachBubble]);

  // 새 레벨 시작
  const startNewLevel = (level: number) => {
    const config = getLevelConfig(level);

    const initialBubbles: Bubble[] = [];
    for (let row = 0; row < config.initialRows; row++) {
      for (let col = 0; col < COLS; col++) {
        const offsetX = row % 2 === 0 ? 0 : BUBBLE_RADIUS;
        const bubble = generateRandomBubble(level, false); // 초기 배치 - 일반 버블만
        initialBubbles.push({
          x: col * BUBBLE_SPACING + BUBBLE_RADIUS + offsetX,
          y: row * ROW_HEIGHT + BUBBLE_RADIUS + TOP_PADDING,
          color: bubble.color,
          type: bubble.type,
          row,
          col,
        });
      }
    }
    setBubbles(initialBubbles);

    const firstBubble = generateRandomBubble(level, true); // 쏘는 공 - 특수 버블 가능
    const secondBubble = generateRandomBubble(level, true); // 쏘는 공 - 특수 버블 가능
    setCurrentBubble(firstBubble.color);
    setCurrentBubbleType(firstBubble.type);
    setNextBubble(secondBubble.color);
    setNextBubbleType(secondBubble.type);
    setShootingBubble(null);
    setHearts(3);
    setTurnCount(0);
    setGridOffset(0); // 새 줄 offset 초기화 (짝수 행으�� 시작)
    dangerTimeRef.current = 0;
    lastDangerCheckRef.current = Date.now();

    // 현재 버블 색 소리 재생
    if (firstBubble.type === "normal") {
      playColorSound(firstBubble.color);
    }
  };

  const handleCanvasClick = (
    e: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    if (
      shootingBubble ||
      gameState !== "playing" ||
      isPaused ||
      isVoicePlaying
    )
      return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 실제 캔버스 크기를 기준 좌표계로 변환
    const scaleX = rect.width / REFERENCE_WIDTH;
    const scaleY = rect.height / REFERENCE_HEIGHT;

    const shooterX = REFERENCE_WIDTH / 2; // 기준 좌표계에서 중앙
    const shooterY = REFERENCE_HEIGHT - 60; // 기준 좌표계에서 발사 위치

    // 클릭 좌표도 기�� 좌표계로 변환
    const referenceClickX = clickX / scaleX;
    const referenceClickY = clickY / scaleY;

    // 마우스 위치로부터 각도 계산
    const rawAngle = Math.atan2(
      mousePos.y - shooterY,
      mousePos.x - shooterX,
    );

    // 발사 가능한 각도 범위로 제한 (위쪽으로만)
    const minAngle = -Math.PI * 0.9;
    const maxAngle = -Math.PI * 0.1;
    const clampedAngle = Math.max(
      minAngle,
      Math.min(maxAngle, rawAngle),
    );

    const speed = 12; // 공 발사 속도
    playClickSound(); // 발사 효과음
    setShootingBubble({
      x: shooterX,
      y: shooterY,
      dx: Math.cos(clampedAngle) * speed,
      dy: Math.sin(clampedAngle) * speed,
      color: currentBubble,
      type: currentBubbleType,
    });
  };

  const handleCanvasMouseMove = (
    e: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    if (shootingBubble || gameState !== "playing" || isPaused)
      return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 캔버스의 표시 크기 대비 실제 해상도 비율 계산

    // 마우스 좌��를 캔버스 해상도 좌표로 변환

    // ��쪽으로만 조준 가능
    // 실제 캔버스 크기를 기준 좌표계로 변환 (handleCanvasClick과 동일한 방식)
    const scaleX = rect.width / REFERENCE_WIDTH;
    const scaleY = rect.height / REFERENCE_HEIGHT;

    // 마우스 좌표를 기�� 좌표계로 변환
    const referenceMouseX = mouseX / scaleX;
    const referenceMouseY = mouseY / scaleY;
    setMousePos({ x: referenceMouseX, y: referenceMouseY });
  };

  // 터치 이벤트 핸들러 추가 (안드로이드 대응)
  const handleCanvasTouchStart = (
    e: React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault(); // 스크롤 방지
    // touchStart에서는 조준선만 업데이트하고 발사하지 않음
    if (shootingBubble || gameState !== "playing" || isPaused)
      return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    // 실제 캔버스 크기를 기준 좌표계로 변환
    const scaleX = rect.width / REFERENCE_WIDTH;
    const scaleY = rect.height / REFERENCE_HEIGHT;

    // 터치 좌표를 기준 좌표계로 변환
    const referenceTouchX = touchX / scaleX;
    const referenceTouchY = touchY / scaleY;

    // mousePos 업데이트 (조준선이 터치 위치를 가리키도록)
    setMousePos({ x: referenceTouchX, y: referenceTouchY });
  };

  const handleCanvasTouchMove = (
    e: React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault(); // 스크롤 방지
    if (shootingBubble || gameState !== "playing" || isPaused)
      return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    // 실제 캔버스 크기를 기준 좌표계로 변환
    const scaleX = rect.width / REFERENCE_WIDTH;
    const scaleY = rect.height / REFERENCE_HEIGHT;

    // 터치 좌표를 기준 좌표계로 변환
    const referenceTouchX = touchX / scaleX;
    const referenceTouchY = touchY / scaleY;
    setMousePos({ x: referenceTouchX, y: referenceTouchY });
  };

  const handleCanvasTouchEnd = (
    e: React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault();
    if (
      shootingBubble ||
      gameState !== "playing" ||
      isPaused ||
      isVoicePlaying
    )
      return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.changedTouches[0]; // touchEnd에서는 changedTouches 사용
    if (!touch) return;

    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    // 실제 캔버스 크기를 기준 좌표계로 변환
    const scaleX = rect.width / REFERENCE_WIDTH;
    const scaleY = rect.height / REFERENCE_HEIGHT;

    const shooterX = REFERENCE_WIDTH / 2;
    const shooterY = REFERENCE_HEIGHT - 60;

    // 터치 좌표를 기준 좌표계로 변환
    const referenceTouchX = touchX / scaleX;
    const referenceTouchY = touchY / scaleY;

    // 터치한 위치로 각도 계산
    const rawAngle = Math.atan2(
      referenceTouchY - shooterY,
      referenceTouchX - shooterX,
    );

    // 발사 가능한 각도 범위로 제한 (위쪽으로만)
    const minAngle = -Math.PI * 0.9;
    const maxAngle = -Math.PI * 0.1;
    const clampedAngle = Math.max(
      minAngle,
      Math.min(maxAngle, rawAngle),
    );

    const speed = 12;
    playClickSound();
    setShootingBubble({
      x: shooterX,
      y: shooterY,
      dx: Math.cos(clampedAngle) * speed,
      dy: Math.sin(clampedAngle) * speed,
      color: currentBubble,
      type: currentBubbleType,
    });
  };

  const resetGame = () => {
    playSelectSound();

    // 게임 시작 전 누적 점수 저장 및 게임 오버 플래�� 초기화
    setPreviousAccumulatedScore(dailyAccumulatedScore);
    setShowGoalAchieved(false);
    isGameOverRef.current = false;

    const config = getLevelConfig(currentLevel);

    const initialBubbles: Bubble[] = [];
    for (let row = 0; row < config.initialRows; row++) {
      for (let col = 0; col < COLS; col++) {
        const offsetX = row % 2 === 0 ? 0 : BUBBLE_RADIUS;
        const bubble = generateRandomBubble(
          currentLevel,
          false,
        ); // 초기 배치 - 일반 버블만
        initialBubbles.push({
          x: col * BUBBLE_SPACING + BUBBLE_RADIUS + offsetX,
          y: row * ROW_HEIGHT + BUBBLE_RADIUS + TOP_PADDING,
          color: bubble.color,
          type: bubble.type,
          row,
          col,
        });
      }
    }
    setBubbles(initialBubbles);

    const firstBubble = generateRandomBubble(
      currentLevel,
      true,
    ); // 쏘는 공 - 특수 버블 가능
    const secondBubble = generateRandomBubble(
      currentLevel,
      true,
    ); // 쏘는 공 - 특수 버블 가능
    setCurrentBubble(firstBubble.color);
    setCurrentBubbleType(firstBubble.type);
    setNextBubble(secondBubble.color);
    setNextBubbleType(secondBubble.type);
    setShootingBubble(null);
    setScore(0);
    setHearts(3);
    setTurnCount(0);
    setGridOffset(0); // 초기화
    dangerTimeRef.current = 0;
    lastDangerCheckRef.current = Date.now();
    setGameState("playing");

    // 현재 버블 색 음성 안내 재생
    if (currentLevel === 3) {
      // 🎵 레벨 3: 모든 공(일반/무적/꽝) 좌우 스테레오로 재생
      const side = Math.random() < 0.5 ? "left" : "right";
      setTargetSide(side);

      setIsVoicePlaying(true);
      (async () => {
        const levelColors = config.colorIndices.map(
          (idx) => COLORS[idx],
        );

        let selectedLeftColor: string;
        let selectedLeftType: "normal" | "invincible" | "bomb";
        let selectedRightColor: string;
        let selectedRightType: "normal" | "invincible" | "bomb";

        // 현재 버블이 특수 공인 경우, 한쪽은 특수 공 음성
        if (firstBubble.type === "invincible" || firstBubble.type === "bomb") {
          const specialSide = Math.random() < 0.5 ? "left" : "right";
          const randomColor = levelColors[
            Math.floor(Math.random() * levelColors.length)
          ];

          if (specialSide === "left") {
            selectedLeftColor = firstBubble.color;
            selectedLeftType = firstBubble.type;
            selectedRightColor = randomColor;
            selectedRightType = "normal";
          } else {
            selectedLeftColor = randomColor;
            selectedLeftType = "normal";
            selectedRightColor = firstBubble.color;
            selectedRightType = firstBubble.type;
          }
        } else {
          // 일반 공인 경우, 양쪽 모두 랜덤 색상
          selectedLeftColor =
            levelColors[
              Math.floor(Math.random() * levelColors.length)
            ];
          let rightColor =
            levelColors[
              Math.floor(Math.random() * levelColors.length)
            ];

          // 같은 색이면 다른 색 선택
          while (
            rightColor === selectedLeftColor &&
            levelColors.length > 1
          ) {
            rightColor =
              levelColors[
                Math.floor(Math.random() * levelColors.length)
              ];
          }

          selectedRightColor = rightColor;
          selectedLeftType = "normal";
          selectedRightType = "normal";
        }

        // 좌우 같은 버전 번호 선택
        const version = Math.floor(Math.random() * 4) + 1;
        setCurrentVoiceVersion(version);

        // 좌우 색상 저장
        setLeftColor(selectedLeftColor);
        setRightColor(selectedRightColor);

        console.log(
          `🎵 버블게임 레벨 3 스테레오 재생 (재시작): 왼쪽=${selectedLeftColor}(${selectedLeftType})-${version}, 오른쪽=${selectedRightColor}(${selectedRightType})-${version}, 타겟=${side}`,
        );

        // 동시에 좌우 재생
        const [leftResult, rightResult] = await Promise.all([
          playColorVoice(
            selectedLeftColor,
            selectedLeftType,
            version,
            "left",
          ),
          playColorVoice(
            selectedRightColor,
            selectedRightType,
            version,
            "right",
          ),
        ]);

        // 둘 다 성공한 경우에만 진행
        if (leftResult.success && rightResult.success) {
          console.log(`✅ 스테레오 재생 성공 (재시작)`);

          // 타겟 쪽의 색상과 타입으로 설정
          const targetColor =
            side === "left"
              ? selectedLeftColor
              : selectedRightColor;
          const targetType =
            side === "left"
              ? selectedLeftType
              : selectedRightType;
          
          setCurrentBubble(targetColor);
          setCurrentBubbleType(targetType);

          // 음성 재생 시간(0.5초) 후 상태 업데이트
          setTimeout(() => {
            setIsVoicePlaying(false);
          }, 500);
        } else {
          // 재생 실패 시에도 게임 진행
          console.log(
            `❌ 스테레오 재생 실패 (재시작): 왼쪽=${leftResult.success}, 오른쪽=${rightResult.success}`,
          );
          const targetColor =
            side === "left"
              ? selectedLeftColor
              : selectedRightColor;
          const targetType =
            side === "left"
              ? selectedLeftType
              : selectedRightType;
          
          setCurrentBubble(targetColor);
          setCurrentBubbleType(targetType);
          setIsVoicePlaying(false);
        }
      })();
    } else {
      // 레벨 1, 2: 기존 방식
      setIsVoicePlaying(true);
      (async () => {
        const result = await playColorVoice(
          firstBubble.color,
          firstBubble.type,
          undefined,
          "center",
          (duration) => {
            // 음성 파일이 재생되기 직전에 노이즈 시작
            if (currentLevel === 2) {
              playShortNoise(duration);
            }
          },
        );

        // 재생 성공한 경우에만 진행
        if (result.success) {
          setCurrentVoiceVersion(result.version);
          console.log(
            `🎵 버블게임 레벨 ${currentLevel} 음성 재생 성공 (재시작): ${firstBubble.color}-${result.version} (타입: ${firstBubble.type})`,
          );

          // 음성 재생 시간 후 상태 업데이트 (duration이 있으면 사용, 없으면 0.5초)
          setTimeout(
            () => {
              setIsVoicePlaying(false);
            },
            (result.duration || 0.5) * 1000,
          );
        } else {
          // 재생 실패 시에도 게임 진행
          console.log(
            `❌ 버블게임 음성 재생 실패 (재시작): ${firstBubble.color}`,
          );
          setIsVoicePlaying(false);
        }
      })();
    }
  };

  // 일시정지 핸들러
  const handlePause = () => {
    if (gameState !== "playing") return;

    playClickSound();
    setIsPaused(true);

    // 현재 게임 상태 저장
    setSavedGameState({
      score,
      hearts,
      bubbles,
      currentBubble,
      currentBubbleType,
      level: currentLevel,
      turnCount,
    });
  };

  const handleResume = () => {
    playClickSound();
    setIsPaused(false);
    lastDangerCheckRef.current = Date.now();

    // 저장된 상태 복원
    if (savedGameState) {
      setScore(savedGameState.score);
      setHearts(savedGameState.hearts);
      setBubbles(savedGameState.bubbles);
      setCurrentBubble(savedGameState.currentBubble);
      setCurrentBubbleType(savedGameState.currentBubbleType);
      setCurrentLevel(savedGameState.level);
      setTurnCount(savedGameState.turnCount);
    }
  };

  const handleRestart = () => {
    playSelectSound();
    setIsPaused(false);
    setSavedGameState(null);
    resetGame();
  };

  const handleExit = () => {
    playBackSound();
    setIsPaused(false);
    setSavedGameState(null);
    onBack();
  };

  // 게임 오버 시 기록 저장
  useEffect(() => {
    if (gameState === "gameOver" && !isGameOverRef.current) {
      isGameOverRef.current = true;

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
          recordAchievement("bubbleShooter");
          setShowGoalAchieved(true);
        } else {
          setShowGoalAchieved(false);
        }
      }

      saveGameRecord("bubbleShooter", score, currentLevel);
    }
  }, [gameState, score, currentLevel, dailyTargetScore]);

  // 컴포넌트 마운트 시 추천 레벨 계산
  useEffect(() => {
    const records = getGameRecord("bubbleShooter");
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
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-amber-50 p-4 pb-[env(safe-area-inset-bottom)] flex flex-col pt-[max(env(safe-area-inset-top),3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center">
          {/* Ready 상태일 때만 뒤로가기 버튼 */}
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
                className="h-8 w-8 object-contain"
              />
            </button>
          )}

          {/* Playing, Countdown 또는 GameOver 상태일 때는 일시정지 버튼과 설정 버튼 */}
          {((gameState === "playing" && !isPaused) ||
            gameState === "gameOver" ||
            gameState === "countdown") && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePause}
                disabled={gameState === "countdown"}
                className={`bg-transparent hover:bg-transparent border-none p-2 cursor-pointer ${gameState === "countdown" ? "opacity-30 cursor-not-allowed" : ""}`}
              >
                <ImageWithFallback
                  src={pauseIcon}
                  alt="pause"
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

          {/* GameOver 상태일 때는 빈 공간 */}

          {/* Ready 상태일 때만 타이틀 표시 */}
          {gameState === "ready" && (
            <>
              <h1
                className="text-gray-700 ml-4 text-4xl cursor-pointer"
                style={{ fontFamily: "OngleipRyudung" }}
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
                버블 게임{devMode && " 🔧"}
              </h1>
              {devMode && (
                <>
                  <button
                    onClick={() => {
                      localStorage.removeItem(
                        "bubbleShooter_dailyGoal",
                      );
                      const newTarget = getTargetScore();
                      setDailyTargetScore(newTarget);
                      setDailyAccumulatedScore(0);
                      setAnimatedAccumulatedScore(0);
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
                          "bubbleShooter_dailyGoal",
                        );
                      if (dailyGoalData) {
                        const data = JSON.parse(dailyGoalData);
                        data.accumulatedScore = 0;
                        data.achieved = false;
                        localStorage.setItem(
                          "bubbleShooter_dailyGoal",
                          JSON.stringify(data),
                        );
                        setDailyAccumulatedScore(0);
                        setAnimatedAccumulatedScore(0);
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
            </>
          )}
        </div>

        {(gameState === "playing" ||
          gameState === "gameOver" ||
          gameState === "countdown") && (
          <div className="flex items-center gap-4">
            {/* 하트 */}
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  className={`h-7 w-7 ${i < hearts ? "text-[#cd6c58]" : "fill-gray-300 text-gray-300"}`}
                  fill={i < hearts ? "#cd6c58" : undefined}
                />
              ))}
            </div>

            {/* 점수 */}
            <div
              className="bg-white/80 px-6 py-2 rounded-lg"
              style={{ position: "relative", zIndex: 50 }}
            >
              <span className="text-2xl">점수: {score}</span>
            </div>
          </div>
        )}
      </div>

      {/* Ready 상태일 때 게임 설명 */}
      {gameState === "ready" && (
        <>
          <p className="text-2xl text-gray-700 text-center mb-4">
            *이어폰(헤드폰) 착용 필수
            <br />
            같은 색 버블이 3개 이상 모이면 버블이 터집니다!
            <br />
            발사 버블의 색은 소리로만 알 수 있습니다
          </p>
          <p
            className="text-2xl text-center mb-1"
            style={{ color: "#e5a652" }}
          >
            일일 목표점수:{" "}
            {dailyTargetScore === null || dailyTargetScore === 0
              ? "측정중..."
              : `${dailyTargetScore}점`}
          </p>
          <p
            className="text-2xl text-center mb-4"
            style={{ color: "#e5a652" }}
          >
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
                levelName="4가지 버블"
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
                    setTimeout(
                      () => setShowNoEnergyAlert(false),
                      2000,
                    );
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
                levelName="6가지 버블"
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
                    setTimeout(
                      () => setShowNoEnergyAlert(false),
                      2000,
                    );
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
                levelName="9가지 버블"
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
                    setTimeout(
                      () => setShowNoEnergyAlert(false),
                      2000,
                    );
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

            {/* 텍스트는 중앙, 물음표 버튼은 오른쪽 상단에 고정 */}
            <p className="text-2xl text-gray-700 mt-4 text-center">
              난이도를 선택하세요
            </p>

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

      {/* 게임 설명 모달 */}
      <GameRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        title="버블 게임 설명"
        primaryColor="#e5a652"
        backgroundColor="#fef3c7"
        scrollbarColor="#e5a652"
        scrollbarTrackColor="#fef3c7"
        onCloseSound={playClickSound}
      >
        <RuleSection title="게임 방법" titleColor="#e5a652">
          <p className="mb-4">
            방향을 조준하고 공을 발사합니다
          </p>
          <RuleList
            items={[
              "소리를 듣고 발사 버블의 색을 알 수 있습니다.",
              "같은 색 버블이 3개 이상 모이면 버블이 터집니다.",
              "주황 위험선을 넘으면 시간이 흐릅니다. 10초 안에 위험선 아래 버블을 없애지 못하면 하트를 잃습니다.",
              "버블이 빨간선에 닿으면 하트 개수에 상관없이 즉시 게임 오버됩니다.",
              "하트가 모두 사라지면 게임이 종료됩니다",
            ]}
          />
        </RuleSection>

        <RuleSection title="특수 버블" titleColor="#e5a652">
          <RuleList
            items={[
              <>
                <strong>무적버블 (무지개색)</strong>: 어떤
                색과도 붙어서 터뜨릴 수 있는 만능 버블
              </>,
              <>
                <strong>꽝버블 (회색)</strong>: 절대 터뜨릴 수
                없는 버블
              </>,
            ]}
          />
        </RuleSection>

        <RuleSection title="점수" titleColor="#e5a652">
          <RuleList
            items={[
              <>
                <strong>쉬움</strong>: 사라지는 버블당 10점
              </>,
              <>
                <strong>보통</strong>: 사라지는 버블당 20점
              </>,
              <>
                <strong>어려움</strong>: 사라지는 버블당 30점
              </>,
            ]}
          />
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
            <p
              className="text-2xl mb-6"
              style={{
                fontFamily: "OngleipRyudung",
                color: "#675c4e",
              }}
            >
              에너지가
              <br />
              부족합니다!
            </p>
            <button
              onClick={() => {
                playClickSound();
                setShowNoEnergyAlert(false);
              }}
              className="bg-[#e5a652] text-white px-8 py-3 rounded-lg text-xl hover:bg-[#d49542] transition-colors"
              style={{ fontFamily: "OngleipRyudung" }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Game Canvas */}
      {gameState !== "ready" && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          {/* 카운트다운 화면 */}
          {gameState === "countdown" && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div
                  className="text-9xl"
                  style={{
                    fontFamily: "OngleipRyudung",
                    color: "#e5a652",
                  }}
                >
                  {countdown}
                </div>
              </div>
            </div>
          )}

          {/* Playing 상태일 때 안내 메시지 */}
          {gameState === "playing" && (
            <div className="h-12 flex items-center justify-center mb-2">
              <div
                className="text-3xl animate-pulse"
                style={{ color: "#e5a652" }}
              >
                {isVoicePlaying
                  ? "음성에 집중하세요!"
                  : currentLevel === 3
                    ? targetSide === "left"
                      ? "왼쪽에서 들린 색상의 버블을 발사하세요!"
                      : "오른쪽에서 들린 색상의 버블을 발사하세요!"
                    : "버블을 발사하세요!"}
              </div>
            </div>
          )}

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

          {gameState !== "countdown" && (
            <div className="relative max-w-md w-full aspect-[3/4] max-h-[70vh] overflow-hidden flex-shrink">
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair"
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onTouchStart={handleCanvasTouchStart}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={handleCanvasTouchEnd}
              />

              {/* 위험선 타이머 */}
              {gameState === "playing" && dangerTimer > 0 && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
                  <div className="text-xl">
                    경고: {Math.ceil(10 - dangerTimer)}초
                  </div>
                </div>
              )}

              {/* 하트 감소 텍스트 - 화면 중앙에 표시 */}
              {showHeartLoss && (
                <div
                  className="absolute pointer-events-none z-30 flex items-center gap-1"
                  style={{
                    left: "50%",
                    top: "40%",
                    transform: "translateX(-50%)",
                    animation:
                      "floatUpHeart 2.5s ease-out forwards",
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
                      flexShrink: 0,
                    }}
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  <span
                    style={{
                      fontSize: "56px",
                      fontWeight: "bold",
                      color: "#FFD700",
                      textShadow: "3px 3px 6px rgba(0,0,0,0.7)",
                      fontFamily:
                        "'OngleipRyudung', sans-serif",
                    }}
                  >
                    -1
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 다시듣기 버튼 */}
          {gameState !== "countdown" && (
            <div className="mt-6 h-16 flex items-center justify-center flex-shrink-0">
              {gameState === "playing" &&
                !isPaused &&
                !isVoicePlaying &&
                (() => {
                  // 레벨별 다시듣기 비용 계산
                  const replayCost =
                    currentLevel === 1
                      ? 5
                      : currentLevel === 2
                        ? 10
                        : 15;
                  const canReplay = score >= replayCost;

                  return canReplay ? (
                    <button
                      onClick={() => {
                        // playClickSound(); 제거 - 색상 안내 소리와 겹치지 않도록
                        // 점수 차감
                        setScore(
                          (prevScore) => prevScore - replayCost,
                        );
                        setIsVoicePlaying(true);

                        if (currentLevel === 3) {
                          // 레벨 3: 좌우 색상 다시 재생 (저장된 버전 사용)
                          playColorVoice(
                            leftColor,
                            "normal",
                            currentVoiceVersion,
                            "left",
                          );
                          playColorVoice(
                            rightColor,
                            "normal",
                            currentVoiceVersion,
                            "right",
                          );
                        } else if (currentLevel === 2) {
                          // 레벨 2: 노이즈 먼저 재생 후 색상 음성 재생 (저장된 버전 사용)
                          playShortNoise();
                          playColorVoice(
                            currentBubble,
                            currentBubbleType,
                            currentVoiceVersion,
                            "center",
                          );
                        } else {
                          // 레벨 1: 저장된 버전으로 다시 재생
                          playColorVoice(
                            currentBubble,
                            currentBubbleType,
                            currentVoiceVersion,
                          );
                        }

                        // 음성 재생 시간(0.5초) 후 상태 업데이트
                        setTimeout(() => {
                          setIsVoicePlaying(false);
                        }, 500);
                      }}
                      className="relative hover:scale-105 active:scale-95 transition-transform"
                    >
                      <ImageWithFallback
                        src={replayButtonBg}
                        alt="다시듣기"
                        className="h-16 w-auto object-contain"
                      />
                      <span
                        className="absolute inset-0 flex items-center justify-center text-xl"
                        style={{ color: "#ffffff" }}
                      >
                        다시듣기 -{replayCost}점
                      </span>
                    </button>
                  ) : null;
                })()}
            </div>
          )}
        </div>
      )}

      {/* 일시정지 메뉴 */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div
            className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat animate-in zoom-in-95 duration-200"
            style={{ backgroundImage: `url(${pauseMenuBg})` }}
          >
            <h2
              className="text-center mb-6 mt-4 text-4xl"
              style={{ color: "#eae4d3" }}
            >
              일시정지
            </h2>

            <div className="space-y-0">
              {/* 이어서 버튼 */}
              <button
                onClick={handleResume}
                className="w-full bg-transparent py-2 px-6 transition-all duration-200 flex items-center justify-center gap-3 hover:scale-110"
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

              {/* 처음부터 버튼 */}
              <button
                onClick={handleRestart}
                className="w-full bg-transparent py-2 px-6 transition-all duration-200 flex items-center justify-center gap-3 hover:scale-110"
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

              {/* 나가기 버튼 */}
              <button
                onClick={handleExit}
                className="w-full bg-transparent py-2 px-6 transition-all duration-200 flex items-center justify-center gap-3 hover:scale-110"
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

      {/* 게임 오버 모달 */}
      {gameState === "gameOver" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div
            className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat animate-in zoom-in-95 duration-200"
            style={{ backgroundImage: `url(${pauseMenuBg})` }}
          >
            {showGoalAchieved ? (
              <>
                <h2
                  className="text-center mb-4 mt-4 text-4xl"
                  style={{ color: "#eae4d3" }}
                >
                  목표 달성!
                </h2>
                <div
                  className="text-center mb-6 text-2xl"
                  style={{ color: "#d4c5a0" }}
                >
                  일일 목표점수: {dailyTargetScore}점
                </div>
              </>
            ) : (
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
                onClick={resetGame}
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
  );
}