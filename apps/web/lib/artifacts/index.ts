/**
 * Artifacts Module Index
 * Re-exports client utilities for artifact management
 */

export {
  fetchArtifacts,
  fetchArtifact,
  createArtifact,
  deleteArtifact,
  getToolDisplayName,
  formatDimensions,
  addToPriceCalculator,
  type Artifact,
  type ArtifactMeta,
  type CreateArtifactParams,
  type FetchArtifactsParams,
  type FetchArtifactsResult,
} from './client';

export { sanitizeSvg, extractSvgMeta, normalizeSvgDimensions, type SvgMeta } from './svg';
