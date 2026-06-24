import { useState, useEffect, useRef } from "react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { GameRulesButton } from "../GameRulesButton";
import { GameRulesModal, RuleSection, RuleList } from "../GameRulesModal";
import { playBackSound, playClickSound, playSelectSound } from "../../utils/sound";
import { saveGameRecord, getGameRecord, recordAchievement } from "../../utils/gameRecord";
import { getEnergy, useEnergy, hasEnergy } from "../../utils/globalEnergy";
import { getTargetScore, setMeasuredScore, getAccumulatedScore, loadAccumulatedScore, addScoreToMemory, commitScore, revertScore } from "../../utils/coloringGameDailyGoal";
import { LevelButton } from "./LevelButton";
import { ColoringGameProps, GameState, HeartText } from "./coloring/coloringTypes";
import { 
  COLORING_IMAGES, 
  ALL_SEGMENT_URLS,
  BALLOON_SEGMENT_POSITIONS,
  BALLOON_SEGMENT_NAMES,
  BALLOON_SEGMENT_URLS,
  HOUSE_SEGMENT_POSITIONS,
  HOUSE_SEGMENT_NAMES,
  HOUSE_SEGMENT_URLS,
  CHILD_SEGMENT_POSITIONS,
  CHILD_SEGMENT_NAMES,
  CHILD_SEGMENT_URLS,
  LIVINGROOM_SEGMENT_POSITIONS,
  LIVINGROOM_SEGMENT_NAMES,
  LIVINGROOM_SEGMENT_URLS,
  TRAIN_SEGMENT_POSITIONS,
  TRAIN_SEGMENT_NAMES,
  TRAIN_SEGMENT_URLS
} from "./coloring/coloringData";
import { useColoringCanvas } from "./coloring/useColoringCanvas";
import { calculateGameScore } from "./coloring/scoringUtils";
import { getSegmentGroups, getGroupIndexBySegment } from "./coloring/coloringGroups";
import { Heart } from "lucide-react";
import pauseIcon from "figma:asset/8acb1e015c5c90586e07679819984941b38f74af.png";
import resumeImg from "figma:asset/62327073bfb38b1feb704b5c6f1eb2a36789eee8.png";
import restartImg from "figma:asset/d1a45328f3c2f5290d250ff17f71584c907a61a7.png";
import pauseMenuBg from "figma:asset/54f8a82ff3f9348da47c92cd7e8e9b17adc71522.png";
import pauseExitIcon from "figma:asset/7b6920cff9236248c28a92364a77c6df5be27012.png";
import exitIcon from "figma:asset/74b1288f91a03a19fc199ba8e3ce487eebb3c1fb.png";
import homeImg from "figma:asset/7b6920cff9236248c28a92364a77c6df5be27012.png";
import levelButtonBg from "figma:asset/5d455998023ef79fbbf223eaf0a0e503e73de2f2.png";
import replayButtonBg from "figma:asset/76896cc73d11fff23bc0ef71e56e9001acc1b9ee.png";
import paletteImg from "figma:asset/5ba5c743706f1f61b899a9b817da0382ca0aad0a.png";
import { Palette1, Palette2 } from "./ColoringPalettes";
import buttonImg from "figma:asset/292f675f474bdb9553a5527caffea8d853194246.png";
import brushIcon from "figma:asset/e91ce300ea77a7c842a3adb230615860359851c5.png";
import timerIcon from "figma:asset/7c8f40952522b94eb464f4eaf7b991a3386aee04.png";
import brushYellow from "figma:asset/0faf0b9cb98707116d975388798b3aabb49b9813.png";
import brushOrange from "figma:asset/8fdb52456b875d46ec70625049c1c4d84a52a0be.png";
import brushRed from "figma:asset/d4cbe294c778ed49075c692af65ae739fccf595e.png";
import brushGreen from "figma:asset/9da4d0c6e9d0443f1780bef8065a26327b7b076b.png";
import xMarkImg from "figma:asset/e8be98e87b6faeefb67d27b3fae42ae4999e08f7.png";
import brushNavy from "figma:asset/91a3af52e196affa7901cfd76830500abac33a21.png";
import brushSky from "figma:asset/f3321191423e363ea4f72f45487cc54937634ccf.png";
import brushBrown from "figma:asset/95b3929dbf555867bcda381020ae890c63d63ddb.png";
import brushPurple from "figma:asset/88937aee057669826f57607995d91336d28a7824.png";
import brushClear from "figma:asset/e91ce300ea77a7c842a3adb230615860359851c5.png";
import starIcon from "figma:asset/536422266eac9485f74fff9de4a5153de25a14b7.png";
import checkIconGray from "figma:asset/2481c41f3b40adb897713a482226b3b07f990883.png";

export function ColoringGame({ onBack }: ColoringGameProps) {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [colorSelected, setColorSelected] = useState(false); // 색상이 선택되었는지 추적
  const [elapsedTime, setElapsedTime] = useState(0);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [previewOutlineImage, setPreviewOutlineImage] = useState<string>(""); // outline 이미지 추가
  
  // 이미지 preload를 위한 ref 추가
  const preloadedImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const preloadedSegmentsRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [targetColors, setTargetColors] = useState<number[]>([]); // 활성화된 색상 인덱스 배열
  const cursorRef = useRef<HTMLDivElement>(null); // 커서 DOM 참조
  const [brushSrc, setBrushSrc] = useState(brushClear); // 브러쉬 이미지 src
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false); // 미리보기 생성 중 상태
  const [showPreviewModal, setShowPreviewModal] = useState(false); // 정답 미리보기 모달
  const [previewTimeLeft, setPreviewTimeLeft] = useState(10); // 남은 미리보기 시간
  const [showCompletedTime, setShowCompletedTime] = useState(false); // 완성 버튼 눌렀을 때 시간 표시
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [scorePopups, setScorePopups] = useState<Array<{ id: number; points: number; x: number; y: number }>>([]);
  const scorePopupIdRef = useRef(0);
  const [checkPopups, setCheckPopups] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const checkPopupIdRef = useRef(0);
  const [wrongPopups, setWrongPopups] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const wrongPopupIdRef = useRef(0);
  const [heartTexts, setHeartTexts] = useState<HeartText[]>([]);
  const heartTextIdRef = useRef(0);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false); // 미완성 알림 모달
  const [incompleteMessage, setIncompleteMessage] = useState(""); // 미완성 메시지
  const [showCompleteButton, setShowCompleteButton] = useState(false); // 완성 버튼 표시 여부
  const [correctGroupColors, setCorrectGroupColors] = useState<Map<number, string>>(new Map()); // 정답 색상 매핑 (그룹 인덱스 -> 정답 색상)
  
  // 전역 에너지 시스템
  const [energy, setEnergy] = useState(getEnergy());
  const [showNoEnergyAlert, setShowNoEnergyAlert] = useState(false);
  const [previewUsedCount, setPreviewUsedCount] = useState(0); // 다시보기 사용 횟수
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 }); // 원본 이미지 크기
  const [showGoalAchieved, setShowGoalAchieved] = useState(false); // 목표 점수 달성 팝업
  
  // 일일 목표점수 시스템
  const [dailyTargetScore, setDailyTargetScore] = useState<number | null>(null);
  const [dailyAccumulatedScore, setDailyAccumulatedScore] = useState<number>(0);
  const [previousAccumulatedScore, setPreviousAccumulatedScore] = useState<number>(0);
  const [animatedAccumulatedScore, setAnimatedAccumulatedScore] = useState<number>(0);
  const isGameOverRef = useRef<boolean>(false);
  
  // 개발자 모드 (제목 5번 클릭 시 활성화)
  const [devMode, setDevMode] = useState(false);
  const [devClickCount, setDevClickCount] = useState(0);
  const devClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 커서가 캔버스 안에 있는지 여부
  const [isCursorInside, setIsCursorInside] = useState(false);
  
  // 각 조각의 offset 위치 관리
  const [segmentOffsets, setSegmentOffsets] = useState<{ x: number; y: number }[]>([]);
  
  // 팔레트 선택 영역 위치 관리 - 난이도별로 3개 정의
  // 쉬움(4색): 빨강(0), 노랑(2), 초록(3), 하늘(4) - Palette1 이미지
  const easyPalettePositionsDefault = [
    { top: '74.2%', left: '54.0%' },  // 빨강 (index 0)
    { top: '0%', left: '0%' },         // 주황 (사용안함)
    { top: '70.2%', left: '27.0%' },   // 노랑 (index 2)
    { top: '44.9%', left: '16.1%' },   // 초록 (index 3)
    { top: '26.2%', left: '37.1%' },   // 하늘 (index 4)
    { top: '0%', left: '0%' },         // 남색 (사용안함)
    { top: '0%', left: '0%' },         // 보라 (사용안함)
    { top: '0%', left: '0%' }          // 갈색 (사용안함)
  ];
  
  // 보통(6색): 빨강(0), 노랑(2), 초록(3), 하늘(4), 보라(6), 갈색(7) - Palette2 이미지
  const normalPalettePositionsDefault = [
    { top: '74.1%', left: '54.1%' },   // 빨강 (index 0)
    { top: '0%', left: '0%' },         // 주황 (사용안함)
    { top: '69.6%', left: '27.0%' },   // 노랑 (index 2)
    { top: '43.2%', left: '15.6%' },   // 초록 (index 3)
    { top: '24.5%', left: '34.5%' },   // 하늘 (index 4)
    { top: '0%', left: '0%' },         // 남색 (사용안함)
    { top: '27%', left: '62%' },       // 보라 (index 6)
    { top: '49.7%', left: '42.1%' }    // 갈색 (index 7)
  ];
  
  // 어려움(8색): 모든 색상 - paletteImg 이미지
  const hardPalettePositionsDefault = [
    { top: '73%', left: '66%' },   // 빨강 (index 0)
    { top: '77%', left: '47%' },   // 주황 (index 1)
    { top: '73%', left: '27%' },   // 노랑 (index 2)
    { top: '54%', left: '14%' },   // 초록 (index 3)
    { top: '33%', left: '22%' },   // 하늘 (index 4)
    { top: '24.5%', left: '41%' }, // 남색 (index 5)
    { top: '27%', left: '62%' },   // 보라 (index 6)
    { top: '52%', left: '40%' }    // 갈색 (index 7)
  ];
  
  // 드래그 가능한 팔레트 위치 state (개발 모드용)
  const [easyPalettePositions, setEasyPalettePositions] = useState(easyPalettePositionsDefault);
  const [normalPalettePositions, setNormalPalettePositions] = useState(normalPalettePositionsDefault);
  const [hardPalettePositions, setHardPalettePositions] = useState(hardPalettePositionsDefault);
  
  // 선택된 레벨에 따라 적절한 팔레트 위치 선택
  const palettePositions = selectedLevel === 1 ? easyPalettePositions : 
                           selectedLevel === 2 ? normalPalettePositions : 
                           hardPalettePositions;
  
  const setPalettePositions = selectedLevel === 1 ? setEasyPalettePositions : 
                              selectedLevel === 2 ? setNormalPalettePositions : 
                              setHardPalettePositions;
  
  const { 
    canvasRef, 
    coloredCanvasRef, 
    loadImages, 
    fillSegment, 
    segmentColorsRef, 
    initializeCanvas, 
    outlineImgRef, 
    redrawSegments, 
    segmentPositionsRef,
    segmentImagesRef 
  } = useColoringCanvas();

  const outlineCanvasRef = useRef<HTMLCanvasElement>(null); // 전체 outline 캔버스 (고정)
  
  // 세그먼트 위치 정보를 가져오기 위한 함수
  const getSegmentPositions = (imageName: string) => {
    const segmentData = (() => {
      switch (imageName) {
        case "풍선":
          return BALLOON_SEGMENT_POSITIONS;
        case "집":
          return HOUSE_SEGMENT_POSITIONS;
        case "아이":
          return CHILD_SEGMENT_POSITIONS;
        case "거실":
          return LIVINGROOM_SEGMENT_POSITIONS;
        case "기차":
          return TRAIN_SEGMENT_POSITIONS;
        default:
          return [];
      }
    })();
    return segmentData;
  };
  
  // 세그먼트 이름 정보를 가져오기 위한 함수
  const getSegmentNames = (imageName: string) => {
    const segmentNames = (() => {
      switch (imageName) {
        case "풍선":
          return BALLOON_SEGMENT_NAMES;
        case "집":
          return HOUSE_SEGMENT_NAMES;
        case "아이":
          return CHILD_SEGMENT_NAMES;
        case "거실":
          return LIVINGROOM_SEGMENT_NAMES;
        case "기차":
          return TRAIN_SEGMENT_NAMES;
        default:
          return [];
      }
    })();
    return segmentNames;
  };

  // 세그먼트 경로(URL) 정보를 가져오기 위한 함수
  const getSegmentPaths = (imageName: string) => {
    const segmentPaths = (() => {
      switch (imageName) {
        case "풍선":
          return BALLOON_SEGMENT_URLS;
        case "집":
          return HOUSE_SEGMENT_URLS;
        case "아이":
          return CHILD_SEGMENT_URLS;
        case "거실":
          return LIVINGROOM_SEGMENT_URLS;
        case "기차":
          return TRAIN_SEGMENT_URLS;
        default:
          return [];
      }
    })();
    return segmentPaths;
  };

  // 레벨에 따라 색상 개수 결정 (1레벨: 4개, 2레벨: 6개, 3레벨: 8개)
  const getColorCountForLevel = (level: number) => {
    if (level === 1) return 4;
    if (level === 2) return 6;
    return 8;
  };
  
  const currentImage = COLORING_IMAGES[selectedImageIndex];
  const colorCount = getColorCountForLevel(selectedLevel);
  const colors = currentImage?.colors.slice(0, colorCount) || [];

  // 레벨에 따른 팔레트 이미지 선택
  const currentPaletteImg = selectedLevel === 1 ? Palette1 : selectedLevel === 2 ? Palette2 : paletteImg;

  // 색상 정의: 이름과 hex 코드를 항상 고정 매핑
  const COLOR_PALETTE = [
    { name: "빨강", hex: "#D58473" },
    { name: "주황", hex: "#E5A652" },
    { name: "노랑", hex: "#FCDB8E" },    // 기본값, 거실은 #E3D173
    { name: "초록", hex: "#4E7557" },
    { name: "하늘", hex: "#A7B7C4" },
    { name: "파랑", hex: "#486073" },
    { name: "보라", hex: "#A990BA" },
    { name: "갈색", hex: "#8B765B" }
  ];

  // 색상 hex → 브러쉬 이미지 매핑
  const colorToBrush: { [key: string]: string } = {
    "#D58473": brushRed, "#E5A652": brushOrange, "#E3D173": brushYellow,
    "#FCDB8E": brushYellow, "#4E7557": brushGreen, "#A7B7C4": brushSky,
    "#486073": brushNavy, "#A990BA": brushPurple, "#8B765B": brushBrown,
    "#E17B7B": brushRed, "#E89C5C": brushOrange, "#E8D465": brushYellow,
    "#7CB369": brushGreen, "#B994D1": brushPurple, "#A8C5D1": brushSky,
    "#8B6F47": brushBrown, "#2C3E7C": brushNavy, "#B89FC9": brushPurple,
    "#A0B5C1": brushSky, "#E89A8B": brushRed, "#5C8D5A": brushGreen,
    "#415468": brushNavy,
  };

  // 레벨에 따른 고정 색상 인덱스 선택
  const generateRandomColors = (count: number) => {
    // 레벨에 따른 고정 색상 인덱스
    if (count === 4) {
      // 쉬움: 빨강(0), 노랑(2), 하늘(4), 초록(3)
      return [0, 2, 3, 4];
    } else if (count === 6) {
      // 보통: 빨강(0), 노랑(2), 하늘(4), 초록(3), 보라(6), 갈색(7)
      return [0, 2, 3, 4, 6, 7];
    } else {
      // 어려움: 모든 색상 (0~7)
      return [0, 1, 2, 3, 4, 5, 6, 7];
    }
  };

  const generatePreviewImage = async (imageIndex: number, level: number) => {
  const startTime = performance.now();
  
  const colorCount = getColorCountForLevel(level);
  const randomColors = generateRandomColors(colorCount);
  setTargetColors(randomColors);

  const imageName = COLORING_IMAGES[imageIndex]?.name;
  const isLivingroomImage = imageName === "거실";
  const yellowColor = isLivingroomImage ? "#E3D173" : "#FCDB8E";

  // 선택된 색상 배열
  const selectedColorArray = randomColors.map((idx) => {
    const color = COLOR_PALETTE[idx];
    return color.name === "노랑" ? yellowColor : color.hex;
  });

  // 세그먼트 정보 가져오기
  const segmentPositions = getSegmentPositions(imageName);
  const segmentNames = getSegmentNames(imageName);
  const segmentPaths = getSegmentPaths(imageName);
  
  if (segmentPositions.length === 0) {
    console.warn("⚠️ 세그먼트 정보��� 없습니다!");
    return;
  }

  // 기차 이미지인 경우 ��퀴 12개를 그룹으로 처리
  const isTrainImage = imageName === "기차";
  const wheelIndices = isTrainImage ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [];
  
  // 집 이미지의 레벨별 그룹 설정
  const isHouseImage = imageName === "집";
  let houseGroups: number[][] = [];
  
  if (isHouseImage) {
    if (level === 1) {
      // 1레벨: 4개 영역 - [집], [구름+해], [꽃+울타리], [나무]
      houseGroups = [
        [2, 3, 4, 5, 6], // 창문2, 창문1, 문, 지붕, 벽 -> 집
        [7, 8, 13], // 구름1, 구름2, 태양 -> 구름+해
        [9, 10, 11, 12], // 울타리1, 울타리2, 꽃1, 꽃2 -> 꽃+울타리
        [0, 1], // 나무2, 나무1 -> 나무
      ];
    } else if (level === 2) {
      // 2레벨: 6개 영역 - [구름], [꽃], [울타리], [집], [해], [나무]
      houseGroups = [
        [7, 8], // 구름1, 구름2 -> 구름
        [11, 12], // 꽃1, 꽃2 -> 꽃
        [9, 10], // 울타리1, 울타리2 -> 울타리
        [2, 3, 4, 5, 6], // 창문2, 창문1, 문, 지붕, 벽 -> 집
        [13], // 태양
        [0, 1], // 나무2, 나무1 -> 나무
      ];
    } else {
      // 3레벨: 8개 영역 - [구름], [해], [꽃1], [꽃2], [울타리], [지붕], [집 나머지], [나무]
      houseGroups = [
        [7, 8], // 구름1, 구름2 -> 구름
        [13], // 태양
        [11], // 꽃1
        [12], // 꽃2
        [9, 10], // 울타리1, 울타리2 -> 울타리
        [5], // 지붕
        [2, 3, 4, 6], // 창문2, 창문1, 문, 벽 -> 집 나머지
        [0, 1], // 나무2, 나무1 -> 나무
      ];
    }
  }
  
  // 아이 이미지의 레벨별 그룹 설정
  const isChildImage = imageName === "아이";
  let childGroups: number[][] = [];
  
  if (isChildImage) {
    if (level === 1) {
      // 1레벨: 4개 영역 - [아이], [그림], [의자], [물건들]
      childGroups = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // 머리띠(오,왼), 얼굴, 머리카락(왼,오), 목, 옷, 팔(오,왼), 발(오,왼) -> 아이
        [11, 12, 13, 14], // 강아지, 강아지배경, 고양이, 고양이배경 -> 그림
        [17], // 의자
        [15, 16, 18, 19], // 펜, 메모, 종이, 색연필 -> 물건들
      ];
    } else if (level === 2) {
      // 2레벨: 6개 영역 - [아이 머리], [아이 몸통], [의자], [강아지 그림], [고양이 그림], [물건들]
      childGroups = [
        [0, 1, 2, 3, 4], // 머리띠(오,왼), 얼굴, 머리카락(왼,오) -> 아이 머리
        [5, 6, 7, 8, 9, 10], // 목, 옷, 팔(오,왼), 발(오,왼) -> 아이 몸통
        [17], // 의자
        [11, 12], // 강아지, 강아지배경 -> 강아지 그림
        [13, 14], // 고양이, 고양이배경 -> 고양이 그림
        [15, 16, 18, 19], // 펜, 메모, 종이, 색연필 -> 물건들
      ];
    } else {
      // 3레벨: 8개 영역 - [아이 머리], [아이 ��], [아이 팔다리], [의자], [강아지 그림], [고양이 그림], [물건1], [물건2]
      childGroups = [
        [0, 1, 2, 3, 4], // 머리띠(오,왼), 얼굴, 머리카락(왼,오) -> 아이 머리
        [5, 6], // 목, 옷 -> 아이 옷
        [7, 8, 9, 10], // 팔(오,왼), 발(오,왼) -> 아이 팔다리
        [17], // 의자
        [11, 12], // 강아지, 강아지배경 -> 강아지 그림
        [13, 14], // 고양이, 고양이배경 -> 고양이 그림
        [15, 16], // 펜, 메모 -> 물건1
        [18, 19], // 종이, 색연필 -> 물건2
      ];
    }
  }
  
  // 거실 이미지의 레벨별 그룹 설정
  let livingroomGroups: number[][] = [];
  
  if (isLivingroomImage) {
    if (level === 1) {
      // 1레벨: 5개 영역
      livingroomGroups = [
        [4, 5, 7, 10, 11], // 왼쪽 상단
        [1, 2], // 창문+커튼
        [0, 6], // 소파+카펫
        [3], // 강아지
        [8, 9], // 식물
      ];
    } else if (level === 2) {
      // 2레벨: 6개 영역
      livingroomGroups = [
        [4, 5, 7, 10, 11], // 왼쪽 상단
        [1, 2], // 창문+커튼
        [0], // 소파
        [6], // 카펫
        [3], // 강아지
        [8, 9], // 식물
      ];
    } else {
      // 3레벨: 8개 영역
      livingroomGroups = [
        [4, 5, 7, 10], // 선반1
        [11], // 선반2
        [1], // 창문
        [2], // 커튼
        [0], // 소파
        [6], // 카펫
        [3], // 강아지
        [8, 9], // 식물
      ];
    }
  }
  
  // 기차 이미지의 레벨별 그룹 설정
  const isTrainImageGroup = imageName === "기차";
  let trainGroups: number[][] = [];
  
  if (isTrainImageGroup) {
    if (level === 1) {
      // 1레벨: 4개 영역
      trainGroups = [
        [18, 19], // 구름
        [20], // 해
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17], // 기차+기차바퀴+연기
        [12], // 레일
      ];
    } else if (level === 2) {
      // 2레벨: 6개 영역
      trainGroups = [
        [18, 19], // 구름
        [20], // 해
        [13, 17], // 기차1+연기
        [14, 15, 16], // 기차2
        [12], // 레일
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // 기차바퀴
      ];
    } else {
      // 3레벨: 8개 영역
      trainGroups = [
        [18, 19], // 구름
        [20], // 해
        [13, 17], // 기차1+연기
        [14], // 기차2
        [15], // 기차3
        [16], // 기차4
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // 기차바퀴
        [12], // 레일
      ];
    }
  }
  
  // 풍선 이미지의 레벨별 그룹 설정
  const isBalloonImage = imageName === "풍선";
  let balloonGroups: number[][] = [];
  
  if (isBalloonImage) {
    if (level === 1) {
      // 1레벨: 4개 영역
      balloonGroups = [
        [0, 1], // 상자+상자끈
        [3, 5], // 꽃+미니
        [4, 6], // 줄무늬+하트
        [2, 7], // 땡땡이+별
      ];
    } else if (level === 2) {
      // 2레벨: 6개 영역
      balloonGroups = [
        [0], // 상자
        [1], // 상자끈
        [4], // 하트
        [6], // 줄무늬
        [2, 7], // 별+땡땡이
        [3, 5], // 미니+꽃
      ];
    } else {
      // 3레벨: 8개 영역 - 지금 나뉜 대로
      balloonGroups = [
        [0], [1], [2], [3], [4], [5], [6], [7]
      ];
    }
  }
  
  // 그룹별로 색상 할당하는 이미지들
  let segmentColors: { segmentIndex: number; color: string; }[];
  
  if ((isHouseImage && houseGroups.length > 0) || 
      (isChildImage && childGroups.length > 0) ||
      (isLivingroomImage && livingroomGroups.length > 0) ||
      (isTrainImageGroup && trainGroups.length > 0) ||
      (isBalloonImage && balloonGroups.length > 0)) {
    // 그룹을 랜덤하게 섞기
    const groups = isHouseImage ? houseGroups : 
                   isChildImage ? childGroups :
                   isLivingroomImage ? livingroomGroups :
                   isTrainImageGroup ? trainGroups :
                   balloonGroups;
    const shuffledGroups = [...groups].sort(() => Math.random() - 0.5);
    
    // 각 그룹에 색상 할당
    segmentColors = [];
    shuffledGroups.forEach((group, groupIdx) => {
      const color = selectedColorArray[groupIdx % colorCount];
      group.forEach(segIdx => {
        segmentColors.push({
          segmentIndex: segIdx,
          color: color
        });
      });
    });
  }

  // 원본 이미지 로드 - preloaded ref 사용
  const imageKey = `coloring_${imageIndex}`;
  let img = preloadedImagesRef.current[imageKey];
  
  if (!img) {
    img = new Image();
    // file:// 또는 Capacitor 환경에서는 crossOrigin 설정하지 않음
    const protocol = window.location.protocol;
    if (!protocol.startsWith('capacitor') && protocol !== 'file:') {
      img.crossOrigin = "anonymous";
    }
    img.src = COLORING_IMAGES[imageIndex].src;
    preloadedImagesRef.current[imageKey] = img;
  }

  await new Promise<void>((resolve, reject) => {
    const processImage = async () => {
      const loadTime = performance.now();
      
      // Preview용 작은 크기로 처음부터 작업 (속도 최적화)
      // ✅ 400x400으로 작업 (기존 800x800 대비 4배 빠름, 320x320 출력에 충분)
      const previewSize = 400;
      const scale = previewSize / img.width;
      
      const canvas = document.createElement("canvas");
      canvas.width = previewSize;
      canvas.height = previewSize;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        resolve();
        return;
      }

      // 원본 이미지 크기 저장
      setOriginalImageSize({ width: img.width, height: img.height });

      // 🎨 ��그먼트별로 색칠 (병렬 처리로 최적화)
      const totalSegments = segmentColors.length;

      // 모든 세그먼트 이미지를 병렬로 로드
      const segmentPromises = segmentColors.map(async ({ segmentIndex, color }) => {
        const segmentPath = segmentPaths[segmentIndex];
        const segmentPos = segmentPositions[segmentIndex];
        
        // preloaded ref에서 세그먼트 이미지 가져오기 - 경로를 키로 사용
        const segmentKey = `segment_path_${segmentPath}`;
        let segImg = preloadedSegmentsRef.current[segmentKey];
        
        if (!segImg) {
          // 세그먼트 경로로 preloaded 이미지 찾기
          const segmentIdx = ALL_SEGMENT_URLS.findIndex(url => url === segmentPath);
          if (segmentIdx !== -1) {
            segImg = preloadedSegmentsRef.current[`segment_all_${segmentIdx}`];
          }
          
          if (!segImg) {
            segImg = new Image();
            // file:// 또는 Capacitor 환경에서는 crossOrigin 설정하지 않음
            const protocol = window.location.protocol;
            if (!protocol.startsWith('capacitor') && protocol !== 'file:') {
              segImg.crossOrigin = "anonymous";
            }
          }
          preloadedSegmentsRef.current[segmentKey] = segImg;
        }
        
        return new Promise<{ img: HTMLImageElement; pos: typeof segmentPos; color: string } | null>((resolve) => {
          segImg.onload = () => resolve({ img: segImg, pos: segmentPos, color });
          segImg.onerror = (e) => {
            console.error(`❌ 세그먼트 이미지 로드 실패: ${segmentPath}`, e);
            resolve(null);
          };
          segImg.src = segmentPath;
        });
      });

      const loadedSegments = await Promise.all(segmentPromises);
      const segmentLoadTime = performance.now();

      // 로드된 세그먼트들을 한 번에 처리
      for (const segment of loadedSegments) {
        if (!segment) continue;
        
        const { img: segImg, pos: segmentPos, color } = segment;
        
        // 임시 캔버스에 세그먼트 그리기 (스케일 적용)
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = previewSize;
        tempCanvas.height = previewSize;
        const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
        
        if (tempCtx) {
          // 세그먼트를 스케일 조정된 위치에 그리기
          const scaledX = segmentPos.x * scale;
          const scaledY = segmentPos.y * scale;
          const scaledWidth = segImg.width * scale;
          const scaledHeight = segImg.height * scale;
          
          tempCtx.drawImage(segImg, scaledX, scaledY, scaledWidth, scaledHeight);
          const segData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
          const segPixels = segData.data;
          
          // 색상을 RGB로 변환
          const hex = color.substring(1);
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          
          // 세그먼트의 불투명 픽셀 색칠 (outline 체크 간소화)
          for (let i = 0; i < segPixels.length; i += 4) {
            const alpha = segPixels[i + 3];
            
            if (alpha > 0) {
              const origR = segPixels[i];
              const origG = segPixels[i + 1];
              const origB = segPixels[i + 2];
              
              // 어두운 색상(outline)은 검은색 유지, 나머지는 색칠
              if (origR < 80 && origG < 80 && origB < 80) {
                segPixels[i] = 0;
                segPixels[i + 1] = 0;
                segPixels[i + 2] = 0;
              } else {
                segPixels[i] = r;
                segPixels[i + 1] = g;
                segPixels[i + 2] = b;
              }
            }
          }
          
          tempCtx.putImageData(segData, 0, 0);
          
          // 메인 캔버스에 합성
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }

      // Outline 이미지 생성 - 전체 완성본 이미지에서 한 번에 추출
      const outlineCanvas = document.createElement("canvas");
      outlineCanvas.width = previewSize;
      outlineCanvas.height = previewSize;
      const outlineCtx = outlineCanvas.getContext("2d", { willReadFrequently: true });

      if (outlineCtx) {
        
        // 전체 완성본 이미지를 스케일 조정해서 그리기
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = previewSize;
        tempCanvas.height = previewSize;
        const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
        
        if (tempCtx) {
          // 원본 이미지를 스케일 조정해서 그리기
          tempCtx.drawImage(img, 0, 0, previewSize, previewSize);
          const imageData = tempCtx.getImageData(0, 0, previewSize, previewSize);
          const pixels = imageData.data;
          
          // outline만 추출 (검은색 선만 남기고 나머지는 투명하게)
          let outlineCount = 0;
          let transparentCount = 0;
          for (let j = 0; j < pixels.length; j += 4) {
            const alpha = pixels[j + 3];
            if (alpha > 0) {
              const r = pixels[j];
              const g = pixels[j + 1];
              const b = pixels[j + 2];
              
              // 어두운 색상(outline)만 검은색으로 유지
              if (r < 80 && g < 80 && b < 80) {
                pixels[j] = 0;     // R - 검은색
                pixels[j + 1] = 0; // G - 검은색
                pixels[j + 2] = 0; // B - 검은색
                pixels[j + 3] = 255; // alpha - 불투명
                outlineCount++;
              } else {
                // 색칠 영역은 투명하게
                pixels[j] = 0;
                pixels[j + 1] = 0;
                pixels[j + 2] = 0;
                pixels[j + 3] = 0; // alpha - 완전 투명
                transparentCount++;
              }
            }
          }
          
          tempCtx.putImageData(imageData, 0, 0);
          
          // outline 캔버스에 복사
          outlineCtx.drawImage(tempCanvas, 0, 0);
        }
      }

      // 이미 800x800으로 작업했으므로 320x320으로만 축소
      const finalPreviewSize = 320;
      const previewCanvas = document.createElement("canvas");
      previewCanvas.width = finalPreviewSize;
      previewCanvas.height = finalPreviewSize;
      const previewCtx = previewCanvas.getContext("2d", { willReadFrequently: true });

      if (!previewCtx) {
        resolve();
        return;
      }

      previewCtx.drawImage(canvas, 0, 0, finalPreviewSize, finalPreviewSize);
      setPreviewImage(previewCanvas.toDataURL());

      // Outline도 320x320으로 축소
      const previewOutlineCanvas = document.createElement("canvas");
      previewOutlineCanvas.width = finalPreviewSize;
      previewOutlineCanvas.height = finalPreviewSize;
      const previewOutlineCtx = previewOutlineCanvas.getContext("2d", { willReadFrequently: true });

      if (previewOutlineCtx) {
        previewOutlineCtx.drawImage(outlineCanvas, 0, 0, finalPreviewSize, finalPreviewSize);
        const outlineDataUrl = previewOutlineCanvas.toDataURL();
        setPreviewOutlineImage(outlineDataUrl);
      } else {
        console.warn(`⚠️ previewOutlineCtx를 얻지 못했습니다!`);
      }

      // 정답 색상 저장 - 랜덤으로 할당한 색상을 정답으로 저장
      const correctColorsMap: { [key: number]: string } = {};

      // segmentColors 배열에서 각 세그먼트의 색상을 가져와서 정답으로 저장
      segmentColors.forEach(({ segmentIndex, color }) => {
        correctColorsMap[segmentIndex] = color;
      });

      // 그룹별로 정답 색상 저장
      const groups = getSegmentGroups(imageName || "", level);
      const groupColorsMap = new Map<number, string>();
      
      groups.forEach((group, groupIdx) => {
        // 그룹의 첫 번째 세그먼트 색상을 그룹 대표 색상으로 저장
        const firstSegmentInGroup = group[0];
        const groupColor = correctColorsMap[firstSegmentInGroup];
        if (groupColor) {
          groupColorsMap.set(groupIdx, groupColor);
        }
      });
      
      setCorrectGroupColors(groupColorsMap);

      const endTime = performance.now();
      
      resolve();
    };
    
    // 이미지 로드 이벤트 핸들러 설정
    img.onload = processImage;

    img.onerror = (e) => {
      console.error("❌ 원본 이미지 로드 실패:", {
        src: img.src,
        name: COLORING_IMAGES[imageIndex].name,
        protocol: window.location.protocol,
        error: e
      });
      alert(`이미지 로드 실패: ${COLORING_IMAGES[imageIndex].name}\n경로: ${img.src}\n\n앱을 다시 시작해주세요.`);
      reject(new Error("Image load failed"));
    };
    
    // 이미지가 이미 로드되어 있으면 즉시 처리
    if (img.complete && img.naturalWidth > 0) {
      processImage();
    }
  });
};
  
  // 브러쉬 이미지 preload
  useEffect(() => {
    const brushImages = [
      brushYellow, brushOrange, brushRed, brushGreen, 
      brushNavy, brushSky, brushBrown, brushPurple, brushClear
    ];
    brushImages.forEach(src => {
      const img = new Image();
      img.onerror = (e) => console.error(`❌ 브러시 이미지 로드 실패: ${src}`, e);
      img.src = src;
    });
  }, []);

  // 커서 표시 여부 제어
  useEffect(() => {
    if (!cursorRef.current) return;

    const shouldShow =
      gameState === "playing" &&
      !isPaused &&
      isCursorInside &&
      colorSelected;

    cursorRef.current.style.display = shouldShow ? "block" : "none";
  }, [gameState, isPaused, isCursorInside, colorSelected]);

  // 선택한 색에 따라 브러쉬 이미지 자동 변경
  useEffect(() => {
    if (!colorSelected) {
      setBrushSrc(brushClear);
      return;
    }

    const imageName = COLORING_IMAGES[selectedImageIndex]?.name;
    const yellowColor = imageName === "거실" ? "#E3D173" : "#FCDB8E";

    let currentColorHex = COLOR_PALETTE[selectedColorIndex]?.hex;
    if (COLOR_PALETTE[selectedColorIndex]?.name === "노랑") {
      currentColorHex = yellowColor;
    }

    setBrushSrc(colorToBrush[currentColorHex || ""] || brushClear);
  }, [colorSelected, selectedColorIndex, selectedImageIndex]);

  useEffect(() => {
    if (gameState === "preview" || gameState === "playing") {
      loadImages(selectedImageIndex).then(() => {
        if (outlineImgRef.current) {
          initializeCanvas(outlineImgRef.current, selectedImageIndex, outlineCanvasRef.current, selectedLevel);
          const positions = segmentPositionsRef.current;
          setSegmentOffsets(positions.map(() => ({ x: 0, y: 0 })));
        }
      });
    }
  }, [selectedImageIndex, gameState]);

  useEffect(() => {
    if (segmentOffsets.length > 0) {
      redrawSegments(segmentOffsets);
    }
  }, [segmentOffsets]);

  useEffect(() => {
    if (gameState === "playing" && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [gameState, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeText = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  const startGame = () => {
    playSelectSound();
    
    // 게임 시작 전 누적 점수 저장 및 게임 오버 플래그 초기화
    setPreviousAccumulatedScore(dailyAccumulatedScore);
    setShowGoalAchieved(false);
    isGameOverRef.current = false;
    
    setShowCompleteButton(false);
    setSegmentOffsets(segmentPositionsRef.current.map(() => ({ x: 0, y: 0 })));
    setColorSelected(false);
    setSelectedColorIndex(0);
    setBrushSrc(brushClear);
    setGameState("playing");
  };

  const togglePause = () => {
    playClickSound();
    setIsPaused(prev => !prev);
  };

  const handleRestart = () => {
    playClickSound();
    setIsPaused(false);
    setElapsedTime(0);
    setShowCompletedTime(false);
    setShowCompleteButton(false);
    setScore(0);
    setHearts(3); // 하트 초기화 추가
    setShowGoalAchieved(false);
    setCorrectGroupColors(new Map());
    setSegmentOffsets(segmentPositionsRef.current.map(() => ({ x: 0, y: 0 })));
    setPreviewUsedCount(0);
    setColorSelected(false);
    setSelectedColorIndex(0);
    setBrushSrc(brushClear);
    
    const randomIndex = Math.floor(Math.random() * COLORING_IMAGES.length);
    setSelectedImageIndex(randomIndex);
    generatePreviewImage(randomIndex, selectedLevel);
    setGameState("preview");
  };

  const handleContinue = () => {
    playClickSound();
    setIsPaused(false);
    setElapsedTime(0);
    setShowCompletedTime(false);
    setShowCompleteButton(false);
    // setScore(0); // 점수는 초기화하지 않음!
    // 하트는 초기화하지 않음! 한 판은 하트 3개를 다 쓸 때까지이므로 다음 그림에서도 하트 유지
    setShowGoalAchieved(false);
    setCorrectGroupColors(new Map());
    setSegmentOffsets(segmentPositionsRef.current.map(() => ({ x: 0, y: 0 })));
    setPreviewUsedCount(0);
    setColorSelected(false);
    setSelectedColorIndex(0);
    setBrushSrc(brushClear);
    
    const randomIndex = Math.floor(Math.random() * COLORING_IMAGES.length);
    setSelectedImageIndex(randomIndex);
    generatePreviewImage(randomIndex, selectedLevel);
    setGameState("preview");
  };

  const handleBackToLevels = (shouldRemoveScore: boolean = false) => {
    playBackSound();
    
    // 일시정지 창에서 나가기 시에만 현재 판의 점수를 메모리에서 제거 (로컬 저장소 영향 X)
    if (shouldRemoveScore) {
      const currentGameScore = dailyAccumulatedScore - previousAccumulatedScore;
      if (currentGameScore > 0) {
        revertScore(currentGameScore);
        setDailyAccumulatedScore(getAccumulatedScore());
      }
    }
    
    setIsPaused(false);
    setElapsedTime(0);
    setCorrectGroupColors(new Map());
    setSegmentOffsets([]);
    setColorSelected(false);
    setSelectedColorIndex(0);
    onBack();
  };

  const handleExitConfirm = () => {
    playBackSound();
    setShowExitConfirm(false);
    handleBackToLevels(true); // 중도 포기이므로 점수 제거
  };

  const handleLevelSelect = async (level: number) => {
    playSelectSound();
    setSelectedLevel(level);
    setElapsedTime(0);
    setScore(0);
    setShowGoalAchieved(false);
    setCorrectGroupColors(new Map());
    setSegmentOffsets([]);
    
    const randomIndex = Math.floor(Math.random() * COLORING_IMAGES.length);
    setSelectedImageIndex(randomIndex);
    
    // ✅ 완성본 생성 시작 - 로딩 상태 표시
    setIsGeneratingPreview(true);
    setGameState("preview"); // preview 화면으로 전환 (로딩 표시)
    
    try {
      // ✅ 완성본 생성 완료될 때까지 대기
      await generatePreviewImage(randomIndex, level);
    } catch (error) {
      console.error("완성본 생성 실패:", error);
    } finally {
      // ✅ 완성본 생성 완료 - 로딩 상태 해제
      setIsGeneratingPreview(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || isPaused) return;

    if (!colorSelected) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const brushOffsetX = 0;
    const brushOffsetY = 0;
    
    const centerX = Math.floor((e.clientX - rect.left + brushOffsetX) * scaleX);
    const centerY = Math.floor((e.clientY - rect.top + brushOffsetY) * scaleY);

    const imageName = COLORING_IMAGES[selectedImageIndex]?.name;
    const yellowColor = imageName === "거실" ? "#E3D173" : "#FCDB8E";
    
    let currentColorHex = COLOR_PALETTE[selectedColorIndex]?.hex;
    if (COLOR_PALETTE[selectedColorIndex]?.name === "노랑") {
      currentColorHex = yellowColor;
    }
    
    if (!currentColorHex) {
      return;
    }

    let filled = false;
    const searchRadius = 3;
    
    filled = fillSegment(centerX, centerY, currentColorHex, segmentOffsets);
    
    if (!filled) {
      for (let radius = 1; radius <= searchRadius && !filled; radius++) {
        for (let dx = -radius; dx <= radius && !filled; dx++) {
          for (let dy = -radius; dy <= radius && !filled; dy++) {
            if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
              filled = fillSegment(centerX + dx, centerY + dy, currentColorHex, segmentOffsets);
            }
          }
        }
      }
    }
    
    if (filled) {
      playClickSound();
      redrawSegments(segmentOffsets);
      
      const imageName = COLORING_IMAGES[selectedImageIndex]?.name || "";
      let segmentCount = 8;
      
      // 집/아이 그림은 레벨별로 다른 세그먼트 개수
      if (imageName === "집") {
        if (selectedLevel === 1) {
          segmentCount = 4; // 1레벨: 구름, 해, 집+울타리+꽃, 나무
        } else if (selectedLevel === 2) {
          segmentCount = 6; // 2레벨: 구름, 꽃, 울타리, 집, 해, 나무
        } else {
          segmentCount = 8; // 3레벨: 구름, 해, 꽃1, 꽃2, 울타리, 지붕, 집 나머지, 나무
        }
      } else if (imageName === "아이") {
        if (selectedLevel === 1) {
          segmentCount = 4;
        } else if (selectedLevel === 2) {
          segmentCount = 6;
        } else {
          segmentCount = 8;
        }
      } else if (imageName === "거실") {
        if (selectedLevel === 1) {
          segmentCount = 5;
        } else if (selectedLevel === 2) {
          segmentCount = 6;
        } else {
          segmentCount = 8;
        }
      } else if (imageName === "기차") {
        if (selectedLevel === 1) {
          segmentCount = 4;
        } else if (selectedLevel === 2) {
          segmentCount = 6;
        } else {
          segmentCount = 8;
        }
      } else if (imageName === "풍선") {
        if (selectedLevel === 1) {
          segmentCount = 4;
        } else if (selectedLevel === 2) {
          segmentCount = 6;
        } else {
          segmentCount = 8;
        }
      }
      
      // 집/아이 그림은 그룹별로 완료 체크
      let isComplete = false;
      if (imageName === "집") {
        // 그룹 정의 (위와 동일)
        let houseGroups: number[][] = [];
        if (selectedLevel === 1) {
          houseGroups = [
            [2, 3, 4, 5, 6], [7, 8, 13], [9, 10, 11, 12], [0, 1]
          ];
        } else if (selectedLevel === 2) {
          houseGroups = [
            [7, 8], [11, 12], [9, 10], [2, 3, 4, 5, 6], [13], [0, 1]
          ];
        } else {
          houseGroups = [
            [7, 8], [13], [11], [12], [9, 10], [5], [2, 3, 4, 6], [0, 1]
          ];
        }
        
        // 각 그룹이 칠해졌는지 체크
        const groupsFilled = houseGroups.filter(group => {
          return group.every(segIdx => {
            const color = segmentColorsRef.current[segIdx];
            return color != null && color !== undefined;
          });
        }).length;
        
        isComplete = groupsFilled === houseGroups.length;
      } else if (imageName === "아이") {
        // 그룹 정의 (위와 동일)
        let childGroups: number[][] = [];
        if (selectedLevel === 1) {
          childGroups = [
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [11, 12, 13, 14], [17], [15, 16, 18, 19]
          ];
        } else if (selectedLevel === 2) {
          childGroups = [
            [0, 1, 2, 3, 4], [5, 6, 7, 8, 9, 10], [17], [11, 12], [13, 14], [15, 16, 18, 19]
          ];
        } else {
          childGroups = [
            [0, 1, 2, 3, 4], [5, 6], [7, 8, 9, 10], [17], [11, 12], [13, 14], [15, 16], [18, 19]
          ];
        }
        
        // 각 그룹이 칠해졌는지 체크
        const groupsFilled = childGroups.filter(group => {
          return group.every(segIdx => {
            const color = segmentColorsRef.current[segIdx];
            return color != null && color !== undefined;
          });
        }).length;
        
        isComplete = groupsFilled === childGroups.length;
      } else if (imageName === "거실") {
        // 그룹 정의
        let livingroomGroups: number[][] = [];
        if (selectedLevel === 1) {
          livingroomGroups = [
            [4, 5, 7, 10, 11], [1, 2], [0, 6], [3], [8, 9]
          ];
        } else if (selectedLevel === 2) {
          livingroomGroups = [
            [4, 5, 7, 10, 11], [1, 2], [0], [6], [3], [8, 9]
          ];
        } else {
          livingroomGroups = [
            [4, 5, 7, 10], [11], [1], [2], [0], [6], [3], [8, 9]
          ];
        }
        
        const groupsFilled = livingroomGroups.filter(group => {
          return group.every(segIdx => {
            const color = segmentColorsRef.current[segIdx];
            return color != null && color !== undefined;
          });
        }).length;
        
        isComplete = groupsFilled === livingroomGroups.length;
      } else if (imageName === "기차") {
        // 그룹 정의
        let trainGroups: number[][] = [];
        if (selectedLevel === 1) {
          trainGroups = [
            [18, 19], [20], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17], [12]
          ];
        } else if (selectedLevel === 2) {
          trainGroups = [
            [18, 19], [20], [13, 17], [14, 15, 16], [12], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
          ];
        } else {
          trainGroups = [
            [18, 19], [20], [13, 17], [14], [15], [16], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [12]
          ];
        }
        
        const groupsFilled = trainGroups.filter(group => {
          return group.every(segIdx => {
            const color = segmentColorsRef.current[segIdx];
            return color != null && color !== undefined;
          });
        }).length;
        
        isComplete = groupsFilled === trainGroups.length;
      } else if (imageName === "풍선") {
        // 그룹 정의
        let balloonGroups: number[][] = [];
        if (selectedLevel === 1) {
          balloonGroups = [
            [0, 1], [3, 5], [4, 6], [2, 7]
          ];
        } else if (selectedLevel === 2) {
          balloonGroups = [
            [0], [1], [4], [6], [2, 7], [3, 5]
          ];
        } else {
          balloonGroups = [
            [0], [1], [2], [3], [4], [5], [6], [7]
          ];
        }
        
        const groupsFilled = balloonGroups.filter(group => {
          return group.every(segIdx => {
            const color = segmentColorsRef.current[segIdx];
            return color != null && color !== undefined;
          });
        }).length;
        
        isComplete = groupsFilled === balloonGroups.length;
      }
      
      if (isComplete) {
        setShowCompleteButton(true);
      }
    }
  };

  const handleCanvasMouseEnter = () => {
    setIsCursorInside(true);
  };

  const handleCanvasMouseLeave = () => {
    setIsCursorInside(false);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cursorRef.current) return;
    if (gameState !== "playing" || isPaused) return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    cursorRef.current.style.left = `${x}px`;
    cursorRef.current.style.top = `${y}px`;
  };

  const handleColorSelect = (index: number) => {
    playClickSound();
    setSelectedColorIndex(index);
    setColorSelected(true);

    const colorName = COLOR_PALETTE[index]?.name || "알 수 없음";
    const imageName = COLORING_IMAGES[selectedImageIndex]?.name;
    const yellowColor = imageName === "거실" ? "#E3D173" : "#FCDB8E";

    let colorHex = COLOR_PALETTE[index]?.hex;
    if (COLOR_PALETTE[index]?.name === "노랑") {
      colorHex = yellowColor;
    }
  };

  // 팔레트 위치 드래그 핸들러 (개발 모드용)
  const handlePaletteDragStart = (e: React.MouseEvent, index: number) => {
    if (!devMode) return;
    e.stopPropagation();
    
    const paletteContainer = e.currentTarget.parentElement?.parentElement;
    if (!paletteContainer) return;
    
    const rect = paletteContainer.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    
    const currentPos = palettePositions[index];
    const startLeft = parseFloat(currentPos.left);
    const startTop = parseFloat(currentPos.top);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      const newLeft = startLeft + (deltaX / rect.width) * 100;
      const newTop = startTop + (deltaY / rect.height) * 100;
      
      const newPositions = [...palettePositions];
      newPositions[index] = {
        top: `${newTop.toFixed(1)}%`,
        left: `${newLeft.toFixed(1)}%`
      };
      setPalettePositions(newPositions);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // 드래그 종료 시 현재 레벨의 모든 위치 로그 출력
      console.log(`\n=== ${selectedLevel === 1 ? '쉬움' : selectedLevel === 2 ? '보통' : '어려움'} 팔레트 위치 ===`);
      const colorNames = ['빨강', '주황', '노랑', '초록', '하늘', '남색', '보라', '갈색'];
      palettePositions.forEach((pos, idx) => {
        console.log(`{ top: '${pos.top}', left: '${pos.left}' },  // ${colorNames[idx]} (index ${idx})`);
      });
      console.log('=================\n');
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handlePaletteClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPaused) return;
    
    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    const colorWidth = width / 8;
    const clickedIndex = Math.floor(x / colorWidth);
    
    if (clickedIndex >= 0 && clickedIndex < 8) {
      handleColorSelect(clickedIndex);
    }
  };

  const handleComplete = () => {
    playSelectSound();
    
    // 완성 버튼 즉시 비활성화 (중복 클릭 방지)
    setShowCompleteButton(false);
    
    const imageName = COLORING_IMAGES[selectedImageIndex]?.name;
    let segmentCount = 0;
    
    switch (imageName) {
      case "풍선":
        segmentCount = 8;
        break;
      case "집":
        segmentCount = 14;
        break;
      case "난":
        segmentCount = 14;
        break;
      case "아이":
        segmentCount = 20;
        break;
      case "거실":
        segmentCount = 12;
        break;
      case "기차":
        segmentCount = 21;
        break;
      default:
        segmentCount = 8;
    }
    
    const coloredCanvas = coloredCanvasRef.current;
    if (!coloredCanvas) {
      setGameState("complete");
      return;
    }
    
    const correctImg = new Image();
    correctImg.crossOrigin = "anonymous";
    correctImg.src = COLORING_IMAGES[selectedImageIndex].src;
    
    correctImg.onload = () => {
      
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = coloredCanvas.width;
      tempCanvas.height = coloredCanvas.height;
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
      
      if (!tempCtx) return;
      
      tempCtx.drawImage(correctImg, 0, 0, tempCanvas.width, tempCanvas.height);
      const correctData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      
      const coloredCtx = coloredCanvas.getContext("2d", { willReadFrequently: true });
      if (!coloredCtx) return;
      
      const coloredData = coloredCtx.getImageData(0, 0, coloredCanvas.width, coloredCanvas.height);
      
      let totalColoredPixels = 0;
      let correctPixels = 0;
      const threshold = 50;
      
      for (let i = 0; i < correctData.data.length; i += 4) {
        const correctR = correctData.data[i];
        const correctG = correctData.data[i + 1];
        const correctB = correctData.data[i + 2];
        const correctA = correctData.data[i + 3];
        
        const coloredR = coloredData.data[i];
        const coloredG = coloredData.data[i + 1];
        const coloredB = coloredData.data[i + 2];
        const coloredA = coloredData.data[i + 3];
        
        if (correctA > 0 && (correctR >= 80 || correctG >= 80 || correctB >= 80)) {
          totalColoredPixels++;
          
          if (coloredA > 0) {
            const rDiff = Math.abs(correctR - coloredR);
            const gDiff = Math.abs(correctG - coloredG);
            const bDiff = Math.abs(correctB - coloredB);
            
            if (rDiff <= threshold && gDiff <= threshold && bDiff <= threshold) {
              correctPixels++;
            }
          }
        }
      }
      
      const accuracy = totalColoredPixels > 0 ? (correctPixels / totalColoredPixels) * 100 : 0;
      const filledCount = segmentColorsRef.current.filter(color => color != null && color !== undefined).length;
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setShowCompletedTime(true);
      
      const segmentPositions = getSegmentPositions(imageName);
        
      const scoringResult = calculateGameScore(
        segmentCount,
        segmentPositions,
        coloredCanvas,
        correctGroupColors,
        elapsedTime,
        originalImageSize.width,  // 원본 이미지 너비
        originalImageSize.height,  // 원본 이미지 높이
        imageName,  // 이미지 이름
        selectedLevel,  // 레벨
        segmentColorsRef.current  // 세그먼트별 색상 배열 추가
      );
      
      if (!scoringResult) {
        console.error("점수 계산 실패");
        return;
      }
      
      const { correctSegments, correctSegmentIndices, baseScore, timeBonus, finalScore } = scoringResult;
      
      // 점수 업데이트 (하트 감소는 나중에 틀린 그룹 계산 후 처리)
      const prevScore = score;
      const newScore = prevScore + finalScore;
      setScore(newScore);
      
      // 일일 목표점수 시스템: 메모리에만 점수 추가 (로컬 저장 X)
      addScoreToMemory(finalScore);
      setDailyAccumulatedScore(getAccumulatedScore());
      
      // 목표 달성 시 측정중이었으면 목표점수 갱신
      if (dailyTargetScore === null || dailyTargetScore === 0) {
        const currentTargetScore = getTargetScore();
        setDailyTargetScore(currentTargetScore);
      }
      
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / canvas.width;
        const scaleY = rect.height / canvas.height;
        
        const pointsPerGroup = 10;  // 그룹당 점수
        
        // 그룹 정의 가져오기
        const groups = getSegmentGroups(imageName, selectedLevel);
        
        // 완성된 그룹 찾기
        const completedGroupIndices: number[] = [];
        for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
          const group = groups[groupIdx];
          const anyCorrect = group.some(segIdx => correctSegmentIndices.includes(segIdx));
          if (anyCorrect) {
            completedGroupIndices.push(groupIdx);
          }
        }
        
        // 틀린 그룹 찾기
        const wrongGroupIndices: number[] = [];
        for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
          if (!completedGroupIndices.includes(groupIdx)) {
            wrongGroupIndices.push(groupIdx);
          }
        }
        
        // 하트 감소 처리 (틀린 그룹이 있을 때만)
        let newHearts = hearts;
        if (wrongGroupIndices.length > 0) {
          newHearts = Math.max(0, hearts - 1);
          setHearts(newHearts);
        }
        
        // 먼저 틀린 그룹에 X 표시
        for (let i = 0; i < wrongGroupIndices.length; i++) {
          const groupIdx = wrongGroupIndices[i];
          const group = groups[groupIdx];
          
          // 그룹 내 중간 인덱스 세그먼트의 위치를 대표 위치로 사용
          const representativeSegIdx = group[Math.floor(group.length / 2)];
          const pos = segmentPositions[representativeSegIdx];
          
          if (!pos) {
            console.warn(`⚠️ 그룹 ${groupIdx + 1}의 대표 세그먼트 ${representativeSegIdx} 위치 정보 없음`);
            continue;
          }
          
          // 세그먼트 이미지 크기 가져오기
          const segmentImg = segmentImagesRef.current[representativeSegIdx];
          const segmentWidth = segmentImg ? segmentImg.width : 0;
          const segmentHeight = segmentImg ? segmentImg.height : 0;
          
          // 세그먼트의 중앙 위치 계산
          const centerX = pos.x + segmentWidth / 2;
          const centerY = pos.y + segmentHeight / 2;
          
          // 비율 계산
          const ratioX = centerX / canvas.width;
          const ratioY = centerY / canvas.height;
          
          const screenX = rect.left + (rect.width * ratioX);
          const screenY = rect.top + (rect.height * ratioY) + 30;
          
          setTimeout(() => {
            const popupId = wrongPopupIdRef.current++;
            setWrongPopups(prev => [
              ...prev,
              {
                id: popupId,
                x: screenX,
                y: screenY
              }
            ]);
            playBackSound();
            
            // 1초 후 X 표시 제거
            setTimeout(() => {
              setWrongPopups(prev => prev.filter(p => p.id !== popupId));
            }, 1000);
          }, i * 150);
        }
        
        // X 표시 시작 후 0.5초 후에 하트 애니메이션 표시 (틀린 그룹이 있을 때만)
        const heartAnimationDelay = 500; // X 표시 시작 후 0.5초 후
        if (wrongGroupIndices.length > 0) {
          setTimeout(() => {
            // 우측 상단 하트 위치에 하트 애니메이션 표시
            const heartsElement = document.getElementById('hearts-display');
            if (heartsElement) {
              const heartsRect = heartsElement.getBoundingClientRect();
              const heartText: HeartText = {
                id: heartTextIdRef.current++,
                x: heartsRect.left + heartsRect.width / 2,
                y: heartsRect.top + heartsRect.height / 2,
                createdAt: Date.now(),
                scale: 1
              };
              setHeartTexts(prev => [...prev, heartText]);
              
              // 1.2초 후에 하트 텍스트 제거
              setTimeout(() => {
                setHeartTexts(prev => prev.filter(text => text.id !== heartText.id));
              }, 1200);
            }
          }, heartAnimationDelay);
        }
        
        // 틀린 그룹 표시 후 맞은 그룹에 점수 표시 (하트 애니메이션 고려)
        const wrongAnimationDelay = wrongGroupIndices.length > 0 
          ? heartAnimationDelay + 1200 + 300 // 하트 애니메이션 시작 + 애니메이션 시간 + 여유시간
          : 300; // 틀린 그룹이 없으면 바로 시작
        
        // 각 완성된 그룹별로 팝업 하나씩 생성
        for (let i = 0; i < completedGroupIndices.length; i++) {
          const groupIdx = completedGroupIndices[i];
          const group = groups[groupIdx];
          
          // 그룹 내 중간 인덱스 세그먼트의 위치를 대표 위치로 사용
          const representativeSegIdx = group[Math.floor(group.length / 2)];
          const pos = segmentPositions[representativeSegIdx];
          
          if (!pos) {
            continue;
          }
          
          // 세그먼트 이미지 크기 가져오기
          const segmentImg = segmentImagesRef.current[representativeSegIdx];
          const segmentWidth = segmentImg ? segmentImg.width : 0;
          const segmentHeight = segmentImg ? segmentImg.height : 0;
          
          // 세그먼트의 중앙 위치 계산 (세그먼트 시작 위치 + 너비/높이의 절반)
          const centerX = pos.x + segmentWidth / 2;
          const centerY = pos.y + segmentHeight / 2;
          
          // 세그먼트 중앙 위치는 원본 이미지 크기 좌표이므로 캔버스 크기 기준으로 비율 계산
          const ratioX = centerX / canvas.width;
          const ratioY = centerY / canvas.height;
          
          const screenX = rect.left + (rect.width * ratioX);
          const screenY = rect.top + (rect.height * ratioY) + 30; // 팝업 위치 살짝 아래로
          
          setTimeout(() => {
            setScorePopups(prev => [
              ...prev,
              {
                id: scorePopupIdRef.current++,
                points: pointsPerGroup,
                x: screenX,
                y: screenY
              }
            ]);
            playClickSound();
          }, wrongAnimationDelay + i * 200);
        }
        
        // 완성된 그룹이 있을 때만 시간 보너스 지급
        if (timeBonus > 0 && completedGroupIndices.length > 0) {
          setTimeout(() => {
            // DOM이 업데이트될 시간을 주기 위해 requestAnimationFrame 사용
            requestAnimationFrame(() => {
              const completedTimeElement = document.getElementById('completed-time-display');
              
              let bonusX, bonusY;
              
              if (completedTimeElement) {
                const completedTimeRect = completedTimeElement.getBoundingClientRect();
                bonusX = completedTimeRect.left + completedTimeRect.width / 2;
                bonusY = completedTimeRect.top - 5; // 거의 붙여서
              } else {
                // 엘리먼트가 없으면 화면 중앙 상단에 표시
                bonusX = window.innerWidth / 2;
                bonusY = window.innerHeight / 4;
              }
              
              setScorePopups(prev => [
                ...prev,
                {
                  id: scorePopupIdRef.current++,
                  points: timeBonus,
                  x: bonusX,
                  y: bonusY
                }
              ]);
              playClickSound();
            });
          }, wrongAnimationDelay + completedGroupIndices.length * 200 + 300);
        }
        
        const totalDelay = timeBonus > 0 && completedGroupIndices.length > 0
          ? 1500 + wrongAnimationDelay + completedGroupIndices.length * 200 + 300 + 300
          : 1500 + wrongAnimationDelay + completedGroupIndices.length * 200 + 300;
        
        // 첫 플레이(측정 단계)에서도 commitScore() 호출하여 점수 저장 및 목표 달성 체크
        setTimeout(() => {
          setScorePopups([]); // 모든 팝업 제거
          setWrongPopups([]); // 틀린 표시 제거
          
          // 하트가 0이면 게임 오버
          if (newHearts === 0) {
            // 게임 종료 시 측정값 설정
            if (!isGameOverRef.current) {
              isGameOverRef.current = true;
              if (dailyTargetScore === null || dailyTargetScore === 0) {
                setMeasuredScore(newScore);
                const newTarget = newScore > 0 ? newScore * 3 : 0;
                setDailyTargetScore(newTarget);
              }
            }
            // 메모리 점수를 로컬 저장소에 저장
            commitScore();
            setGameState("complete");
            saveGameRecord("coloringGame", newScore, selectedLevel);
            return; // 게임 종료
          } else {
            // 하트가 남아있으면 다음 그림으로
            handleContinue();
          }
        }, totalDelay);
      } else {
        // 목표 점수 달성 체크는 commitScore()에서 처리
        setTimeout(() => {
          setScorePopups([]); // 모든 팝업 제거
          setWrongPopups([]); // 틀린 표시 제거
          
          // 하트가 0이면 게임 오버
          if (newHearts === 0) {
            // 메모리 점수를 로컬 저장소에 저장 및 목표 달성 체크
            const isGoalAchieved = commitScore();
            
            if (isGoalAchieved) {
              // 목표 달성 시 팝업 표시
              recordAchievement("coloringGame");
              setShowGoalAchieved(true);
              playSelectSound();
              
              // 5초 후 자동으로 닫고 게임 종료
              setTimeout(() => {
                setShowGoalAchieved(false);
                setTimeout(() => {
                  setGameState("complete");
                  saveGameRecord("coloringGame", score + finalScore, selectedLevel);
                }, 100);
              }, 5000);
            } else {
              // 목표 미달성 시 바로 게임 종료
              setGameState("complete");
              saveGameRecord("coloringGame", score + finalScore, selectedLevel);
            }
            return; // 게임 종료
          } else {
            // 하트가 남아있으면 다음 그림으로
            handleContinue();
          }
        }, 1500);
      }
    };
  };

  const handleReplay = () => {
    playClickSound();
    handleRestart();
  };

  const handleRulesClick = () => {
    playClickSound();
    setShowRules(true);
  };

  const handleRulesClose = () => {
    playClickSound();
    setShowRules(false);
  };

  const handleShowPreview = () => {
    if (previewUsedCount >= 3) return;
    
    playClickSound();
    setShowPreviewModal(true);
    setPreviewTimeLeft(10);
    setPreviewUsedCount(prev => prev + 1);
    
    previewTimerRef.current = setInterval(() => {
      setPreviewTimeLeft(prev => {
        if (prev <= 1) {
          if (previewTimerRef.current) {
            clearInterval(previewTimerRef.current);
            previewTimerRef.current = null;
          }
          setShowPreviewModal(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClosePreview = () => {
    playClickSound();
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setShowPreviewModal(false);
  };

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    };
  }, []);

  // 컴포넌트 마운트 시 일일 목표점수 초기화
  useEffect(() => {
    const target = getTargetScore();
    setDailyTargetScore(target);
    const accumulated = loadAccumulatedScore(); // 로컬 저장소 → 메모리 로드
    setDailyAccumulatedScore(accumulated);
    setPreviousAccumulatedScore(accumulated);
    setAnimatedAccumulatedScore(accumulated);
  }, []);
  
  // 게임 오버 시 누적 점수 애니메이션
  useEffect(() => {
    if (gameState === "complete") {
      setAnimatedAccumulatedScore(previousAccumulatedScore);
      
      const duration = 1000;
      const startTime = Date.now();
      const startScore = previousAccumulatedScore;
      const endScore = dailyAccumulatedScore;
      const diff = endScore - startScore;
      
      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentScore = Math.floor(startScore + diff * eased);
        
        setAnimatedAccumulatedScore(currentScore);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [gameState, previousAccumulatedScore, dailyAccumulatedScore]);

  // 팝업 컴포넌트 (모든 상태에서 공통으로 표시)
  const popups = (
    <>
      {/* 틀린 요소 X 표시 */}
      {wrongPopups.map(popup => (
        <div
          key={popup.id}
          className="fixed pointer-events-none z-50"
          style={{
            left: `${popup.x}px`,
            top: `${popup.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <ImageWithFallback
            src={xMarkImg}
            alt="wrong"
            className="w-8 h-8 object-contain"
            style={{
              filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
            }}
          />
        </div>
      ))}
      
      {/* 하트 감소 텍스트 표시 */}
      {heartTexts.map(text => {
        return (
          <div
            key={text.id}
            className="fixed pointer-events-none z-50 flex items-center gap-0.5"
            style={{
              left: `${text.x}px`,
              top: `${text.y}px`,
              transform: 'translate(-50%, -50%)',
              animation: 'floatUpHeart 1.2s ease-out forwards',
            }}
          >
            <style>{`
              @keyframes floatUpHeart {
                0% { 
                  transform: translate(-50%, -50%) translateY(0px); 
                  opacity: 1; 
                }
                100% { 
                  transform: translate(-50%, -50%) translateY(-40px); 
                  opacity: 0; 
                }
              }
            `}</style>
            <Heart 
              className="w-7 h-7"
              style={{ fill: '#cd6c58', color: '#cd6c58' }}
            />
            <span style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#cd6c58',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              fontFamily: 'OngleipRyudung'
            }}>
              -1
            </span>
          </div>
        );
      })}
      
      {/* 점수 팝업 애니메이션 - 코인과 함께 표시 */}
      {scorePopups.map(popup => (
        <div
          key={popup.id}
          className="fixed pointer-events-none z-50"
          style={{
            left: `${popup.x}px`,
            top: `${popup.y}px`,
            transform: 'translate(-50%, -50%)',
            animation: 'floatUp 1.5s ease-out forwards',
          }}
          onAnimationEnd={() => {
            setScorePopups(prev => prev.filter(p => p.id !== popup.id));
          }}
        >
          <div className="flex items-center gap-2">
            <ImageWithFallback 
              src={starIcon} 
              alt="코인" 
              style={{ width: "40px", height: "40px", objectFit: "contain" }}
            />
            <span className="text-4xl drop-shadow-lg" style={{ 
              fontFamily: 'OngleipRyudung',
              color: '#a7b7c4',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              +{popup.points}
            </span>
          </div>
        </div>
      ))}
    </>
  );

  if (gameState === "ready") {
    return (
      <>
      {popups}
      <div className="fixed inset-0 bg-amber-50 p-4 pb-[env(safe-area-inset-bottom)] flex flex-col pt-[max(env(safe-area-inset-top),3rem)]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        <div className="flex items-center mb-4 flex-shrink-0">
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
          <h2 
            className="text-4xl ml-4 cursor-pointer" 
            style={{ color: '#4a4a4a', fontFamily: 'OngleipRyudung' }}
            onClick={() => {
              setDevClickCount(prev => {
                const newCount = prev + 1;
                
                // 타이머 초기화
                if (devClickTimerRef.current) {
                  clearTimeout(devClickTimerRef.current);
                }
                
                // 2초 후 카운트 리셋
                devClickTimerRef.current = setTimeout(() => {
                  setDevClickCount(0);
                }, 2000);
                
                // 5번 클릭 시 개발자 모드 활성화
                if (newCount >= 5) {
                  setDevMode(true);
                  playClickSound();
                  setDevClickCount(0);
                  if (devClickTimerRef.current) {
                    clearTimeout(devClickTimerRef.current);
                  }
                }
                
                return newCount;
              });
            }}
          >
            색칠 게임{devMode && " 🔧"}
          </h2>
          {devMode && (
            <>
              <button
                onClick={() => {
                  localStorage.removeItem('coloringGame_dailyGoal');
                  const newTarget = getTargetScore();
                  setDailyTargetScore(newTarget);
                  setDailyAccumulatedScore(0);
                  setAnimatedAccumulatedScore(0);
                  playClickSound();
                  alert('목표점수 데이터가 초기화되었습니다!');
                }}
                className="text-xl px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 ml-4"
                style={{ fontFamily: "OngleipRyudung" }}
              >
                목표점수 초기화
              </button>
              <button
                onClick={() => {
                  const dailyGoalData = localStorage.getItem('coloringGame_dailyGoal');
                  if (dailyGoalData) {
                    const data = JSON.parse(dailyGoalData);
                    data.accumulatedScore = 0;
                    data.achieved = false;
                    localStorage.setItem('coloringGame_dailyGoal', JSON.stringify(data));
                    // 메모리도 함께 초기화
                    loadAccumulatedScore();
                    setDailyAccumulatedScore(0);
                    setAnimatedAccumulatedScore(0);
                    playClickSound();
                    alert('누적 점수가 초기화되었습니다!');
                  }
                }}
                className="text-xl px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 ml-2"
                style={{ fontFamily: "OngleipRyudung" }}
              >
                누적 점수 초기화
              </button>

            </>
          )}
        </div>

        <div className="mb-4 flex-shrink-0">
          <p className="text-2xl text-center mb-4" style={{ color: '#4a4a4a' }}>
            그림을 기억하고 색칠하세요!<br />
            잘못 색칠하면 하트를 잃습니다.
          </p>
          <p className="text-2xl text-center mb-1" style={{ color: '#a7b7c4' }}>
            일일 목표점수: {dailyTargetScore === null || dailyTargetScore === 0 ? '측정중...' : `${dailyTargetScore}점`}
          </p>
          <p className="text-2xl text-center mb-4" style={{ color: '#a7b7c4' }}>
            일일 누적점수: {animatedAccumulatedScore}점
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative flex flex-col items-center justify-center">
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <LevelButton
                level={1}
                levelName="4가지 색"
                isRecommended={false}
                buttonBgImage={levelButtonBg}
                devMode={devMode}
                color="#a7b7c4"
                disabled={!hasEnergy()}
                onClick={() => {
                  // 개발자 모드일 때는 기회 체크 스킵
                  if (devMode) {
                    handleLevelSelect(1);
                    return;
                  }
                  
                  if (!devMode && !hasEnergy()) {
                    setShowNoEnergyAlert(true);
                    setTimeout(() => setShowNoEnergyAlert(false), 2000);
                    return;
                  }
                  
                  if (devMode || useEnergy()) {
                    setEnergy(getEnergy());
                    handleLevelSelect(1);
                  }
                }}
              />
              
              <LevelButton
                level={2}
                levelName="6가지 색"
                isRecommended={false}
                buttonBgImage={levelButtonBg}
                devMode={devMode}
                color="#a7b7c4"
                disabled={!hasEnergy()}
                onClick={() => {
                  // 개발자 모드일 때는 기회 체크 스킵
                  if (devMode) {
                    handleLevelSelect(2);
                    return;
                  }
                  
                  if (!devMode && !hasEnergy()) {
                    setShowNoEnergyAlert(true);
                    setTimeout(() => setShowNoEnergyAlert(false), 2000);
                    return;
                  }
                  
                  if (devMode || useEnergy()) {
                    setEnergy(getEnergy());
                    handleLevelSelect(2);
                  }
                }}
              />
              
              <LevelButton
                level={3}
                levelName="8가지 색"
                isRecommended={false}
                buttonBgImage={levelButtonBg}
                devMode={devMode}
                color="#a7b7c4"
                disabled={!hasEnergy()}
                onClick={() => {
                  // 개발자 모드일 때는 기회 체크 스킵
                  if (devMode) {
                    handleLevelSelect(3);
                    return;
                  }
                  

                  
                  if (devMode || useEnergy()) {
                    setEnergy(getEnergy());
                    handleLevelSelect(3);
                  }
                }}
              />
            </div>

            <p className="text-2xl text-gray-700 mt-4 text-center">난이도를 선택하세요</p>

            <GameRulesButton
              onClick={() => {
                playClickSound();
                setShowRules(true);
              }}
              backgroundColor="#a7b7c4"
              textColor="#ffffff"
            />
          </div>
        </div>

        <GameRulesModal 
          isOpen={showRules} 
          onClose={handleRulesClose} 
          title="색칠 게임 방법"
          primaryColor="#a7b7c4"
          backgroundColor="#e8edf1"
          scrollbarColor="#a7b7c4"
          scrollbarTrackColor="#e8edf1"
          onCloseSound={playClickSound}
        >
          <RuleSection title="게임 방법" titleColor="#a7b7c4">
            <RuleList items={[
              "색칠된 그림을 외워주세요.",
              "게임이 시작되면 색칠되지 않은 그림이 보입니다.",
              "아까 외운 완성본 그림과 똑같이 색칠해주세요.",
              "기억이 나지 않는다면 10초 동안 다시 볼 수 있어요!",
              "틀리게 색칠한 상태로 완성시키면 하트가 1개 줄어듭니다.",
              "하트가 모두 사라지면 게임이 종료됩니다."
            ]} />
          </RuleSection>
          
          <RuleSection title="점수" titleColor="#a7b7c4">
            <RuleList items={[
              "요소 하나 당 10점",
              "3분 이내로 완성시키면 30초 당 5점 추가"
            ]} />
          </RuleSection>
        </GameRulesModal>
      </div>
      </>
    );
  }
  
  if (gameState === "preview") {
    return (
      <>
      {popups}
      <div className="fixed inset-0 bg-amber-50 pb-[env(safe-area-inset-bottom)] flex flex-col pt-[max(env(safe-area-inset-top),3rem)]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        <div className="flex items-center justify-between p-4 mb-4 flex-shrink-0">
          {!isPaused && (
            <button
              onClick={togglePause}
              className="bg-transparent hover:bg-transparent border-none p-2 cursor-pointer"
            >
              <ImageWithFallback
                src={pauseIcon}
                alt="일시정지"
                className="h-10 w-10 object-contain"
              />
            </button>
          )}
          
          {isPaused && (
            <div className="w-12" />
          )}

          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  className={`w-7 h-7 ${
                    i < hearts
                      ? "text-[#cd6c58]"
                      : "fill-gray-300 text-gray-300"
                  }`}
                  fill={i < hearts ? "#cd6c58" : undefined}
                />
              ))}
            </div>
            
            <div className="bg-white/80 px-6 py-2 rounded-lg">
              <span className="text-2xl">점수: {score}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div 
            className="relative w-80 h-80 bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer" 
            style={{ border: '2px solid #a7b7c4' }}
          >
            {/* 조각 그림 (색칠된 이미��) */}
            {previewImage && (
              <img
                src={previewImage}
                alt={`레벨 ${selectedLevel}`}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ zIndex: 0 }}
              />
            )}
            
            {/* Outline 완성본 (위에 겹침) */}
            {previewOutlineImage && (
              <img
                src={previewOutlineImage}
                alt="Outline"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{ zIndex: 1 }}
              />
            )}
          </div>

          <button
            onClick={startGame}
            disabled={isGeneratingPreview}
            className="relative w-64 h-20 flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImageWithFallback
              src={levelButtonBg}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
            />
            <span className="relative font-[OngleipRyudung] text-white z-10" style={{ fontSize: '2.25rem' }}>
              {isGeneratingPreview ? '준비 중...' : '시작하기'}
            </span>
          </button>
        </div>

        {isPaused && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div 
              className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${pauseMenuBg})` }}
            >
              <h2 className="text-center mb-6 mt-4 text-4xl" style={{ color: '#eae4d3' }}>일시정지</h2>
              
              <div className="space-y-0">
                <button
                  onClick={togglePause}
                  className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
                >
                  <ImageWithFallback
                    src={resumeImg}
                    alt="resume"
                    className="h-12 w-12 object-contain"
                  />
                  <span className="text-3xl" style={{ color: '#eae4d3' }}>이어서</span>
                </button>

                <button
                  onClick={handleRestart}
                  className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
                >
                  <ImageWithFallback
                    src={restartImg}
                    alt="restart"
                    className="h-12 w-12 object-contain"
                  />
                  <span className="text-3xl" style={{ color: '#eae4d3' }}>처음부터</span>
                </button>

                <button
                  onClick={() => handleBackToLevels(true)}
                  className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
                >
                  <ImageWithFallback
                    src={pauseExitIcon}
                    alt="exit"
                    className="h-12 w-12 object-contain"
                  />
                  <span className="text-3xl" style={{ color: '#eae4d3' }}>나가기</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
    );
  }

  if (gameState === "complete") {
    return (
      <>
      {popups}
        {/* 게임 화면을 어둡게 배경으로 보여줌 */}
        <div className="fixed inset-0 bg-amber-50 flex flex-col" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="flex justify-between items-center p-4 mb-4 flex-shrink-0">
            <button className="bg-transparent hover:bg-transparent border-none p-2 cursor-pointer" disabled>
              <ImageWithFallback
                src={pauseIcon}
                alt="일시정지"
                className="h-10 w-10 object-contain"
              />
            </button>

            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-7 h-7 ${
                      i < hearts
                        ? "text-[#cd6c58]"
                        : "fill-gray-300 text-gray-300"
                    }`}
                    fill={i < hearts ? "#cd6c58" : undefined}
                  />
                ))}
              </div>
              
              <div className="bg-white/80 px-6 py-2 rounded-lg">
                <span className="text-2xl">점수: {score}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 pb-8 overflow-hidden">
            <div className="flex justify-center">
              <div className="relative w-80 h-80 bg-white rounded-lg shadow-lg overflow-hidden border-4 border-black">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="relative w-auto h-56">
                <ImageWithFallback
                  src={currentPaletteImg}
                  alt="팔레트"
                  className="w-auto h-56 object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 성 모 */}
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div 
            className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat animate-in zoom-in-95 duration-200"
            style={{ backgroundImage: `url(${pauseMenuBg})` }}
          >
            {showGoalAchieved ? (
              <>
                <h2 className="text-center mb-4 mt-4 text-4xl" style={{ color: '#eae4d3' }}>목표 달성!</h2>
                <div className="text-center mb-6 text-2xl" style={{ color: '#d4c5a0' }}>
                  일일 목표점수: {dailyTargetScore}점
                </div>
              </>
            ) : (
              <>
                <h2 className="text-center mb-2 mt-4 text-4xl" style={{ color: '#eae4d3' }}>
                  게임 종료!
                </h2>
                <div className="text-center mb-2 text-2xl" style={{ color: '#d4c5a0' }}>
                  일일 목표점수: {dailyTargetScore === null || dailyTargetScore === 0 ? '측정중...' : `${dailyTargetScore}점`}
                </div>
                <div className="text-center mb-6 text-2xl" style={{ color: '#eae4d3' }}>
                  일일 누적점수: {animatedAccumulatedScore}점
                </div>
              </>
            )}
            
            <div className="space-y-0">
              <button
                onClick={handleRestart}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={restartImg}
                  alt="restart"
                  className="h-12 w-12 object-contain"
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>처음부터</span>
              </button>

              <button
                onClick={() => handleBackToLevels(false)}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={pauseExitIcon}
                  alt="exit"
                  className="h-12 w-12 object-contain"
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>나가기</span>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
    {/* 이미지 preloading을 위한 숨겨진 img 태그들 */}
    <div style={{ position: 'absolute', left: '-9999px', visibility: 'hidden' }}>
      {/* 완성본 이미지들 */}
      {COLORING_IMAGES.map((img, idx) => (
        <img 
          key={`preload_coloring_${idx}`}
          src={img.src} 
          alt=""
          ref={(el) => {
            if (el) preloadedImagesRef.current[`coloring_${idx}`] = el;
          }}
        />
      ))}
      {/* 세그먼트 이미지들 */}
      {ALL_SEGMENT_URLS.map((segUrl, idx) => (
        <img 
          key={`preload_segment_${idx}`}
          src={segUrl} 
          alt=""
          ref={(el) => {
            if (el) preloadedSegmentsRef.current[`segment_all_${idx}`] = el;
          }}
        />
      ))}
    </div>
    
    {popups}
    
    {/* 목표 점수 달성 팝업 */}
    {showGoalAchieved && (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div 
          className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat animate-in zoom-in-95 duration-200"
          style={{ backgroundImage: `url(${pauseMenuBg})` }}
        >
          <h2 className="text-center mb-2 mt-4 text-4xl" style={{ color: '#eae4d3' }}>
            {score}점 달성!
          </h2>
          <div className="text-center mb-6 text-2xl" style={{ color: '#d4c5a0' }}>
            목표 점수 300점 달성
          </div>
          
          <div className="space-y-0">
            <button
              onClick={() => {
                setShowGoalAchieved(false);
                playClickSound();
                // 팝업 닫은 후 다음으로 진행 (이미 commitScore() 호출됨)
                setTimeout(() => {
                  setScorePopups([]);
                  setWrongPopups([]);
                  if (hearts === 0) {
                    setGameState("complete");
                    saveGameRecord("coloringGame", score, selectedLevel);
                  } else {
                    handleContinue();
                  }
                }, 100);
              }}
              className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
            >
              <ImageWithFallback
                src={resumeImg}
                alt="resume"
                className="h-12 w-12 object-contain"
              />
              <span className="text-3xl" style={{ color: '#eae4d3' }}>이어서 하기</span>
            </button>

            <button
              onClick={() => {
                setShowGoalAchieved(false);
                handleBackToLevels(false);
              }}
              className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
            >
              <ImageWithFallback
                src={pauseExitIcon}
                alt="exit"
                className="h-12 w-12 object-contain"
              />
              <span className="text-3xl" style={{ color: '#eae4d3' }}>나가기</span>
            </button>
          </div>
        </div>
      </div>
    )}
    
    <div className="fixed inset-0 bg-amber-50 pb-[env(safe-area-inset-bottom)] flex flex-col pt-[max(env(safe-area-inset-top),3rem)]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="flex justify-between items-center px-4 py-3 flex-shrink-0">
        <button
          onClick={togglePause}
          className="bg-transparent hover:bg-transparent border-none p-2 cursor-pointer"
          disabled={isPaused}
        >
          <ImageWithFallback
            src={isPaused ? resumeImg : pauseIcon}
            alt={isPaused ? "계속하기" : "일시정지"}
            className="h-10 w-10 object-contain"
          />
        </button>

        <div className="flex items-center gap-4">
          <div className="flex gap-1" id="hearts-display">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-7 h-7 ${
                  i < hearts
                    ? "text-[#cd6c58]"
                    : "fill-gray-300 text-gray-300"
                }`}
                fill={i < hearts ? "#cd6c58" : undefined}
              />
            ))}
          </div>
          
          <div className="bg-white/80 px-6 py-2 rounded-lg">
            <span className="text-2xl">점수: {score}</span>
          </div>
        </div>
      </div>

      {/* 일일 목표점수 달성 현황 */}
      <div className="text-center mb-2 flex-col justify-center flex-shrink-0">
        <div className="flex items-center justify-center gap-2">
          {dailyTargetScore !== null && dailyTargetScore > 0 && dailyAccumulatedScore >= dailyTargetScore ? (
            <div className="text-2xl" style={{ color: '#a7b7c4' }}>일일 목표점수 도달 완료!</div>
          ) : (
            <>
              <div className="text-gray-700 text-2xl">일일 목표점수</div>
              <div className="text-gray-700 text-2xl">
                {dailyTargetScore === null || dailyTargetScore === 0 
                  ? '측정중...' 
                  : `${previousAccumulatedScore + score}/${dailyTargetScore}점`}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8 pb-6 overflow-hidden">
        
        {/* 완성 시간 표시 (완성 버튼 누른 경우에만) */}
        {showCompletedTime && (
          <div className="mb-1 flex justify-center">
            <div className="flex items-center gap-2" id="completed-time-display">
              <ImageWithFallback
                src={timerIcon}
                alt="타이머"
                className="h-7 w-7 object-contain -translate-y-0.5"
              />
              <span className="text-lg">걸린 시간: {formatTimeText(elapsedTime)}</span>
            </div>
          </div>
        )}
        
        {/* 캔버스 */}
        <div className="flex justify-center">
          <div 
            className="relative w-72 h-72 bg-white rounded-lg shadow-lg overflow-hidden"
            style={{ 
              border: '2px solid #a7b7c4'
            }}
          >
            {/* 전체 완성본 outline (고정, 배경) */}
            <canvas
              ref={outlineCanvasRef}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ zIndex: 0 }}
            />
            
            {/* 그림 조각들 */}
            <div
              style={{
                width: '100%',
                height: '100%',
                cursor: 'none',
                touchAction: 'none',
                position: 'relative',
                zIndex: 1
              }}
              onMouseMove={handleCanvasMouseMove}
              onMouseEnter={handleCanvasMouseEnter}
              onMouseLeave={handleCanvasMouseLeave}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
                style={{ background: 'transparent', pointerEvents: 'auto' }}
                onClick={handleCanvasClick}
              />
            </div>
            {/* 커스텀 브러쉬 커서 */}
            <div
              ref={cursorRef}
              className="pointer-events-none absolute z-10"
              style={{
                left: 0,
                top: 0,
                transform: 'translate(-5%, -90%)',
                display: 'none',
                width: '80px',
                height: '80px',
                backgroundImage: `url(${brushSrc})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                willChange: 'transform'
              }}
            />
          </div>
        </div>

        {/* 팔레트 이미지와 버튼들 */}
        <div className="flex flex-col items-center gap-1">
          <div className="relative w-auto h-44">
            <ImageWithFallback
              src={currentPaletteImg}
              alt="팔레트"
              className="w-auto h-44 object-contain"
            />
            {/* 색상 선택 영역 - 투명한 클릭 영역 */}
            <div className="absolute inset-0">
              {/* 빨강 */}
              <div
                className="absolute w-8 h-8 rounded-full cursor-pointer"
                style={{ 
                  top: palettePositions[0].top, 
                  left: palettePositions[0].left, 
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: devMode ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
                  border: devMode ? '2px solid white' : 'none'
                }}
                onClick={() => !devMode && handleColorSelect(0)}
                onMouseDown={(e) => devMode && handlePaletteDragStart(e, 0)}
              />
              
              {/* 주황 (어려움만) */}
              {selectedLevel === 3 && (
                <div
                  className="absolute w-8 h-8 rounded-full cursor-pointer"
                  style={{ 
                    top: palettePositions[1].top, 
                    left: palettePositions[1].left, 
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: devMode ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
                    border: devMode ? '2px solid white' : 'none'
                  }}
                  onClick={() => !devMode && handleColorSelect(1)}
                  onMouseDown={(e) => devMode && handlePaletteDragStart(e, 1)}
                />
              )}
              
              {/* 노랑 */}
              <div
                className="absolute w-8 h-8 rounded-full cursor-pointer"
                style={{ 
                  top: palettePositions[2].top, 
                  left: palettePositions[2].left, 
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: devMode ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
                  border: devMode ? '2px solid white' : 'none'
                }}
                onClick={() => !devMode && handleColorSelect(2)}
                onMouseDown={(e) => devMode && handlePaletteDragStart(e, 2)}
              />
              
              {/* 초록 */}
              <div
                className="absolute w-8 h-8 rounded-full cursor-pointer"
                style={{ 
                  top: palettePositions[3].top, 
                  left: palettePositions[3].left, 
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: devMode ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
                  border: devMode ? '2px solid white' : 'none'
                }}
                onClick={() => !devMode && handleColorSelect(3)}
                onMouseDown={(e) => devMode && handlePaletteDragStart(e, 3)}
              />
              
              {/* 하늘 */}
              <div
                className="absolute w-8 h-8 rounded-full cursor-pointer"
                style={{ 
                  top: palettePositions[4].top, 
                  left: palettePositions[4].left, 
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: devMode ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
                  border: devMode ? '2px solid white' : 'none'
                }}
                onClick={() => !devMode && handleColorSelect(4)}
                onMouseDown={(e) => devMode && handlePaletteDragStart(e, 4)}
              />
              
              {/* 남색 (어려움만) */}
              {selectedLevel === 3 && (
                <div
                  className="absolute w-8 h-8 rounded-full cursor-pointer"
                  style={{ 
                    top: palettePositions[5].top, 
                    left: palettePositions[5].left, 
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: devMode ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
                    border: devMode ? '2px solid white' : 'none'
                  }}
                  onClick={() => !devMode && handleColorSelect(5)}
                  onMouseDown={(e) => devMode && handlePaletteDragStart(e, 5)}
                />
              )}
              
              {/* 보라 (보통/어려움만) */}
              {selectedLevel >= 2 && (
                <div
                  className="absolute w-8 h-8 rounded-full cursor-pointer"
                  style={{ 
                    top: palettePositions[6].top, 
                    left: palettePositions[6].left, 
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: devMode ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
                    border: devMode ? '2px solid white' : 'none'
                  }}
                  onClick={() => !devMode && handleColorSelect(6)}
                  onMouseDown={(e) => devMode && handlePaletteDragStart(e, 6)}
                />
              )}
              
              {/* 갈색 (보통/어려움만) */}
              {selectedLevel >= 2 && (
                <div
                  className="absolute w-8 h-8 rounded-full cursor-pointer"
                  style={{ 
                    top: palettePositions[7].top, 
                    left: palettePositions[7].left, 
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: devMode ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
                    border: devMode ? '2px solid white' : 'none'
                  }}
                  onClick={() => !devMode && handleColorSelect(7)}
                  onMouseDown={(e) => devMode && handlePaletteDragStart(e, 7)}
                />
              )}
            </div>
          </div>
          
          {/* 버튼들을 가로로 나란히 배치 */}
          <div className="flex gap-4 items-end">
            {/* 다시보기 버튼 */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleShowPreview}
                disabled={isPaused || previewUsedCount >= 1}
                className="relative w-40 h-16 flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                <ImageWithFallback
                  src={buttonImg}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain"
                />
                <span className="relative font-[OngleipRyudung] text-white z-10" style={{ fontSize: '1.75rem' }}>
                  다시보기
                </span>
              </button>
            </div>
            
            {/* 완성 버튼 - 모든 조각이 칠해졌을 때만 표시 */}
            {showCompleteButton && (
              <button
                onClick={handleComplete}
                disabled={isPaused}
                className="relative w-40 h-16 flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                <ImageWithFallback
                  src={buttonImg}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain"
                />
                <span className="relative font-[OngleipRyudung] text-white z-10" style={{ fontSize: '1.75rem' }}>
                  완성!
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {isPaused && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div 
            className="p-8 max-w-sm w-full mx-4 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${pauseMenuBg})` }}
          >
            <h2 className="text-center mb-6 mt-4 text-4xl" style={{ color: '#eae4d3' }}>일시정지</h2>
            
            <div className="space-y-0">
              <button
                onClick={togglePause}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={resumeImg}
                  alt="resume"
                  className="h-12 w-12 object-contain"
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>이어서</span>
              </button>
              
              <button
                onClick={handleRestart}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={restartImg}
                  alt="restart"
                  className="h-12 w-12 object-contain"
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>처음부터</span>
              </button>
              
              <button
                onClick={() => handleBackToLevels(true)}
                className="w-full bg-transparent hover:opacity-80 py-2 px-6 transition-opacity flex items-center justify-center gap-3"
              >
                <ImageWithFallback
                  src={pauseExitIcon}
                  alt="exit"
                  className="h-12 w-12 object-contain"
                />
                <span className="text-3xl" style={{ color: '#eae4d3' }}>나가기</span>
              </button>
            </div>
          </div>
        </div>
      )}

            {/* 미리보기 다시보기 모달 */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative bg-white/90 rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="text-center mb-4">
              <h3
                className="text-2xl mb-2"
                style={{ fontFamily: "OngleipRyudung" }}
              >
                미리보기
              </h3>
              <p
                className="text-xl"
                style={{ fontFamily: "OngleipRyudung" }}
              >
                {previewTimeLeft}초 남음
              </p>
            </div>

            {previewImage && previewOutlineImage && (
              <div className="mb-4 flex justify-center">
                {/* 두 이미지를 같은 위치에 완전히 겹쳐서 보여줌 */}
                <div className="relative w-80 h-80 bg-white rounded-lg overflow-hidden border border-gray-200">
                  {/* 색칠된 그림 */}
                  <ImageWithFallback
                    src={previewImage}
                    alt="Colored Preview"
                    className="absolute inset-0 w-full h-full object-contain rounded"
                  />
                  {/* 윤곽선 그림 (위에 겹침) */}
                  <ImageWithFallback
                    src={previewOutlineImage}
                    alt="Outline Preview"
                    className="absolute inset-0 w-full h-full object-contain rounded"
                    style={{ mixBlendMode: "multiply" }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleClosePreview}
              className="relative w-full h-12 flex items-center justify-center hover:scale-105 transition-transform"
            >
              <ImageWithFallback
                src={buttonImg}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
              />
              <span
                className="relative font-[OngleipRyudung] text-white z-10"
                style={{ fontSize: "1.5rem" }}
              >
                닫기
              </span>
            </button>
          </div>
        </div>
      )}


      {/* 미완성 알림 모달 */}
      {showIncompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative bg-white/90 rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center mb-4">
              <p className="text-2xl mb-2" style={{ fontFamily: 'OngleipRyudung' }}>
                {incompleteMessage}
              </p>
              <p className="text-xl" style={{ fontFamily: 'OngleipRyudung', color: '#ef4444' }}>
                하트 -1
              </p>
            </div>
            
            <button
              onClick={() => setShowIncompleteModal(false)}
              className="relative w-full h-12 flex items-center justify-center hover:scale-105 transition-transform"
            >
              <ImageWithFallback
                src={buttonImg}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
              />
              <span className="relative font-[OngleipRyudung] text-white z-10" style={{ fontSize: '1.5rem' }}>
                확인
              </span>
            </button>
          </div>
        </div>
      )}
      
      {/* 에너지 없음 알림 */}
      {showNoEnergyAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
            <p className="text-2xl mb-6" style={{ fontFamily: 'OngleipRyudung', color: '#675c4e' }}>
              에너지가<br />부족합니다!
            </p>
            <button
              onClick={() => {
                playClickSound();
                setShowNoEnergyAlert(false);
              }}
              className="bg-[#a7b7c4] text-white px-8 py-3 rounded-lg text-xl hover:bg-[#97a7b4] transition-colors"
              style={{ fontFamily: 'OngleipRyudung' }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      <canvas ref={coloredCanvasRef} className="hidden" />
    </div>
    </>
  );
}