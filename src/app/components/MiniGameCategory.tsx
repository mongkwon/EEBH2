import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { playBackSound, playSelectSound } from "../utils/sound";
import { getGameRecord } from "../utils/gameRecord";
import { useMemo } from "react";
import exitIcon from "figma:asset/74b1288f91a03a19fc199ba8e3ce487eebb3c1fb.png";
import bubbleShooterImage from "figma:asset/f712d571d285bee2696a85c9d8618791699bff6d.png";
import bombGameImage from "figma:asset/2d58df535439ac8405877245ed7bc22bde0a26a1.png";
import yabaweeGameImage from "figma:asset/c896f27c85b86b7736a81baf286ac5df1113377a.png";
import clickOrderGameImage from "figma:asset/674510e3698b5f289e93498da70d75826115ad9b.png";
import memoryGameImage from "figma:asset/50fce9c5b16d6bafc9a92cfdb18a832238704ef4.png";
import classifyGameImage from "figma:asset/c3a76529d7a99651f2f80aa45b6ccc9516c02719.png";
import numberMemoryGameImage from "figma:asset/12bab1b8a03571be7448c66014c9b00d47419739.png";
import directionGameImage from "figma:asset/c9c64f2470835e3b229b7e926061767958f6cd2e.png";
import coloringGameImage from "figma:asset/f4394451a36fa3adbd523016c446357b111fd638.png";

interface MiniGameCategoryProps {
  categoryIndex: number;
  onBack: () => void;
  onSelectGame: (gameIndex: number) => void;
}

const categoryData = [
  {
    name: "눈 게임",
    gameKeys: ["bombGame", "yabawiGame", "numberGame"],
    games: [
      { name: "폭탄 게임", image: bombGameImage },
      { name: "셔플 게임", image: yabaweeGameImage },
      { name: "숫자 게임", image: numberMemoryGameImage }
    ]
  },
  {
    name: "귀 게임",
    gameKeys: ["bubbleShooter", "directionGame", "classifyGame"],
    games: [
      { name: "버블 게임", image: bubbleShooterImage },
      { name: "방향 게임", image: directionGameImage },
      { name: "단어 게임", image: classifyGameImage }
    ]
  },
  {
    name: "뇌 게임",
    gameKeys: ["memoryGame", "coloringGame", "clickInOrder"],
    games: [
      { name: "카드 게임", image: memoryGameImage },
      { name: "색칠 게임", image: coloringGameImage },
      { name: "순서 게임", image: clickOrderGameImage }
    ]
  },
  {
    name: "테스트하기",
    gameKeys: [],
    games: [
      { name: "타워 디펜스", color: "bg-pink-500" },
      { name: "턴제 전투", color: "bg-rose-500" },
      { name: "자원 관리", color: "bg-violet-500" }
    ]
  }
];

export function MiniGameCategory({ categoryIndex, onBack, onSelectGame }: MiniGameCategoryProps) {
  const category = categoryData[categoryIndex];

  // 가장 낮은 점수를 가진 게임 인덱스 찾기 (랜덤)
  const pulsingGameIndex = useMemo(() => {
    if (!category.gameKeys || category.gameKeys.length === 0) return null;
    
    // 레벨별 점수 합으로 총점 계산
    const scores = category.gameKeys.map((key) => {
      const record = getGameRecord(key);
      return (record.level1 || 0) + (record.level2 || 0) + (record.level3 || 0);
    });
    const minScore = Math.min(...scores);
    
    // 가장 낮은 점수를 가진 게임들의 인덱스 찾기
    const lowestScoreIndices = scores
      .map((score, index) => (score === minScore ? index : -1))
      .filter(index => index !== -1);
    
    // 랜덤으로 하나 선택
    if (lowestScoreIndices.length > 0) {
      return lowestScoreIndices[Math.floor(Math.random() * lowestScoreIndices.length)];
    }
    
    return null;
  }, [category.gameKeys]);

  return (
    <div className="h-screen overflow-hidden bg-amber-50 p-4 pb-[env(safe-area-inset-bottom)] flex flex-col pt-[max(env(safe-area-inset-top),3rem)]">
      {/* Header */}
      <div className="flex items-center mb-6 flex-shrink-0">
        <Button
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
        </Button>
        <h1 className="text-gray-700 ml-4 text-4xl">{category.name}</h1>
      </div>

      {/* Mini Games Grid */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-xs w-full space-y-3">
          {category.games.map((game, index) => (
            <div key={index} className="flex flex-col items-center">
              <button
                onClick={() => {
                  playSelectSound();
                  onSelectGame(index);
                }}
                className="bg-transparent hover:bg-transparent border-none p-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                style={
                  pulsingGameIndex === index
                    ? { animation: 'buttonPulse 1.5s ease-in-out infinite' }
                    : undefined
                }
              >
                {game.image ? (
                  <ImageWithFallback
                    src={game.image}
                    alt={game.name}
                    className="w-2/3 h-auto object-contain mx-auto"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <h2 className="text-white drop-shadow-lg text-3xl">{game.name}</h2>
                    </div>
                    <div className="absolute top-3 right-3 bg-white/30 backdrop-blur-sm rounded-full px-3 py-1">
                      <span className="text-white text-xl">플레이</span>
                    </div>
                  </>
                )}
              </button>
              {game.image && (
                <p className="text-gray-700 mt-2 text-3xl">{game.name}</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-gray-500 mt-4 text-2xl">게임을 선택하여 플레이하세요</p>
      </div>
    </div>
  );
}