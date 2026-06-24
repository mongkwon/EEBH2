/**
 * 게임 설명창 및 물음표 버튼 사용 예시
 * 
 * 이 파일은 GameRulesButton과 GameRulesModal을 사용하는 방법을 보여줍니다.
 * 다른 게임에서 색상과 텍스트만 바꿔서 사용하세요.
 */

import { useState } from 'react';
import { GameRulesButton } from './GameRulesButton';
import { GameRulesModal, RuleSection, RuleList } from './GameRulesModal';
import { playClickSound } from '../utils/sound';

// 사용 예시 1: 버블 게임 (amber-50 색상 계열)
export const BubbleGameRulesExample = () => {
  const [showRules, setShowRules] = useState(false);

  return (
    <>
      <GameRulesButton
        onClick={() => {
          playClickSound();
          setShowRules(true);
        }}
        backgroundColor="#e5a652"  // 주 색상
        textColor="#ffffff"         // 물음표 색상
      />

      <GameRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        title="버블 게임 설명"
        primaryColor="#e5a652"           // 제목, 닫기 버튼, 확인 버튼 색상
        backgroundColor="#fef3c7"        // 배경색 (amber-50)
        scrollbarColor="#e5a652"         // 스크롤바 색상
        scrollbarTrackColor="#fef3c7"    // 스크롤바 트랙 색상
        onCloseSound={playClickSound}
      >
        <RuleSection title="게임 목표" titleColor="#e5a652">
          <p>같은 색 버블이 3개 이상 모이면 버블이 터집니다!</p>
        </RuleSection>

        <RuleSection title="게임 방법" titleColor="#e5a652">
          <RuleList items={[
            "마우스로 방향을 조준하고 클릭하여 공을 발사합니다",
            "발사 버블의 색은 소리로만 알 수 있습니다",
          ]} />
        </RuleSection>
      </GameRulesModal>
    </>
  );
};

// 사용 예시 2: 파란색 계열 게임
export const BlueGameRulesExample = () => {
  const [showRules, setShowRules] = useState(false);

  return (
    <>
      <GameRulesButton
        onClick={() => {
          playClickSound();
          setShowRules(true);
        }}
        backgroundColor="#3b82f6"  // 파란색
        textColor="#ffffff"
      />

      <GameRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        title="파란색 게임 설명"
        primaryColor="#3b82f6"           // 파란색
        backgroundColor="#dbeafe"        // 연한 파란색 배경
        scrollbarColor="#3b82f6"
        scrollbarTrackColor="#dbeafe"
        onCloseSound={playClickSound}
      >
        <RuleSection title="게임 목표" titleColor="#3b82f6">
          <p>여기에 게임 목표를 작성하세요!</p>
        </RuleSection>

        <RuleSection title="게임 방법" titleColor="#3b82f6">
          <RuleList items={[
            "첫 번째 규칙",
            "두 번째 규칙",
            "세 번째 규칙",
          ]} />
        </RuleSection>

        {/* 강조된 섹션 - 제목 색상만 빨간색으로 */}
        <RuleSection title="주의사항" titleColor="#dc2626">
          <RuleList items={[
            "중요한 주의사항 1",
            "중요한 주의사항 2",
          ]} />
        </RuleSection>
      </GameRulesModal>
    </>
  );
};

// 사용 예시 3: 초록색 계열 게임
export const GreenGameRulesExample = () => {
  const [showRules, setShowRules] = useState(false);

  return (
    <>
      <GameRulesButton
        onClick={() => {
          playClickSound();
          setShowRules(true);
        }}
        backgroundColor="#10b981"  // 초록색
        textColor="#ffffff"
      />

      <GameRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        title="초록색 게임 설명"
        primaryColor="#10b981"           // 초록색
        backgroundColor="#d1fae5"        // 연한 초록색 배경
        scrollbarColor="#10b981"
        scrollbarTrackColor="#d1fae5"
        onCloseSound={playClickSound}
      >
        <RuleSection title="게임 목표">
          <p>여기에 게임 목표를 작성하세요!</p>
        </RuleSection>

        <RuleSection title="특수 아이템">
          <RuleList items={[
            <><strong>골드 아이템</strong>: 점수 2배</>,
            <><strong>실버 아이템</strong>: 시간 추가</>,
            <><strong>브론즈 아이템</strong>: 힌트 제공</>,
          ]} />
        </RuleSection>
      </GameRulesModal>
    </>
  );
};

// 사용 예시 4: 보라색 계열 게임
export const PurpleGameRulesExample = () => {
  const [showRules, setShowRules] = useState(false);

  return (
    <>
      <GameRulesButton
        onClick={() => {
          playClickSound();
          setShowRules(true);
        }}
        backgroundColor="#a855f7"  // 보라색
        textColor="#ffffff"
      />

      <GameRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        title="보라색 게임 설명"
        primaryColor="#a855f7"           // 보라색
        backgroundColor="#f3e8ff"        // 연한 보라색 배경
        scrollbarColor="#a855f7"
        scrollbarTrackColor="#f3e8ff"
        onCloseSound={playClickSound}
      >
        <RuleSection title="게임 목표">
          <p>여기에 게임 목표를 작성하세요!</p>
        </RuleSection>
      </GameRulesModal>
    </>
  );
};

/**
 * 색상 팔레트 참고:
 * 
 * Amber (황금색 - 버블 게임):
 * - 주 색상: #e5a652
 * - 배경색: #fef3c7 (amber-50)
 * 
 * Blue (파란색):
 * - 주 색상: #3b82f6 (blue-500)
 * - 배경색: #dbeafe (blue-100)
 * 
 * Green (초록색):
 * - 주 색상: #10b981 (emerald-500)
 * - 배경색: #d1fae5 (emerald-100)
 * 
 * Purple (보라색):
 * - 주 색상: #a855f7 (purple-500)
 * - 배경색: #f3e8ff (purple-100)
 * 
 * Red (빨간색):
 * - 주 색상: #ef4444 (red-500)
 * - 배경색: #fee2e2 (red-100)
 * 
 * Orange (주황색):
 * - 주 색상: #f97316 (orange-500)
 * - 배경색: #ffedd5 (orange-100)
 * 
 * Pink (분홍색):
 * - 주 색상: #ec4899 (pink-500)
 * - 배경색: #fce7f3 (pink-100)
 * 
 * Teal (청록색):
 * - 주 색상: #14b8a6 (teal-500)
 * - 배경색: #ccfbf1 (teal-100)
 */
