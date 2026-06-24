// 게임 기록을 localStorage에 저장하는 유틸리티

export const saveGameRecord = (gameKey: string, score: number, level: number = 1) => {
  try {
    const existingRecord = localStorage.getItem(gameKey);
    const currentRecord = existingRecord ? JSON.parse(existingRecord) : { level1: 0, level2: 0, level3: 0 };
    
    const levelKey = `level${level}` as 'level1' | 'level2' | 'level3';
    
    // 새로운 점수가 더 높으면 업데이트
    if (score > (currentRecord[levelKey] || 0)) {
      currentRecord[levelKey] = score;
      localStorage.setItem(gameKey, JSON.stringify(currentRecord));
    }
  } catch (error) {
    console.error('Failed to save game record:', error);
  }
};

export const getGameRecord = (gameKey: string) => {
  try {
    const record = localStorage.getItem(gameKey);
    return record ? JSON.parse(record) : { level1: 0, level2: 0, level3: 0 };
  } catch (error) {
    console.error('Failed to get game record:', error);
    return { level1: 0, level2: 0, level3: 0 };
  }
};

// 일일 목표 달성 기록
export const recordAchievement = (gameKey: string, date?: string): void => {
  try {
    // 한국 시간(KST) 기준으로 날짜 계산
    const now = new Date();
    const kstOffset = 9 * 60; // KST는 UTC+9
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
    const todayDate = date || kstTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const storageKey = `${gameKey}_achievements`;
    const existingData = localStorage.getItem(storageKey);
    const achievements = existingData ? JSON.parse(existingData) : {};
    
    // 해당 날짜에 달성 기록
    achievements[todayDate] = true;
    localStorage.setItem(storageKey, JSON.stringify(achievements));
  } catch (error) {
    console.error('Failed to record achievement:', error);
  }
};

// 특정 날짜의 달성 여부 확인
export const hasAchievement = (gameKey: string, date?: string): boolean => {
  try {
    // 한국 시간(KST) 기준으로 날짜 계산
    const now = new Date();
    const kstOffset = 9 * 60; // KST는 UTC+9
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
    const todayDate = date || kstTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const storageKey = `${gameKey}_achievements`;
    const existingData = localStorage.getItem(storageKey);
    const achievements = existingData ? JSON.parse(existingData) : {};
    
    return achievements[todayDate] === true;
  } catch (error) {
    console.error('Failed to check achievement:', error);
    return false;
  }
};

// 카테고리별 게임 정의
const CATEGORIES = {
  eye: ['bombGame', 'yabawiGame', 'numberGame'],
  ear: ['bubbleShooter', 'directionGame', 'classifyGame'],
  brain: ['memoryGame', 'coloringGame', 'clickInOrder'],
  heart: [] // 추후 확장 가능
};

// 특정 날짜에 카테고리별 달성 여부 확인
export const getCategoryAchievements = (date: string): { eye: boolean; ear: boolean; brain: boolean; heart: boolean } => {
  try {
    const achievements = {
      eye: false,
      ear: false,
      brain: false,
      heart: false
    };
    
    // 눈 게임 체크
    achievements.eye = CATEGORIES.eye.some(gameKey => hasAchievement(gameKey, date));
    
    // 귀 게임 체크
    achievements.ear = CATEGORIES.ear.some(gameKey => hasAchievement(gameKey, date));
    
    // 뇌 게임 체크
    achievements.brain = CATEGORIES.brain.some(gameKey => hasAchievement(gameKey, date));
    
    // 하트 게임 체크
    achievements.heart = CATEGORIES.heart.some(gameKey => hasAchievement(gameKey, date));
    
    return achievements;
  } catch (error) {
    console.error('Failed to get category achievements:', error);
    return { eye: false, ear: false, brain: false, heart: false };
  }
};

// 특정 월의 모든 날짜별 달성 기록 가져오기
export const getMonthlyAchievements = (year: number, month: number) => {
  try {
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthlyData: Record<number, { eye: boolean; ear: boolean; brain: boolean; heart: boolean }> = {};
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      monthlyData[day] = getCategoryAchievements(dateStr);
    }
    
    return monthlyData;
  } catch (error) {
    console.error('Failed to get monthly achievements:', error);
    return {};
  }
};

// 오늘 플레이한 게임 기록
export const recordGamePlayed = (gameKey: string): void => {
  try {
    // 한국 시간(KST) 기준으로 날짜 계산
    const now = new Date();
    const kstOffset = 9 * 60; // KST는 UTC+9
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
    const todayDate = kstTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const storageKey = `dailyGamesPlayed_${todayDate}`;
    const existingData = localStorage.getItem(storageKey);
    const gamesPlayed = existingData ? JSON.parse(existingData) : [];
    
    // 중복 방지하지 않고 플레이할 때마다 추가
    gamesPlayed.push({
      gameKey,
      timestamp: Date.now()
    });
    
    localStorage.setItem(storageKey, JSON.stringify(gamesPlayed));
  } catch (error) {
    console.error('Failed to record game played:', error);
  }
};

// 오늘 플레이한 게임 개수 가져오기
export const getTodayGamesPlayedCount = (): number => {
  try {
    // 한국 시간(KST) 기준으로 날짜 계산
    const now = new Date();
    const kstOffset = 9 * 60; // KST는 UTC+9
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
    const todayDate = kstTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const storageKey = `dailyGamesPlayed_${todayDate}`;
    const existingData = localStorage.getItem(storageKey);
    const gamesPlayed = existingData ? JSON.parse(existingData) : [];
    
    return gamesPlayed.length;
  } catch (error) {
    console.error('Failed to get today games played count:', error);
    return 0;
  }
};