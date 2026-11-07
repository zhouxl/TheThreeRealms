/** Pure gameplay rules shared by the 3D controller and tests. No rendering dependencies. */
export type Vec3 = readonly [number, number, number];
export type Station = 'incense' | 'fortune' | 'blessing';

export const WORLD = {
  hallWidth: 12.6,
  hallDepth: 9.6,
  courtyardDepth: 7.2,
  hallFloor: 0.45,
  playerHeight: 1.55,
  speed: 1.7,
} as const;

export const STATIONS: Readonly<Record<Station, { label: string; position: Vec3; stand: Vec3; radius: number }>> = {
  incense: { label: '上香', position: [0, 0, 3.2], stand: [0, 0, 4.55], radius: 2.3 },
  fortune: { label: '求一支签', position: [-4.25, 0.45, -4], stand: [-3.65, 0.45, -3.35], radius: 2.05 },
  blessing: { label: '留下一份心愿', position: [4.25, 0.45, -4], stand: [3.55, 0.45, -3.3], radius: 2.05 },
};

export type PlayerPosition = { x: number; z: number };
export type Ritual =
  | { kind: 'explore' }
  | { kind: 'incense'; step: 'take' | 'light' | 'hold' | 'bow' | 'place' | 'done' }
  | { kind: 'fortune'; step: 'shake' | 'reading'; number?: number }
  | { kind: 'blessing'; step: 'edit' | 'done'; slotId?: number };

export const INCENSE_STEPS = ['take', 'light', 'hold', 'bow', 'place', 'done'] as const;

export function nextIncenseStep(step: (typeof INCENSE_STEPS)[number]): (typeof INCENSE_STEPS)[number] {
  const index = INCENSE_STEPS.indexOf(step);
  return INCENSE_STEPS[Math.min(index + 1, INCENSE_STEPS.length - 1)];
}

/** The player lights the incense on leaving the 'light' step. Until it is
 * placed into the burner, the ember and smoke must follow the held stick. */
export function isHandheldIncenseLit(ritual: Ritual): boolean {
  return ritual.kind === 'incense' && (
    ritual.step === 'hold' || ritual.step === 'bow' || ritual.step === 'place'
  );
}

export function floorHeight(z: number): number {
  if (z >= 0.15) return 0;
  if (z <= -0.4) return WORLD.hallFloor;
  return WORLD.hallFloor * ((0.15 - z) / 0.55);
}

function blockedByStructure(x: number, z: number): boolean {
  // Narrower main entrance; lateral movement outside this opening is blocked.
  if (z > -0.3 && z < 0.35 && Math.abs(x) > 1.55) return true;
  // Main altar (buffered), wall-side shrine and side interaction displays.
  if (z < -5.6 && z > -7 && Math.abs(x) < 1.75) return true;
  if (z < -7.2 && Math.abs(x) < 2.55) return true;
  if (z < -3.0 && z > -5.2 && Math.abs(x) > 4.95) return true;
  // Incense burner in the courtyard.
  if (z > 2.45 && z < 3.95 && Math.abs(x) < 0.73) return true;
  return false;
}

export function canOccupy(x: number, z: number): boolean {
  if (Math.abs(x) > 5.85 || z < -8.55 || z > 6.85) return false;
  return !blockedByStructure(x, z);
}

export function moveWithCollision(pos: PlayerPosition, dx: number, dz: number): PlayerPosition {
  const x = canOccupy(pos.x + dx, pos.z) ? pos.x + dx : pos.x;
  const z = canOccupy(x, pos.z + dz) ? pos.z + dz : pos.z;
  return { x, z };
}

export function getNearestStation(pos: PlayerPosition): Station | null {
  let best: { station: Station; distance: number } | null = null;
  for (const key of Object.keys(STATIONS) as Station[]) {
    const candidate = STATIONS[key];
    const d = Math.hypot(pos.x - candidate.stand[0], pos.z - candidate.stand[2]);
    if (d <= candidate.radius && (!best || d < best.distance)) best = { station: key, distance: d };
  }
  return best?.station ?? null;
}

export function pickFortune(randomValue: number): number {
  if (!(randomValue >= 0 && randomValue < 1)) throw new RangeError('Expected random value in [0, 1)');
  return Math.floor(randomValue * 32) + 1;
}

export function firstAvailableSlot(occupied: readonly number[], capacity = 30): number | null {
  const taken = new Set(occupied);
  for (let slot = 1; slot <= capacity; slot += 1) if (!taken.has(slot)) return slot;
  return null;
}

export function normalizeWish(value: string): string {
  return [...value.trim().replace(/\s+/g, ' ')].slice(0, 60).join('');
}
