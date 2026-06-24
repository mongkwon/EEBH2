import { getSegmentGroups, getGroupIndexBySegment } from './coloringGroups';
import { SegmentPosition } from './coloringTypes';

/**
 * 특정 세그먼트에서 "유저가 칠한 대표 색"을 추출
 */
function getSegmentUserColor(
  segmentPos: SegmentPosition,
  coloredData: ImageData,
  canvasWidth: number,
  canvasHeight: number
): { r: number; g: number; b: number } | null {
  const centerX = Math.floor(segmentPos.x);
  const centerY = Math.floor(segmentPos.y);

  // 좌표가 캔버스 범위를 벗어나면 경고하고 null 반환
  if (centerX < 0 || centerX >= canvasWidth || centerY < 0 || centerY >= canvasHeight) {
    console.warn(`   ⚠️ (${centerX}, ${centerY}): 좌표가 캔버스 범위(${canvasWidth}x${canvasHeight})를 벗어남`);
    return null;
  }

  // 점진적으로 범위를 늘려가며 색상 검색 - 정답색 검색과 동일한 범위
  const radiusSteps = [10, 20, 30, 50, 80, 120];  // 최대 반경을 줄여서 인접 세그먼트 색상 혼입 방지
  
  for (const sampleRadius of radiusSteps) {
    const colorCounts = new Map<string, { count: number; r: number; g: number; b: number }>();
    let validSamples = 0;

    // 샘플링 간격을 2로 줄여서 더 총체적게 검사
    for (let dy = -sampleRadius; dy <= sampleRadius; dy += 2) {
      for (let dx = -sampleRadius; dx <= sampleRadius; dx += 2) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x >= 0 && x < canvasWidth && y >= 0 && y < canvasHeight) {
          const idx = (y * canvasWidth + x) * 4;
          const r = coloredData.data[idx];
          const g = coloredData.data[idx + 1];
          const b = coloredData.data[idx + 2];
          const a = coloredData.data[idx + 3];

          // 투명하거나 거의 흰색이면(배경) 무시
          if (a === 0) continue;
          if (r > 240 && g > 240 && b > 240) continue;
          
          // 윤곽선 색상(어두운 회색/검은색) 제외 - RGB가 모두 50 이하이면 윤곽선으로 간주
          const isOutline = r <= 50 && g <= 50 && b <= 50;
          if (isOutline) continue;

          validSamples++;

          const rKey = Math.floor(r / 10) * 10;
          const gKey = Math.floor(g / 10) * 10;
          const bKey = Math.floor(b / 10) * 10;
          const colorKey = `${rKey},${gKey},${bKey}`;

          if (!colorCounts.has(colorKey)) {
            colorCounts.set(colorKey, { count: 0, r, g, b });
          }
          const colorData = colorCounts.get(colorKey)!;
          colorData.count++;
          colorData.r = Math.floor((colorData.r * (colorData.count - 1) + r) / colorData.count);
          colorData.g = Math.floor((colorData.g * (colorData.count - 1) + g) / colorData.count);
          colorData.b = Math.floor((colorData.b * (colorData.count - 1) + b) / colorData.count);
        }
      }
    }

    // 유효한 샘플을 찾았으면 대표 색상 반환
    if (validSamples > 0 && colorCounts.size > 0) {
      let maxCount = 0;
      let resultColor = { r: 0, g: 0, b: 0 };

      for (const colorData of colorCounts.values()) {
        if (colorData.count > maxCount) {
          maxCount = colorData.count;
          resultColor = { r: colorData.r, g: colorData.g, b: colorData.b };
        }
      }

      return resultColor;
    }
  }

  // 모든 반경에서 색상을 찾지 못함 (색칠 안 된 세그먼트로 간주)
  return null;
}

/**
 * hex 색상을 RGB로 변환
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex || hex.length !== 7 || !hex.startsWith('#')) {
    return null;
  }

  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return { r, g, b };
}

/**
 * 노란색 계열인지 확인 (RGB 기반)
 */
function isSameYellowFamilyFromRgb(
  cr: number, cg: number, cb: number,
  ur: number, ug: number, ub: number
): boolean {
  // 정답과 유저 색상 모두 노란색 계열인지 확인
  const isCorrectYellow = cr > 200 && cg > 180 && cb < 100;
  const isUserYellow = ur > 200 && ug > 180 && ub < 100;
  
  // 둘 다 노란색 계열이면 true
  return isCorrectYellow && isUserYellow;
}

/**
 * 점수 계산 결과 타입
 */
export interface ScoringResult {
  correctSegments: number;
  correctSegmentIndices: number[];
  baseScore: number;
  timeBonus: number;
  finalScore: number;
}

/**
 * 게임 점수를 계산 (그룹별 방식)
 * @param segmentCount 전체 세그먼트 수
 * @param segmentPositions 세그먼트 위치 배열
 * @param coloredCanvas 색칠된 캔버스
 * @param correctGroupColors 그룹별 정답 색상 (그룹 인덱스 → hex)
 * @param elapsedTime 경과 시간 (초)
 * @param originalWidth 원본 이미지 너비
 * @param originalHeight 원본 이미지 높이
 * @param imageName 이미지 이름
 * @param level 레벨
 * @param segmentColors 세그먼트별로 사용자가 칠한 색상 배열 (선택적)
 * @returns 점수 계산 결과
 */
export function calculateGameScore(
  segmentCount: number,
  segmentPositions: SegmentPosition[],
  coloredCanvas: HTMLCanvasElement,
  correctGroupColors: Map<number, string>,
  elapsedTime: number,
  originalWidth: number,
  originalHeight: number,
  imageName: string,
  level: number,
  segmentColors?: (string | null)[]
): ScoringResult | null {
  const coloredCtx = coloredCanvas.getContext("2d", { willReadFrequently: true });
  if (!coloredCtx) return null;

  const coloredData = coloredCtx.getImageData(0, 0, coloredCanvas.width, coloredCanvas.height);

  // 원본 이미지 크기 대비 coloredCanvas 크기의 스케일 비율 계산
  const scaleX = coloredCanvas.width / originalWidth;
  const scaleY = coloredCanvas.height / originalHeight;

  // 그룹 정의 가져오기
  const groups = getSegmentGroups(imageName, level);
  
  let correctSegments = 0;
  const correctSegmentIndices: number[] = [];

  // 각 세그먼트별로 색상 확인
  for (let segIdx = 0; segIdx < segmentCount; segIdx++) {
    if (segIdx >= segmentPositions.length) break;

    const pos = segmentPositions[segIdx];
    
    // 이 세그먼트가 속한 그룹 찾기
    const groupIdx = getGroupIndexBySegment(segIdx, imageName, level);
    
    if (groupIdx === -1) {
      continue;
    }

    // 그룹의 정답 색상 가져오기
    const correctHex = correctGroupColors.get(groupIdx);

    if (!correctHex) {
      continue;
    }

    const correctRgb = hexToRgb(correctHex);
    if (!correctRgb) {
      continue;
    }

    // segmentColors 배열이 제공되었으면 직접 사용 (더 정확함)
    let userColorHex: string | null = null;
    if (segmentColors && segIdx < segmentColors.length) {
      userColorHex = segmentColors[segIdx];
    }

    // segmentColors에서 색상을 가져왔을 때
    if (userColorHex) {
      const userRgb = hexToRgb(userColorHex);
      if (!userRgb) {
        continue;
      }

      const { r: cr, g: cg, b: cb } = correctRgb;
      const { r: ur, g: ug, b: ub } = userRgb;

      // 색상 비교 허용 오차
      const threshold = 50;
      const rDiff = Math.abs(cr - ur);
      const gDiff = Math.abs(cg - ug);
      const bDiff = Math.abs(cb - ub);

      const isYellowOk = isSameYellowFamilyFromRgb(cr, cg, cb, ur, ug, ub);
      const isCloseColor = rDiff <= threshold && gDiff <= threshold && bDiff <= threshold;

      const isCorrect = isYellowOk || isCloseColor;

      if (isCorrect) {
        correctSegments++;
        correctSegmentIndices.push(segIdx);
      }

      continue;
    }

    // segmentColors가 없으면 기존 방식 (캔버스 픽셀 읽기)
    // 원본 좌표가 이미지 범위를 크게 벗어나면 건너뛰기
    const margin = 0.1;
    if (pos.x < -originalWidth * margin || pos.x > originalWidth * (1 + margin) ||
        pos.y < -originalHeight * margin || pos.y > originalHeight * (1 + margin)) {
      console.warn(`⚠️ 세그먼트 ${segIdx}: 원본 좌표가 이미지 범위를 벗어남 - (${pos.x}, ${pos.y}) - 건너뜀`);
      continue;
    }

    // 원본 좌표를 coloredCanvas 좌표로 스케일링
    const scaledPos = {
      x: pos.x * scaleX,
      y: pos.y * scaleY
    };

    // 스케일링된 좌표가 캔버스 범위를 벗어나면 건너뛰기
    if (scaledPos.x < -10 || scaledPos.x >= coloredCanvas.width + 10 ||
        scaledPos.y < -10 || scaledPos.y >= coloredCanvas.height + 10) {
      console.warn(`⚠️ 세그먼트 ${segIdx}: 좌표가 캔버스 범위를 벗어남 - 원본(${pos.x}, ${pos.y}) → 스케일(${scaledPos.x.toFixed(1)}, ${scaledPos.y.toFixed(1)}) - 건너뜀`);
      continue;
    }

    // 약간의 여유만 있는 경우 클램핑
    const clampedPos = {
      x: Math.max(0, Math.min(coloredCanvas.width - 1, scaledPos.x)),
      y: Math.max(0, Math.min(coloredCanvas.height - 1, scaledPos.y))
    };

    // 클램핑이 크게 발생한 경우 (5픽셀 이상)

    const userColor = getSegmentUserColor(
      clampedPos,
      coloredData,
      coloredCanvas.width,
      coloredCanvas.height
    );

    if (!userColor) {
      continue;
    }

    const { r: cr, g: cg, b: cb } = correctRgb;
    const { r: ur, g: ug, b: ub } = userColor;

    // 색상 비교 허용 오차
    const threshold = 50;
    const rDiff = Math.abs(cr - ur);
    const gDiff = Math.abs(cg - ug);
    const bDiff = Math.abs(cb - ub);

    const isYellowOk = isSameYellowFamilyFromRgb(cr, cg, cb, ur, ug, ub);
    const isCloseColor = rDiff <= threshold && gDiff <= threshold && bDiff <= threshold;

    const isCorrect = isYellowOk || isCloseColor;

    if (isCorrect) {
      correctSegments++;
      correctSegmentIndices.push(segIdx);
    }

    const userHex = `#${ur.toString(16).padStart(2, "0")}${ug
      .toString(16)
      .padStart(2, "0")}${ub.toString(16).padStart(2, "0")}`.toUpperCase();

  }

  // 그룹별로 점수 계산 (각 그룹당 10점)
  // 그룹 내 하나의 세그먼트라도 정답으로 색칠되면 그룹 전체 완성으로 간주
  let completedGroups = 0;
  for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
    const group = groups[groupIdx];
    const anyCorrect = group.some(segIdx => correctSegmentIndices.includes(segIdx));
    if (anyCorrect) {
      completedGroups++;
    }
  }

  const baseScore = completedGroups * 10;  // 그룹당 10점
  
  // 레벨별 시간 보너스 계산 (완성된 그룹이 있을 때만)
  let timeBonus = 0;
  if (completedGroups > 0) {
    if (level === 1) {
      // 레벨 1: 30초 이내
      if (elapsedTime < 10) timeBonus = 15;
      else if (elapsedTime < 20) timeBonus = 10;
      else if (elapsedTime < 30) timeBonus = 5;
      else timeBonus = 0;
    } else if (level === 2) {
      // 레벨 2: 90초(1분 30초) 이내
      if (elapsedTime < 30) timeBonus = 15;
      else if (elapsedTime < 60) timeBonus = 10;
      else if (elapsedTime < 90) timeBonus = 5;
      else timeBonus = 0;
    } else {
      // 레벨 3: 180초(3분) 이내
      if (elapsedTime < 30) timeBonus = 30;
      else if (elapsedTime < 60) timeBonus = 25;
      else if (elapsedTime < 90) timeBonus = 20;
      else if (elapsedTime < 120) timeBonus = 15;
      else if (elapsedTime < 150) timeBonus = 10;
      else if (elapsedTime < 180) timeBonus = 5;
      else timeBonus = 0;
    }
  }
  
  const finalScore = baseScore + timeBonus;

  return {
    correctSegments,
    correctSegmentIndices,
    baseScore,
    timeBonus,
    finalScore,
  };
}