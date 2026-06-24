/**
 * 색칠 게임의 이미지별/레벨별 세그먼트 그룹 정의
 */

export interface GroupDefinition {
  groups: number[][];
}

/**
 * 이미지와 레벨에 따른 세그먼트 그룹 정의 가져오기
 */
export function getSegmentGroups(imageName: string, level: number): number[][] {
  if (imageName === "집") {
    if (level === 1) {
      return [
        [2, 3, 4, 5, 6], // 집
        [7, 8, 13], // 구름+해
        [9, 10, 11, 12], // 꽃+울타리
        [0, 1], // 나무
      ];
    } else if (level === 2) {
      return [
        [7, 8], // 구름
        [11, 12], // 꽃
        [9, 10], // 울타리
        [2, 3, 4, 5, 6], // 집
        [13], // 태양
        [0, 1], // 나무
      ];
    } else {
      // level 3
      return [
        [7, 8], // 구름
        [13], // 태양
        [11], // 꽃1
        [12], // 꽃2
        [9, 10], // 울타리
        [5], // 지붕
        [2, 3, 4, 6], // 집 본체
        [0, 1], // 나무
      ];
    }
  } else if (imageName === "아이") {
    if (level === 1) {
      return [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // 얼굴+머리
        [11, 12, 13, 14], // 상의
        [17], // 신발
        [15, 16, 18, 19], // 하의+양말
      ];
    } else if (level === 2) {
      return [
        [0, 1, 2, 3, 4], // 얼굴
        [5, 6, 7, 8, 9, 10], // 머리
        [17], // 신발
        [11, 12], // 상의 상단
        [13, 14], // 상의 하단
        [15, 16, 18, 19], // 하의+양말
      ];
    } else {
      // level 3
      return [
        [0, 1, 2, 3, 4], // 얼굴
        [5, 6], // 머리 왼쪽
        [7, 8, 9, 10], // 머리 오른쪽
        [17], // 신발
        [11, 12], // 상의 상단
        [13, 14], // 상의 하단
        [15, 16], // 하의
        [18, 19], // 양말
      ];
    }
  } else if (imageName === "거실") {
    if (level === 1) {
      return [
        [4, 5, 7, 10, 11], // 소파+쿠션
        [1, 2], // 창문
        [0, 6], // 액자+화분
        [3], // 테이블
        [8, 9], // 러그
      ];
    } else if (level === 2) {
      return [
        [4, 5, 7, 10, 11], // 소파+쿠션
        [1, 2], // 창문
        [0], // 액자
        [6], // 화분
        [3], // 테이블
        [8, 9], // 러그
      ];
    } else {
      // level 3
      return [
        [4, 5, 7, 10], // 소파
        [11], // 쿠션
        [1], // 창문 왼쪽
        [2], // 창문 오른쪽
        [0], // 액자
        [6], // 화분
        [3], // 테이블
        [8, 9], // 러그
      ];
    }
  } else if (imageName === "기차") {
    if (level === 1) {
      return [
        [18, 19], // 연기
        [20], // 하늘
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17], // 기차
        [12], // 선로
      ];
    } else if (level === 2) {
      return [
        [18, 19], // 연기
        [20], // 하늘
        [13, 17], // 기차 상단
        [14, 15, 16], // 기차 중간
        [12], // 선로
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // 기차 하단
      ];
    } else {
      // level 3
      return [
        [18, 19], // 연기
        [20], // 하늘
        [13, 17], // 기차 상단
        [14], // 기차 중간1
        [15], // 기차 중간2
        [16], // 기차 중간3
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // 기차 하단
        [12], // 선로
      ];
    }
  } else if (imageName === "풍선") {
    if (level === 1) {
      return [
        [0, 1], // 풍선1+줄
        [3, 5], // 풍선2+줄
        [4, 6], // 풍선3+줄
        [2, 7], // 풍선4+줄
      ];
    } else if (level === 2) {
      return [
        [0], // 풍선1
        [1], // 줄1
        [4], // 풍선3
        [6], // 줄3
        [2, 7], // 풍선4+줄
        [3, 5], // 풍선2+줄
      ];
    } else {
      // level 3
      return [
        [0], // 풍선1
        [1], // 줄1
        [2], // 풍선4
        [3], // 풍선2
        [4], // 풍선3
        [5], // 줄2
        [6], // 줄3
        [7], // 줄4
      ];
    }
  }

  // 기본값: 각 세그먼트를 개별 그룹으로
  return [];
}

/**
 * 세그먼트 인덱스로 그룹 인덱스 찾기
 * @returns 그룹 인덱스, 없으면 -1
 */
export function getGroupIndexBySegment(
  segmentIndex: number,
  imageName: string,
  level: number
): number {
  const groups = getSegmentGroups(imageName, level);
  
  for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
    if (groups[groupIdx].includes(segmentIndex)) {
      return groupIdx;
    }
  }
  
  return -1;
}

/**
 * 그룹의 모든 세그먼트 인덱스 가져오기
 */
export function getSegmentsInGroup(
  groupIndex: number,
  imageName: string,
  level: number
): number[] {
  const groups = getSegmentGroups(imageName, level);
  return groups[groupIndex] || [];
}
