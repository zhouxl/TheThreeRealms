import type {TravelerPose} from './incenseMotion.ts';

/**
 * World-space target for the foot of the incense stick, slightly inside the ash.
 * The censer is centered at z=3.2; the first available hole is centered.
 */
export const CENSER_POSITION = {x:0,z:3.2} as const;
export const INCENSE_TARGET = {x:0,y:1.0,z:3.2} as const;
export const INCENSE_STAND = {x:0,z:4.12} as const;
export const INCENSE_MAX_VISIBLE = 6;

const HOLES: readonly (readonly [number,number])[] = [
  [0,0], [0.18,0.07], [-0.18,0.07],
  [0.12,-0.16], [-0.12,-0.16], [0,-0.22],
] as const;

/** Includes one in-progress stick after release, but not after it is saved. */
export function getVisibleIncenseSlots(committedCount:number, releasedPreview:boolean): readonly (readonly [number,number])[] {
  const recorded=Number.isFinite(committedCount)?Math.max(0,Math.floor(committedCount)):0;
  const visible=Math.min(INCENSE_MAX_VISIBLE, recorded + (releasedPreview?1:0));
  return HOLES.slice(0,visible);
}

/**
 * The present V1.2 placeholder rig rotates its upper body around Y=0.7.
 * This is the bottom end of the held stick; it should touch the censer ash
 * on the release marker rather than vanish at an arbitrary screen position.
 */
export function getHeldIncenseBaseWorld(pose:TravelerPose, stand=INCENSE_STAND) {
  const angle=pose.torsoPitch;
  return {
    x:stand.x,
    y:0.7 + Math.cos(angle)*pose.handY - Math.sin(angle)*pose.handZ,
    z:stand.z + Math.sin(angle)*pose.handY + Math.cos(angle)*pose.handZ,
  };
}
