/**
 * V1.2's procedural stand-in for authored skeletal GLB animation clips.
 * Pure timing and pose functions make keyframes independent from rendering FPS.
 */
import {nextIncenseStep, type IncenseStep} from './rules.ts';

export type IncenseAction = 'bowing' | 'placing';

export const INCENSE_ACTION_SECONDS: Readonly<Record<IncenseAction, number>> = {
  bowing: 1.8,
  placing: 2.4,
};
export const INCENSE_RELEASE_PROGRESS = 0.76;

export type TravelerPose = Readonly<{
  torsoPitch: number;
  armsForward: number;
  handY: number;
  handZ: number;
  incenseTilt: number;
}>;

const REST: TravelerPose = {
  torsoPitch: 0,
  armsForward: 0,
  handY: 0.28,
  handZ: -0.43,
  incenseTilt: 0,
};

const HOLD: TravelerPose = {
  torsoPitch: 0,
  armsForward: 1.03,
  handY: 0.28,
  handZ: -0.43,
  incenseTilt: 0,
};

/** Button input starts a timed action; it never skips an in-progress action. */
export function advanceIncenseButton(step: IncenseStep): IncenseStep {
  if(step==='bow')return 'bowing';
  if(step==='place')return 'placing';
  if(isIncenseActionStep(step))return step;
  return nextIncenseStep(step);
}

export function isIncenseActionStep(step: IncenseStep): step is IncenseAction {
  return step === 'bowing' || step === 'placing';
}

export function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export function easeInOut(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

export function incenseActionProgress(action: IncenseAction, elapsedSeconds: number): number {
  return clamp01(elapsedSeconds / INCENSE_ACTION_SECONDS[action]);
}

export function hasReleasedIncense(step: IncenseStep, progress: number): boolean {
  return step === 'placing' && progress >= INCENSE_RELEASE_PROGRESS;
}

export function getTravelerPose(step: IncenseStep | null, progress: number): TravelerPose {
  if (step === null || step === 'done') return REST;

  const p = clamp01(progress);
  if (step === 'bowing') {
    // One bow: lean forward, hold briefly at the deepest point, return upright.
    const dip = p < 0.5 ? easeInOut(p * 2) : easeInOut((1 - p) * 2);
    return {
      ...HOLD,
      torsoPitch: -0.51 * dip,
      armsForward: 1.03 + 0.14 * dip,
      handY: HOLD.handY - 0.03 * dip,
    };
  }

  if (step === 'placing') {
    const reach = easeInOut(p / INCENSE_RELEASE_PROGRESS);
    const recover = easeInOut((p - INCENSE_RELEASE_PROGRESS) / (1 - INCENSE_RELEASE_PROGRESS));
    const reachWeight = reach * (1 - recover);
    return {
      torsoPitch: -0.18 * reachWeight,
      armsForward: 1.03 + 0.4 * reachWeight,
      handY: HOLD.handY - 0.18 * reachWeight,
      handZ: HOLD.handZ - 0.65 * reachWeight,
      incenseTilt: 0.13 * reachWeight,
    };
  }
  return HOLD;
}
