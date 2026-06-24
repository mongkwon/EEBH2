import { useState, useEffect } from "react";
import eyeStampIcon from "figma:asset/cd58ebe3b7a36a9bbf64d3324c781239846d915c.png";
import earStampIcon from "figma:asset/cfb59ecd96a5d7d1c8d27854b62048804679dc98.png";
import brainStampIcon from "figma:asset/c6a3cec6186216ff5f8dd55a63c804251922739b.png";
import allStampIcon from "figma:asset/12882d280843ceafad39e72ea25913edd0bc4854.png";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { getMonthlyAchievements, getTodayGamesPlayedCount } from "../utils/gameRecord";
import { getEnergy, getMaxEnergy } from "../utils/globalEnergy";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { playBackSound, playClickSound } from "../utils/sound";
import exitIcon from "figma:asset/74b1288f91a03a19fc199ba8e3ce487eebb3c1fb.png";
import starIcon from "figma:asset/6bb4b946fe5bace96d27aa95e71d0d4f7866adde.png";
import heartGameImage from "figma:asset/bcc22c12cc1569915dbdb315501b5e8a6b904580.png";
import detailButtonBg from "figma:asset/cd8fa7fc408d44774d5fb29ff7c0832112f3cf65.png";

interface RecordsProps {
  onBack: () => void;
}

// localStorage에서 게임 기록 불러오기
const getGameRecord = (key: string) => {
  const record = localStorage.getItem(key);
  return record ? JSON.parse(record) : { highScore: 0 };
};

export function Records({ onBack }: RecordsProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  // 달력 화면용 년/월 state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  // 컴포넌트가 마운트될 때마다 데이터 새로고침
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const gameRecords = [
    {
      category: "눈 게임",
      games: [
        { name: "폭탄게임", key: "bombGame", ...getGameRecord("bombGame") },
        { name: "셔플게임", key: "yabawiGame", ...getGameRecord("yabawiGame") },
        { name: "숫자게임", key: "numberGame", ...getGameRecord("numberGame") }
      ]
    },
    {
      category: "귀 게임",
      games: [
        { name: "버블게임", key: "bubbleShooter", ...getGameRecord("bubbleShooter") },
        { name: "방향게임", key: "directionGame", ...getGameRecord("directionGame") },
        { name: "단어게임", key: "classifyGame", ...getGameRecord("classifyGame") }
      ]
    },
    {
      category: "뇌 게임",
      games: [
        { name: "카드게임", key: "memoryGame", ...getGameRecord("memoryGame") },
        { name: "색칠게임", key: "coloringGame", ...getGameRecord("coloringGame") },
        { name: "순서게임", key: "clickInOrder", ...getGameRecord("clickInOrder") }
      ]
    }
  ];

  // 게임의 총점 계산 (3개 레벨 합)
  const getTotalScore = (game: any) => {
    return (game.level1 || 0) + (game.level2 || 0) + (game.level3 || 0);
  };

  // 전체 통계 계산
  const totalHighScore = gameRecords.reduce((total, category) => {
    return total + category.games.reduce((sum, game) => sum + getTotalScore(game), 0);
  }, 0);
  
  // 오늘 플레이한 게임 수 계산
  const gamesPlayedToday = getTodayGamesPlayedCount();

  // 현재 월의 카테고리별 도장 개수 계산
  const monthlyAchievements = getMonthlyAchievements(selectedYear, selectedMonth);
  
  // 카테고리별 도장 찍힌 날짜 수 계산
  const eyeStampCount = Object.values(monthlyAchievements).filter(day => day.eye).length;
  const earStampCount = Object.values(monthlyAchievements).filter(day => day.ear).length;
  const brainStampCount = Object.values(monthlyAchievements).filter(day => day.brain).length;
  const totalStampCount = eyeStampCount + earStampCount + brainStampCount;

  // 레이더 차트 데이터 생성 - 카테고리별 도장 개수
  const radarData = [
    {
      category: '눈',
      count: eyeStampCount
    },
    {
      category: '귀',
      count: earStampCount
    },
    {
      category: '뇌',
      count: brainStampCount
    }
  ];

  // 최대 개수 계산 (차트 스케일용) - 최소 5
  const maxCount = Math.max(...radarData.map(d => d.count), 5);

  const handleDeleteAll = () => {
    playClickSound();
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteAll = () => {
    // 모든 게임 기록 삭제
    gameRecords.forEach(category => {
      category.games.forEach(game => {
        localStorage.removeItem(game.key);
      });
    });
    playClickSound();
    setRefreshKey(prev => prev + 1);
    setShowDeleteConfirmation(false);
  };

  const cancelDelete = () => {
    playClickSound();
    setShowDeleteConfirmation(false);
  };

  // 상세보기 화면 - 달력 방식으로 변경
  if (showDetailView) {
    // 해당 월의 모든 달성 기록 가져오기
    const monthlyAchievements = getMonthlyAchievements(selectedYear, selectedMonth);
    
    // 달력 생성을 위한 계산
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 1일의 요일 (0=일요일)
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate(); // 해당 월의 총 일수
    
    // 달력 그리드 생성
    const calendarDays: (number | null)[] = [];
    
    // 첫 주의 빈 칸 추가
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    
    // 날짜 추가
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }
    
    // 이전 달로 이동
    const handlePrevMonth = () => {
      playClickSound();
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    };
    
    // 다음 달로 이동
    const handleNextMonth = () => {
      playClickSound();
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    };
    
    // 도장 렌링 함수
    const renderStamp = (achievements: { eye: boolean; ear: boolean; brain: boolean; heart: boolean }) => {
      const achievedCount = [achievements.eye, achievements.ear, achievements.brain].filter(Boolean).length;
      
      // 3개 모두 달성: 스페셜 도장
      if (achievedCount === 3) {
        return (
          <div title="모두 달성!">
            <ImageWithFallback 
              src={allStampIcon} 
              alt="모두 달성!" 
              title="모두 달성!"
              style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              className="sm:w-9 sm:h-9"
            />
          </div>
        );
      }
      
      // 2개 달성: 두 도장 겹쳐서
      if (achievedCount === 2) {
        return (
          <div className="relative flex items-center justify-center" style={{ width: '50px', height: '50px' }}>
            {achievements.eye && (
              <ImageWithFallback 
                src={eyeStampIcon} 
                alt="눈 게임 달성" 
                title="눈 게임 달성"
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  objectFit: 'contain',
                  position: 'absolute',
                  transform: 'rotate(-15deg) translate(-5px, -3px)',
                  zIndex: 1
                }}
              />
            )}
            {achievements.ear && (
              <ImageWithFallback 
                src={earStampIcon} 
                alt="귀 게임 달성" 
                title="귀 게임 달성"
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  objectFit: 'contain',
                  position: 'absolute',
                  transform: achievements.eye 
                    ? 'rotate(15deg) translate(5px, 3px)' 
                    : 'rotate(-15deg) translate(-5px, -3px)',
                  zIndex: achievements.eye ? 2 : 1
                }}
              />
            )}
            {achievements.brain && (
              <ImageWithFallback 
                src={brainStampIcon} 
                alt="뇌 게임 달성" 
                title="뇌 게임 달성"
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  objectFit: 'contain',
                  position: 'absolute',
                  transform: 'rotate(15deg) translate(5px, 3px)',
                  zIndex: 2
                }}
              />
            )}
          </div>
        );
      }
      
      // 1개만 달성: 해당 도장만 (크기 더 크게)
      if (achievedCount === 1) {
        return (
          <div className="flex items-center justify-center">
            {achievements.eye && (
              <ImageWithFallback 
                src={eyeStampIcon} 
                alt="눈 게임 달성" 
                title="눈 게임 달성"
                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                className="sm:w-16 sm:h-16"
              />
            )}
            {achievements.ear && (
              <ImageWithFallback 
                src={earStampIcon} 
                alt="귀 게임 달성" 
                title="귀 게임 달성"
                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                className="sm:w-16 sm:h-16"
              />
            )}
            {achievements.brain && (
              <ImageWithFallback 
                src={brainStampIcon} 
                alt="뇌 게임 달성" 
                title="뇌 게임 달성"
                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                className="sm:w-16 sm:h-16"
              />
            )}
          </div>
        );
      }
      
      return null;
    };
    
    return (
      <div className="h-screen overflow-hidden bg-amber-50 p-4 flex flex-col pt-[max(env(safe-area-inset-top),3rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center">
            <button
              onClick={() => {
                playBackSound();
                setShowDetailView(false);
              }}
              className="border-none p-2 hover:opacity-80 transition-opacity"
            >
              <ImageWithFallback src={exitIcon} alt="exit" style={{ width: '2rem', height: '2rem', objectFit: 'contain' }} />
            </button>
            <h1 className="text-gray-700 ml-4 text-4xl" style={{ fontFamily: "'OngleipRyudung', sans-serif" }}>도장 달력</h1>
          </div>
        </div>

        {/* 달력 영역 */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
          <div className="max-w-2xl mx-auto h-full flex flex-col">
            {/* 월 표시 */}
            <div className="text-center mb-4 sm:mb-6 flex-shrink-0">
              <div className="text-2xl sm:text-3xl mb-1" style={{ fontFamily: "'OngleipRyudung', sans-serif", color: '#675c4e' }}>
                {selectedYear}년
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handlePrevMonth}
                  className="cursor-pointer bg-transparent border-none p-2 transition-transform duration-200 hover:scale-110 active:scale-95"
                  style={{ color: '#675c4e' }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="text-3xl sm:text-4xl min-w-[120px]" style={{ fontFamily: "'OngleipRyudung', sans-serif", color: '#675c4e' }}>
                  {selectedMonth}월
                </div>
                <button
                  onClick={handleNextMonth}
                  className="cursor-pointer bg-transparent border-none p-2 transition-transform duration-200 hover:scale-110 active:scale-95"
                  style={{ color: '#675c4e' }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* 달력 */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg flex-shrink-0 mb-4">
              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                  <div 
                    key={day} 
                    className="text-center py-1 sm:py-2 text-2xl sm:text-3xl"
                    style={{ 
                      fontFamily: "'OngleipRyudung', sans-serif",
                      color: index === 0 ? '#cd6c58' : index === 6 ? '#4e7557' : '#675c4e'
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              {/* 날짜 그리드 */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square"></div>;
                  }
                  
                  const isToday = day === now.getDate() && selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
                  const achievements = monthlyAchievements[day] || { eye: false, ear: false, brain: false, heart: false };
                  const hasAnyAchievement = achievements.eye || achievements.ear || achievements.brain;
                  
                  return (
                    <div 
                      key={day}
                      className="aspect-square rounded-lg flex items-center justify-center relative"
                      style={{
                        backgroundColor: isToday ? '#ffeaa7' : 'transparent',
                        border: isToday ? '2px solid #fdcb6e' : 'none'
                      }}
                    >
                      {/* 날짜 - 도장이 없을 때만 보임 */}
                      <div 
                        className="text-xl sm:text-2xl"
                        style={{ 
                          fontFamily: "'OngleipRyudung', sans-serif",
                          color: '#675c4e',
                          opacity: hasAnyAchievement ? 0 : 1
                        }}
                      >
                        {day}
                      </div>
                      
                      {/* 도장 - 날짜 위를 완전히 덮음 */}
                      {hasAnyAchievement && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {renderStamp(achievements)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 범례 */}
            <div className="p-3 sm:p-4 flex-shrink-0">
              <h3 className="text-3xl sm:text-4xl mb-3 sm:mb-4 text-center" style={{ fontFamily: "'OngleipRyudung', sans-serif", color: '#675c4e' }}>도장 설명</h3>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2">
                  <ImageWithFallback 
                    src={eyeStampIcon} 
                    alt="눈 게임 달성"
                    style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                    className="sm:w-9 sm:h-9"
                  />
                  <span className="text-2xl sm:text-3xl" style={{ fontFamily: "'OngleipRyudung', sans-serif", color: '#675c4e' }}>눈 게임 달성</span>
                </div>
                <div className="flex items-center justify-start gap-2">
                  <ImageWithFallback 
                    src={earStampIcon} 
                    alt="귀 게임 달성"
                    style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                    className="sm:w-9 sm:h-9"
                  />
                  <span className="text-2xl sm:text-3xl" style={{ fontFamily: "'OngleipRyudung', sans-serif", color: '#675c4e' }}>귀 게임 달성</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <ImageWithFallback 
                    src={brainStampIcon} 
                    alt="뇌 게임 달성"
                    style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                    className="sm:w-9 sm:h-9"
                  />
                  <span className="text-2xl sm:text-3xl" style={{ fontFamily: "'OngleipRyudung', sans-serif", color: '#675c4e' }}>뇌 게임 달성</span>
                </div>
                <div className="flex items-center justify-start gap-2">
                  <ImageWithFallback 
                    src={allStampIcon} 
                    alt="모두 달성!"
                    style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                    className="sm:w-10 sm:h-10"
                  />
                  <span className="text-2xl sm:text-3xl" style={{ fontFamily: "'OngleipRyudung', sans-serif", color: '#675c4e' }}>모두 달성!</span>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 text-center text-xl sm:text-2xl" style={{ fontFamily: "'OngleipRyudung', sans-serif", color: '#8b7d6b' }}>
                각 카테고리의 게임 중 하나라도 목표를 달성하면 도장이 찍힙니다
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 메인 화면 (레이더 차트)
  return (
    <div className="h-screen overflow-hidden bg-amber-50 p-4 pb-[env(safe-area-inset-bottom)] flex flex-col pt-[max(env(safe-area-inset-top),3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center">
          <button
            onClick={() => {
              playBackSound();
              onBack();
            }}
            className="border-none p-2 hover:opacity-80 transition-opacity"
          >
            <ImageWithFallback src={exitIcon} alt="exit" style={{ width: '2rem', height: '2rem', objectFit: 'contain' }} />
          </button>
          <h1 className="text-gray-700 ml-4 text-4xl" style={{ fontFamily: "'OngleipRyudung', sans-serif" }}>게임 기록</h1>
        </div>
      </div>

      {/* 레이더 차트 카드 */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="max-w-2xl w-full">
          <div className="p-5 pb-3">
            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div>
                <div className="flex justify-center mb-2">
                  <ImageWithFallback 
                    src={heartGameImage} 
                    alt="하트" 
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div className="text-gray-600 text-2xl" style={{ fontFamily: "'OngleipRyudung', sans-serif" }}>플레이한 게임</div>
                <div className="text-3xl" style={{ fontFamily: "'OngleipRyudung', sans-serif", color: '#675c4e' }}>{gamesPlayedToday}/9</div>
              </div>
              <div>
                <div className="flex justify-center mb-2">
                  <ImageWithFallback 
                    src={starIcon} 
                    alt="star" 
                    className="h-8 w-8 object-contain" 
                  />
                </div>
                <div className="text-gray-600 text-2xl" style={{ fontFamily: "'OngleipRyudung', sans-serif" }}>총 목표도달 횟수</div>
                <div className="text-3xl" style={{ fontFamily: "'OngleipRyudung', sans-serif", color: '#675c4e' }}>{totalStampCount}</div>
              </div>
            </div>
            
            {/* 레이더 차트 */}
            <div className="pt-3 pb-3" style={{ pointerEvents: 'none' }}>
              <div className="h-1 rounded-full mb-3 mx-auto" style={{ backgroundColor: '#675c4e', width: '90%' }}></div>
              <div className="flex items-center justify-center mb-0" style={{ transform: 'translateY(15px)' }}>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 40, bottom: 50, left: 40 }}>
                    <PolarGrid 
                      stroke="#675c4e" 
                      strokeWidth={1}
                      levels={1}
                    />
                    <PolarAngleAxis 
                      dataKey="category" 
                      tick={{ fill: '#675c4e', fontSize: 24, fontFamily: "'OngleipRyudung', sans-serif" }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, maxCount]}
                      tick={false}
                    />
                    <Radar 
                      name="점수" 
                      dataKey="count" 
                      stroke="#675c4e" 
                      fill="#8b7d6b" 
                      fillOpacity={0.7}
                      strokeWidth={3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* 상세보기 버튼 */}
            <div className="pt-3 flex justify-center">
              <button
                onClick={() => {
                  playClickSound();
                  setShowDetailView(true);
                }}
                className="relative cursor-pointer bg-transparent border-none p-0 transition-transform duration-200 ease-out hover:scale-110 active:scale-95 w-[17.5rem] h-20"
              >
                <ImageWithFallback 
                  src={detailButtonBg} 
                  alt="달력보기 버튼" 
                  className="w-full h-full object-contain"
                />
                <div 
                  className="absolute inset-0 flex items-center justify-center text-white text-2xl"
                  style={{ 
                    fontFamily: "'OngleipRyudung', sans-serif",
                    pointerEvents: 'none'
                  }}
                >
                  달력보기
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}