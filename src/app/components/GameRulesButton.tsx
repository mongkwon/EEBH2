import React from 'react';

interface GameRulesButtonProps {
  onClick: () => void;
  backgroundColor?: string;
  textColor?: string;
}

export const GameRulesButton: React.FC<GameRulesButtonProps> = ({
  onClick,
  backgroundColor = '#e5a652',
  textColor = '#ffffff',
}) => {
  return (
    <button
      onClick={onClick}
      className="absolute top-0 right-0 rounded-full w-12 h-12 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform cursor-pointer"
      style={{ backgroundColor }}
    >
      <span className="text-2xl" style={{ color: textColor }}>?</span>
    </button>
  );
};
