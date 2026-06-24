import { useState, useEffect } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  playBackSound,
  playClickSound,
  setSoundEnabled,
  getSoundEnabled,
  getSoundVolume,
  setSoundVolume,
} from "../utils/sound";
import {
  setMusicEnabled,
  getMusicEnabled,
  playMusic,
  getMusicKey,
  setMusicVolume,
  getMusicVolume,
} from "../utils/backgroundMusic";

import soundIcon from "figma:asset/c1e11ed9978a9e0fcea7b7741d8796c644635179.png";
import musicIcon from "figma:asset/6de35528e469087989cdb9643d8b5e30918378b7.png";
import settingsBg from "figma:asset/54f8a82ff3f9348da47c92cd7e8e9b17adc71522.png";
import exitIcon from "figma:asset/964e9c2c14bd3b416452c49a610fb5f6b37d8f5a.png";

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [soundEnabled, setSoundEnabledState] = useState(
    getSoundEnabled(),
  );
  const [musicEnabled, setMusicEnabledState] = useState(
    getMusicEnabled(),
  );
  const [volume, setVolumeState] = useState(getMusicVolume());
  const [soundVolumeState, setSoundVolumeStateLocal] =
    useState(getSoundVolume());
  const [showCredits, setShowCredits] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);

  // 크레딧 화면 전환 시 음악 변경 (첫 렌더링 제외)
  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false);
      return;
    }

    if (showCredits && getMusicEnabled()) {
      playMusic("credits", getMusicVolume());
    } else if (!showCredits && getMusicEnabled()) {
      playMusic("main", getMusicVolume());
    }
  }, [showCredits]);

  const handleSoundToggle = () => {
    const newState = !soundEnabled;
    setSoundEnabledState(newState);
    setSoundEnabled(newState);
    // 켤 때만 효과음 재생
    if (newState) {
      playClickSound();
    }
  };

  const handleMusicToggle = () => {
    playClickSound();
    const newState = !musicEnabled;
    setMusicEnabledState(newState);
    setMusicEnabled(newState);
  };

  const handleClose = () => {
    playBackSound();
    onClose();
  };

  const handleCreditsToggle = () => {
    playClickSound();
    setShowCredits(!showCredits);
  };

  const handleVolumeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newVolume = parseFloat(event.target.value);
    setVolumeState(newVolume);
    setMusicVolume(newVolume);
  };

  const handleSoundVolumeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newVolume = parseFloat(event.target.value);
    setSoundVolumeStateLocal(newVolume);
    setSoundVolume(newVolume);
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 animate-in fade-in duration-200 ${showCredits ? "bg-black/70 backdrop-blur-md" : "bg-black/50 backdrop-blur-md"}`}
    >
      <div className="relative w-full max-w-md mx-4 flex flex-col items-center">
        {/* 제목 - 배경 바깥 위 */}
        <div className="-mb-2">
          <h2
            className="text-center text-4xl"
            style={{
              fontFamily: "OngleipRyudung",
              color: "#eae4d3",
            }}
          >
            {showCredits ? "크레딧" : "설정"}
          </h2>
        </div>

        {/* 배경 이미지 영역 */}
        <div className="relative w-[85%] -mb-2 overflow-hidden">
          <ImageWithFallback
            src={settingsBg}
            alt="설정 배경"
            className="w-full h-auto object-contain"
          />

          {/* 설정 내용 - 배경 위에 오버레이 */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="w-full px-8 py-6">
              {!showCredits ? (
                <>
                  {/* 효과음 토글 */}
                  <div className="mb-2">
                    <button
                      onClick={handleSoundToggle}
                      className="w-full flex items-center px-4 py-1 bg-transparent rounded-xl transition-all cursor-pointer"
                    >
                      <ImageWithFallback
                        src={soundIcon}
                        alt="효과음"
                        className="h-12 w-12 object-contain flex-shrink-0"
                        style={{
                          opacity: soundEnabled ? 1 : 0.5,
                        }}
                      />
                      <span
                        className="flex-1 text-center text-2xl whitespace-nowrap"
                        style={{
                          fontFamily: "OngleipRyudung",
                          color: "#eae4d3",
                        }}
                      >
                        효과음
                      </span>
                      <div
                        className="w-14 h-7 rounded-full transition-colors flex-shrink-0"
                        style={{
                          backgroundColor: soundEnabled
                            ? "#cbb46f"
                            : "#9ca3af",
                        }}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white mt-1 transition-transform ${soundEnabled ? "translate-x-8" : "translate-x-1"}`}
                        />
                      </div>
                    </button>
                  </div>

                  {/* 효과음 볼륨 조절 */}
                  <div className="px-4 mb-3">
                    <div className="w-full">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-lg whitespace-nowrap"
                          style={{
                            fontFamily: "OngleipRyudung",
                            color: "#eae4d3",
                            opacity: soundEnabled ? 1 : 0.5,
                          }}
                        >
                          볼륨
                        </span>
                        <style>{`
                          .sound-volume-slider {
                            -webkit-appearance: none;
                            appearance: none;
                            cursor: pointer;
                            width: 100%;
                            height: 6px;
                            border-radius: 3px;
                            background: linear-gradient(to right, #eae4d3 0%, #eae4d3 ${soundVolumeState * 100}%, #9ca3af ${soundVolumeState * 100}%, #9ca3af 100%);
                          }
                          .sound-volume-slider:disabled {
                            cursor: not-allowed;
                            opacity: 0.5;
                          }
                          .sound-volume-slider::-webkit-slider-track {
                            background: transparent;
                            height: 6px;
                            border-radius: 3px;
                          }
                          .sound-volume-slider::-moz-range-track {
                            background: transparent;
                            height: 6px;
                            border-radius: 3px;
                          }
                          .sound-volume-slider::-webkit-slider-thumb {
                            -webkit-appearance: none;
                            appearance: none;
                            width: 20px;
                            height: 20px;
                            border-radius: 50%;
                            background: #cbb46f;
                            cursor: pointer;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          }
                          .sound-volume-slider:disabled::-webkit-slider-thumb {
                            cursor: not-allowed;
                            background: #9ca3af;
                          }
                          .sound-volume-slider::-moz-range-thumb {
                            width: 20px;
                            height: 20px;
                            border-radius: 50%;
                            background: #cbb46f;
                            cursor: pointer;
                            border: none;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          }
                          .sound-volume-slider:disabled::-moz-range-thumb {
                            cursor: not-allowed;
                            background: #9ca3af;
                          }
                        `}</style>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={soundVolumeState}
                          onChange={handleSoundVolumeChange}
                          disabled={!soundEnabled}
                          className="sound-volume-slider flex-1"
                        />
                        <span
                          className="text-lg whitespace-nowrap"
                          style={{
                            fontFamily: "OngleipRyudung",
                            color: "#eae4d3",
                            opacity: soundEnabled ? 1 : 0.5,
                          }}
                        >
                          {Math.round(soundVolumeState * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 배경음악 토글 */}
                  <div className="mb-2">
                    <button
                      onClick={handleMusicToggle}
                      className="w-full flex items-center px-4 py-1 bg-transparent rounded-xl transition-all cursor-pointer"
                    >
                      <ImageWithFallback
                        src={musicIcon}
                        alt="배경음악"
                        className="h-12 w-12 object-contain flex-shrink-0"
                        style={{
                          opacity: musicEnabled ? 1 : 0.5,
                        }}
                      />
                      <span
                        className="flex-1 text-center text-2xl whitespace-nowrap"
                        style={{
                          fontFamily: "OngleipRyudung",
                          color: "#eae4d3",
                        }}
                      >
                        배경음악
                      </span>
                      <div
                        className="w-14 h-7 rounded-full transition-colors flex-shrink-0"
                        style={{
                          backgroundColor: musicEnabled
                            ? "#cbb46f"
                            : "#9ca3af",
                        }}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white mt-1 transition-transform ${musicEnabled ? "translate-x-8" : "translate-x-1"}`}
                        />
                      </div>
                    </button>
                  </div>

                  {/* 배경음악 볼륨 조절 */}
                  <div className="px-4">
                    <div className="w-full">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-lg whitespace-nowrap"
                          style={{
                            fontFamily: "OngleipRyudung",
                            color: "#eae4d3",
                            opacity: musicEnabled ? 1 : 0.5,
                          }}
                        >
                          볼륨
                        </span>
                        <style>{`
                          .volume-slider {
                            -webkit-appearance: none;
                            appearance: none;
                            cursor: pointer;
                            width: 100%;
                            height: 6px;
                            border-radius: 3px;
                            background: linear-gradient(to right, #eae4d3 0%, #eae4d3 ${volume * 100}%, #9ca3af ${volume * 100}%, #9ca3af 100%);
                          }
                          .volume-slider:disabled {
                            cursor: not-allowed;
                            opacity: 0.5;
                          }
                          .volume-slider::-webkit-slider-track {
                            background: transparent;
                            height: 6px;
                            border-radius: 3px;
                          }
                          .volume-slider::-moz-range-track {
                            background: transparent;
                            height: 6px;
                            border-radius: 3px;
                          }
                          .volume-slider::-webkit-slider-thumb {
                            -webkit-appearance: none;
                            appearance: none;
                            width: 20px;
                            height: 20px;
                            border-radius: 50%;
                            background: #cbb46f;
                            cursor: pointer;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          }
                          .volume-slider:disabled::-webkit-slider-thumb {
                            cursor: not-allowed;
                            background: #9ca3af;
                          }
                          .volume-slider::-moz-range-thumb {
                            width: 20px;
                            height: 20px;
                            border-radius: 50%;
                            background: #cbb46f;
                            cursor: pointer;
                            border: none;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          }
                          .volume-slider:disabled::-moz-range-thumb {
                            cursor: not-allowed;
                            background: #9ca3af;
                          }
                        `}</style>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={volume}
                          onChange={handleVolumeChange}
                          disabled={!musicEnabled}
                          className="volume-slider flex-1"
                        />
                        <span
                          className="text-lg whitespace-nowrap"
                          style={{
                            fontFamily: "OngleipRyudung",
                            color: "#eae4d3",
                            opacity: musicEnabled ? 1 : 0.5,
                          }}
                        >
                          {Math.round(volume * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* 크레딧 내용 - 스크롤 가능 영역 */}
                  <div className="h-[15rem] overflow-hidden px-4 pt-2">
                    <style>{`
                      @keyframes scrollUp {
                        0%, 16.67% {
                          transform: translateY(0%);
                        }
                        100% {
                          transform: translateY(-100%);
                        }
                      }
                      .auto-scroll {
                        animation: scrollUp 30s linear infinite;
                      }
                    `}</style>

                    <div className="auto-scroll">
                      {/* 제작자 */}
                      <div className="mb-6">
                        <div
                          className="text-center"
                          style={{
                            fontFamily: "OngleipRyudung",
                            color: "#eae4d3",
                          }}
                        >
                          <p>
                            <b className="text-4xl">눈귀뇌</b>
                          </p>
                          <p>
                            <b className="text-4xl">하</b>
                            <span className="text-2xl">
                              드
                            </span>{" "}
                            <b className="text-4xl">트</b>
                            <span className="text-2xl">
                              레이닝
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* 제작자 */}
                      <div className="mb-6">
                        <h3
                          className="text-2xl mb-2 text-center"
                          style={{
                            fontFamily: "OngleipRyudung",
                            color: "#eae4d3",
                          }}
                        >
                          멍 때리는 개발자들
                        </h3>
                        <div
                          className="text-xl text-center space-y-1"
                          style={{
                            fontFamily: "OngleipRyudung",
                            color: "#eae4d3",
                          }}
                        >
                          <p>해삼</p>
                          <p>성게</p>
                          <p>말미잘</p>
                        </div>
                      </div>

                      {/* 도움을 주신 분 */}
                      <div className="mb-6">
                        <h3
                          className="text-2xl mb-2 text-center"
                          style={{
                            fontFamily: "OngleipRyudung",
                            color: "#eae4d3",
                          }}
                        >
                          도움을 주신 분
                        </h3>
                        <div
                          className="text-xl text-center space-y-1"
                          style={{
                            fontFamily: "OngleipRyudung",
                            color: "#eae4d3",
                          }}
                        >
                          <p>후원자 추가 예정</p>
                          <p>후원자 추가 예정</p>
                          <p>후원자 추가 예정</p>
                          <p>후원자 추가 예정</p>
                          <p>후원자 추가 예정</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 버튼 영역 - 배경 바깥 아래 */}
        <div className="flex justify-center gap-8">
          {!showCredits ? (
            <>
              <button
                onClick={handleCreditsToggle}
                className="bg-transparent border-none px-6 py-2 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span
                  className="text-3xl"
                  style={{
                    fontFamily: "OngleipRyudung",
                    color: "#eae4d3",
                  }}
                >
                  크레딧
                </span>
              </button>
              <button
                onClick={handleClose}
                className="bg-transparent border-none px-6 py-2 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span
                  className="text-3xl"
                  style={{
                    fontFamily: "OngleipRyudung",
                    color: "#eae4d3",
                  }}
                >
                  닫기
                </span>
              </button>
            </>
          ) : (
            <button
              onClick={handleCreditsToggle}
              className="bg-transparent border-none px-8 py-2 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            >
              <span
                className="text-3xl"
                style={{
                  fontFamily: "OngleipRyudung",
                  color: "#eae4d3",
                }}
              >
                닫기
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}