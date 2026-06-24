// 🎨 새로운 세그먼트 기반 Preview 생성 함수

const generatePreviewImage = async (imageIndex: number, level: number) => {
  console.log(`🎨 generatePreviewImage 호출됨 - imageIndex: ${imageIndex}, level: ${level}`);
  
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

  console.log(`🎨 선택된 색 인덱스: [${randomColors.join(", ")}]`);
  console.log(`🎨 선택된 색 Hex: [${selectedColorArray.join(", ")}]`);

  // 세그먼트 정보 가져오기
  const segmentPositions = SEGMENT_POSITIONS[imageIndex] || [];
  const segmentNames = SEGMENT_NAMES[imageIndex] || [];
  
  if (segmentPositions.length === 0) {
    console.warn("⚠️ 세그먼트 정보가 없습니다!");
    return;
  }

  // 세그먼트 순서를 섞어서 색상을 랜덤하게 할당
  const segmentIndices = Array.from({ length: segmentPositions.length }, (_, i) => i);
  const shuffledIndices = segmentIndices.sort(() => Math.random() - 0.5);
  
  // 각 세그먼트에 색상 할당 (순환)
  const segmentColors = shuffledIndices.map((segIdx, i) => ({
    segmentIndex: segIdx,
    color: selectedColorArray[i % colorCount]
  }));

  console.log(`🎨 세그먼트 ${segmentPositions.length}개에 색상 ${colorCount}개 할당`);

  // 원본 이미지 로드
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = COLORING_IMAGES[imageIndex].src;
  console.log(`🎨 이미지 로딩 시작: ${COLORING_IMAGES[imageIndex].name}`);

  await new Promise<void>((resolve) => {
    img.onload = async () => {
      console.log(`🎨 원본 이미지 로드 완료`);
      
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        resolve();
        return;
      }

      // 원본 이미지 크기 저장
      setOriginalImageSize({ width: img.width, height: img.height });

      // 🎨 세그먼트별로 색칠
      let completedSegments = 0;
      const totalSegments = segmentColors.length;

      for (const { segmentIndex, color } of segmentColors) {
        const segmentPath = SEGMENT_PATHS[imageIndex][segmentIndex];
        
        // 세그먼트 이미지 로드
        const segImg = new Image();
        segImg.crossOrigin = "anonymous";
        
        await new Promise<void>((resolveSegment) => {
          segImg.onload = () => {
            // 임시 캔버스에 세그먼트 그리기
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
            
            if (tempCtx) {
              tempCtx.drawImage(segImg, 0, 0);
              const segData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
              const segPixels = segData.data;
              
              // 색상을 RGB로 변환
              const hex = color.substring(1);
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              
              // 세그먼트의 불투명 픽셀을 지정된 색상으로 변경
              for (let i = 0; i < segPixels.length; i += 4) {
                const alpha = segPixels[i + 3];
                if (alpha > 0) {
                  segPixels[i] = r;
                  segPixels[i + 1] = g;
                  segPixels[i + 2] = b;
                }
              }
              
              tempCtx.putImageData(segData, 0, 0);
              
              // 메인 캔버스에 합성
              ctx.drawImage(tempCanvas, 0, 0);
            }
            
            completedSegments++;
            resolveSegment();
          };
          
          segImg.onerror = () => {
            console.warn(`⚠️ 세그먼트 이미지 로드 실패: ${segmentPath}`);
            completedSegments++;
            resolveSegment();
          };
          
          segImg.src = segmentPath;
        });
      }

      console.log(`✅ 모든 세그먼트 색칠 완료: ${completedSegments}/${totalSegments}`);

      // 미리보기용 리사이즈
      const previewSize = 320;
      const previewCanvas = document.createElement("canvas");
      previewCanvas.width = previewSize;
      previewCanvas.height = previewSize;
      const previewCtx = previewCanvas.getContext("2d", { willReadFrequently: true });

      if (!previewCtx) {
        resolve();
        return;
      }

      previewCtx.drawImage(canvas, 0, 0, previewSize, previewSize);
      setPreviewImage(previewCanvas.toDataURL());

      // 정답 색상 저장
      const previewImageData = previewCtx.getImageData(0, 0, previewSize, previewSize);
      const previewPixels = previewImageData.data;
      const correctColorsMap: { [key: number]: string } = {};
      const scaleX = previewSize / canvas.width;
      const scaleY = previewSize / canvas.height;

      console.log(`🔍 디버깅: 이미지 = ${imageName}`);
      console.log(`🔍 디버깅: 원본 이미지 크기 = ${canvas.width}x${canvas.height}`);
      console.log(`🔍 디버깅: 미리보기 크기 = ${previewSize}x${previewSize}`);
      console.log(`🔍 디버깅: 스케일 비율 = ${scaleX.toFixed(2)} x ${scaleY.toFixed(2)}`);

      segmentPositions.forEach((pos, index) => {
        const scaledX = Math.floor(pos.x * scaleX);
        const scaledY = Math.floor(pos.y * scaleY);

        const pixelIndex = (scaledY * previewSize + scaledX) * 4;
        const r = previewPixels[pixelIndex];
        const g = previewPixels[pixelIndex + 1];
        const b = previewPixels[pixelIndex + 2];

        const hexColor = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
        correctColorsMap[index] = hexColor;

        console.log(`세그먼트 ${index} (${segmentNames[index]}) 정답색: ${hexColor}`);
      });

      setCorrectColors(correctColorsMap);
      console.log(`✅ 정답색 저장 완료: ${Object.keys(correctColorsMap).length}/${segmentPositions.length}개 세그먼트`);

      resolve();
    };

    img.onerror = () => {
      console.error("❌ 이미지 로드 실패");
      resolve();
    };
  });
};
