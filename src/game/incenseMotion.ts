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
  // Keep the lower end of the stick above the ash until the placement reach.
  handY: 0.49,
  handZ: -0.43,
  incenseTilt: 0,
};

/** Button input starts a timed action; it never skips an in-progress action. */
export function advanceIncenseButton(step: IncenseStep): IncenseStep {
  if(step==='approach')return 'approach';
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

/** A composed bow with a short, quiet hold near its lowest point. */
export function sampleIncenseClipProgress(action:IncenseAction,progress:number):number{
  const p=clamp01(progress);
  if(action==='bowing'){
    if(p<=0.42)return 0.5*easeInOut(p/0.42);
    if(p<=0.62)return 0.5;
    return 0.5+0.5*easeInOut((p-0.62)/0.38);
  }
  return p<=INCENSE_RELEASE_PROGRESS
    ? INCENSE_RELEASE_PROGRESS*easeInOut(p/INCENSE_RELEASE_PROGRESS)
    : INCENSE_RELEASE_PROGRESS+(1-INCENSE_RELEASE_PROGRESS)*
      easeInOut((p-INCENSE_RELEASE_PROGRESS)/(1-INCENSE_RELEASE_PROGRESS));
}

/** Subtle approach during insertion; restore the default stand after release. */
export function getIncenseReachWeight(progress:number):number{
  const p=clamp01(progress);
  const advance=easeInOut(p/0.43);
  const recover=easeInOut((p-INCENSE_RELEASE_PROGRESS)/(1-INCENSE_RELEASE_PROGRESS));
  return advance*(1-recover);
}

export function hasReleasedIncense(step: IncenseStep, progress: number): boolean {
  return step === 'placing' && progress >= INCENSE_RELEASE_PROGRESS;
}

export function getTravelerPose(step: IncenseStep | null, progress: number): TravelerPose {
  if (step === null || step === 'done' || step === 'approach') return REST;

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
      // Waist pivot lowers the hand in world space; local movement only fine-tunes contact.
      handY: HOLD.handY - 0.02 * reachWeight,
      handZ: HOLD.handZ - 0.59 * reachWeight,
      // Counter the torso lean so the incense remains close to vertical.
      incenseTilt: 0.18 * reachWeight,
    };
  }
  return HOLD;
}
