import React, { ReactNode } from 'react';
import { Button } from './ui/button';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  primaryColor?: string;
  backgroundColor?: string;
  scrollbarColor?: string;
  scrollbarTrackColor?: string;
  onCloseSound?: () => void;
}

export const GameRulesModal: React.FC<GameRulesModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  primaryColor = '#e5a652',
  backgroundColor = '#fef3c7',
  scrollbarColor = '#e5a652',
  scrollbarTrackColor = '#fef3c7',
  onCloseSound,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    if (onCloseSound) onCloseSound();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div 
        className="rounded-2xl max-w-2xl max-h-[90vh] overflow-hidden relative"
        style={{ backgroundColor }}
      >
        <div
          className="p-8 max-h-[90vh] overflow-y-auto bubble-rules-scroll"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: `${scrollbarColor} ${scrollbarTrackColor}`,
            fontFamily: 'OngleipRyudung',
          }}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-4 w-14 h-14 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            style={{ color: primaryColor }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <h2 className="mb-6 text-center text-gray-800 text-4xl">{title}</h2>
          
          <div className="space-y-4 text-gray-700 text-2xl">
            {children}
          </div>

          <Button
            onClick={handleClose}
            className="w-full mt-6 text-white px-8 py-4 text-3xl"
            style={{ backgroundColor: primaryColor, fontFamily: 'OngleipRyudung' }}
          >
            확인
          </Button>
        </div>
      </div>
    </div>
  );
};

// 섹션 컴포넌트들
interface RuleSectionProps {
  title: string;
  titleColor?: string;
  children: ReactNode;
}

export const RuleSection: React.FC<RuleSectionProps> = ({ 
  title, 
  titleColor = '#e5a652', 
  children 
}) => {
  return (
    <div>
      <h3 className="mb-2 text-3xl" style={{ color: titleColor }}>{title}</h3>
      {children}
    </div>
  );
};

interface RuleListProps {
  items: (string | ReactNode)[];
}

export const RuleList: React.FC<RuleListProps> = ({ items }) => {
  return (
    <ul className="list-disc list-inside space-y-1">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
};
