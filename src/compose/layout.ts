import type { StepDefinition } from '../types.js';

const DEFAULT_STEP_WIDTH = 400;
const DEFAULT_STEP_GAP_X = 100;

export function computeAutoLayout(
  steps: StepDefinition[],
  options?: {
    stepWidth?: number;
    stepGapX?: number;
    stepGapY?: number;
  }
): Map<string, { x: number; y: number }> {
  const stepWidth = options?.stepWidth ?? DEFAULT_STEP_WIDTH;
  const stepGapX = options?.stepGapX ?? DEFAULT_STEP_GAP_X;

  const positions = new Map<string, { x: number; y: number }>();

  // 简单的网格布局：按顺序水平排列
  for (let i = 0; i < steps.length; i++) {
    positions.set(steps[i].id, {
      x: i * (stepWidth + stepGapX),
      y: 0,
    });
  }

  return positions;
}
