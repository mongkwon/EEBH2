import { useRef, MutableRefObject } from "react";
import { 
  COLORING_IMAGES, 
  BALLOON_SEGMENT_URLS, 
  BALLOON_SEGMENT_POSITIONS,
  HOUSE_SEGMENT_URLS,
  HOUSE_SEGMENT_POSITIONS,
  CHILD_SEGMENT_URLS,
  CHILD_SEGMENT_POSITIONS,
  LIVINGROOM_SEGMENT_URLS,
  LIVINGROOM_SEGMENT_POSITIONS,
  TRAIN_SEGMENT_URLS,
  TRAIN_SEGMENT_POSITIONS,
} from "./coloringData";
import { SegmentPosition } from "./coloringTypes";

export function useColoringCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coloredCanvasRef = useRef<HTMLCanvasElement>(null);
  const outlineImgRef = useRef<HTMLImageElement | null>(null);
  const coloredImgRef = useRef<HTMLImageElement | null>(null);
  const imageScaleRef = useRef(1);
  const imageSizeRef = useRef({ width: 0, height: 0 });
  const segmentImagesRef = useRef<HTMLImageElement[]>([]);
  const segmentMasksRef = useRef<ImageData[]>([]);
  const segmentPositionsRef = useRef<SegmentPosition[]>([]);
  const fullOutlineImageRef = useRef<HTMLImageElement | null>(null); // 전체 outline 이미지 저장
  const segmentOutlinesRef = useRef<HTMLImageElement[]>([]); // 각 조각의 outline 저장
  const segmentColorsRef = useRef<(string | null)[]>([]); // 각 조각의 색상 저장
  const currentImageIndexRef = useRef(0); // 현재 이미지 인덱스
  const currentLevelRef = useRef(1); // 현재 레벨

  const getSegmentData = (imageName: string) => {
    switch (imageName) {
      case "풍선":
        return { urls: BALLOON_SEGMENT_URLS, positions: BALLOON_SEGMENT_POSITIONS };
      case "집":
        return { urls: HOUSE_SEGMENT_URLS, positions: HOUSE_SEGMENT_POSITIONS };
      case "아이":
        return { urls: CHILD_SEGMENT_URLS, positions: CHILD_SEGMENT_POSITIONS };
      case "거실":
        return { urls: LIVINGROOM_SEGMENT_URLS, positions: LIVINGROOM_SEGMENT_POSITIONS };
      case "기차":
        return { urls: TRAIN_SEGMENT_URLS, positions: TRAIN_SEGMENT_POSITIONS };
      default:
        return null;
    }
  };

  const loadImages = async (imageIndex: number) => {
    const canvas = canvasRef.current;
    const coloredCanvas = coloredCanvasRef.current;
    if (!canvas || !coloredCanvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const coloredCtx = coloredCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !coloredCtx) return;

    // 캔버스 초기화 - 이전 그림 완전히 지우기
    segmentImagesRef.current = [];
    segmentMasksRef.current = [];
    segmentPositionsRef.current = [];
    segmentColorsRef.current = [];
    segmentOutlinesRef.current = [];

    const currentImage = COLORING_IMAGES[imageIndex];
    currentImageIndexRef.current = imageIndex;

    try {
      // 이미지를 blob으로 변환하는 헬퍼 함수
      const loadImageAsBlob = async (src: string): Promise<HTMLImageElement> => {
        try {
          const response = await fetch(src);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = blobUrl;
          });
        } catch (error) {
          // fetch 실패 시 일반 로드 시도
          console.warn('Blob 로드 실패, 일반 로드 시도:', error);
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        }
      };

      const outlineImg = await loadImageAsBlob(currentImage.src);
      const coloredImg = await loadImageAsBlob(currentImage.src);

      outlineImgRef.current = outlineImg;
      coloredImgRef.current = coloredImg;

      // 이미지 원본 크기를 사용하여 캔버스 크기 설정
      const canvasWidth = outlineImg.width;
      const canvasHeight = outlineImg.height;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      coloredCanvas.width = canvasWidth;
      coloredCanvas.height = canvasHeight;

      const imageSize = { width: canvasWidth, height: canvasHeight };
      imageSizeRef.current = imageSize;

      const scaleX = canvasWidth / outlineImg.width;
      const scaleY = canvasHeight / outlineImg.height;
      imageScaleRef.current = Math.min(scaleX, scaleY);

      // 모든 그림에 대해 조각 이미지 로드
      const segmentData = getSegmentData(currentImage.name);
      if (segmentData) {
        const { urls: segmentUrls, positions } = segmentData;

        const loadedImages: HTMLImageElement[] = [];
        const loadedMasks: ImageData[] = [];
        const loadedOutlines: HTMLImageElement[] = [];

        for (let i = 0; i < segmentUrls.length; i++) {
          const img = await loadImageAsBlob(segmentUrls[i]);
          
          // 원본 조각 이미지를 먼저 저장 (마스크 용도)
          loadedImages.push(img);
          
          const extractCanvas = document.createElement("canvas");
          extractCanvas.width = img.width;
          extractCanvas.height = img.height;
          const extractCtx = extractCanvas.getContext("2d", { willReadFrequently: true });

          if (extractCtx) {
            try {
              extractCtx.drawImage(img, 0, 0);
              
              // 마스크 데이터 생성
              const maskData = extractCtx.getImageData(0, 0, img.width, img.height);
              loadedMasks.push(maskData);
              
              // outline만 추출 (검은색 선만 남기고 나머지는 투명하게)
              const outlineData = extractCtx.getImageData(0, 0, img.width, img.height);
              const pixels = outlineData.data;
              
              for (let j = 0; j < pixels.length; j += 4) {
                const r = pixels[j];
                const g = pixels[j + 1];
                const b = pixels[j + 2];
                const a = pixels[j + 3];
                
                if (a > 0) {
                  // 어두운 색상(outline)은 검은색으로, 나머지는 투명으로
                  if (r < 80 && g < 80 && b < 80) {
                    // 검은색 outline 유지
                    pixels[j] = 0;     // R - 검은색
                    pixels[j + 1] = 0; // G - 검은색
                    pixels[j + 2] = 0; // B - 검은색
                    // alpha는 유지
                  } else {
                    // 색칠 영역은 투명하게
                    pixels[j + 3] = 0;
                  }
                }
              }
              
              extractCtx.putImageData(outlineData, 0, 0);
              
              const outlineSegmentImg = await new Promise<HTMLImageElement>((resolve) => {
                const outlineImg = new Image();
                outlineImg.onload = () => {
                  loadedOutlines.push(outlineImg);
                  resolve(outlineImg);
                };
                outlineImg.src = extractCanvas.toDataURL();
              });
            } catch (error) {
              console.error(`조각 ${i + 1} outline 추출 실패:`, error);
            }
          }
        }

        segmentImagesRef.current = loadedImages;
        segmentMasksRef.current = loadedMasks;
        segmentPositionsRef.current = positions;
        segmentOutlinesRef.current = loadedOutlines;
      }
    } catch (error) {
      console.error("이미지 로드 실패:", error);
    }
  };

  const initializeCanvas = (img: HTMLImageElement, imageIndex: number, outlineCanvas?: HTMLCanvasElement | null, level?: number) => {
    const canvas = canvasRef.current;
    const coloredCanvas = coloredCanvasRef.current;
    if (!canvas || !coloredCanvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const coloredCtx = coloredCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !coloredCtx) return;

    const imageSize = imageSizeRef.current;
    
    // 현재 이미지 인덱스 및 레벨 저장
    currentImageIndexRef.current = imageIndex;
    if (level !== undefined) {
      currentLevelRef.current = level;
    }
    
    // 기본 캔버스 초기화
    ctx.clearRect(0, 0, imageSize.width, imageSize.height);
    
    // 색칠 캔버스도 완전히 초기화 (이전 그림 제거)
    coloredCtx.clearRect(0, 0, imageSize.width, imageSize.height);

    // 1단계: 전체 완성본 이미지에서 outline만 추출
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
    
    if (tempCtx) {
      tempCtx.drawImage(img, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
      const pixels = imageData.data;
      
      // 색칠된 부분은 투명으로, 검은색 outline은 유지
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        
        if (a > 0) {
          // 어두운 색상(outline)은 검은색으로, 나머지는 투명으로
          if (r < 80 && g < 80 && b < 80) {
            // 검은색 outline 유지
            pixels[i] = 0;     // R - 검은색
            pixels[i + 1] = 0; // G - 검은색
            pixels[i + 2] = 0; // B - 검은색
            // alpha는 유지
          } else {
            // 색칠 영역은 투명하게
            pixels[i + 3] = 0;
          }
        }
      }
      
      tempCtx.putImageData(imageData, 0, 0);
      
      // outline 캔버스가 제공되면 그곳에 그리기
      if (outlineCanvas) {
        outlineCanvas.width = imageSize.width;
        outlineCanvas.height = imageSize.height;
        const outlineCtx = outlineCanvas.getContext("2d");
        if (outlineCtx) {
          // 흰색 배경
          outlineCtx.fillStyle = "#FFFFFF";
          outlineCtx.fillRect(0, 0, imageSize.width, imageSize.height);
          // outline 그리기
          outlineCtx.drawImage(tempCanvas, 0, 0);
        }
      }

      // 전체 outline 이미지 저장
      const fullOutlineImage = new Image();
      fullOutlineImage.src = tempCanvas.toDataURL();
      fullOutlineImage.onload = () => {
        fullOutlineImageRef.current = fullOutlineImage;
      };
    }

    const currentImage = COLORING_IMAGES[imageIndex];
    const segmentData = getSegmentData(currentImage.name);

    // 2단계: 조각 이미지들을 조각 캔버스에 그리기
    if (segmentData) {
      const segmentOutlines = segmentOutlinesRef.current;

      if (segmentOutlines.length === segmentData.urls.length) {
        const positions = segmentData.positions;

        segmentOutlines.forEach((outlineImg, index) => {
          const pos = positions[index];
          ctx.drawImage(outlineImg, pos.x, pos.y);
        });
      }
    }
  };

  const fillSegment = (x: number, y: number, color: string, offsets: { x: number; y: number }[]): boolean => {
    const canvas = canvasRef.current;
    const coloredCanvas = coloredCanvasRef.current;
    if (!canvas || !coloredCanvas) return false;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const coloredCtx = coloredCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !coloredCtx) return false;

    const segmentImages = segmentImagesRef.current;
    const segmentMasks = segmentMasksRef.current;
    const segmentPositions = segmentPositionsRef.current;

    if (segmentImages.length === 0 || segmentMasks.length === 0) {
      return false;
    }

    // 집 이미지의 레벨별 그룹 설정
    const isHouseImage = COLORING_IMAGES[currentImageIndexRef.current]?.name === "집";
    const currentLevel = currentLevelRef.current;
    let houseGroups: number[][] = [];
    
    if (isHouseImage) {
      if (currentLevel === 1) {
        // 1레벨: 4개 영역
        houseGroups = [
          [2, 3, 4, 5, 6], // 집
          [7, 8, 13], // 구름+해
          [9, 10, 11, 12], // 꽃+울타리
          [0, 1], // 나무
        ];
      } else if (currentLevel === 2) {
        // 2레벨: 6개 영역
        houseGroups = [
          [7, 8], // 구름
          [11, 12], // 꽃
          [9, 10], // 울타리
          [2, 3, 4, 5, 6], // 집
          [13], // 태양
          [0, 1], // 나무
        ];
      } else {
        // 3레벨: 8개 영역
        houseGroups = [
          [7, 8], // 구름
          [13], // 태양
          [11], // 꽃1
          [12], // 꽃2
          [9, 10], // 울타리
          [5], // 지붕
          [2, 3, 4, 6], // 집 나머지
          [0, 1], // 나무
        ];
      }
    }

    // 아이 이미지의 레벨별 그룹 설정
    const isChildImage = COLORING_IMAGES[currentImageIndexRef.current]?.name === "아이";
    let childGroups: number[][] = [];
    
    if (isChildImage) {
      if (currentLevel === 1) {
        // 1레벨: 4개 영역
        childGroups = [
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // 아이
          [11, 12, 13, 14], // 그림
          [17], // 의자
          [15, 16, 18, 19], // 물건들
        ];
      } else if (currentLevel === 2) {
        // 2레벨: 6개 영역
        childGroups = [
          [0, 1, 2, 3, 4], // 아이 머리
          [5, 6, 7, 8, 9, 10], // 아이 몸통
          [17], // 의자
          [11, 12], // 강아지 그림
          [13, 14], // 고양이 그림
          [15, 16, 18, 19], // 물건들
        ];
      } else {
        // 3레벨: 8개 영역
        childGroups = [
          [0, 1, 2, 3, 4], // 아이 머리
          [5, 6], // 아이 옷
          [7, 8, 9, 10], // 아이 팔다리
          [17], // 의자
          [11, 12], // 강아지 그림
          [13, 14], // 고양이 그림
          [15, 16], // 물건1
          [18, 19], // 물건2
        ];
      }
    }

    // 거실 이미지의 레벨별 그룹 설정
    const isLivingroomImage = COLORING_IMAGES[currentImageIndexRef.current]?.name === "거실";
    let livingroomGroups: number[][] = [];
    
    if (isLivingroomImage) {
      if (currentLevel === 1) {
        livingroomGroups = [
          [4, 5, 7, 10, 11], [1, 2], [0, 6], [3], [8, 9]
        ];
      } else if (currentLevel === 2) {
        livingroomGroups = [
          [4, 5, 7, 10, 11], [1, 2], [0], [6], [3], [8, 9]
        ];
      } else {
        livingroomGroups = [
          [4, 5, 7, 10], [11], [1], [2], [0], [6], [3], [8, 9]
        ];
      }
    }

    // 기차 이미지의 레벨별 그룹 설정
    const isTrainImageGroup = COLORING_IMAGES[currentImageIndexRef.current]?.name === "기차";
    let trainGroups: number[][] = [];
    
    if (isTrainImageGroup) {
      if (currentLevel === 1) {
        trainGroups = [
          [18, 19], [20], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17], [12]
        ];
      } else if (currentLevel === 2) {
        trainGroups = [
          [18, 19], [20], [13, 17], [14, 15, 16], [12], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        ];
      } else {
        trainGroups = [
          [18, 19], [20], [13, 17], [14], [15], [16], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [12]
        ];
      }
    }

    // 풍선 이미지의 레벨별 그룹 설정
    const isBalloonImage = COLORING_IMAGES[currentImageIndexRef.current]?.name === "풍선";
    let balloonGroups: number[][] = [];
    
    if (isBalloonImage) {
      if (currentLevel === 1) {
        balloonGroups = [
          [0, 1], [3, 5], [4, 6], [2, 7]
        ];
      } else if (currentLevel === 2) {
        balloonGroups = [
          [0], [1], [4], [6], [2, 7], [3, 5]
        ];
      } else {
        balloonGroups = [
          [0], [1], [2], [3], [4], [5], [6], [7]
        ];
      }
    }

    for (let i = 0; i < segmentImages.length; i++) {
      const pos = segmentPositions[i];
      const offset = offsets[i] || { x: 0, y: 0 };
      const mask = segmentMasks[i];
      const segImg = segmentImages[i];

      const localX = x - (pos.x + offset.x);
      const localY = y - (pos.y + offset.y);

      if (localX >= 0 && localX < mask.width && localY >= 0 && localY < mask.height) {
        const pixelIndex = (Math.floor(localY) * mask.width + Math.floor(localX)) * 4;
        const alpha = mask.data[pixelIndex + 3];

        if (alpha > 128) {

          // 집 그림의 그룹 중 하나를 클릭했다면, 해당 그룹 모두 같은 색으로 칠하기
          if (isHouseImage && houseGroups.length > 0) {
            const clickedGroup = houseGroups.find(group => group.includes(i));
            
            if (clickedGroup) {
              
              clickedGroup.forEach((segIdx) => {
                const segPos = segmentPositions[segIdx];
                const segOffset = offsets[segIdx] || { x: 0, y: 0 };
                const segImg = segmentImages[segIdx];
                
                // 색상 저장
                segmentColorsRef.current[segIdx] = color;
                
                // coloredCanvas에도 색칠
                const offscreenCanvas = document.createElement("canvas");
                offscreenCanvas.width = segImg.width;
                offscreenCanvas.height = segImg.height;
                const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

                if (offscreenCtx) {
                  offscreenCtx.imageSmoothingEnabled = false;
                  offscreenCtx.fillStyle = color;
                  offscreenCtx.fillRect(0, 0, segImg.width, segImg.height);
                  offscreenCtx.globalCompositeOperation = "destination-in";
                  offscreenCtx.drawImage(segImg, 0, 0);

                  coloredCtx.imageSmoothingEnabled = false;
                  coloredCtx.globalCompositeOperation = "source-over";
                  coloredCtx.drawImage(offscreenCanvas, segPos.x, segPos.y);
                }
              });
            }
          } else if (isChildImage && childGroups.length > 0) {
            // 아이 그림의 그룹 중 하나를 클릭했다면, 해당 그룹 모두 같은 색으로 칠하기
            const clickedGroup = childGroups.find(group => group.includes(i));
            
            if (clickedGroup) {
              
              clickedGroup.forEach((segIdx) => {
                const segPos = segmentPositions[segIdx];
                const segOffset = offsets[segIdx] || { x: 0, y: 0 };
                const segImg = segmentImages[segIdx];
                
                // 색상 저장
                segmentColorsRef.current[segIdx] = color;
                
                // coloredCanvas에도 색칠
                const offscreenCanvas = document.createElement("canvas");
                offscreenCanvas.width = segImg.width;
                offscreenCanvas.height = segImg.height;
                const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

                if (offscreenCtx) {
                  offscreenCtx.imageSmoothingEnabled = false;
                  offscreenCtx.fillStyle = color;
                  offscreenCtx.fillRect(0, 0, segImg.width, segImg.height);
                  offscreenCtx.globalCompositeOperation = "destination-in";
                  offscreenCtx.drawImage(segImg, 0, 0);

                  coloredCtx.imageSmoothingEnabled = false;
                  coloredCtx.globalCompositeOperation = "source-over";
                  coloredCtx.drawImage(offscreenCanvas, segPos.x, segPos.y);
                }
              });
            }
          } else if (isLivingroomImage && livingroomGroups.length > 0) {
            // 거실 그림의 그룹 중 하나를 클릭했다면, 해당 그룹 모두 같은 색으로 칠하기
            const clickedGroup = livingroomGroups.find(group => group.includes(i));
            
            if (clickedGroup) {
              
              clickedGroup.forEach((segIdx) => {
                const segPos = segmentPositions[segIdx];
                const segOffset = offsets[segIdx] || { x: 0, y: 0 };
                const segImg = segmentImages[segIdx];
                
                segmentColorsRef.current[segIdx] = color;
                
                const offscreenCanvas = document.createElement("canvas");
                offscreenCanvas.width = segImg.width;
                offscreenCanvas.height = segImg.height;
                const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

                if (offscreenCtx) {
                  offscreenCtx.imageSmoothingEnabled = false;
                  offscreenCtx.fillStyle = color;
                  offscreenCtx.fillRect(0, 0, segImg.width, segImg.height);
                  offscreenCtx.globalCompositeOperation = "destination-in";
                  offscreenCtx.drawImage(segImg, 0, 0);

                  coloredCtx.imageSmoothingEnabled = false;
                  coloredCtx.globalCompositeOperation = "source-over";
                  coloredCtx.drawImage(offscreenCanvas, segPos.x, segPos.y);
                }
              });
            }
          } else if (isTrainImageGroup && trainGroups.length > 0) {
            // 기차 그림의 그룹 중 하나를 클릭했다면, 해당 그룹 모두 같은 색으로 칠하기
            const clickedGroup = trainGroups.find(group => group.includes(i));
            
            if (clickedGroup) {
              
              clickedGroup.forEach((segIdx) => {
                const segPos = segmentPositions[segIdx];
                const segOffset = offsets[segIdx] || { x: 0, y: 0 };
                const segImg = segmentImages[segIdx];
                
                segmentColorsRef.current[segIdx] = color;
                
                const offscreenCanvas = document.createElement("canvas");
                offscreenCanvas.width = segImg.width;
                offscreenCanvas.height = segImg.height;
                const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

                if (offscreenCtx) {
                  offscreenCtx.imageSmoothingEnabled = false;
                  offscreenCtx.fillStyle = color;
                  offscreenCtx.fillRect(0, 0, segImg.width, segImg.height);
                  offscreenCtx.globalCompositeOperation = "destination-in";
                  offscreenCtx.drawImage(segImg, 0, 0);

                  coloredCtx.imageSmoothingEnabled = false;
                  coloredCtx.globalCompositeOperation = "source-over";
                  coloredCtx.drawImage(offscreenCanvas, segPos.x, segPos.y);
                }
              });
            }
          } else if (isBalloonImage && balloonGroups.length > 0) {
            // 풍선 그림의 그룹 중 하나를 클릭했다면, 해당 그룹 모두 같은 색으로 칠하기
            const clickedGroup = balloonGroups.find(group => group.includes(i));
            
            if (clickedGroup) {
              
              clickedGroup.forEach((segIdx) => {
                const segPos = segmentPositions[segIdx];
                const segOffset = offsets[segIdx] || { x: 0, y: 0 };
                const segImg = segmentImages[segIdx];
                
                segmentColorsRef.current[segIdx] = color;
                
                const offscreenCanvas = document.createElement("canvas");
                offscreenCanvas.width = segImg.width;
                offscreenCanvas.height = segImg.height;
                const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

                if (offscreenCtx) {
                  offscreenCtx.imageSmoothingEnabled = false;
                  offscreenCtx.fillStyle = color;
                  offscreenCtx.fillRect(0, 0, segImg.width, segImg.height);
                  offscreenCtx.globalCompositeOperation = "destination-in";
                  offscreenCtx.drawImage(segImg, 0, 0);

                  coloredCtx.imageSmoothingEnabled = false;
                  coloredCtx.globalCompositeOperation = "source-over";
                  coloredCtx.drawImage(offscreenCanvas, segPos.x, segPos.y);
                }
              });
            }
          } else {
            // 일반 조각 색칠
            segmentColorsRef.current[i] = color;

            // coloredCanvas에도 색칠 (점수 계산용)
            const offscreenCanvas = document.createElement("canvas");
            offscreenCanvas.width = segImg.width;
            offscreenCanvas.height = segImg.height;
            const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

            if (offscreenCtx) {
              offscreenCtx.fillStyle = color;
              offscreenCtx.fillRect(0, 0, segImg.width, segImg.height);
              offscreenCtx.globalCompositeOperation = "destination-in";
              offscreenCtx.drawImage(segImg, 0, 0);

              coloredCtx.globalCompositeOperation = "source-over";
              coloredCtx.drawImage(offscreenCanvas, pos.x, pos.y);
            }
          }

          return true;
        }
      }
    }

    return false;
  };

  const redrawSegments = (offsets: { x: number; y: number }[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const imageSize = imageSizeRef.current;
    
    // 캔버스 초기화
    ctx.clearRect(0, 0, imageSize.width, imageSize.height);

    const segmentOutlines = segmentOutlinesRef.current;
    const segmentPositions = segmentPositionsRef.current;
    const segmentColors = segmentColorsRef.current;

    // 각 조각을 그리기
    segmentOutlines.forEach((outlineImg, index) => {
      const pos = segmentPositions[index];
      const offset = offsets[index] || { x: 0, y: 0 };
      const finalX = pos.x + offset.x;
      const finalY = pos.y + offset.y;

      // 색칠된 조각이면 색칠된 버전 그리기
      if (segmentColors[index]) {
        const segImg = segmentImagesRef.current[index];
        const color = segmentColors[index];
        
        if (segImg && color) {
          const offscreenCanvas = document.createElement("canvas");
          offscreenCanvas.width = segImg.width;
          offscreenCanvas.height = segImg.height;
          const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

          if (offscreenCtx) {
            offscreenCtx.fillStyle = color;
            offscreenCtx.fillRect(0, 0, segImg.width, segImg.height);
            offscreenCtx.globalCompositeOperation = "destination-in";
            offscreenCtx.drawImage(segImg, 0, 0);

            ctx.globalCompositeOperation = "source-over";
            ctx.drawImage(offscreenCanvas, finalX, finalY);
          }
        }
      }
      
      // outline 그리기
      ctx.drawImage(outlineImg, finalX, finalY);
    });
  };

  const getSegmentAtPosition = (x: number, y: number, offsets: { x: number; y: number }[]): number => {
    const segmentMasks = segmentMasksRef.current;
    const segmentPositions = segmentPositionsRef.current;

    // 역순으로 체크 (위에 있는 조각부터)
    for (let i = segmentMasks.length - 1; i >= 0; i--) {
      const pos = segmentPositions[i];
      const offset = offsets[i] || { x: 0, y: 0 };
      const mask = segmentMasks[i];

      const localX = x - (pos.x + offset.x);
      const localY = y - (pos.y + offset.y);

      if (localX >= 0 && localX < mask.width && localY >= 0 && localY < mask.height) {
        const pixelIndex = (Math.floor(localY) * mask.width + Math.floor(localX)) * 4;
        const alpha = mask.data[pixelIndex + 3];

        if (alpha > 128) {
          return i;
        }
      }
    }

    return -1;
  };

  return {
    canvasRef,
    coloredCanvasRef,
    loadImages,
    fillSegment,
    imageSizeRef,
    segmentColorsRef, // 조각별 색상 정보 반환
    initializeCanvas,
    outlineImgRef,
    redrawSegments,
    getSegmentAtPosition,
    segmentPositionsRef,
    segmentImagesRef, // 세그먼트 이미지 정보 반환 (크기 계산용)
  };
}