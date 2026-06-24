import { ImageWithFallback } from "../figma/ImageWithFallback";

interface LevelButtonProps {
  level: number;
  levelName: string;
  isRecommended: boolean;
  buttonBgImage: string;
  onClick: () => void;
  devMode?: boolean;
  color?: string;
  disabled?: boolean; // 에너지가 없을 때
}

export function LevelButton({
  level,
  levelName,
  isRecommended,
  buttonBgImage,
  onClick,
  devMode = false,
  color = '#4e7557',
  disabled = false
}: LevelButtonProps) {
  const isDisabled = disabled && !devMode; // 개발자 모드일 때는 비활성화 안 함
  
  return (
    <div className="relative w-2/3 mx-auto flex items-center justify-center">
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
