import { ImageWithFallback } from "../figma/ImageWithFallback";

interface LevelButtonWithChancesProps {
  level: number;
  levelName: string;
  chances: number;
  isRecommended: boolean;
  buttonBgImage: string;
  onClick: () => void;
  devMode?: boolean; // 개발자 모드 추가
  color?: string; // 색상 prop 추가
}

export function LevelButtonWithChances({
  level,
  levelName,
  chances,
  isRecommended,
  buttonBgImage,
  onClick,
  devMode = false,
  color = '#4e7557' // 기본 색상
}: LevelButtonWithChancesProps) {
  const isDisabled = chances === 0 && !devMode; // 개발자 모드일 때는 비활성화 안 함
  
  return (
    <div className="relative w-2/3 mx-auto flex items-center justify-center gap-3">
      {/* 기회 점 3개 (세로) */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full border-2"
            style={{
              backgroundColor: i >= (3 - chances) ? color : 'transparent',
              borderColor: color
            }}
          />
        ))}
      </div>
      
      {/* 레벨 버튼 */}
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`relative transition-transform flex-1 ${
          isDisabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:scale-105 active:scale-95 cursor-pointer'
        }`}
        style={isRecommended && !isDisabled ? {
          animation: 'buttonPulse 1.5s ease-in-out infinite'
        } : undefined}
      >
        <ImageWithFallback
          src={buttonBgImage}
          alt={`레벨 ${level}`}
          className="w-full h-auto object-contain"
        />
        <div 
          className="absolute inset-0 flex flex-col items-start justify-center pl-8" 
          style={{ fontFamily: 'OngleipRyudung', color: '#ffffff' }}
        >
          <div className="text-3xl">{level === 1 ? '쉬움' : level === 2 ? '보통' : '어려움'}</div>
          <div className="text-2xl">{levelName}</div>
        </div>
      </button>
    </div>
  );
}