import type {TravelerPose} from './incenseMotion.ts';

/**
 * World-space target for the foot of the incense stick, slightly inside the ash.
 * The censer is centered at z=3.2; the first available slot is on the traveler-facing ash.
 */
export const CENSER_POSITION = {x:0,z:3.2} as const;
export const INCENSE_TARGET = {x:0,y:1.0,z:3.5} as const;
export const INCENSE_STAND = {x:0,z:4.6} as const;
export const INCENSE_MAX_VISIBLE = 6;

const HOLES: readonly (readonly [number,number])[] = [
  // Near-side ash arc: reachable without stepping inside the censer.
  [0,0.30], [0.17,0.34], [-0.17,0.34],
  [0.31,0.27], [-0.31,0.27], [0,0.40],
] as const;

/** Target the exact slot which the burner will render after the release event. */
export function getIncenseInsertionTarget(committedCount:number): Readonly<{x:number;y:number;z:number}> {
  const recorded=Number.isFinite(committedCount)?Math.max(0,Math.floor(committedCount)):0;
  const [x,z]=HOLES[Math.min(INCENSE_MAX_VISIBLE-1,recorded)];
  return {x:CENSER_POSITION.x+x,y:INCENSE_TARGET.y,z:CENSER_POSITION.z+z};
}

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
