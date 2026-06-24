import { useState, useEffect } from "react";
import { MainMenu } from "./components/MainMenu";
import { MiniGameCategory } from "./components/MiniGameCategory";
import { Settings } from "./components/Settings";
import { Records } from "./components/Records";
import { MiniGame } from "./components/MiniGame";
import { HeadphoneGuide } from "./components/HeadphoneGuide";
import { Button } from "./components/ui/button";
import {
  playMusic,
  getMusicKey,
  setMusicVolume as setBgMusicVolume,
  getMusicEnabled,
  isMusicPlaying,
  setUnmuted,
  getUnmuted,
} from "./utils/backgroundMusic";
import { getMusicVolume, playStartSound } from "./utils/sound";
import loadingImage from "figma:asset/9f4d2922e0e673af43d6b1c1a14fbc586669b81c.png";
import startButtonImage from "figma:asset/6bb4b946fe5bace96d27aa95e71d0d4f7866adde.png";
import { App as CapacitorApp } from "@capacitor/app";

type Screen =
  | { type: "main" }
  | { type: "category"; categoryIndex: number }
  | { type: "game"; categoryIndex: number; gameIndex: number }
  | { type: "records" };

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>({
    type: "main",
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showHeadphoneGuide, setShowHeadphoneGuide] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showStartButton, setShowStartButton] = useState(false);

  // AudioContext 복구 함수
  const resumeAudioContext = async () => {
    try {
      if (
        window.sharedAudioContext &&
        window.sharedAudioContext.state === "suspended"
      ) {
        console.log(
          "🔊 AudioContext 복구 시도...",
          window.sharedAudioContext.state,
        );
        await window.sharedAudioContext.resume();
        console.log(
          "✅ AudioContext 복구 완료:",
          window.sharedAudioContext.state,
        );
      }
    } catch (error) {
      console.error("❌ AudioContext 복구 실패:", error);
    }
  };

  // Capacitor 앱 상태 변경 리스너 (백그라운드 복귀 시 AudioContext 복구)
  useEffect(() => {
    let appStateListener: any;

    const setupAppStateListener = async () => {
      try {
        appStateListener = await CapacitorApp.addListener(
          "appStateChange",
          async ({ isActive }) => {
            console.log(
              "📱 앱 상태 변경:",
              isActive ? "포그라운드" : "백그라운드",
            );

            if (isActive) {
              // 포그라운드로 돌아왔을 때
              console.log(
                "🔄 포그라운드 복귀 - AudioContext 복구",
              );
              await resumeAudioContext();

              // 배경음악도 다시 재생
              if (getMusicEnabled() && !isMusicPlaying()) {
                const musicKey =
                  currentScreen.type === "main"
                    ? getMusicKey("main")
                    : currentScreen.type === "game"
                      ? getMusicKey(
                          "game",
                          currentScreen.categoryIndex,
                          currentScreen.gameIndex,
                        )
                      : getMusicKey("main");
                playMusic(musicKey, getMusicVolume());
              }
            }
          },
        );
        console.log("✅ Capacitor App 리스너 등록 완료");
      } catch (error) {
        console.log(
          "ℹ️ Capacitor App 플러그인 사용 불가 (웹 환경):",
          error,
        );
      }
    };

    setupAppStateListener();

    return () => {
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [currentScreen]);

  // 로딩 화면 처리 - 1초 후 시작 버튼 표시
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowStartButton(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // 앱 시작 시 즉시 음악 재생 시도
  useEffect(() => {
    if (getMusicEnabled()) {
      playMusic(getMusicKey("main"), getMusicVolume());
    }

    // 첫 인터랙션에서 음소거 해제
    const unmuteMusic = () => {
      console.log("👆 첫 클릭 감지 - 음소거 해제 시도");
      if (!getUnmuted()) {
        setUnmuted(true);
        if (getMusicEnabled() && !isMusicPlaying()) {
          playMusic(getMusicKey("main"), getMusicVolume());
        }
      }
      document.removeEventListener("click", unmuteMusic);
      document.removeEventListener("touchstart", unmuteMusic);
    };

    document.addEventListener("click", unmuteMusic);
    document.addEventListener("touchstart", unmuteMusic);

    return () => {
      document.removeEventListener("click", unmuteMusic);
      document.removeEventListener("touchstart", unmuteMusic);
    };
  }, []);

  // 화면 전환 시 음악 변경
  useEffect(() => {
    if (!getMusicEnabled()) return;

    if (currentScreen.type === "main") {
      playMusic(getMusicKey("main"), getMusicVolume());
    } else if (currentScreen.type === "records") {
      playMusic(getMusicKey("main"), getMusicVolume()); // 게임 기록 화면에서는 메인 음악 재생
    } else if (currentScreen.type === "category") {
      playMusic(getMusicKey("main"), getMusicVolume()); // 카테고리 선택 화면에서는 메인 음악 재생
    } else if (currentScreen.type === "game") {
      const musicKey = getMusicKey(
        "game",
        currentScreen.categoryIndex,
        currentScreen.gameIndex,
      );
      playMusic(musicKey, getMusicVolume());
    }
  }, [currentScreen]);

  const handleSelectCategory = (categoryIndex: number) => {
    setCurrentScreen({ type: "category", categoryIndex });
    // 귀 게임(categoryIndex === 1)일 때 헤드폰 안내 오버레이 표시
    if (categoryIndex === 1) {
      setShowHeadphoneGuide(true);
    }
  };

  const handleSelectGame = (gameIndex: number) => {
    if (currentScreen.type === "category") {
      setCurrentScreen({
        type: "game",
        categoryIndex: currentScreen.categoryIndex,
        gameIndex,
      });
    }
  };

  const handleBackToMain = () => {
    setCurrentScreen({ type: "main" });
  };

  const handleBackToCategory = () => {
    if (currentScreen.type === "game") {
      setCurrentScreen({
        type: "category",
        categoryIndex: currentScreen.categoryIndex,
      });
    }
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleOpenRecords = () => {
    setCurrentScreen({ type: "records" });
  };

  const handleHeadphoneConfirm = () => {
    setShowHeadphoneGuide(false);
  };

  const handleStartGame = () => {
    setIsLoading(false);
    // 음소거 해제
    setUnmuted(true);
    // 음악 재생
    if (getMusicEnabled()) {
      playMusic(getMusicKey("main"), getMusicVolume());
    }
    // 시작 사운드 재생
    playStartSound();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {isLoading && (
        <div
          className="flex flex-col items-center justify-center h-full bg-amber-50 relative"
          style={{
            animation: "fadeIn 0.3s ease-in",
          }}
        >
          <div
            className="text-center"
            style={{ marginTop: "4rem" }}
          >
            <img
              src={loadingImage}
              alt="눈귀뇌하트"
              className="max-w-md w-full px-8"
              style={{
                margin: "0 auto 1.5rem",
              }}
            />

            <div
              style={{
                minHeight: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!showStartButton ? (
                <div className="flex justify-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: "#4e7557",
                      animation: "bounce 1s infinite 0s",
                    }}
                  />
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: "#e5a652",
                      animation: "bounce 1s infinite 0.2s",
                    }}
                  />
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: "#a7b7c4",
                      animation: "bounce 1s infinite 0.4s",
                    }}
                  />
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: "#cd6c58",
                      animation: "bounce 1s infinite 0.6s",
                    }}
                  />
                </div>
              ) : (
                <div
                  onClick={handleStartGame}
                  className="cursor-pointer transition-all transform hover:scale-110 active:scale-95"
                  style={{
                    animation: "fadeIn 0.3s ease-in",
                    position: "relative",
                    maxWidth: "200px",
                    margin: "0 auto",
                  }}
                >
                  <img
                    src={startButtonImage}
                    alt="게임 시작"
                    style={{
                      width: "100%",
                      display: "block",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontFamily: "OngleipRyudung",
                      color: "white",
                      fontSize: "2rem",
                      pointerEvents: "none",
                      textAlign: "center",
                      lineHeight: "1.2",
                    }}
                  >
                    게임
                    <br />
                    시작
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 버전 표시 */}
          <div
            style={{
              position: "absolute",
              bottom: "4rem",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "OngleipRyudung",
              fontSize: "1rem",
              color: "#374151",
              zIndex: 10,
            }}
          >
            v0.8.1
          </div>
        </div>
      )}

      {!isLoading && currentScreen.type === "main" && (
        <MainMenu
          onSelectCategory={handleSelectCategory}
          onOpenSettings={handleOpenSettings}
          onOpenRecords={handleOpenRecords}
        />
      )}

      {!isLoading && currentScreen.type === "category" && (
        <MiniGameCategory
          categoryIndex={currentScreen.categoryIndex}
          onBack={handleBackToMain}
          onSelectGame={handleSelectGame}
        />
      )}

      {!isLoading && currentScreen.type === "game" && (
        <MiniGame
          categoryIndex={currentScreen.categoryIndex}
          gameIndex={currentScreen.gameIndex}
          onBack={handleBackToCategory}
        />
      )}

      {!isLoading && currentScreen.type === "records" && (
        <Records onBack={handleBackToMain} />
      )}

      {!isLoading && showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}

      {!isLoading && showHeadphoneGuide && (
        <HeadphoneGuide onConfirm={handleHeadphoneConfirm} />
      )}
    </div>
  );
}