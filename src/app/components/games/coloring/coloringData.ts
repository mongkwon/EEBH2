import { ColoringImage, SegmentPosition } from "./coloringTypes";
import houseColored from "figma:asset/928b4a026eb2f005a0bebb97358d251cf829cb2b.png";
import balloonColored from "figma:asset/9cb43a47ca96bce0f8ba1dc1da7d9e4bae863ee8.png";
import childColored from "figma:asset/eafbb0b7d4f1bf7e7dde00aff70442bb8145d8c4.png";
import livingroomColored from "figma:asset/2c0603f511b5704d10c1ae5ad29e51a29fedc0e0.png";
import trainColored from "figma:asset/1719ffbf3c1590f6c0b15ca38e491bae7d28b7dd.png";

// 풍선 조각 이미지들
import balloonBox from "figma:asset/7f424b1d87396738a4b3a76092ff546300387377.png";
import balloonRibbon from "figma:asset/16c8c11b26f08258613cff80debf71c8e771874a.png";
import balloonDot from "figma:asset/69ab07e6cf6f11e8189591e54668a417ea346ece.png";
import balloonMini from "figma:asset/ba62c75d0f848e52875f3a5abcdae955328665a9.png";
import balloonHeart from "figma:asset/48813c3413919167452c6df1ab41a8805a259c55.png";
import balloonFlower from "figma:asset/bae0bc15e03e7c42d5ef40d37f8af1297f6193f4.png";
import balloonStriped from "figma:asset/451980cb853cf607b876f421ca3a6a638df5f4db.png";
import balloonStar from "figma:asset/9fcbbf13d04262fd9563251965113da63537a914.png";

// Child 조각 이미지들
import imgChildHairbandright from "figma:asset/2c7cfc38c096063f468e6aeb3c5ececd29d4a44b.png";
import imgChildHairbandleft from "figma:asset/dea4a2a09ba4210bfd804b7ee0014dd1016b2629.png";
import imgChildHead from "figma:asset/1929a85eb6aa09d7181db5bdeb6787a8f1c3dd74.png";
import imgChildHairleft from "figma:asset/e7f7a5d0ec8d79bb053aa62aeeaa1f51db9d9d1b.png";
import imgChildHairright from "figma:asset/3dc463a450e5e04e1029322b584aa2d4ea34ecc0.png";
import imgChildNeck from "figma:asset/20dbe14ddd2b07b929790e36043916f74b674d4e.png";
import imgChildClothes from "figma:asset/879da196acc9a03a57b19848bd725a2e26cad2d2.png";
import imgChildArmright from "figma:asset/6cd9122907ba4a8163593dadba9d6091d96489f3.png";
import imgChildArmleft from "figma:asset/2d017ccf0afd3f56e6712d3b497b1d6e90117a94.png";
import imgChildFootright from "figma:asset/fcbf2e76d4b18c97cf791eadacf842cbaf2ab3ff.png";
import imgChildFootleft from "figma:asset/49a1f2ef94fe439811ef705555a9a68d91d64408.png";
import imgChildDog from "figma:asset/21703bca6872ac2b21c11c671a58b2b88f71f25f.png";
import imgChildDogbackground from "figma:asset/e87d5c866011375566628e4b9b8dcef43a6e923b.png";
import imgChildCat from "figma:asset/a7d18ee50bb18e02bbdfcaaa78c963a90195dd60.png";
import imgChildCatbackground from "figma:asset/e5ab40e97670b8b91b7e2ecf78f75eb4201a4c41.png";
import imgChildPen from "figma:asset/4c5a1d79f9b43e230ad4dd43cbbc31ac7199fca0.png";
import imgChildMemo from "figma:asset/de9278b05cf1c24687fd0a8515c1c69faf6f9763.png";
import imgChildChair from "figma:asset/bd3b2af7e4cb36539badc8ef40a3d0d06f33b69e.png";
import imgChildPaper from "figma:asset/4ed123d8075d720b482013dca84d04fbdac94c9d.png";
import imgChildColorpencil from "figma:asset/bf227584e846769adc0b2a8f138ff2e9242d19c7.png";

// Train 조각 이미지들
import imgTrainWheel3 from "figma:asset/5c64ef244a6254d057760d444e81f8e654b4a2a8.png";
import imgTrainWheel4 from "figma:asset/fcf820d6d82cae2059bf8b93da6e6dc2c3a4fb3c.png";
import imgTrainWheel5 from "figma:asset/63474d595c54e56a0ccec8d9ea92924b231de895.png";
import imgTrainWheel6 from "figma:asset/dedc8c0c36cac7d06f695c1be4005c3bd21adcdb.png";
import imgTrainWheel7 from "figma:asset/934511f54569016cf13913f4fa5e606ceef1aca5.png";
import imgTrainWheel8 from "figma:asset/b32d621dc80bbebc85da6134b662840098cfd700.png";
import imgTrainWheel9 from "figma:asset/ca7bcce352cedbe7fc26f2938f51691321709022.png";
import imgTrainWheel10 from "figma:asset/8c054d0f707b86b1bdf66fbbd2d59a0a01704823.png";
import imgTrainWheel11 from "figma:asset/bc30a6ff1a631db03bbb8bdc8961ac3ecb8ce70a.png";
import imgTrainWheel12 from "figma:asset/65477f98eb4e1529cd86b80dc1029871a5c232ba.png";
import imgTrainWheel2 from "figma:asset/da88f5efdb399861ea6466e97b127deb24462807.png";
import imgTrainWheel1 from "figma:asset/fe828f3899add3338e00f246b8a10b7ff854cf49.png";
import imgTrainTrail from "figma:asset/81aca47937a8eaefcce9db453ed6cf4e4a846ee5.png";
import imgTrainTrain1 from "figma:asset/1fec7fa4b532fe2109e1f96ab1d13c9361c16371.png";
import imgTrainTrain2 from "figma:asset/d0cbdbfefbe25689fa6309f8e48508a8c8b294bc.png";
import imgTrianTrain3 from "figma:asset/aa69eab32267d14eb52e9d9cb3274a136b4292d7.png";
import imgTrainTrain4 from "figma:asset/c36aafb90ffc61d4b77849d28538b2cad4b3ab41.png";
import imgTarinSmoke1 from "figma:asset/9a45d32c34d00f173e23248c3bc4c0739a52394e.png";
import imgTrainCloud11 from "figma:asset/41ee49ad6ada7eacdfb670efa94be47b9882dbfa.png";
import imgTrainCloud21 from "figma:asset/63c853aa6c1510f058e4836028cd5757c909aab1.png";
import imgTrainSun1 from "figma:asset/e5b34dca410ee402ca84b278e23d15fe74d94911.png";

// House 조각 이미지들
import imgHouseTree2 from "figma:asset/b51554801822eb88586a7709f1ac91acb29ad20b.png";
import imgHouseTree1 from "figma:asset/bcaf24b6797463ff0bc4599feb479667d35a67b6.png";
import imgHouseWindow2 from "figma:asset/8006ae42a2e8f6695a590c5d2cc5cfbfab775cc1.png";
import imgHouseWindow from "figma:asset/6feb0885583e2295e5f49b082a4b0cb9a0ae3724.png";
import imgHouseDoor from "figma:asset/c202d6328c4ee54fb42e2e0362b640bd11c4dcba.png";
import imgHouseRoof from "figma:asset/3444b4ae94bb0b16876f0c8148eb823df5a114a0.png";
import imgHouseWall from "figma:asset/15ad184fe7bc527b9ec5853e589ec8f39d68fd29.png";
import imgHouseCloud11 from "figma:asset/d0fd4e6c8b654344069420135a3647f49e0d2725.png";
import imgHouseCloud21 from "figma:asset/64e4f638d939f4eef3c26bac3e97cd127ba02f61.png";
import imgHouseFence11 from "figma:asset/7e5832d06eada47349ddfe5bdb445af9dceaa9ff.png";
import imgHouseFence21 from "figma:asset/c75ecb0b638ed85edf219a9a5ab61e9e1887c475.png";
import imgHouseFlower11 from "figma:asset/8da1850f589bee0b507bba2c04a508b251c99394.png";
import imgHouseFlower21 from "figma:asset/69f4bc55acd71f6b67c3d6bc8910c3c04e93e79a.png";
import imgHouseSun1 from "figma:asset/8b67f8ddf1887c1cde715a9cadbf9f7e007090dc.png";

// Livingroom 조각 이미지들
import imgLivingroomCouch1 from "figma:asset/f2bdbfb092775b850d0fb73fae7e3a2147adbcc6.png";
import imgLivingroomWindow1 from "figma:asset/80d8538e6c0db39f70b46bfe526b4374aaf45da9.png";
import imgLivingroomCurtain1 from "figma:asset/c29ffd6587ba647dc715d2c02fc5b04c3e8764f4.png";
import imgLivingroomDog1 from "figma:asset/df46290ed252483107801fbf61d6a73ef6b61443.png";
import imgLivingroomBooks1 from "figma:asset/a064d58f9b766f4529485bbb2489121f70c742ac.png";
import imgLivingroomCar1 from "figma:asset/0e38bd617ab38adbe318f311336f1c724c4283e6.png";
import imgLivingroomCarpet1 from "figma:asset/1d31e59441f801e4c087b6d552ba4797d6ee7743.png";
import imgLivingroomImage1 from "figma:asset/c5cae97e33e775c3ac068463e7647c1b032b6e2f.png";
import imgLivingroomPlant1 from "figma:asset/81bde41d5a948e7adbbe1254bee50261412edb7f.png";
import imgLivingroomPot1 from "figma:asset/554603a7250c19b87a3aab7996ca7528e6284d55.png";
import imgLivingroomShelf11 from "figma:asset/8a6b5d6efbe4aa33668543a586548dbc70d55856.png";
import imgLivingroomShelf21 from "figma:asset/1308607c75a49bdb47f9c0be4efadcad08c10af5.png";

// 색칠 그림 목록
export const COLORING_IMAGES: ColoringImage[] = [
  {
    name: "집",
    src: houseColored,
    colors: [
      { name: "보라색", hex: "#B994D1" },
      { name: "하늘색", hex: "#A8C5D1" },
      { name: "노란색", hex: "#E8D465" },
      { name: "갈색", hex: "#8B6F47" },
      { name: "빨간색", hex: "#E17B7B" },
      { name: "주황색", hex: "#E89C5C" },
      { name: "연두색", hex: "#7CB369" },
      { name: "남색", hex: "#2C3E7C" },
    ],
  },
  {
    name: "풍선",
    src: balloonColored,
    colors: [
      { name: "보라색", hex: "#B89FC9" },
      { name: "하늘색", hex: "#A0B5C1" },
      { name: "노란색", hex: "#E8D465" },
      { name: "갈색", hex: "#8B6F47" },
      { name: "분홍색", hex: "#E89A8B" },
      { name: "주황색", hex: "#E89C5C" },
      { name: "연두색", hex: "#5C8D5A" },
      { name: "남색", hex: "#415468" },
    ],
  },
  {
    name: "아이",
    src: childColored,
    colors: [
      { name: "보라색", hex: "#B994D1" },
      { name: "하늘색", hex: "#A8C5D1" },
      { name: "노란색", hex: "#E8D465" },
      { name: "갈색", hex: "#8B6F47" },
      { name: "빨간색", hex: "#E17B7B" },
      { name: "주황색", hex: "#E89C5C" },
      { name: "연두색", hex: "#7CB369" },
      { name: "남색", hex: "#2C3E7C" },
    ],
  },
  {
    name: "거실",
    src: livingroomColored,
    colors: [
      { name: "보라색", hex: "#B994D1" },
      { name: "하늘색", hex: "#A8C5D1" },
      { name: "노란색", hex: "#E8D465" },
      { name: "갈색", hex: "#8B6F47" },
      { name: "빨간색", hex: "#E17B7B" },
      { name: "주황색", hex: "#E89C5C" },
      { name: "연두색", hex: "#7CB369" },
      { name: "남색", hex: "#2C3E7C" },
    ],
  },
  {
    name: "기차",
    src: trainColored,
    colors: [
      { name: "보라색", hex: "#B89FC9" },
      { name: "하늘색", hex: "#A0B5C1" },
      { name: "노란색", hex: "#E8D465" },
      { name: "갈색", hex: "#8B6F47" },
      { name: "분홍색", hex: "#E89A8B" },
      { name: "주황색", hex: "#E89C5C" },
      { name: "초록색", hex: "#5C8D5A" },
      { name: "남색", hex: "#415468" },
    ],
  },
];

// 풍선 조각 이미지 URL들
export const BALLOON_SEGMENT_URLS = [
  balloonBox,
  balloonRibbon,
  balloonDot,
  balloonMini,
  balloonHeart,
  balloonFlower,
  balloonStriped,
  balloonStar,
];

// 풍선 조각 이름들
export const BALLOON_SEGMENT_NAMES = [
  "상자",
  "리본",
  "점무늬",
  "미니풍선",
  "하트",
  "꽃",
  "줄무늬",
  "별",
];

// 풍선 조각 위치
export const BALLOON_SEGMENT_POSITIONS: SegmentPosition[] = [
  { x: 1419, y: 2589 },
  { x: 1422, y: 2591 },
  { x: 762, y: 406 },
  { x: 2465, y: 832 },
  { x: 1655, y: 189 },
  { x: 2140, y: 1244 },
  { x: 1488, y: 869 },
  { x: 603, y: 1284 },
];

// 집 조각 이미지 URL들
export const HOUSE_SEGMENT_URLS = [
  imgHouseTree2,
  imgHouseTree1,
  imgHouseWindow2,
  imgHouseWindow,
  imgHouseDoor,
  imgHouseRoof,
  imgHouseWall,
  imgHouseCloud11,
  imgHouseCloud21,
  imgHouseFence11,
  imgHouseFence21,
  imgHouseFlower11,
  imgHouseFlower21,
  imgHouseSun1,
];

// 집 조각 이름들
export const HOUSE_SEGMENT_NAMES = [
  "나무2",
  "나무1",
  "창문2",
  "창문1",
  "문",
  "지붕",
  "벽",
  "구름1",
  "구름2",
  "울타리1",
  "울타리2",
  "꽃1",
  "꽃2",
  "태양",
];

// 집 조각 위치
export const HOUSE_SEGMENT_POSITIONS: SegmentPosition[] = [
  { x: 3147, y: 2003 },
  { x: 2893, y: 1390 },
  { x: 2183, y: 2572 },
  { x: 2182, y: 2159 },
  { x: 1262, y: 2173 },
  { x: 910, y: 1283 },
  { x: 973, y: 1406 },
  { x: 206, y: 481 },
  { x: 1646, y: 244 },
  { x: 496, y: 2851 },
  { x: 2314, y: 2837 },
  { x: 529, y: 2348 },
  { x: 181, y: 2347 },
  { x: 2855, y: 256 },
];

// 아이 조각 이미지 URL들
export const CHILD_SEGMENT_URLS = [
  imgChildHairbandright,
  imgChildHairbandleft,
  imgChildHead,
  imgChildHairleft,
  imgChildHairright,
  imgChildNeck,
  imgChildClothes,
  imgChildArmright,
  imgChildArmleft,
  imgChildFootright,
  imgChildFootleft,
  imgChildDog,
  imgChildDogbackground,
  imgChildCat,
  imgChildCatbackground,
  imgChildPen,
  imgChildMemo,
  imgChildChair,
  imgChildPaper,
  imgChildColorpencil,
];

// 아이 조각 이름들
export const CHILD_SEGMENT_NAMES = [
  "머리띠(오른쪽)",
  "머리띠(왼쪽)",
  "얼굴",
  "머리카락(왼쪽)",
  "머리카락(오른쪽)",
  "목",
  "옷",
  "팔(오른쪽)",
  "팔(왼쪽)",
  "발(오른쪽)",
  "발(왼쪽)",
  "강아지",
  "강아지배경",
  "고양이",
  "고양이배경",
  "펜",
  "메모",
  "의자",
  "종이",
  "색연필",
];

// 아이 조각 위치
export const CHILD_SEGMENT_POSITIONS: SegmentPosition[] = [
  { x: 242, y: 1722 },
  { x: 251, y: 1724 },
  { x: 439, y: 1745 },
  { x: 203, y: 1999 },
  { x: 1426, y: 2038 },
  { x: 866, y: 2488 },
  { x: 410, y: 2561 },
  { x: 1224, y: 2533 },
  { x: 379, y: 2480 },
  { x: 1431, y: 2923 },
  { x: 219, y: 2922 },
  { x: 433, y: 535 },
  { x: 434, y: 524 },
  { x: 1164, y: 843 },
  { x: 1165, y: 832 },
  { x: 2561, y: 2626 },
  { x: 2735, y: 3309 },
  { x: 2305, y: 782 },
  { x: 3156, y: 2809 },
  { x: 1886, y: 3194 },
];

// 거실 조각 이미지 URL들
export const LIVINGROOM_SEGMENT_URLS = [
  imgLivingroomCouch1,
  imgLivingroomWindow1,
  imgLivingroomCurtain1,
  imgLivingroomDog1,
  imgLivingroomBooks1,
  imgLivingroomCar1,
  imgLivingroomCarpet1,
  imgLivingroomImage1,
  imgLivingroomPlant1,
  imgLivingroomPot1,
  imgLivingroomShelf11,
  imgLivingroomShelf21,
];

// 거실 조각 이름들
export const LIVINGROOM_SEGMENT_NAMES = [
  "소파",
  "창문",
  "커튼",
  "강아지",
  "책",
  "자동차",
  "카펫",
  "액자",
  "식물",
  "화분",
  "선반1",
  "선반2",
];

// 거실 조각 위치
export const LIVINGROOM_SEGMENT_POSITIONS: SegmentPosition[] = [
  { x: 879.1, y: 1597.6 },  // 소파
  { x: 2003.6, y: 142.3 },   // 창문
  { x: 2006.6, y: 140.6 },   // 커튼
  { x: 1443.8, y: 1945.6 },  // 강아지
  { x: 845.6, y: 1045.7 },   // 책
  { x: 695.7, y: 612.3 },    // 자동차
  { x: 708.2, y: 2848.5 },  // 카펫
  { x: 1152.2, y: 447.4 },   // 액자
  { x: 3012.6, y: 1949.6 },  // 식물
  { x: 3101.0, y: 2793.3 },  // 화분
  { x: 661.5, y: 908.0 },    // 선반1
  { x: 720.9, y: 1428.9 },   // 선반2
];

// 기차 조각 이미지 URL들
export const TRAIN_SEGMENT_URLS = [
  imgTrainWheel3,
  imgTrainWheel4,
  imgTrainWheel5,
  imgTrainWheel6,
  imgTrainWheel7,
  imgTrainWheel8,
  imgTrainWheel9,
  imgTrainWheel10,
  imgTrainWheel11,
  imgTrainWheel12,
  imgTrainWheel2,
  imgTrainWheel1,
  imgTrainTrail,
  imgTrainTrain1,
  imgTrainTrain2,
  imgTrianTrain3,
  imgTrainTrain4,
  imgTarinSmoke1,
  imgTrainCloud11,
  imgTrainCloud21,
  imgTrainSun1,
];

// 기차 조각 이름들
export const TRAIN_SEGMENT_NAMES = [
  "바퀴3",
  "바퀴4",
  "바퀴5",
  "바퀴6",
  "바퀴7",
  "바퀴8",
  "바퀴9",
  "바퀴10",
  "바퀴11",
  "바퀴12",
  "바퀴2",
  "바퀴1",
  "레일",
  "객차1",
  "객차2",
  "객차3",
  "객차4",
  "연기",
  "구름1",
  "구름2",
  "태양",
];

// 모든 세그먼트 이미지 URL 모음 (preloading용)
export const ALL_SEGMENT_URLS = [
  ...BALLOON_SEGMENT_URLS,
  ...HOUSE_SEGMENT_URLS,
  ...CHILD_SEGMENT_URLS,
  ...LIVINGROOM_SEGMENT_URLS,
  ...TRAIN_SEGMENT_URLS,
];

// 기차 조각 위치
export const TRAIN_SEGMENT_POSITIONS: SegmentPosition[] = [
  { x: 696, y: 2817 },
  { x: 1137, y: 2728 },
  { x: 1387, y: 2727 },
  { x: 1648, y: 2739 },
  { x: 2128, y: 2715 },
  { x: 2388, y: 2716 },
  { x: 2651, y: 2728 },
  { x: 3162, y: 2716 },
  { x: 3425, y: 2702 },
  { x: 3683, y: 2702 },
  { x: 430, y: 2830 },
  { x: 157, y: 2844 },
  { x: -1, y: 2480 },
  { x: 41, y: 1749 },
  { x: 1088, y: 2039 },
  { x: 2003, y: 2071 },
  { x: 3032, y: 2067 },
  { x: 663, y: 1004 },
  { x: 76, y: 61 },
  { x: 2798, y: 807 },
  { x: 1493, y: 298 },
];