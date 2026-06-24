import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { Heart, X } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { GameRulesButton } from "../GameRulesButton";
import { GameRulesModal, RuleSection, RuleList } from "../GameRulesModal";
import { playBackSound, playClickSound, playSelectSound } from "../../utils/sound";
import { saveGameRecord, getGameRecord, recordAchievement, recordGamePlayed } from "../../utils/gameRecord";
import { getEnergy, useEnergy, hasEnergy } from "../../utils/globalEnergy";
import { LevelButton } from "./LevelButton";
import { getTargetScore, setMeasuredScore, getAccumulatedScore, addScore, isAchieved } from "../../utils/numberGameDailyGoal";
import pauseIcon from "figma:asset/8acb1e015c5c90586e07679819984941b38f74af.png";
import resumeIcon from "figma:asset/62327073bfb38b1feb704b5c6f1eb2a36789eee8.png";
import restartIcon from "figma:asset/d1a45328f3c2f5290d250ff17f71584c907a61a7.png";
import exitIcon from "figma:asset/74b1288f91a03a19fc199ba8e3ce487eebb3c1fb.png";
import blankBox from "figma:asset/4ebcee60f00eb87875083117c5ef1f23f3e9ebd8.png";
import levelButtonBg from "figma:asset/a29e3c84c9c958413e3e5b27055c8415d775b5fe.png";
import pauseMenuBg from "figma:asset/54f8a82ff3f9348da47c92cd7e8e9b17adc71522.png";
import pauseExitIcon from "figma:asset/7b6920cff9236248c28a92364a77c6df5be27012.png";
import numberPad from "figma:asset/cd4974d35cb511ba4ccb0cceb15fee945cc3ee47.png";
import correctGif from "figma:asset/399adba23998dd03505039248a26901c996cb91f.png";
import checkIconGreen from "figma:asset/fc6012aff6e638c650bfda3422b1fa6d6fad7f6e.png";
import xIconRed from "figma:asset/6e7571d0e1cde7b66675af17f6a00a2752bfa47a.png";

interface NumberGameProps {
  onBack: () => void;
  difficulty: number;
}

type GameState = "levelSelect" | "ready" | "countdown" | "showing" | "input" | "correct" | "wrong" | "levelComplete" | "gameOver";

export function NumberGame({ onBack, difficulty }: NumberGameProps) {
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [gameState, setGameState] = useState<GameState>("levelSelect");
  const [currentDifficulty, setCurrentDifficulty] = useState(difficulty);
  const [problemNumber, setProblemNumber] = useState(0);
  const [displayNumber, setDisplayNumber] = useState("");
  const [numberPositions, setNumberPositions] = useState<Array<{ x: number; y: number }>>([]);
  const [blinkingIndices, setBlinkingIndices] = useState<number[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("숫자를 입력하세요");
  const [feedbackColor, setFeedbackColor] = useState("#000000");
  const [recommendedLevel, setRecommendedLevel] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(3); // 카운트다운 state 추가
  
  // 전역 에너지 시스템
  const [energy, setEnergy] = useState(getEnergy());
  const [showNoEnergyAlert, setShowNoEnergyAlert] = useState(false);
  
  // 일일 목표점수 시스템
  const [dailyTargetScore, setDailyTargetScore] = useState<number | null>(null);
  const [dailyAccumulatedScore, setDailyAccumulatedScore] = useState<number>(0);
  const [showGoalAchieved, setShowGoalAchieved] = useState(false);
  const [animatedAccumulatedScore, setAnimatedAccumulatedScore] = useState<number>(0);
  const [previousAccumulatedScore, setPreviousAccumulatedScore] = useState<number>(0); // 게임 시작 전 누적 점수
  const isGameOverRef = useRef<boolean>(false);
  
  // 점수 애니메이션 state 추가
  const [animatedScore, setAnimatedScore] = useState(0);
  
  // 개발자 모드 (제목 5번 클릭 시 활성화)
  const [devMode, setDevMode] = useState(false);
  const [devClickCount, setDevClickCount] = useState(0);
  const devClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const isPausedRef = useRef(false);
  const showingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedTimeRef = useRef<{
    pauseStartTime: number;
    timerStartTime: number;
    totalTime: number;
    gameState: GameState;
  } | null>(null);
  const timerStartTimeRef = useRef<number>(0);
  const transitionTimersRef = useRef<NodeJS.Timeout[]>([]);

  // 난이도별 설정
  const getConfig = (diff: number) => {
    switch (diff) {
      case 1:
        return { digits: 3, baseShowTime: 1500, timeDecrement: 100, minShowTime: 1000 }; // 100ms씩 감소, 최소 1000ms
      case 2:
        return { digits: 4, baseShowTime: 1500, timeDecrement: 100, minShowTime: 1000 };
      case 3:
        return { digits: 5, baseShowTime: 1500, timeDecrement: 100, minShowTime: 1000 };
      default:
        return { digits: 3, baseShowTime: 1500, timeDecrement: 100, minShowTime: 1000 };
    }
  };

  // 라운드에 따른 표시 시간 계산
  const getShowTime = (diff: number, problemNum: number): number => {
    const config = getConfig(diff);
    const decrements = Math.floor(problemNum / 2); // 2문제마다 1씩 증가
    const calculatedTime = config.baseShowTime - (decrements * config.timeDecrement);
    return Math.max(calculatedTime, config.minShowTime); // 최소 시간 보장
  };

  // 컴포넌트 마운트 시 게임 자동 시작
  useEffect(() => {
    // 레벨 선택 화면으로 시작
    setGameState("levelSelect");
    
    // 추천 레벨 계산
    const records = getGameRecord("numberGame");
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
    setAnimatedAccumulatedScore(accumulated);
    setPreviousAccumulatedScore(accumulated);
  }, []);

  // 카운트다운 로직
  useEffect(() => {
    if (gameState !== "countdown") return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // 카운트다운 종료 후 문제 시작
      startProblem(currentDifficulty, 0);
    }
  }, [gameState, countdown, currentDifficulty]);

  // 게임 오버 시 누적 점수 애니메이션
  useEffect(() => {
    if (gameState === "gameOver") {
      // 점수 애니메이션 시작: 0에서 score까지
      setAnimatedScore(0);
      
      const duration = 1000; // 1초 동안 애니메이션
      const startTime = Date.now();
      const endScore = score;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // easeOutQuad 이징 함수
        const easedProgress = 1 - (1 - progress) * (1 - progress);
        const currentScore = Math.round(endScore * easedProgress);
        
        setAnimatedScore(currentScore);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
      
      // 누적 점수 애니메이션: previousAccumulatedScore에서 dailyAccumulatedScore까지
      setAnimatedAccumulatedScore(previousAccumulatedScore);
      
      const startScoreAccumulated = previousAccumulatedScore;
      const endScoreAccumulated = dailyAccumulatedScore;
      const diffAccumulated = endScoreAccumulated - startScoreAccumulated;
      
      const animateAccumulated = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // easeOutQuad 이징 함수
        const easedProgress = 1 - (1 - progress) * (1 - progress);
        const currentScore = Math.round(startScoreAccumulated + diffAccumulated * easedProgress);
        
        setAnimatedAccumulatedScore(currentScore);
        
        if (progress < 1) {
          requestAnimationFrame(animateAccumulated);
        }
      };
      
      requestAnimationFrame(animateAccumulated);
    }
  }, [gameState, score, previousAccumulatedScore, dailyAccumulatedScore]);

  // 개발자 모드: 'q' 키로 게임 즉시 종료 (점수 0, 하트 0), 'w' 키로 게임 즉시 종료 (점수 30, 하트 0)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const isDevMode = localStorage.getItem('devMode') === 'true';
      if (isDevMode && (gameState === 'showing' || gameState === 'input')) {
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
          saveGameRecord("numberGame", finalScore, 1);
          
          // 측정 중이거나 목표점수가 0점일 때: 측정값 설정 및 목표점수 설정
          const currentTargetScore = getTargetScore();
          if (currentTargetScore === null || currentTargetScore === 0) {
            setMeasuredScore(finalScore);
            const newTarget = finalScore * 3; // 30 * 3 = 90
            setDailyTargetScore(newTarget);
            setDailyAccumulatedScore(finalScore); // 누적점수 30점
            setShowGoalAchieved(false);
          } else {
            // 목표점수가 설정되어 있으면 누적 점수에 추가
            const newAccumulatedScore = getAccumulatedScore() + finalScore;
            setDailyAccumulatedScore(newAccumulatedScore);
            
            // 목표 달성 여부 확인
            if (newAccumulatedScore >= currentTargetScore) {
              recordAchievement("numberGame");
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
  }, [gameState]);

  // 게임 시작
  const startGame = () => {
    setScore(0);
    setHearts(3);
    // setCurrentDifficulty는 onClick에서 이미 설정했으므로 여기서 다시 설정하지 않음
    setProblemNumber(0);
    setUserInput("");
    setFeedbackMessage("숫자를 입력하세요"); // 🔥 피드백 메시지 초기화
    setFeedbackColor("#000000"); // 🔥 피드백 색상 초기화
    isGameOverRef.current = false;
    setShowGoalAchieved(false);
    setPreviousAccumulatedScore(getAccumulatedScore()); // 🔥 재시작 시 현재 누적 점수 저장
    setCountdown(3); // 카운트다운 초기화
    setGameState("countdown"); // 카운트다운 상태로 시작
  };

  // 문제 시작
  const startProblem = async (diff: number, problemNum: number) => {
    const config = getConfig(diff);
    
    // 랜덤 숫자 생성
    const randomNumber = generateRandomNumber(config.digits);
    setDisplayNumber(randomNumber);
    
    // 각 자리 숫자마다 다른 위치 생성 (좌우 여백 확보하면서 넓은 간격)
    const positions: Array<{ x: number; y: number }> = [];
    
    const leftMargin = 10; // 왼쪽 여백 10%
    const rightMargin = 10; // 오른쪽 여백 10%
    const usableWidth = 100 - leftMargin - rightMargin; // 사용 가능한 너비 80%
    
    // 숫자 개수에 따라 화면을 균등 분할
    for (let i = 0; i < config.digits; i++) {
      // leftMargin부터 (100 - rightMargin)까지 균등 분할
      const x = leftMargin + (usableWidth / (config.digits - 1)) * i;
      const y = 35 + Math.random() * 30; // y는 화면의 35%~65%
      positions.push({ x, y });
    }
    
    setNumberPositions(positions);
    setBlinkingIndices([]);
    
    setGameState("showing");
    setUserInput("");
    
    // 지정된 시간 동안 숫자 표시
    const showTime = getShowTime(diff, problemNum);
    timerStartTimeRef.current = Date.now(); // 타이머 시작 시간 기록
    showingTimerRef.current = setTimeout(() => {
      if (!isPausedRef.current) {
        setGameState("input");
        showingTimerRef.current = null;
      }
    }, showTime);
  };

  // 랜덤 숫자 생성
  const generateRandomNumber = (digits: number): string => {
    let result = "";
    for (let i = 0; i < digits; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  };

  // 숫자 입력 핸들러
  const handleNumberInput = (num: number) => {
    if (userInput.length < config.digits) {
      playClickSound();
      setUserInput(userInput + num);
    }
  };

  // 지우기 핸들러
  const handleDelete = () => {
    if (userInput.length > 0) {
      playClickSound();
      setUserInput(userInput.slice(0, -1));
    }
  };

  // 정답 확인
  const checkAnswer = () => {
    if (userInput === displayNumber) {
      // 정답
      playSelectSound();
      setGameState("correct");
      setFeedbackMessage("맞았습니다!");
      // 레벨별 점수 차등: 레벨 1은 10점, 레벨 2는 20점, 레벨 3은 30점
      const pointsPerCorrect = currentDifficulty * 10;
      const newScore = score + pointsPerCorrect;
      setScore(newScore);
      
      // 1.7초 후 다음 문제로 이동
      timerStartTimeRef.current = Date.now();
      const timer = setTimeout(() => {
        if (!isPausedRef.current) {
          const nextProblem = problemNumber + 1;
          setProblemNumber(nextProblem);
          setGameState("input");
          setFeedbackMessage("숫자를 입력하세요");
          setFeedbackColor("#000000");
          startProblem(currentDifficulty, nextProblem);
        }
      }, 1700);
      transitionTimersRef.current.push(timer);
    } else {
      // 오답
      playBackSound();
      playClickSound();
      setGameState("wrong");
      setFeedbackMessage("틀렸습니다!");
      const newHearts = hearts - 1;
      setHearts(newHearts);
      
      // 1.2초 후 다음 동작
      timerStartTimeRef.current = Date.now();
      const timer = setTimeout(() => {
        if (!isPausedRef.current) {
          if (newHearts <= 0) {
            // 🔥 하트 0 시 점수 저장 및 누적 (한 번만 저장)
            if (!isGameOverRef.current) {
              isGameOverRef.current = true;
              
              saveGameRecord("numberGame", score, currentDifficulty);
              
              // 측정 중이거나 목표점수가 0점일 때: 계속 측정
              const currentTargetScore = getTargetScore();
              if (currentTargetScore === null || currentTargetScore === 0) {
                setMeasuredScore(score);
                const newTarget = score > 0 ? score * 3 : 0;
                setDailyTargetScore(newTarget);
                setDailyAccumulatedScore(score); // 🔥 측정 판 종료 시 누적 점수 즉시 저장
                setPreviousAccumulatedScore(score); // 🔥 측정 판 종료 시 이전 누적 점수도 업데이트
                setShowGoalAchieved(false);
              } else {
                // 🎯 게임 종료 시점에 점수 합산
                const { achieved, newAccumulated } = addScore(score);
                setDailyAccumulatedScore(newAccumulated);
                
                if (achieved) {
                  recordAchievement("numberGame");
                  setShowGoalAchieved(true);
                } else {
                  setShowGoalAchieved(false);
                }
              }
            }
            
            setGameState("gameOver");
          } else {
            // 같은 문제 다시
            setGameState("input");
            setFeedbackMessage("숫자를 입력하세요");
            setFeedbackColor("#000000");
            startProblem(currentDifficulty, problemNumber);
          }
        }
      }, 1200);
      transitionTimersRef.current.push(timer);
    }
  };

  // 일시정지 핸들러
  const handlePause = () => {
    if (gameState === "ready" || gameState === "gameOver" || gameState === "levelSelect") return;
    
    playClickSound();
    isPausedRef.current = true;
    setIsPaused(true);
    
    // 현재 시간 기록
    const pauseStartTime = Date.now();
    const elapsedTime = pauseStartTime - timerStartTimeRef.current;
    
    // showing 상태일 때는 남은 표시 시간 계산
    const totalShowTime = getShowTime(currentDifficulty, problemNumber);
    const remainingTime = gameState === "showing" ? Math.max(totalShowTime - elapsedTime, 0) : Math.max(2000 - elapsedTime, 0);
    
    pausedTimeRef.current = { 
      pauseStartTime, 
      timerStartTime: timerStartTimeRef.current, 
      totalTime: remainingTime, 
      gameState 
    };
    
    // 타이머 정지
    if (showingTimerRef.current) {
      clearTimeout(showingTimerRef.current);
      showingTimerRef.current = null;
    }
    
    // 전환 타이머 정지
    transitionTimersRef.current.forEach(timer => clearTimeout(timer));
    transitionTimersRef.current = [];
  };

  const handleResume = () => {
    playClickSound();
    isPausedRef.current = false;
    setIsPaused(false);
    
    // 일시정지 시 저장한 남은 시간만큼만 타이머 재시작
    if (pausedTimeRef.current) {
      const { totalTime, gameState: savedGameState } = pausedTimeRef.current;
      
      if (savedGameState === "showing") {
        // showing 상태에서 일시정지한 경우
        if (totalTime > 0) {
          timerStartTimeRef.current = Date.now(); // 재시작 시간 기록
          showingTimerRef.current = setTimeout(() => {
            if (!isPausedRef.current) {
              setGameState("input");
              showingTimerRef.current = null;
            }
          }, totalTime);
        } else {
          setGameState("input");
        }
      } else if (savedGameState === "correct" || savedGameState === "wrong") {
        // correct 또는 wrong 상태에서 일시정지한 경우
        if (totalTime > 0) {
          timerStartTimeRef.current = Date.now();
          const timer = setTimeout(() => {
            if (!isPausedRef.current) {
              if (savedGameState === "correct") {
                const nextProblem = problemNumber + 1;
                const totalProblems = Infinity;
                
                if (nextProblem >= totalProblems) {
                  setGameState("gameOver");
                } else {
                  setProblemNumber(nextProblem);
                  startProblem(currentDifficulty, nextProblem);
                }
              } else {
                // wrong 상태
                if (hearts <= 0) {
                  setGameState("gameOver");
                } else {
                  startProblem(currentDifficulty, problemNumber);
                }
              }
            }
          }, totalTime);
          transitionTimersRef.current.push(timer);
        }
      }
      
      pausedTimeRef.current = null;
    }
  };

  const handleRestart = () => {
    playSelectSound();
    isPausedRef.current = false;
    setIsPaused(false);
    startGame();
  };

  const handleExit = () => {
    playBackSound();
    isPausedRef.current = false;
    setIsPaused(false);
    onBack();
  };

  const config = getConfig(currentDifficulty);

  // 게임 오버 시 기록은 하트 0 로직에서만 저장 (중복 방지)

  return (
    <div className="h-screen overflow-hidden bg-amber-50 p-4 pb-[env(safe-area-inset-bottom)] flex flex-col pt-[max(env(safe-area-inset-top),3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          {gameState === "levelSelect" ? (
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
          ) : gameState === "countdown" ? (
            <button
              disabled
              className="bg-transparent border-none p-2 cursor-not-allowed opacity-30"
            >
              <ImageWithFallback
                src={pauseIcon}
                alt="pause"
                className="h-10 w-10 object-contain"
              />
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="bg-transparent hover:bg-transparent border-none p-2 cursor-pointer"
            >
              <ImageWithFallback
                src={pauseIcon}
                alt="pause"
                className="h-10 w-10 object-contain"
              />
            </button>
          )}
          {gameState === "levelSelect" && (
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
                숫자 게임{devMode && " 🔧"}
              </h1>
              {devMode && (
                <>
                  <button
                    onClick={() => {
                      localStorage.removeItem('numberGameDailyGoal');
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
                      const dailyGoalData = localStorage.getItem('numberGameDailyGoal');
                      if (dailyGoalData) {
                        const data = JSON.parse(dailyGoalData);
                        data.accumulatedScore = 0;
                        data.achieved = false;
                        localStorage.setItem('numberGameDailyGoal', JSON.stringify(data));
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
        </div>
        
        {/* 하트와 점수 */}
        {gameState !== "levelSelect" && (
          <div className="flex items-center gap-4">
            {/* 하 */}
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-7 h-7 ${i < hearts ? 'text-[#cd6c58]' : 'fill-gray-300 text-gray-300'}`}
                  fill={i < hearts ? '#cd6c58' : undefined}
                />
              ))}
            </div>
            
            {/* 점수 */}
            <div className="bg-white/80 px-6 py-2 rounded-lg">
              <span className="text-2xl">점수: {score}</span>
            </div>
          </div>
        )}
        
        {gameState === "levelSelect" && (
          <div className="w-12" />
        )}
      </div>

      {/* 게임 설명 - 레벨 선택 화면에서만 표시 */}
      {gameState === "levelSelect" && (
        <div className="flex-shrink-0 mb-2">
          <p className="text-2xl text-gray-700 text-center px-4">
            여기저기 나타나는 숫자를 왼쪽부터 오른쪽 순서로 기억하세요!<br />
            숫자를 기억하지 못하면 하트를 잃습니다.
          </p>
          <p className="text-2xl text-center mb-1 mt-4" style={{ color: '#4e7557' }}>
            일일 목표점수: {dailyTargetScore === null || dailyTargetScore === 0 ? '측정중...' : `${dailyTargetScore}점`}
          </p>
          <p className="text-2xl text-center" style={{ color: '#4e7557' }}>
            일일 누적점수: {animatedAccumulatedScore}점
          </p>
        </div>
      )}

      {/* Game Area */}
      <div className="flex-1 flex items-center justify-center relative">
        <div className="w-full max-w-2xl">
          {/* Level Select Screen */}
          {gameState === "levelSelect" && (
            <>
              {/* Difficulty Selection */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative flex flex-col items-center justify-center">
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    <LevelButton
                      level={1}
                      levelName="3자리 숫자"
                      isRecommended={recommendedLevel === 1}
                      buttonBgImage={levelButtonBg}
                      devMode={devMode}
                      color="#4e7557"
                      disabled={!hasEnergy()}
                      onClick={() => {
                        if (!devMode && !hasEnergy()) {
                          setShowNoEnergyAlert(true);
                          setTimeout(() => setShowNoEnergyAlert(false), 2000);
                          return;
                        }
                        
                        if (devMode || useEnergy()) {
                          recordGamePlayed('numberGame');
                          setEnergy(getEnergy());
                          playSelectSound();
                          setCurrentDifficulty(1);
                          startGame();
                        }
                      }}
                    />
                    
                    <LevelButton
                      level={2}
                      levelName="4자리 숫자"
                      isRecommended={recommendedLevel === 2}
                      buttonBgImage={levelButtonBg}
                      devMode={devMode}
                      color="#4e7557"
                      disabled={!hasEnergy()}
                      onClick={() => {
                        if (!devMode && !hasEnergy()) {
                          setShowNoEnergyAlert(true);
                          setTimeout(() => setShowNoEnergyAlert(false), 2000);
                          return;
                        }
                        
                        if (devMode || useEnergy()) {
                          recordGamePlayed('numberGame');
                          setEnergy(getEnergy());
                          playSelectSound();
                          setCurrentDifficulty(2);
                          startGame();
                        }
                      }}
                    />
                    
                    <LevelButton
                      level={3}
                      levelName="5자리 숫자"
                      isRecommended={recommendedLevel === 3}
                      buttonBgImage={levelButtonBg}
                      devMode={devMode}
                      color="#4e7557"
                      disabled={!hasEnergy()}
                      onClick={() => {
                        if (!devMode && !hasEnergy()) {
                          setShowNoEnergyAlert(true);
                          setTimeout(() => setShowNoEnergyAlert(false), 2000);
                          return;
                        }
                        
                        if (devMode || useEnergy()) {
                          recordGamePlayed('numberGame');
                          setEnergy(getEnergy());
                          playSelectSound();
                          setCurrentDifficulty(3);
                          startGame();
                        }
                      }}
                    />
                  </div>
                  
                  <p className="text-2xl text-gray-700 mt-4">난도를 선택하세요</p>
                  
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
            </>
          )}
          
          {/* 카운트다운 화면 */}
          {gameState === "countdown" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div 
                  className="text-9xl"
                  style={{ 
                    fontFamily: "OngleipRyudung",
                    color: '#4e7557'
                  }}
                >
                  {countdown}
                </div>
              </div>
            </div>
          )}
          
          {/* 숫자 표시 영역 */}
          {gameState === "showing" && (
            <div className="absolute inset-0">
              {/* 안내 문구 */}
              <div className="text-center mb-3 flex-col justify-center flex-shrink-0" style={{ height: '5rem' }}>
                <div style={{ height: '2rem' }} className="flex items-center justify-center">
                  <p className="text-gray-700 text-3xl">왼쪽에서 오른쪽 순서대로 기억하세요!</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {dailyTargetScore !== null && dailyTargetScore > 0 && dailyAccumulatedScore >= dailyTargetScore ? (
                    <div className="text-2xl" style={{ color: '#4e7557' }}>일일 목표점수 도달 완료!</div>
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
              </div>
              
              {/* 숫자들 */}
              {displayNumber.split('').map((digit, index) => (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    left: `${numberPositions[index]?.x}%`,
                    top: `${numberPositions[index]?.y}%`,
                    transform: 'translate(-50%, -50%)',
                    fontSize: '2.5rem',
                    ...((currentDifficulty === 2 || currentDifficulty === 3) && {
                      animation: currentDifficulty === 3 
                        ? `floatUpDown${index % 3} 1.5s ease-in-out infinite, blink 1s ease-in-out infinite`
                        : `floatUpDown${index % 3} 1.5s ease-in-out infinite`
                    })
                  }}
                  className={`text-gray-800`}
                >
                  {digit}
                </div>
              ))}
            </div>
          )}

          {/* 입력 화면 */}
          {(gameState === "input" || gameState === "correct" || gameState === "wrong" || gameState === "gameOver") && (
            <div className="flex flex-col h-full">
              {/* 상단: 제목과 빈칸 */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                {/* 상태 메시지 영역 - 고정 높이 */}
                <div className="relative h-20 mb-2">
                  {feedbackMessage === '틀렸습니다!' ? (
                    <div className="flex flex-col items-center justify-center absolute inset-0">
                      <div 
                        className="flex items-center justify-center gap-2" 
                        style={{ 
                          fontSize: '2.5rem',
                          color: '#cd6c58', 
                          fontFamily: 'OngleipRyudung',
                          animation: 'shakeX 0.5s ease-out',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        틀렸습니다!
                        <ImageWithFallback 
                          src={xIconRed} 
                          alt="엑스" 
                          style={{ width: "30px", height: "30px", objectFit: "contain" }}
                        />
                      </div>
                      <div 
                        style={{ 
                          fontSize: '1.75rem',
                          color: '#2B7851', 
                          fontFamily: 'OngleipRyudung',
                          marginTop: '-8px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        정답: {displayNumber}
                      </div>
                    </div>
                  ) : feedbackMessage === '맞았습니다!' ? (
                    <div className="flex items-center justify-center absolute inset-0">
                      <div 
                        className="flex items-center justify-center gap-2" 
                        style={{ 
                          fontSize: '2.5rem',
                          color: '#4e7557', 
                          fontFamily: 'OngleipRyudung',
                          animation: 'pulse 0.5s ease-out',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        맞았습니다!
                        <ImageWithFallback 
                          src={checkIconGreen} 
                          alt="체크" 
                          style={{ width: "30px", height: "30px", objectFit: "contain" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center absolute inset-0">
                      <div 
                        style={{ 
                          fontSize: '2.5rem',
                          color: '#000000', 
                          fontFamily: 'OngleipRyudung',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {feedbackMessage}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 일일 목표점수 표시 */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  {dailyTargetScore !== null && dailyTargetScore > 0 && dailyAccumulatedScore >= dailyTargetScore ? (
                    <div className="text-2xl" style={{ color: '#4e7557' }}>일일 목표점수 도달 완료!</div>
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
                
                {/* 빈칸 박스들 */}
                <div className="flex gap-2 mb-6 px-2">
                  {Array.from({ length: config.digits }).map((_, index) => (
                    <div key={index} className="relative" style={{ width: '4rem', height: '4rem' }}>
                      <ImageWithFallback
                        src={blankBox}
                        alt="blank"
                        className="w-full h-full object-contain"
                      />
                      {/* 입력된 숫자 */}
                      {userInput[index] && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl" style={{ color: '#eae4d3' }}>{userInput[index]}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 하단: 숫자 번호판 */}
              <div className="pb-4 flex justify-center px-4 flex-shrink-0">
                {/* 번호판 이미지를 배경으로 사용 */}
                <div className="relative w-full aspect-[4/5]" style={{ maxWidth: '17.5rem' }}>
                  {/* 번호판 배경 이미지 */}
                  <ImageWithFallback
                    src={numberPad}
                    alt="number pad"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  
                  {/* 투명 버튼들 - 3x4 그리드 */}
                  {/* 첫 번째 줄: 1, 2, 3 */}
                  <button
                    onClick={() => handleNumberInput(1)}
                    className="absolute left-0 w-1/3 hover:bg-white/10 active:bg-white/20 transition-colors"
                    style={{ top: '0%', height: '25%' }}
                    aria-label="1"
                  />
                  <button
                    onClick={() => handleNumberInput(2)}
                    className="absolute left-1/3 w-1/3 hover:bg-white/10 active:bg-white/20 transition-colors"
                    style={{ top: '0%', height: '25%' }}
                    aria-label="2"
                  />
                  <button
                    onClick={() => handleNumberInput(3)}
                    className="absolute right-0 w-1/3 hover:bg-white/10 active:bg-white/20 transition-colors"
                    style={{ top: '0%', height: '25%' }}
                    aria-label="3"
                  />
                  
                  {/* 두 번째 줄: 4, 5, 6 */}
                  <button
                    onClick={() => handleNumberInput(4)}
                    className="absolute left-0 w-1/3 hover:bg-white/10 active:bg-white/20 transition-colors"
                    style={{ top: '25%', height: '25%' }}
                    aria-label="4"
                  />
                  <button
                    onClick={() => handleNumberInput(5)}
                    className="absolute left-1/3 w-1/3 hover:bg-white/10 active:bg-white/20 transition-colors"
                    style={{ top: '25%', height: '25%' }}
                    aria-label="5"
                  />
                  <button
                    onClick={() => handleNumberInput(6)}
                    className="absolute right-0 w-1/3 hover:bg-white/10 active:bg-white/20 transition-colors"
                    style={{ top: '25%', height: '25%' }}
                    aria-label="6"
                  />
                  
                  {/* 세 번째 줄: 7, 8, 9 */}
                  <button
                    onClick={() => handleNumberInput(7)}
                    className="absolute left-0 w-1/3 hover:bg-white/10 active:bg-white/20 transition-colors"
                    style={{ top: '50%', height: '25%' }}
                    aria-label="7"
                  />
                  <button
                    onClick={() => handleNumberInput(8)}
                    className="absolute left-1/3 w-1/3 hover:bg-white/10 active:bg-white/20 transition-colors"
                    style={{ top: '50%', height: '25%' }}
                    aria-label="8"
                  />
                  <button
                    onClick={() => handleNumberInput(9)}
                    className="absolute right-0 w-1/3 hover:bg-white/10 active:bg-white/20 transition-colors"
                    style={{ top: '50%', height: '25%' }}
                    aria-label="9"
                  />
                  
                  {/* 네 번째 줄: 지우기(X), 0, 인(✓) */}
                  <button
                    onClick={handleDelete}
                    className="absolute left-0 w-1/3 hover:bg-white/10 active:bg-white/20 transition-colors"
                    style={{ top: '75%', height: '25%' }}
                    aria-label="지우기"
                  />
                  <button
                    onClick={() => handleNumberInput(0)}
                    className="absolute left-1/3 w-1/3 hover:bg-white/10 active:bg-white/20 transition-colors"
                    style={{ top: '75%', height: '25%' }}
                    aria-label="0"
                  />
                  <button
                    onClick={checkAnswer}
                    disabled={userInput.length !== config.digits}
                    className="absolute right-0 w-1/3 hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ top: '75%', height: '25%' }}
                    aria-label="확인"
                  />
                </div>
              </div>
            </div>
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
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.05);
              }
            }
            
            @keyframes floatUpDown0 {
              0%, 100% {
                transform: translateY(0);
              }
              50% {
                transform: translateY(-10px);
              }
            }
            
            @keyframes floatUpDown1 {
              0%, 100% {
                transform: translateY(0);
              }
              50% {
                transform: translateY(10px);
              }
            }
            
            @keyframes floatUpDown2 {
              0%, 100% {
                transform: translateY(0);
              }
              50% {
                transform: translateY(-5px);
              }
            }
            
            @keyframes blink {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0;
              }
            }
          `}</style>

          {/* 레벨 완료 화면 */}
          {gameState === "levelComplete" && (
            <div className="text-center px-4">
              <h2 className="text-3xl mb-4" style={{ color: '#2B7851' }}>난이도 {currentDifficulty} 완료!</h2>
              <p className="text-xl">난이도 {currentDifficulty + 1}로 이동합니다...</p>
            </div>
          )}

          {/* 게임 종료 화면 */}
          {gameState === "gameOver" && (
            <>
              {/* 모달 */}
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div 
                  className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${pauseMenuBg})` }}
                >
                {showGoalAchieved ? (
                  <>
                    <h2 className="text-center mb-4 mt-4 text-4xl" style={{ color: '#eae4d3', fontFamily: 'OngleipRyudung' }}>목표 달성!</h2>
                    <div className="text-center mb-2 text-2xl" style={{ color: '#d4c5a0' }}>
                      일일 목표점수: {dailyTargetScore}점
                    </div>
                    <div className="text-center mb-6 text-2xl" style={{ color: '#eae4d3' }}>
                      일일 누적 점수: {animatedAccumulatedScore}점
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-center mb-2 mt-4 text-4xl" style={{ color: '#eae4d3' }}>게임 종료!</h2>
                    <div className="text-center mb-2 text-2xl" style={{ color: '#d4c5a0' }}>
                      일일 목표점수: {dailyTargetScore === null || dailyTargetScore === 0 ? '측정중...' : `${dailyTargetScore}점`}
                    </div>
                    <div className="text-center mb-6 text-2xl" style={{ color: '#eae4d3' }}>
                      일일 누적 점수: {animatedAccumulatedScore}점
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
            </>
          )}
        </div>
      </div>

      {/* 일시정지 메뉴 */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div 
            className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat animate-in zoom-in-95 duration-200"
            style={{ backgroundImage: `url(${pauseMenuBg})` }}
          >
            <h2 className="text-center mb-6 mt-4 text-4xl" style={{ fontFamily: 'OngleipRyudung', color: '#eae4d3' }}>일시정지</h2>
            
            <div className="space-y-0" style={{ fontFamily: 'OngleipRyudung' }}>
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
                <span className="text-3xl" style={{ color: '#eae4d3' }}>이어서</span>
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
                <span className="text-3xl" style={{ color: '#eae4d3' }}>처음부터</span>
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
        title="숫자 게임 설명"
        primaryColor="#4e7557"
        backgroundColor="#d4e9d8"
        scrollbarColor="#4e7557"
        scrollbarTrackColor="#d4e9d8"
        onCloseSound={playClickSound}
      >
        <RuleSection title="게임 방법" titleColor="#4e7557">
          <p className="mb-4">화면에 랜덤하게 나타나는 숫자를 기억하고 왼쪽부터 오른쪽 순서대로 입력하세요!</p>
          <RuleList items={[
            "게임이 시작되면 화면 여러 곳에 숫자가 나타납니다",
            "숫자들을 왼쪽에서 오른쪽 순서로 기억합니다.",
            "숫자가 사라지면  나타나는 번호판에 기억한 숫자를 순서대로 입력하고 체크를 누르세요.",
            "잘못된 숫자를 입력하면 하트가 1개 줄어듭니다",
            "하트가 모두 사라지면 게임이 종료됩니다"
          ]} />
        </RuleSection>

        <RuleSection title="점수" titleColor="#4e7557">
          <RuleList items={[
            <><strong>레벨 1</strong>: 정답당 10점</>,
            <><strong>레벨 2</strong>: 정답당 20점</>,
            <><strong>레벨 3</strong>: 정답당 30점</>
          ]} />
        </RuleSection>
      </GameRulesModal>
      
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
              className="bg-[#4e7557] text-white px-8 py-3 rounded-lg text-xl hover:bg-[#3e5f47] transition-colors"
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