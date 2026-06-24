import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { playBackSound, playStartSound } from "../utils/sound";
import { ClickInOrder } from "./games/ClickInOrder";
import { BubbleShooter } from "./games/BubbleShooter";
import { NumberGame } from "./games/NumberGame";
import { BombGame } from "./games/BombGame";
import { YabawiGame } from "./games/YabawiGame";
import { MemoryGame } from "./games/MemoryGame";
import { DirectionGame } from "./games/DirectionGame";
import { ColoringGame } from "./games/ColoringGame";
import { ClassifyGame } from "./games/ClassifyGame";
import { useState, useEffect } from "react";
import exitIcon from "figma:asset/fd39ad38efaf21900a6b145941ed87c0259ad382.png";

interface MiniGameProps {
  categoryIndex: number;
  gameIndex: number;
  onBack: () => void;
}

const gameNames = [
  ["슈팅 게임", "점프 게임", "러너 게임"],
  ["버블 게임", "블록 퍼즐", "숨은그림찾기"],
  ["카레이싱", "색칠 게임", "순서 게임"],
  ["타워 디펜스", "턴제 전투", "자원 관리"]
];

export function MiniGame({ categoryIndex, gameIndex, onBack }: MiniGameProps) {
  const gameName = gameNames[categoryIndex][gameIndex];
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);

  // 게임이 변경될 때마다 난이도 초기화
  useEffect(() => {
    setSelectedDifficulty(null);
  }, [categoryIndex, gameIndex]);

  // 폭탄 게임 (눈 게임 - 첫 번째)
  if (categoryIndex === 0 && gameIndex === 0) {
    return <BombGame onBack={onBack} />;
  }

  // 버블 게임 (귀 게임 - 첫 번째)
  if (categoryIndex === 1 && gameIndex === 0) {
    return <BubbleShooter onBack={onBack} />;
  }

  // 순서 게임 (뇌 게임 - 세 번째)
  if (categoryIndex === 2 && gameIndex === 2) {
    return <ClickInOrder onBack={onBack} />;
  }

  // 카드 게임 (뇌 게임 - 첫 번째)
  if (categoryIndex === 2 && gameIndex === 0) {
    return <MemoryGame onBack={onBack} />;
  }

  // 색칠하기 게임 (뇌 게임 - 두 번째)
  if (categoryIndex === 2 && gameIndex === 1) {
    return <ColoringGame onBack={onBack} />;
  }

  // 방향 게임 (귀 게임 - 두 번째)
  if (categoryIndex === 1 && gameIndex === 1) {
    return <DirectionGame onBack={onBack} />;
  }

  // 단어 게임 (귀 게임 - 세 번째)
  if (categoryIndex === 1 && gameIndex === 2) {
    return <ClassifyGame onBack={onBack} />;
  }

  // 셔플 게임 (눈 게임 - 두 번째)
  if (categoryIndex === 0 && gameIndex === 1) {
    return <YabawiGame onBack={onBack} />;
  }

  // 숫자 게임 (눈 게임 - 세 번째)
  if (categoryIndex === 0 && gameIndex === 2) {
    return <NumberGame onBack={onBack} difficulty={1} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 p-4 pb-[env(safe-area-inset-bottom)] flex flex-col pt-[max(env(safe-area-inset-top),3rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          <button
            onClick={() => {
              playBackSound();
              onBack();
            }}
            className="bg-transparent hover:bg-transparent border-none p-2 cursor-pointer"
          >
            <ImageWithFallback
              src={exitIcon}
              alt="exit"
              className="h-8 w-8 object-contain"
            />
          </button>
          <h1 className="text-white ml-4 text-4xl">{gameName}</h1>
        </div>
      </div>

      {/* Game Placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-4xl w-full px-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 aspect-video flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="text-white mb-4 text-4xl">게임 화</div>
              <p className="text-white/60 mb-8 text-2xl">
                "{gameName}" 게임이 여기에 표시됩니다
              </p>
              <Button 
                className="bg-white text-gray-900 hover:bg-white/90 text-2xl px-6 py-3"
                onClick={() => playStartSound()}
              >
                게임 시작
              </Button>
            </div>
          </div>

          {/* Game Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <h2 className="text-white mb-3 text-3xl">게임 정보</h2>
            <div className="grid grid-cols-2 gap-4 text-white/70">
              <div>
                <div className="text-xl">최고 기록</div>
                <div className="text-white text-2xl">0</div>
              </div>
              <div>
                <div className="text-xl">플레이 횟수</div>
                <div className="text-white text-2xl">0</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}