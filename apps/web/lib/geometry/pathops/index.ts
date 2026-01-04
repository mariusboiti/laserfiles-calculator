/**
 * Shared PathOps Geometry Engine
 * Used by: Keychain, Badge, Ornament, Coaster tools
 */

export { loadPathOps, isPathOpsLoaded } from './loadPathOps';
export type { PathOps, StrokeOpts } from './loadPathOps';

export { mmToU, uToMm, U_PER_MM } from './units';

export { 
  textCache, 
  iconCache, 
  geomCache,
  clearAllCaches 
} from './cache';
