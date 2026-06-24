// 게임 기회 관리 유틸리티

interface ChanceData {
  chances: number;
  lastResetDate: string;
}

const DAILY_CHANCES = 3; // 하루 3번

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
const getTodayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// localStorage 키 생성
const getStorageKey = (gameId: string, level: number): string => {
  return `${gameId}_level${level}_chances`;
};

// 기회 데이터 가져오기 (자정 초기화 체크 포함)
const getChanceData = (gameId: string, level: number): ChanceData => {
  const key = getStorageKey(gameId, level);
  const stored = localStorage.getItem(key);
  const today = getTodayDate();
  
  if (!stored) {
    // 처음 플레이하는 경우
    const newData: ChanceData = {
      chances: DAILY_CHANCES,
      lastResetDate: today
    };
    localStorage.setItem(key, JSON.stringify(newData));
    return newData;
  }
  
  const data: ChanceData = JSON.parse(stored);
  
  // 날짜가 바뀌었으면 초기화
  if (data.lastResetDate !== today) {
    const resetData: ChanceData = {
      chances: DAILY_CHANCES,
      lastResetDate: today
    };
    localStorage.setItem(key, JSON.stringify(resetData));
    return resetData;
  }
  
  return data;
};

// 기회 데이터 저장
const saveChanceData = (gameId: string, level: number, data: ChanceData): void => {
  const key = getStorageKey(gameId, level);
  localStorage.setItem(key, JSON.stringify(data));
};

// 남은 기회 개수 반환 (0~3)
export const getChances = (gameId: string, level: number): number => {
  const data = getChanceData(gameId, level);
  return data.chances;
};

// 기회 1개 사용 (성공하면 true, 기회 없으면 false)
export const useChance = (gameId: string, level: number): boolean => {
  const data = getChanceData(gameId, level);
  
  if (data.chances <= 0) {
    return false; // 기회 없음
  }
  
  // 기회 1개 차감
  data.chances -= 1;
  saveChanceData(gameId, level, data);
  return true; // 성공
};

// 기회가 남아있는지 확인
export const hasChances = (gameId: string, level: number): boolean => {
  return getChances(gameId, level) > 0;
};

// 모든 레벨의 기회 초기화 (테스트용)
export const resetAllChances = (gameId: string): void => {
  [1, 2, 3].forEach(level => {
    const key = getStorageKey(gameId, level);
    localStorage.removeItem(key);
  });
};
