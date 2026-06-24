export interface ColoringGameProps {
  onBack: () => void;
}

export type GameState = "ready" | "preview" | "playing" | "complete";

export interface ColoringImage {
  name: string;
  src: string;
  colors: Array<{ name: string; hex: string }>;
}

export interface SegmentPosition {
  x: number;
  y: number;
}

export interface HeartText {
  id: number;
  x: number;
  y: number;
  createdAt: number;
  scale: number;
}