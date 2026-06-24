// NumberGame 일일 목표점수 시스템
// 하루 동안 획득한 점수를 누적하여 목표점수에 도달하면 달성 처리하는 시스템

const STORAGE_KEY = 'numberGameDailyGoal';
const CALENDAR_KEY = 'minigameCalendar';

export interface NumberGameDailyGoalData {
  date: string; // 'YYYY-MM-DD' 형식
  targetScore: number; // 일일 목표점수
  accumulatedScore: number; // 하루 동안 누적된 점수
  achieved: boolean; // 목표 달성 여부
  measuredScore: number; // 최초 측정 점수 (목표점수 계산용)
}

// 오늘 날짜를 'YYYY-MM-DD' 형식으로 반환
function getTodayString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// 로컬스토리지에서 데이터 가져오기
function getData(): NumberGameDailyGoalData {
  const today = getTodayString();
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (stored) {
    const data: NumberGameDailyGoalData = JSON.parse(stored);
    // 날짜가 다르면 초기화
    if (data.date !== today) {
      const initialData: NumberGameDailyGoalData = {
        date: today,
        targetScore: 0,
        accumulatedScore: 0,
        achieved: false,
        measuredScore: 0,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
      return initialData;
    }
    return data;
  }
  
  // 데이터가 없으면 초기화
  const initialData: NumberGameDailyGoalData = {
    date: today,
    targetScore: 0,
    accumulatedScore: 0,
    achieved: false,
    measuredScore: 0,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
  return initialData;
}

// 로컬스토리지에 데이터 저장
function saveData(data: NumberGameDailyGoalData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 목표점수 가져오기 (측정중이면 0 반환)
export function getTargetScore(): number {
  const data = getData();
  return data.targetScore;
}

// 누적점수 가져오기
export function getAccumulatedScore(): number {
  const data = getData();
  return data.accumulatedScore;
}

// 목표 달성 여부 확인
export function isAchieved(): boolean {
  const data = getData();
  return data.achieved;
}

// 측정 점수 설정 및 목표점수 계산 (최초 1회만 실행)
export function setMeasuredScore(score: number): void {
  const data = getData();
  
  // 이미 목표점수가 설정되어 있으면 무시
  if (data.targetScore > 0) {
    return;
  }
  
  // 측정 점수 저장 및 목표점수 계산 (측정 점수의 3배)
  data.measuredScore = score;
  data.targetScore = score > 0 ? score * 3 : 0;
  
  // ✅ 측정 중일 때는 첫 플레이이므로 누적점수도 설정
  data.accumulatedScore = score;
  
  saveData(data);
}

// 점수 추가 및 목표 달성 체크
export function addScore(score: number): { achieved: boolean; newAccumulated: number } {
  const data = getData();
  
  // 이미 달성했으면 점수만 누적하고 achieved는 false 반환 (한 번만 달성 처리)
  if (data.achieved) {
    data.accumulatedScore += score;
    saveData(data);
    return { achieved: false, newAccumulated: data.accumulatedScore };
  }
  
  // 점수 누적
  data.accumulatedScore += score;
  
  // 목표 달성 체크
  if (data.targetScore > 0 && data.accumulatedScore >= data.targetScore && !data.achieved) {
    data.achieved = true;
    saveData(data);
    
    // 달력에 도장 찍기
    markCalendar();
    
    return { achieved: true, newAccumulated: data.accumulatedScore };
  }
  
  saveData(data);
  return { achieved: false, newAccumulated: data.accumulatedScore };
}

// 달력에 도장 찍기
function markCalendar(): void {
  const today = getTodayString();
  const stored = localStorage.getItem(CALENDAR_KEY);
  let calendar: Record<string, string[]> = {};
  
  if (stored) {
    calendar = JSON.parse(stored);
  }
  
  if (!calendar[today]) {
    calendar[today] = [];
  }
  
  // '눈' 카테고리 도장 추가 (중복 방지)
  if (!calendar[today].includes('눈')) {
    calendar[today].push('눈');
  }
  
  localStorage.setItem(CALENDAR_KEY, JSON.stringify(calendar));
}

// 초기화 (테스트용)
export function resetDailyGoal(): void {
  localStorage.removeItem(STORAGE_KEY);
}