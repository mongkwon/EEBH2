import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { playClickSound, playSelectSound } from "../utils/sound";
import { pauseMusic, resumeMusic } from "../utils/backgroundMusic";
import { useState, useEffect, useRef } from "react";
import { getEnergy, resetEnergy, addEnergyFromAd, canWatchAd, getMaxEnergy } from "../utils/globalEnergy";

import settingsIcon from "figma:asset/f50441ac52c2a907e8c436ef7897926c378fa505.png";
import eyeGameImage from "figma:asset/26384e5070001773ecdd00a276581db36dab93ab.png";
import earGameImage from "figma:asset/cb3ff545f21b905d3b831c0f35c52531b19aa0e2.png";
import brainGameImage from "figma:asset/4ece2f551ec8cafe4d1e5357cfabd5058b8baf0c.png";
import heartGameImage from "figma:asset/02c9835d22d8877f7a0fc712cab1474d338372f5.png";
import energyIcon from "figma:asset/8515896910322bc62854d803695158c24ee34aa7.png";

interface MainMenuProps {
  onSelectCategory: (categoryIndex: number) => void;
  onOpenSettings: () => void;
  onOpenRecords: () => void;
}

const categories = [
  {
    id: 1,
    name: "눈 게임",
    image: eyeGameImage
  },
  {
    id: 2,
    name: "귀 게임",
    image: earGameImage
  },
  {
    id: 3,
    name: "뇌 게임",
    image: brainGameImage
  },
  {
    id: 4,
    name: "게임 기록",
    image: heartGameImage
  }
];

const getPublicAssetPath = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

// localStorage에서 게임 기록 불러오기
const getGameRecord = (key: string) => {
  const record = localStorage.getItem(key);
  return record ? JSON.parse(record) : { level1: 0, level2: 0, level3: 0 };
};

// 게임의 총점 계산 (3개 레벨 합)
const getTotalScore = (game: any) => {
  return (game.level1 || 0) + (game.level2 || 0) + (game.level3 || 0);
};

// 카테고리별 총점 계산
const getCategoryScores = () => {
  const eyeGames = ['bombGame', 'yabawiGame', 'numberGame'];
  const earGames = ['bubbleShooter', 'directionGame', 'classifyGame'];
  const brainGames = ['memoryGame', 'coloringGame', 'clickInOrder'];

  const eyeScore = eyeGames.reduce((sum, key) => sum + getTotalScore(getGameRecord(key)), 0);
  const earScore = earGames.reduce((sum, key) => sum + getTotalScore(getGameRecord(key)), 0);
  const brainScore = brainGames.reduce((sum, key) => sum + getTotalScore(getGameRecord(key)), 0);

  return [eyeScore, earScore, brainScore];
};

// 가장 낮은 점수의 카테고리 인덱스 반환
const getLowestScoreCategory = () => {
  const scores = getCategoryScores();
  const minScore = Math.min(...scores);
  const lowestIndices = scores
    .map((score, index) => (score === minScore ? index : -1))
    .filter(index => index !== -1);
  
  // 같은 점수가 여러 개면 랜덤으로 선택
  return lowestIndices[Math.floor(Math.random() * lowestIndices.length)];
};

export function MainMenu({ onSelectCategory, onOpenSettings, onOpenRecords }: MainMenuProps) {
  const [recommendedCategory, setRecommendedCategory] = useState<number | null>(null);
  const [titleClickCount, setTitleClickCount] = useState(0);
  const [devMode, setDevMode] = useState(() => {
    // localStorage에서 개발자 모드 상태 불러오기
    return localStorage.getItem('devMode') === 'true';
  });
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [energy, setEnergy] = useState(getEnergy());
  const [showAdButton, setShowAdButton] = useState(false);
  const [showVideoAd, setShowVideoAd] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [skipTimer, setSkipTimer] = useState(5); // 5초 후 스킵 가능
  const [selectedAdVideo, setSelectedAdVideo] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 컴포넌트 마운트 시 추천 카테고리 계산
    setRecommendedCategory(getLowestScoreCategory());
    
    // 에너지 업데이트
    const updateEnergy = () => {
      setEnergy(getEnergy());
    };
    
    // 에너지 업데이트 인터벌 (1초마다)
    const interval = setInterval(updateEnergy, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // 제목 클릭 핸들러 - 5번 클릭 시 개발자 모드 활성화
  const handleTitleClick = () => {
    const newCount = titleClickCount + 1;
    setTitleClickCount(newCount);

    if (newCount === 5) {
      setDevMode(true);
      localStorage.setItem('devMode', 'true');
      playClickSound();
      setTitleClickCount(0);
      
      // 타이머 클리어
      if (clickTimer) {
        clearTimeout(clickTimer);
        setClickTimer(null);
      }
      return;
    }
    
    // 기존 타이머 클리어
    if (clickTimer) {
      clearTimeout(clickTimer);
    }
    
    // 2초 후 카운트 초기화
    const newTimer = setTimeout(() => {
      setTitleClickCount(0);
      setClickTimer(null);
    }, 2000);
    
    setClickTimer(newTimer);
  };
  
  // 개발자 모드 토글 핸들러
  const handleDevModeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDevMode(false);
    localStorage.setItem('devMode', 'false');
    setTitleClickCount(0); // 카운트 초기화
    
    // 타이머 클리어
    if (clickTimer) {
      clearTimeout(clickTimer);
      setClickTimer(null);
    }
    
    playClickSound();
  };
  
  // 마스터 리셋 핸들러
  const handleMasterReset = () => {
    if (confirm('모든 게임의 데이터를 초기화하시겠습니까?')) {
      try {
        // localStorage 전체 순회하여 게임 관련 데이터 모두 삭제
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key !== 'devMode') { // devMode는 유지
            keysToRemove.push(key);
          }
        }
        
        // 모든 키 삭제 (devMode 제외)
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        // 에너지 초기화
        resetEnergy();
        setEnergy(getEnergy());
        
        // 추천 카테고리 재계산
        setRecommendedCategory(getLowestScoreCategory());
        
        playClickSound();
        alert('모든 데이터가 초기화되었습니다.');
      } catch (error) {
        console.error('초기화 중 오류 발생:', error);
        alert('초기화 중 오류가 발생했습니다.');
      }
    }
  };

  // 에너지 클릭 핸들러
  const handleEnergyClick = () => {
    playClickSound();
    setShowAdButton(!showAdButton);
  };

  // 광고 시청 핸들러 (실제로는 광고 플랫폼 연동 필요)
  const handleWatchAd = () => {
    playClickSound();
    
    // 광고 시청 시뮬레이션 (실제로는 광고 플랫폼 SDK 사용)
    alert('광고를 시청하는 중...');
    
    // 광고 시청 후 에너지 3개 추가
    setTimeout(() => {
      addEnergyFromAd(3);
      setEnergy(getEnergy());
      setShowAdButton(false);
      playSelectSound();
      alert('에너지 3개를 받았습니다!');
    }, 1000);
  };

  // 비디오 광고 보여주기
  const handleShowVideoAd = () => {
    // 30개 이상이면 광고를 볼 수 없음
    if (!canWatchAd()) {
      playClickSound();
      alert('에너지가 이미 최대입니다!');
      setShowAdButton(false);
      return;
    }
    
    playClickSound();
    
    // 1~5 중 랜덤으로 광고 선택
    const randomAdNumber = Math.floor(Math.random() * 5) + 1;
    setSelectedAdVideo(getPublicAssetPath(`video/ad${randomAdNumber}.mp4`));
    
    setShowVideoAd(true);
    setSkipTimer(5); // 5초 후 스킵 가능
    
    // 배경음악 일시정지
    pauseMusic();
  };

  // 비디오 광고 스킵
  const handleSkipVideoAd = () => {
    playClickSound();
    setShowVideoAd(false);
    setVideoWatched(false);
    setSkipTimer(5); // 타이머 초기화
    
    // 스킵해도 에너지 지급
    const currentEnergy = getEnergy();
    const maxEnergy = getMaxEnergy();
    const remainingSpace = maxEnergy - currentEnergy;
    const actualReward = Math.min(3, remainingSpace);
    
    addEnergyFromAd(3);
    setEnergy(getEnergy());
    playSelectSound();
    alert(`에너지 ${actualReward}개를 받았습니다!`);
    
    // 배경음악 재개
    resumeMusic();
  };

  // 비디오 광고 완료
  const handleVideoAdEnded = () => {
    playClickSound();
    setShowVideoAd(false);
    setVideoWatched(true);
    
    const currentEnergy = getEnergy();
    const maxEnergy = getMaxEnergy();
    const remainingSpace = maxEnergy - currentEnergy;
    const actualReward = Math.min(3, remainingSpace);
    
    addEnergyFromAd(3);
    setEnergy(getEnergy());
    playSelectSound();
    alert(`에너지 ${actualReward}개를 받았습니다!`);
    
    // 배경음악 재개
    resumeMusic();
  };

  // 스킵 타이머 업데이트
  useEffect(() => {
    if (skipTimer > 0 && showVideoAd) {
      const timer = setInterval(() => {
        setSkipTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [skipTimer, showVideoAd]);

  return (
    <div className="h-screen overflow-hidden bg-amber-50 flex flex-col">
      {/* Header with Energy Display, Title, and Settings button */}
      <div className="flex items-center justify-between pt-[max(env(safe-area-inset-top),4rem)] pb-[env(safe-area-inset-bottom)] px-4 flex-shrink-0">
        {/* 에너지 표시 */}
        <div className="relative">
          <div className="relative cursor-pointer" onClick={handleEnergyClick}>
            <img src={energyIcon} alt="에너지" className="w-14 h-14 object-contain" />
            <span 
              className="absolute bottom-0 right-0 text-lg font-black pointer-events-none"
              style={{ 
                fontFamily: "OngleipRyudung", 
                color: "#4a4a4a",
                fontWeight: 900,
                WebkitTextStroke: "1px #4a4a4a"
              }}
            >
              {energy}
            </span>
            <span 
              className="absolute text-lg font-black pointer-events-none"
              style={{ 
                fontFamily: "OngleipRyudung", 
                color: "#4a4a4a", 
                top: '2px', 
                right: '2px',
                fontWeight: 900,
                WebkitTextStroke: "1px #4a4a4a"
              }}
            >
              +
            </span>
          </div>
          
          {/* 광고 시청 버튼 */}
          {showAdButton && (() => {
            const maxEnergy = getMaxEnergy();
            const remainingSpace = maxEnergy - energy;
            const adReward = Math.min(3, remainingSpace); // 최대 3개, 남은 공간만큼만
            
            // 30개면 버튼 자체를 표시 안 함
            if (!canWatchAd()) {
              return null;
            }
            
            return (
              <button
                onClick={handleShowVideoAd}
                className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#ffa500] text-white rounded-md text-xs hover:bg-[#ff8c00] transition-colors whitespace-nowrap z-10"
                style={{ fontFamily: "OngleipRyudung" }}
              >
                광고 시청 +{adReward}
              </button>
            );
          })()}
        </div>
        
        <h1 
          className="text-5xl text-center cursor-pointer select-none" 
          style={{ fontFamily: "'KkuBulLim', cursive", color: "#4a4a4a" }}
          onClick={handleTitleClick}
        >
          눈귀뇌하트{devMode && (
            <span 
              onClick={handleDevModeToggle}
              className="cursor-pointer hover:scale-110 transition-transform inline-block ml-2"
              title="개발자 모드 끄기"
            >
              🔧
            </span>
          )}
        </h1>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            playClickSound();
            onOpenSettings();
          }}
          className="bg-transparent hover:bg-transparent border-none p-2 w-16 h-16 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
        >
          <ImageWithFallback src={settingsIcon} alt="설정" className="w-full h-full object-contain" />
        </Button>
      </div>
      
      {/* 개발자 모드 버튼 */}
      {devMode && (
        <div className="flex justify-center gap-2 px-4 mt-2 flex-shrink-0">
          <button
            onClick={handleMasterReset}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xl"
            style={{ fontFamily: "OngleipRyudung" }}
          >
            🗑️ 마스터 리셋
          </button>
        </div>
      )}

      {/* Game Category Buttons - 화면 중앙에 배치 */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8 mt-4">
        <div className="max-w-xs w-full space-y-2">
          {categories.map((category, index) => (
            <div key={category.id} className="relative">
              <button
                onClick={() => {
                  playSelectSound();
                  // 4번째 카테고리(테스트하기/하트)는 기록 화면으로 이동
                  if (index === 3) {
                    onOpenRecords();
                  } else {
                    onSelectCategory(index);
                  }
                }}
                className={`w-full transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                  index === 0 || index === 1 || index === 2 || index === 3
                    ? 'bg-transparent border-none p-0' 
                    : 'aspect-[16/6] rounded-2xl overflow-hidden relative shadow-xl'
                }`}
                style={index < 3 && index === recommendedCategory ? {
                  animation: 'buttonPulse 1.5s ease-in-out infinite'
                } : undefined}
              >
                {index === 0 || index === 1 || index === 2 || index === 3 ? (
                  // 모든 게임 - 이미지 자체가 버튼
                  <ImageWithFallback
                    src={category.image}
                    alt={category.name}
                    className="w-2/3 h-auto object-contain mx-auto"
                  />
                ) : (
                  // 나머지 게임들 - 기존 스타일
                  <>
                    <ImageWithFallback
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <h2 className="text-white drop-shadow-lg">{category.name}</h2>
                    </div>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 비디오 광고 모달 */}
      {showVideoAd && (
        <div className="fixed top-0 left-0 w-full h-full bg-black/90 flex items-center justify-center z-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="relative w-full h-full max-w-4xl flex items-center justify-center px-4">
            <video
              ref={videoRef}
              className="w-full h-auto max-h-full"
              autoPlay
              playsInline
              preload="auto"
              onPlay={() => {
                // 비디오 재생 시작 시 배경음악 일시정지 확인
                pauseMusic();
              }}
              onError={() => {
                console.error("광고 영상 로드 실패:", selectedAdVideo);
              }}
              onEnded={handleVideoAdEnded}
            >
              <source src={selectedAdVideo} type="video/mp4" />
              브라우저가 비디오를 지원하지 않습니다.
            </video>
            
            {/* 스킵 버튼 - 5초 후 활성화 */}
            {skipTimer > 0 ? (
              <div
                className="absolute top-4 right-4 px-4 py-2 bg-gray-700 text-white rounded-lg opacity-50"
                style={{ fontFamily: "OngleipRyudung" }}
              >
                {skipTimer}초 후 스킵 가능
              </div>
            ) : (
              <button
                onClick={handleSkipVideoAd}
                className="absolute top-4 right-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                style={{ fontFamily: "OngleipRyudung" }}
              >
                ✕ 스킵
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
