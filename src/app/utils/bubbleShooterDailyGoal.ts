// 버블게임 일일 목표점수 관리

interface DailyGoalData {
  targetScore: number | null; // 목표점수 (측정값 * 3), null이면 측정중
  measuredScore: number | null; // 측정값 (첫 플레이 점수)
  accumulatedScore: number; // 오늘 누적된 총 점수
  lastResetDate: string; // 마지막 초기화 날짜
  achieved: boolean; // 오늘 목표를 이미 달성했는지 여부
}

const STORAGE_KEY = 'bubbleShooter_dailyGoal';

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
const getTodayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 일일 목표 데이터 가져오기 (자정 초기화 체크 포함)
const getDailyGoalData = (): DailyGoalData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const today = getTodayDate();
  
  if (!stored) {
    // 처음 플레이하는 경우
    const newData: DailyGoalData = {
      targetScore: null,
      measuredScore: null,
      accumulatedScore: 0,
      lastResetDate: today,
      achieved: false
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    return newData;
  }
  
  const data: DailyGoalData = JSON.parse(stored);
  
  // 날짜가 바뀌었으면 초기화
  if (data.lastResetDate !== today) {
    const resetData: DailyGoalData = {
      targetScore: null,
      measuredScore: null,
      accumulatedScore: 0,
      lastResetDate: today,
      achieved: false
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resetData));
    return resetData;
  }
  
  return data;
};

// 일일 목표 데이터 저장
const saveDailyGoalData = (data: DailyGoalData): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// 목표점수 가져오기 (null이면 측정중)
export const getTargetScore = (): number | null => {
  const data = getDailyGoalData();
  return data.targetScore;
};

// 첫 플레이 점수 기록 (측정값 설정 및 목표점수 계산)
export const setMeasuredScore = (score: number): void => {
  const data = getDailyGoalData();
  
  // 이미 0점이 아닌 목표점수가 설정되어 있으면 무시
  if (data.targetScore !== null && data.targetScore > 0) {
    return;
  }
  
  // 0점이면 0으로 저장 (다음에도 계속 측정)
  // 0점이 아니면 측정값 * 3으로 목표점수 설정
  data.measuredScore = score;
  data.targetScore = score > 0 ? score * 3 : 0;
  
  // ✅ 측정 중일 때는 첫 플레이이므로 누적점수도 설정
  data.accumulatedScore = score;
  
  saveDailyGoalData(data);
};

// 테스트용: 모든 데이터 초기화
export const resetDailyGoal = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

// 누적 점수 가져오기
export const getAccumulatedScore = (): number => {
  const data = getDailyGoalData();
  return data.accumulatedScore;
};

// 게임 점수 추가 및 목표 달성 여부 반환
export const addScore = (score: number): { achieved: boolean; newAccumulated: number } => {
  const data = getDailyGoalData();
  
  // 누적 점수에 추가
  data.accumulatedScore += score;
  saveDailyGoalData(data);
  
  // 이미 목표를 달성한 경우 false 반환 (게임 계속 진행)
  if (data.achieved) {
    return { achieved: false, newAccumulated: data.accumulatedScore };
  }
  
  // 목표점수가 설정되어 있고, 누적 점수가 목표 이상이면 true 반환
  if (data.targetScore !== null && data.targetScore > 0 && data.accumulatedScore >= data.targetScore) {
    data.achieved = true;
    saveDailyGoalData(data);
    return { achieved: true, newAccumulated: data.accumulatedScore };
  }
  
  return { achieved: false, newAccumulated: data.accumulatedScore };
};

// 목표 달성 여부 확인
export const isAchieved = (): boolean => {
  const data = getDailyGoalData();
  return data.achieved;
};