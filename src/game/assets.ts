/** Standalone, testable contract for author-supplied glTF/GLB models. */
export const TRAVELER_REQUIRED_CLIPS = ['Idle', 'Walk', 'Bow', 'PlaceIncense'] as const;
export const TRAVELER_REQUIRED_NODES = ['Hand_R', 'Elbow_R', 'Wrist_R', 'IncenseGrip'] as const;
export const TRAVELER_OPTIONAL_CLIPS = ['HoldIncense', 'TakeIncense', 'LightIncense'] as const;
export const TRAVELER_EXPECTED_HEIGHT = 1.55;
export const TRAVELER_TECH_DEMO_URL = '/models/traveler-tech-demo.glb';

/** The shipped technical GLB is enabled by default; an explicit blank value disables it. */
export function resolveTravelerAssetUrl(configured: string | undefined): string | null {
  return configured === undefined ? TRAVELER_TECH_DEMO_URL : normalizePublicGlbPath(configured);
}
export const DEITY_EXPECTED_HEIGHT = 2.85;
export const DEITY_TECH_DEMO_URL = '/models/wenchang-deity-tech-demo.glb';

/** Default to shipped technical model; explicit blank restores the procedural placeholder. */
export function resolveDeityAssetUrl(configured: string | undefined): string | null {
  return configured === undefined ? DEITY_TECH_DEMO_URL : normalizePublicGlbPath(configured);
}

export const DEITY_REQUIRED_NODES = [
  'WenchangRoot','RightHand','LeftHand','WritingBrush','Scroll',
] as const;

/** Deity model is static but prop attachment names are part of the authoring contract. */
export function validateDeityContract(names: readonly string[]) {
  const found=new Set(names);
  const missingNodes=DEITY_REQUIRED_NODES.filter(name=>!found.has(name));
  return {valid:missingNodes.length===0,missingNodes};
}

/** For a model facing +Z, its anatomical right side must be -X. */
export function isDeityHandednessCorrect(rightX:number,leftX:number):boolean {
  return Number.isFinite(rightX)&&Number.isFinite(leftX)&&rightX < -0.05 && leftX > 0.05;
}

/**
 * Restrict asset URLs to the app's public/ directory.
 * An empty environment value means "keep the procedural fallback".
 * No remote URL or traversal path should be silently fetched.
 */
export function normalizePublicGlbPath(value: string | undefined | null): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  const [pathname, query] = path.split('?');
  if (!pathname || path.split('?').length > 2 || !pathname.toLowerCase().endsWith('.glb')) return null;
  if (pathname.split('/').some(segment => segment === '..' || segment === '.')) return null;
  if (!/^\/[\w./-]+$/u.test(pathname)) return null;
  if (query && !/^[\w=&.-]+$/u.test(query)) return null;
  return path;
}

export type AssetValidation = Readonly<{
  valid: boolean;
  missingClips: readonly string[];
  missingNodes: readonly string[];
}>;

/** Explicitly named transforms keep authoring deterministic across DCC packages. */
export function validateTravelerContract(nodeNames: readonly string[], clipNames: readonly string[]): AssetValidation {
  const nodes = new Set(nodeNames);
  const clips = new Set(clipNames);
  const missingClips = TRAVELER_REQUIRED_CLIPS.filter(name => !clips.has(name));
  const missingNodes = TRAVELER_REQUIRED_NODES.filter(name => !nodes.has(name));
  return {valid: missingClips.length === 0 && missingNodes.length === 0, missingClips, missingNodes};
}

/** GLB preflight: informative warning rather than changing user-authored mesh scale. */
export function evaluateModelHeight(actual: number, expected: number, tolerance = 0.15): boolean {
  return Number.isFinite(actual) && Number.isFinite(expected)
    && expected > 0 && tolerance >= 0
    && Math.abs(actual - expected) <= expected * tolerance;
}

/** Use a single timeline across procedural and GLB animation implementations. */
export function selectTravelerClip(
  ritualKind: 'explore' | 'incense' | 'fortune' | 'blessing',
  incenseStep: string | null,
  walking: boolean,
): string {
  if (ritualKind === 'incense') {
    if (incenseStep === 'approach') return 'Walk';
    if (incenseStep === 'bowing') return 'Bow';
    if (incenseStep === 'placing') return 'PlaceIncense';
    // Resting states must not repeatedly loop one-shot Take/Light animations.
    if (incenseStep === 'light' || incenseStep === 'hold'
      || incenseStep === 'bow' || incenseStep === 'place') return 'HoldIncense';
  }
  return walking && ritualKind === 'explore' ? 'Walk' : 'Idle';
}
