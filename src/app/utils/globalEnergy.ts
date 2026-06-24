// 전역 에너지 시스템 (하루 15회)

interface EnergyData {
  energy: number;
  lastResetDate: string;
}

const DAILY_ENERGY = 15; // 하루 기본 지급량
const MAX_ENERGY = 30; // 최대 에너지 개수

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
const getTodayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// localStorage 키
const STORAGE_KEY = 'global_energy';

// 에너지 데이터 가져오기 (자정 초기화 체크 포함)
const getEnergyData = (): EnergyData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const today = getTodayDate();
  
  if (!stored) {
    // 처음 사용하는 경우
    const newData: EnergyData = {
      energy: DAILY_ENERGY,
      lastResetDate: today
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    return newData;
  }
  
  const data: EnergyData = JSON.parse(stored);
  
  // 날짜가 바뀌었으면 초기화 (단, 15개 미만일 때만)
  if (data.lastResetDate !== today) {
    const resetData: EnergyData = {
      energy: Math.max(data.energy, DAILY_ENERGY), // 15개보다 많으면 유지, 적으면 15개로
      lastResetDate: today
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resetData));
    return resetData;
  }
  
  return data;
};

// 에너지 데이터 저장
const saveEnergyData = (data: EnergyData): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// 남은 에너지 개수 반환 (0~15)
export const getEnergy = (): number => {
  const data = getEnergyData();
  return data.energy;
};

// 최대 에너지 개수 반환
export const getMaxEnergy = (): number => {
  return MAX_ENERGY;
};

// 일일 기본 지급량 반환
export const getDailyEnergy = (): number => {
  return DAILY_ENERGY;
};

// 에너지 1개 사용 (성공하면 true, 에너지 없으면 false)
export const useEnergy = (): boolean => {
  const data = getEnergyData();
  
  if (data.energy <= 0) {
    return false; // 에너지 없음
  }
  
  // 에너지 1개 차감
  data.energy -= 1;
  saveEnergyData(data);
  return true; // 성공
};

// 에너지가 남아있는지 확인
export const hasEnergy = (): boolean => {
  return getEnergy() > 0;
};

// 에너지 초기화 (개발자 모드용)
export const resetEnergy = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

// 에너지 추가 (개발자 모드용)
export const addEnergy = (amount: number): void => {
  const data = getEnergyData();
  data.energy = Math.min(data.energy + amount, MAX_ENERGY);
  saveEnergyData(data);
};

// 광고 시청 가능 여부 확인 (30개 미만일 때만)
export const canWatchAd = (): boolean => {
  return getEnergy() < MAX_ENERGY;
};

// 광고 시청으로 에너지 추가 (최대 30개까지만)
export const addEnergyFromAd = (amount: number): void => {
  const data = getEnergyData();
  // 30개를 초과하지 않도록 제한
  data.energy = Math.min(data.energy + amount, MAX_ENERGY);
  saveEnergyData(data);
};