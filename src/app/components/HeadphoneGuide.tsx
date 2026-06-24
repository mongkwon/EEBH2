import { ImageWithFallback } from "./figma/ImageWithFallback";
import replayButtonBg from "figma:asset/76896cc73d11fff23bc0ef71e56e9001acc1b9ee.png";
import headphoneImage from "figma:asset/38b67989fab22ad841b599d71da7bdace29cda4e.png";
import { playClickSound } from "../utils/sound";

interface HeadphoneGuideProps {
  onConfirm: () => void;
}

export function HeadphoneGuide({ onConfirm }: HeadphoneGuideProps) {
  const handleConfirm = () => {
    playClickSound();
    onConfirm();
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-8 backdrop-blur-md"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "rgba(255, 251, 235, 0.5)",
        zIndex: 100,
      }}
    >
      {/* 안내 텍스트 */}
      <div className="text-center mb-12">
        <div
          className="mb-8"
          style={{
            fontFamily: "OngleipRyudung",
            fontSize: "2.1rem",
            color: "#5c4a2f",
            lineHeight: "1.5",
          }}
        >
          원활한 귀 게임 플레이를 위해<br />
          이어폰(헤드폰)을<br />
          준비해주세요!
        </div>

        {/* 이어폰 이미지 */}
        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "center" }}>
          <ImageWithFallback
            src={headphoneImage}
            alt="헤드폰"
            style={{ width: "120px", height: "120px", objectFit: "contain" }}
          />
        </div>
      </div>

      {/* 확인했어요 버튼 */}
      <button
        onClick={handleConfirm}
        className="relative hover:scale-105 active:scale-95 transition-transform"
      >
        <ImageWithFallback
          src={replayButtonBg}
          alt="확인했어요"
          className="h-16 w-auto object-contain"
        />
        <span
          className="absolute inset-0 flex items-center justify-center text-2xl"
          style={{ 
            color: "#ffffff",
            fontFamily: "OngleipRyudung"
          }}
        >
          확인했어요
        </span>
      </button>
    </div>
  );
}