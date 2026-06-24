import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { Heart, X } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { GameRulesButton } from "../GameRulesButton";
import { GameRulesModal, RuleSection, RuleList } from "../GameRulesModal";
import { playBackSound, playClickSound, playSelectSound } from "../../utils/sound";
import { saveGameRecord, getGameRecord, recordAchievement } from "../../utils/gameRecord";
import { getEnergy, useEnergy, hasEnergy } from "../../utils/globalEnergy";
import { getTargetScore, setMeasuredScore, getAccumulatedScore, addScore, isAchieved } from "../../utils/clickInOrderDailyGoal";
import { LevelButton } from "./LevelButton";
import squareImg from "figma:asset/ff0ffe7f30fede33a654f735361390b361a09a64.png";
import circleImg from "figma:asset/2bd4c49592c3ddd60014537bb102754357a9e302.png";
import xMarkImg from "figma:asset/e8be98e87b6faeefb67d27b3fae42ae4999e08f7.png";
import pauseIcon from "figma:asset/8acb1e015c5c90586e07679819984941b38f74af.png";
import resumeIcon from "figma:asset/62327073bfb38b1feb704b5c6f1eb2a36789eee8.png";
import restartIcon from "figma:asset/d1a45328f3c2f5290d250ff17f71584c907a61a7.png";
import exitIcon from "figma:asset/74b1288f91a03a19fc199ba8e3ce487eebb3c1fb.png";
import pauseMenuBg from "figma:asset/54f8a82ff3f9348da47c92cd7e8e9b17adc71522.png";
import pauseExitIcon from "figma:asset/7b6920cff9236248c28a92364a77c6df5be27012.png";
import levelButtonBg from "figma:asset/5d455998023ef79fbbf223eaf0a0e503e73de2f2.png";
import checkIconGray from "figma:asset/2481c41f3b40adb897713a482226b3b07f990883.png";
import xIconRed from "figma:asset/6e7571d0e1cde7b66675af17f6a00a2752bfa47a.png";

interface ClickInOrderProps {
  onBack: () => void;
}

type GameState = "ready" | "countdown" | "showing" | "waiting" | "checking" | "correct" | "wrong" | "gameOver";

export function ClickInOrder({ onBack }: ClickInOrderProps) {
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [gameState, setGameState] = useState<GameState>("ready");
  const [sequence, setSequence] = useState<number[]>([]);
  const [userClicks, setUserClicks] = useState<number[]>([]);
  const [showingIndex, setShowingIndex] = useState<number | null>(null);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [recommendedLevel, setRecommendedLevel] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [countdown, setCountdown] = useState(3); // 카운트다운 state 추가
  const isPausedRef = useRef(false);
  const sequenceTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const wrongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const correctTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
  
  const [savedGameStateData, setSavedGameStateData] = useState<{
    score: number;
    hearts: number;
    round: number;
    level: number;
    sequence: number[];
    userClicks: number[];
    gameState: GameState;
    showingIndex: number | null;
    sequenceProgress: number; // 몇 번째 원까지 보여줬는지
    originalGameState?: GameState; // 일시정지 시 원래 상태 (correct/wrong)
  } | null>(null);

  // 레벨에 따른 그리드 크기
  const gridSize = currentLevel === 1 ? 4 : currentLevel === 2 ? 6 : 9; // 레벨1: 2x2 = 4 cells, 레벨2: 2x3 = 6 cells, 레벨3: 3x3 = 9 cells
  const gridCols = currentLevel === 1 ? 2 : 3;
  
  // 현재 시퀀스 진행도를 추적하는 ref
  const sequenceProgressRef = useRef(0);

  // 라운드별 시퀀스 길이
  const getSequenceLength = () => {
    if (currentLevel === 1) {
      return Math.min(round + 2, 6); // 라운드 0~4: 2~6개, 그 이후 계속 6개
    } else if (currentLevel === 2) {
      // 레벨 2: 라운드 0~4는 4~8개, 그 이후는 계속 8개
      return Math.min(round + 4, 8);
    } else {
      // 레벨 3: 라운드 0~4는 6~10개, 그 이후는 계속 10개
      return Math.min(round + 6, 10);
    }
  };

  // 게임 시작
  const startGame = () => {
    playSelectSound();
    
    // 게임 시작 전 누적 점수 저장 및 게임 오버 플래그 초기화
    setPreviousAccumulatedScore(dailyAccumulatedScore);
    setShowGoalAchieved(false);
    isGameOverRef.current = false;
    
    setScore(0);
    setHearts(3);
    setRound(0);
    setCurrentLevel(selectedLevel);
    setCountdown(3); // 카운트다운 초기화
    setGameState("countdown"); // 카운트다운 상태로 시작
  };

  // 라운드 시작
  const startRound = (roundNumber: number = round, level: number = currentLevel) => {
    // 레벨 설정 (카운트다운 후 처음 시작할 때)
    if (level !== currentLevel) {
      setCurrentLevel(level);
    }
    
    // 기존 타이머들 정리
    sequenceTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    sequenceTimeoutsRef.current = [];
    if (wrongTimeoutRef.current) clearTimeout(wrongTimeoutRef.current);
    if (correctTimeoutRef.current) clearTimeout(correctTimeoutRef.current);
    
    let length;
    const currentGridSize = level === 1 ? 4 : level === 2 ? 6 : 9;
    
    if (level === 1) {
      length = Math.min(roundNumber + 2, 6); // 라운드 0~4: 2~6개, 그 이후 계속 6개
    } else if (level === 2) {
      // 레벨 2: 라운드 0~4는 4~8개, 그 이후는 계속 8개
      length = Math.min(roundNumber + 4, 8);
    } else {
      // 레벨 3: 라운드 0~4는 6~10개, 그 이후는 계속 10개
      length = Math.min(roundNumber + 6, 10);
    }
    
    const newSequence: number[] = [];
    
    // 랜덤 시퀀스 생성 (직전 위치와 다르게)
    for (let i = 0; i < length; i++) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * currentGridSize);
      } while (i > 0 && randomIndex === newSequence[i - 1]);
      
      newSequence.push(randomIndex);
    }
    
    setSequence(newSequence);
    setUserClicks([]);
    setShowingIndex(null);
    setGameState("showing");
    sequenceProgressRef.current = 0; // 진행도 초기화
    showSequence(newSequence, 0);
  };

  // 시퀀스 보여주기 - startIndex부터 시작
  const showSequence = (seq: number[], startIndex: number = 0) => {
    // 기존 타임아웃 모두 정리
    sequenceTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    sequenceTimeoutsRef.current = [];
    
    let delay = 0;
    
    // startIndex부터 시작
    for (let i = startIndex; i < seq.length; i++) {
      const cellIndex = seq[i];
      
      // 대기 시간
      delay += 500;
      
      // 원 표시
      const showTimeout = setTimeout(() => {
        if (isPausedRef.current) return;
        setShowingIndex(cellIndex);
        sequenceProgressRef.current = i; // 진행도 업데이트
        playClickSound();
      }, delay);
      sequenceTimeoutsRef.current.push(showTimeout);
      
      // 원 표시 시간
      delay += 800;
      
      // 원 숨기기
      const hideTimeout = setTimeout(() => {
        if (isPausedRef.current) return;
        setShowingIndex(null);
      }, delay);
      sequenceTimeoutsRef.current.push(hideTimeout);
    }
    
    // 마지막 추가 대기 후 waiting 상태로 전환
    delay += 500;
    const finalTimeout = setTimeout(() => {
      if (isPausedRef.current) return;
      setGameState("waiting");
      sequenceProgressRef.current = 0; // 완료 후 초기화
    }, delay);
    sequenceTimeoutsRef.current.push(finalTimeout);
  };

  // 일시정지 핸들러
  const handlePause = () => {
    if (gameState === "ready" || gameState === "gameOver") return;
    
    playClickSound();
    isPausedRef.current = true;
    setIsPaused(true);
    
    // 모든 타이머 정리
    sequenceTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    sequenceTimeoutsRef.current = [];
    if (wrongTimeoutRef.current) {
      clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = null;
    }
    if (correctTimeoutRef.current) {
      clearTimeout(correctTimeoutRef.current);
      correctTimeoutRef.current = null;
    }
    
    // 현재 게임 상태 저장
    // correct/wrong 상태만 waiting으로 변경 (showing은 유지)
    const stateToSave = gameState === "correct" || gameState === "wrong" ? "waiting" : gameState;
    
    setSavedGameStateData({
      score,
      hearts,
      round,
      level: currentLevel,
      sequence,
      userClicks: gameState === "correct" || gameState === "wrong" ? [] : userClicks,
      gameState: stateToSave,
      showingIndex: null,
      sequenceProgress: sequenceProgressRef.current,
      originalGameState: gameState === "correct" || gameState === "wrong" ? gameState : undefined
    });
    
    // 시각적 상태 초기화
    setShowingIndex(null);
    setWrongIndex(null);
    setClickedIndex(null);
  };

  const handleResume = () => {
    playClickSound();
    setIsClosing(true);
    
    // 애니메이션 대기
    setTimeout(() => {
      isPausedRef.current = false;
      setIsPaused(false);
      setIsClosing(false);
      
      // 저장된 상태 복원
      if (savedGameStateData) {
        setScore(savedGameStateData.score);
        setHearts(savedGameStateData.hearts);
        setRound(savedGameStateData.round);
        setCurrentLevel(savedGameStateData.level);
        setSequence(savedGameStateData.sequence);
        setUserClicks(savedGameStateData.userClicks);
        setShowingIndex(null);
        setGameState(savedGameStateData.gameState);
        
        // showing 상태였다면 시퀀스를 이어서 보여주기
        if (savedGameStateData.gameState === "showing") {
          // 일시정지 시 마지막으로 보여준 인덱스 다음부터 시작
          const nextIndex = savedGameStateData.sequenceProgress + 1;
          showSequence(savedGameStateData.sequence, nextIndex);
        }
        // correct 상태였다면 다음 라운드로 넘어가기
        else if (savedGameStateData.originalGameState === "correct") {
          const correctTimeout = setTimeout(() => {
            const nextRound = savedGameStateData.round + 1;
            setRound(nextRound);
            startRound(nextRound, savedGameStateData.level);
          }, 500);
          correctTimeoutRef.current = correctTimeout;
          sequenceTimeoutsRef.current.push(correctTimeout);
        }
        // wrong 상태였다면 같은 라운드 다시 시작
        else if (savedGameStateData.originalGameState === "wrong") {
          const wrongTimeout = setTimeout(() => {
            if (savedGameStateData.hearts <= 0) {
              setGameState("gameOver");
            } else {
              startRound(savedGameStateData.round, savedGameStateData.level);
            }
          }, 500);
          wrongTimeoutRef.current = wrongTimeout;
          sequenceTimeoutsRef.current.push(wrongTimeout);
        }
      }
    }, 200);
  };

  const handleRestart = () => {
    playSelectSound();
    isPausedRef.current = false;
    setIsPaused(false);
    setSavedGameStateData(null);
    startGame();
  };

  const handleExit = () => {
    playBackSound();
    isPausedRef.current = false;
    setIsPaused(false);
    setSavedGameStateData(null);
    onBack();
  };

  // 셀 클릭
  const handleCellClick = (index: number) => {
    if (gameState !== "waiting" || isPaused) return;
    
    playClickSound();
    const newUserClicks = [...userClicks, index];
    setUserClicks(newUserClicks);

    // 현재까지 클릭한 것이 맞는지 확인
    const currentIndex = newUserClicks.length - 1;
    
    if (newUserClicks[currentIndex] !== sequence[currentIndex]) {
      // 틀렸음 - 빨간 X 표시
      playBackSound(); // 오답 효과음
      setWrongIndex(index);
      setGameState("wrong");
      const newHearts = hearts - 1;
      setHearts(newHearts);
      
      const wrongTimeout = setTimeout(() => {
        if (isPausedRef.current) return;
        setWrongIndex(null);
        if (newHearts <= 0) {
          // 🔥 하트 0 시 게임 오버 - 즉시 목표 달성 여부 확인
          isGameOverRef.current = true; // useEffect 중복 실행 방지
          
          saveGameRecord("clickInOrder", score, currentLevel);
          
          // 측정 중이었으면 목표점수 갱신
          if (dailyTargetScore === null || dailyTargetScore === 0) {
            setMeasuredScore(score);
            const newTarget = score > 0 ? score * 3 : 0;
            setDailyTargetScore(newTarget);
            setDailyAccumulatedScore(getAccumulatedScore());
            setShowGoalAchieved(false);
          } else {
            // 목표점수가 설정되어 있으면 점수 추가 및 목표 달성 여부 확인
            const achieved = addScore(score);
            setDailyAccumulatedScore(getAccumulatedScore());
            
            if (achieved) {
              recordAchievement("clickInOrder");
              setShowGoalAchieved(true);
            } else {
              setShowGoalAchieved(false);
            }
          }
          
          setGameState("gameOver");
        } else {
          // 같은 라운드 다시 시작
          startRound(round, currentLevel);
        }
      }, 1000);
      wrongTimeoutRef.current = wrongTimeout;
      sequenceTimeoutsRef.current.push(wrongTimeout);
      return;
    }

    // 정답 - 원 표시
    setClickedIndex(index);
    const clickTimeout = setTimeout(() => {
      if (isPausedRef.current) return;
      setClickedIndex(null);
    }, 300);
    sequenceTimeoutsRef.current.push(clickTimeout);

    // 시퀀스를 모두 맞췄는지 확인
    if (newUserClicks.length === sequence.length) {
      setGameState("correct");
      playSelectSound(); // 정답 효과음 추가
      
      // 레벨에 따라 점수 증가
      let scoreIncrease = 10;
      if (currentLevel === 2) {
        scoreIncrease = 20;
      } else if (currentLevel === 3) {
        scoreIncrease = 30;
      }
      const newScore = score + scoreIncrease;
      setScore(newScore);
      
      // 🔥 목표 달성 여부 실시간 확인 - 이미 달성한 경우에는 체크하지 않음
      if (!isAchieved() && dailyTargetScore !== null && dailyTargetScore > 0) {
        const projectedTotal = previousAccumulatedScore + newScore;
        
        if (projectedTotal >= dailyTargetScore) {
          // 목표 달성! 즉시 게임 종료
          const correctTimeout = setTimeout(() => {
            if (isPausedRef.current) return;
            
            // 점수 저장 및 목표 달성 처리
            isGameOverRef.current = true;
            saveGameRecord("clickInOrder", newScore, currentLevel);
            
            // 측정 중이었으면 목표점수 갱신 (이 경우는 없겠지만 안전장치)
            if (dailyTargetScore === null || dailyTargetScore === 0) {
              setMeasuredScore(newScore);
              const newTarget = newScore > 0 ? newScore * 3 : 0;
              setDailyTargetScore(newTarget);
              setDailyAccumulatedScore(getAccumulatedScore());
              setShowGoalAchieved(false);
            } else {
              // 목표점수가 설정되어 있으면 점수 추가 및 목표 달성
              addScore(newScore);
              setDailyAccumulatedScore(getAccumulatedScore());
              recordAchievement("clickInOrder");
              setShowGoalAchieved(true);
            }
            
            setGameState("gameOver");
          }, 1000);
          correctTimeoutRef.current = correctTimeout;
          sequenceTimeoutsRef.current.push(correctTimeout);
          return;
        }
      }
      
      // 목표 미달성 시 다음 라운드로
      const correctTimeout = setTimeout(() => {
        if (isPausedRef.current) return;
        
        // 모든 레벨에서 계속 진행 (하트 없어질 때까지)
        const nextRound = round + 1;
        setRound(nextRound);
        startRound(nextRound, currentLevel);
      }, 1000);
      correctTimeoutRef.current = correctTimeout;
      sequenceTimeoutsRef.current.push(correctTimeout);
    }
  };

  // 게임 오버 시 기록 저장 - 하트 0으로 종료된 경우는 이미 처리되었으므로 여기서는 추가 처리 불필요
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
        const achieved = addScore(score);
        setDailyAccumulatedScore(getAccumulatedScore());
        
        if (achieved) {
          recordAchievement("clickInOrder");
          setShowGoalAchieved(true);
        } else {
          setShowGoalAchieved(false);
        }
      }
      
      saveGameRecord("clickInOrder", score, currentLevel);
    }
  }, [gameState, score, currentLevel, dailyTargetScore]);

  // 컴포넌트 마운트 시 추천 레벨 계산
  useEffect(() => {
    const records = getGameRecord("clickInOrder");
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
  
  // 카운트다운 로직
  useEffect(() => {
    if (gameState !== "countdown") return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // 카운트다운 종료 후 첫 라운드 시작 - selectedLevel 사용
      startRound(0, selectedLevel);
    }
  }, [gameState, countdown, selectedLevel]);
  
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
      if (isDevMode && (gameState === 'showing' || gameState === 'waiting' || gameState === 'checking')) {
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
          saveGameRecord("clickInOrder", finalScore, currentLevel);
          
          // 측정 중이거나 목표점수가 0점일 때: 측정값 설정 및 목표점수 설정
          const currentTargetScore = getTargetScore();
          if (currentTargetScore === null || currentTargetScore === 0) {
            setMeasuredScore(finalScore);
            const newTarget = finalScore * 3; // 30 * 3 = 90
            setDailyTargetScore(newTarget);
            setDailyAccumulatedScore(getAccumulatedScore()); // ✅ localStorage에서 최신 값 가져오기
            setShowGoalAchieved(false);
          } else {
            // 목표점수가 설정되어 있으면 누적 점수에 추가
            const achieved = addScore(finalScore);
            setDailyAccumulatedScore(getAccumulatedScore());
            
            // 목표 달성 여부 확인
            if (achieved) {
              recordAchievement("clickInOrder");
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
      <div className="flex items-center justify-between mb-4 flex-shrink-0 relative z-10">
        {/* 게임 진행 중일 때만 버튼 표시 - showing 상태에서도 보이도록 변경 */}
        {gameState !== "ready" && !isPaused && (
          <button
            onClick={handlePause}
            disabled={gameState === "countdown"}
            className={`bg-transparent hover:bg-transparent border-none p-2 relative z-20 ${gameState === "countdown" ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <ImageWithFallback
              src={pauseIcon}
              alt="pause"
              style={{ width: '2.5rem', height: '2.5rem', objectFit: 'contain', pointerEvents: 'none' }}
            />
          </button>
        )}
        
        {gameState !== "ready" && isPaused && (
          <div className="w-12" />
        )}
        
        {gameState === "ready" && (
          <div className="flex items-center">
            <button
              onClick={handleExit}
              className="border-none p-2 hover:opacity-80 transition-opacity"
            >
              <ImageWithFallback
                src={exitIcon}
                alt="exit"
                style={{ width: '2rem', height: '2rem', objectFit: 'contain' }}
              />
            </button>
            <h1 
              className="text-4xl ml-4 cursor-pointer" 
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
              순서 게임{devMode && " 🔧"}
            </h1>
            {devMode && (
              <>
                <button
                  onClick={() => {
                    localStorage.removeItem('clickInOrder_dailyGoal');
                    const newTarget = getTargetScore();
                    setDailyTargetScore(newTarget);
                    setDailyAccumulatedScore(0);
                    setAnimatedAccumulatedScore(0);
                    playClickSound();
                    alert('목표점수 데이터가 초기화되었습니다!');
                  }}
                  className="text-xl px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 ml-4"
                  style={{ fontFamily: "OngleipRyudung" }}
                >
                  목표점수 초기화
                </button>
                <button
                  onClick={() => {
                    const dailyGoalData = localStorage.getItem('clickInOrder_dailyGoal');
                    if (dailyGoalData) {
                      const data = JSON.parse(dailyGoalData);
                      data.accumulatedScore = 0;
                      data.achieved = false;
                      localStorage.setItem('clickInOrder_dailyGoal', JSON.stringify(data));
                      setDailyAccumulatedScore(0);
                      setAnimatedAccumulatedScore(0);
                      playClickSound();
                      alert('누적 점수가 초기화되었습니다!');
                    }
                  }}
                  className="text-xl px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 ml-2"
                  style={{ fontFamily: "OngleipRyudung" }}
                >
                  누적 점수 초기화
                </button>

              </>
            )}
          </div>
        )}
        {gameState === "gameOver" && (
          <div className="w-12" />
        )}
        
        {gameState !== "ready" && (
          <div className="flex items-center gap-4">
            {/* 하트 */}
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  style={{
                    width: '1.75rem',
                    height: '1.75rem',
                    fill: i < hearts ? '#cd6c58' : '#d1d5db',
                    color: i < hearts ? '#cd6c58' : '#d1d5db'
                  }}
                />
              ))}
            </div>
            
            {/* 점수 */}
            <div className="bg-white/80 px-6 py-2 rounded-lg" style={{ position: 'relative', zIndex: 50 }}>
              <span className="text-2xl">점수: {score}</span>
            </div>
          </div>
        )}
      </div>

      {/* 게임 설명 텍스트 - ready 상태에서만 표시 */}
      {gameState === "ready" && (
        <div className="flex-shrink-0 mb-4">
          <p className="text-2xl text-center">원이 나타나는 순서를 기억하세요!<br />순서를 잘못 입력하면 하트를 잃습니다.</p>
          <p className="text-2xl text-center mb-1 mt-4" style={{ color: '#a7b7c4' }}>
            일일 목표점수: {dailyTargetScore === null || dailyTargetScore === 0 ? '측정중...' : `${dailyTargetScore}점`}
          </p>
          <p className="text-2xl text-center" style={{ color: '#a7b7c4' }}>
            일일 누적점수: {animatedAccumulatedScore}점
          </p>
        </div>
      )}

      {/* Game Area */}
      <div className="flex-1 flex items-center justify-center -mt-12">
        {gameState === "ready" && (
          <div className="relative flex flex-col items-center justify-center">
            {/* 레벨 선택 - 세로 배치 */}
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <LevelButton
                level={1}
                levelName="2x2 그리드"
                isRecommended={recommendedLevel === 1}
                buttonBgImage={levelButtonBg}
                devMode={devMode}
                color="#a7b7c4"
                disabled={!hasEnergy()}
                onClick={() => {
                  // 개발자 모드일 때는 기회 체크 스킵
                  if (devMode) {
                    playSelectSound();
                    setSelectedLevel(1);
                    startGame();
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
                    startGame();
                  }
                }}
              />

              <LevelButton
                level={2}
                levelName="3x2 그리드"
                isRecommended={recommendedLevel === 2}
                buttonBgImage={levelButtonBg}
                devMode={devMode}
                color="#a7b7c4"
                disabled={!hasEnergy()}
                onClick={() => {
                  // 개발자 모드일 때는 기회 체크 스킵
                  if (devMode) {
                    playSelectSound();
                    setSelectedLevel(2);
                    startGame();
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
                    startGame();
                  }
                }}
              />

              <LevelButton
                level={3}
                levelName="3x3 그리드"
                isRecommended={recommendedLevel === 3}
                buttonBgImage={levelButtonBg}
                devMode={devMode}
                color="#a7b7c4"
                disabled={!hasEnergy()}
                onClick={() => {
                  // 개발자 모드일 때는 기회 체크 스킵
                  if (devMode) {
                    playSelectSound();
                    setSelectedLevel(3);
                    startGame();
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
                    startGame();
                  }
                }}
              />
            </div>
            
            <p className="mt-4 text-2xl text-gray-700 text-center">난이도를 선택하세요</p>
            
            <GameRulesButton
              onClick={() => {
                playClickSound();
                setShowRules(true);
              }}
              backgroundColor="#a7b7c4"
              textColor="#ffffff"
            />
          </div>
        )}

        {/* 카운트다운 화면 */}
        {gameState === "countdown" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div 
                className="text-9xl"
                style={{ 
                  fontFamily: "OngleipRyudung",
                  color: '#a7b7c4'
                }}
              >
                {countdown}
              </div>
            </div>
          </div>
        )}

        {(gameState === "showing" || gameState === "waiting" || gameState === "checking" || gameState === "correct" || gameState === "wrong" || gameState === "gameOver") && (
          <div className="relative z-0" style={gameState === "gameOver" ? { filter: 'brightness(0.5) blur(2px)' } : undefined}>
            {/* Status Text - 고정 높이로 이미지 위치 고정 */}
            <div className="text-center mb-8 flex items-center justify-center" style={{ height: '60px' }}>
              {gameState === "showing" && <p className="text-3xl">잘 보세요...</p>}
              {gameState === "waiting" && <p className="text-3xl">순서대로 클릭하세요!</p>}
              {gameState === "correct" && (
                <div 
                  className="text-[40px] flex items-center justify-center gap-2" 
                  style={{ 
                    color: '#a7b7c4', 
                    fontFamily: 'OngleipRyudung',
                    animation: 'bounceInOut 1.7s ease-out'
                  }}
                >
                  맞았습니다!
                  <ImageWithFallback 
                    src={checkIconGray} 
                    alt="체크" 
                    style={{ width: "1.875rem", height: "1.875rem", objectFit: "contain" }}
                  />
                </div>
              )}
              {gameState === "wrong" && (
                <div 
                  className="text-[40px] flex items-center justify-center gap-2" 
                  style={{ 
                    color: '#cd6c58', 
                    fontFamily: 'OngleipRyudung',
                    animation: 'shakeX 0.5s ease-out'
                  }}
                >
                  틀렸습니다!
                  <ImageWithFallback 
                    src={xIconRed} 
                    alt="엑스" 
                    style={{ width: "1.875rem", height: "1.875rem", objectFit: "contain" }}
                  />
                </div>
              )}
            </div>
            
            {/* 일일 목표점수 표시 */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {dailyTargetScore !== null && dailyTargetScore > 0 && dailyAccumulatedScore >= dailyTargetScore ? (
                <div className="text-2xl" style={{ color: '#a7b7c4' }}>일일 목표점수 도달 완료!</div>
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

            {/* Grid */}
            <div className={`grid ${currentLevel === 1 ? 'grid-cols-2 gap-6' : currentLevel === 2 ? 'grid-cols-3 gap-3' : 'grid-cols-3 gap-2'} mx-auto`} style={{ maxWidth: currentLevel === 1 ? '17.5rem' : currentLevel === 2 ? '20rem' : '24rem' }}>
              {Array.from({ length: gridSize }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  disabled={gameState !== "waiting"}
                  className="relative aspect-square w-full disabled:cursor-default"
                >
                  {/* 네모 배경 */}
                  <ImageWithFallback
                    src={squareImg}
                    alt="square"
                    className="w-full h-full object-contain"
                  />
                  
                  {/* 원 오버레이 - 시퀀스 표시 */}
                  {showingIndex === index && (
                    <div className="absolute inset-0 flex items-center justify-center p-[12%]">
                      <ImageWithFallback
                        src={circleImg}
                        alt="circle"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  
                  {/* 원 오버레이 - 클릭 시 */}
                  {clickedIndex === index && (
                    <div className="absolute inset-0 flex items-center justify-center p-[12%]">
                      <ImageWithFallback
                        src={circleImg}
                        alt="circle"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  
                  {/* 빨간 X - 틀렸을 때 */}
                  {wrongIndex === index && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageWithFallback
                        src={xMarkImg}
                        alt="xMark"
                        className="w-3/4 h-3/4 text-red-600 stroke-[3]"
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Progress Indicator - 고정 높이로 이미지 위치 고정 */}
            <div className="text-center mt-8" style={{ height: '80px' }}>
              <div className="h-[32px]">
                {gameState === "waiting" && (
                  <p className="text-2xl">진행: {userClicks.length}/{sequence.length}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 게임 오버 모달 - Game Area 밖으로 이동 */}
      {gameState === "gameOver" && (
        <>
          {/* 모달 컨텐츠 */}
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
                    일일 표점수: {dailyTargetScore === null || dailyTargetScore === 0 ? '측정중...' : `${dailyTargetScore}점`}
                  </div>
                  <div className="text-center mb-6 text-2xl" style={{ color: '#eae4d3' }}>
                    일일 누적점수: {animatedAccumulatedScore}점
                  </div>
                </>
              )}
              
              <div className="space-y-0">
                <button
                  onClick={startGame}
                  className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
                >
                  <ImageWithFallback
                    src={restartIcon}
                    alt="restart"
                    style={{ width: '3rem', height: '3rem', objectFit: 'contain' }}
                  />
                  <span className="text-3xl" style={{ color: '#eae4d3' }}>처음부터</span>
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
                    style={{ width: '3rem', height: '3rem', objectFit: 'contain' }}
                  />
                  <span className="text-3xl" style={{ color: '#eae4d3' }}>나가기</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 일시정지 메뉴 */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div 
            className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat animate-in zoom-in-95 duration-200"
            style={{ backgroundImage: `url(${pauseMenuBg})` }}
          >
            <h2 className="text-center mb-8 mt-4 text-4xl" style={{ color: '#eae4d3' }}>일시정지</h2>
            
            <div className="space-y-0">
              {/* 이어서 버튼 */}
              <button
                onClick={handleResume}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={resumeIcon}
                  alt="resume"
                  style={{ width: '3rem', height: '3rem', objectFit: 'contain' }}
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>이어서</span>
              </button>

              {/* 처음부터 버튼 */}
              <button
                onClick={handleRestart}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={restartIcon}
                  alt="restart"
                  style={{ width: '3rem', height: '3rem', objectFit: 'contain' }}
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>처음부터</span>
              </button>

              {/* 나가기 버튼 */}
              <button
                onClick={handleExit}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={pauseExitIcon}
                  alt="exit"
                  style={{ width: '3rem', height: '3rem', objectFit: 'contain' }}
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>나가기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게임 규칙 모달 */}
      {showRules && (
        <GameRulesModal
          isOpen={showRules}
          onClose={() => setShowRules(false)}
          title="순서 게임 설명"
          primaryColor="#a7b7c4"
          backgroundColor="#e8edf1"
          scrollbarColor="#a7b7c4"
          scrollbarTrackColor="#e8edf1"
          onCloseSound={playClickSound}
        >
          <RuleSection title="게임 방법" titleColor="#a7b7c4">
            <p className="mb-4">네모 안에 원이 나타나 순서를 기억하고 순서대로 클릭하세요!</p>
            <RuleList items={[
              "게임이 시작되면 네모 칸에 원이 차례로 나타니다",
              "원이 나타나는 순서를 잘 기억하세요",
              "모든 원이 사라지면 기억한 순서대로 네모를 클릭하세요",
              "정확한 순서로 모두 클릭하면 다음 라운드로 넘어갑니다.",
              "잘못된 순서로 클릭하면 하트가 1개 줄어듭니다",
              "하트가 모두 사라지면 게임이 종료됩니다"
            ]} />
          </RuleSection>

          <RuleSection title="점수" titleColor="#a7b7c4">
            <RuleList items={[
              <><strong>쉬움</strong>: 정답당 10점</>,
              <><strong>보통</strong>: 정답당 20점</>,
              <><strong>어려움</strong>: 정답당 30점</>
            ]} />
          </RuleSection>
        </GameRulesModal>
      )}
      
      <style>{`
        @keyframes bounceInOut {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          20% {
            opacity: 1;
            transform: scale(1.1);
          }
          30%, 100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes shakeX {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-8px);
          }
          75% {
            transform: translateX(8px);
          }
        }
        
        @keyframes buttonPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
      
      {/* 기회 없음 알림 */}
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
              className="bg-[#a7b7c4] text-white px-8 py-3 rounded-lg text-xl hover:bg-[#97a7b4] transition-colors"
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