import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { SVGInfo, Settings, GridInfo, TileInfo } from '../../types';
import { getBaseFileName } from './parser';
import { generateAssemblyMapSVG } from './assemblyMap';

interface ExportOptions {
  svgInfo: SVGInfo;
  settings: Settings;
  gridInfo: GridInfo;
  tiles: TileInfo[];
  t?: (key: string) => string;
}

export function generateReadme(options: ExportOptions): string {
  const { svgInfo, settings, gridInfo, tiles } = options;
  const nonEmptyTiles = tiles.filter(t => !t.isEmpty);
  const unsafeTiles = tiles.filter(t => t.hasUnsafeFallback);

  const tr = (key: string, fallback: string) => {
    try {
      return options.t ? options.t(key) : fallback;
    } catch {
      return fallback;
    }
  };

  const lines = [
    '========================================',
    tr('panel_splitter.readme.export_summary_title', 'Panel Splitter - Export Summary'),
    '========================================',
    '',
    tr('panel_splitter.readme.input_design_title', 'INPUT DESIGN'),
    `  ${tr('panel_splitter.readme.file_label', 'File')}: ${svgInfo.fileName}`,
    `  ${tr('panel_splitter.readme.size_label', 'Size')}: ${svgInfo.detectedWidthMm.toFixed(2)} x ${svgInfo.detectedHeightMm.toFixed(2)} mm`,
    '',
    tr('panel_splitter.readme.bed_settings_title', 'BED SETTINGS'),
    `  ${tr('panel_splitter.readme.bed_size_label', 'Bed Size')}: ${settings.bedWidth} x ${settings.bedHeight} mm`,
    `  ${tr('panel_splitter.readme.margin_label', 'Margin')}: ${settings.margin} mm`,
    `  ${tr('panel_splitter.readme.overlap_label', 'Overlap')}: ${settings.overlap} mm`,
    `  ${tr('panel_splitter.readme.export_mode_label', 'Export Mode')}: ${
      settings.exportMode === 'laser-safe'
        ? tr('panel_splitter.readme.export_mode_laser_safe', 'Laser-Safe Trim')
        : tr('panel_splitter.readme.export_mode_fast_clip', 'Fast Clip')
    }`,
    '',
    tr('panel_splitter.readme.grid_layout_title', 'GRID LAYOUT'),
    `  ${tr('panel_splitter.readme.rows_label', 'Rows')}: ${gridInfo.rows}`,
    `  ${tr('panel_splitter.readme.columns_label', 'Columns')}: ${gridInfo.cols}`,
    `  ${tr('panel_splitter.readme.total_tiles_label', 'Total Tiles')}: ${tiles.length}`,
    `  ${tr('panel_splitter.readme.non_empty_tiles_label', 'Non-Empty Tiles')}: ${nonEmptyTiles.length}`,
    `  ${tr('panel_splitter.readme.effective_tile_area_label', 'Effective Tile Area')}: ${gridInfo.effectiveTileWidth.toFixed(2)} x ${gridInfo.effectiveTileHeight.toFixed(2)} mm`,
    '',
    tr('panel_splitter.readme.numbering_title', 'NUMBERING'),
    `  ${tr('panel_splitter.readme.format_label', 'Format')}: ${settings.numberingFormat}`,
    `  ${tr('panel_splitter.readme.enabled_label', 'Enabled')}: ${settings.numberingEnabled ? tr('panel_splitter.readme.yes', 'Yes') : tr('panel_splitter.readme.no', 'No')}`,
    '',
    tr('panel_splitter.readme.tile_list_title', 'TILE LIST'),
  ];

  for (const tile of tiles) {
    const status = tile.isEmpty
      ? ` (${tr('panel_splitter.readme.tile_status_empty', 'EMPTY')})`
      : tile.hasUnsafeFallback
        ? ` (${tr('panel_splitter.readme.tile_status_unsafe_fallback', 'UNSAFE FALLBACK')})`
        : '';

    lines.push(
      tr('panel_splitter.readme.tile_line', '  {label}: Row {row}, Col {col}{status}')
        .replace('{label}', tile.label)
        .replace('{row}', String(tile.row + 1))
        .replace('{col}', String(tile.col + 1))
        .replace('{status}', status)
    );
  }

  if (unsafeTiles.length > 0) {
    lines.push('');
    lines.push(tr('panel_splitter.readme.warning_unsafe_fallback_title', '⚠️  WARNING: UNSAFE FALLBACK TILES'));
    lines.push(tr('panel_splitter.readme.warning_unsafe_fallback_body_1', 'The following tiles contain geometry that could not be properly trimmed.'));
    lines.push(tr('panel_splitter.readme.warning_unsafe_fallback_body_2', 'Boolean operations failed, so the original shapes were included without clipping.'));
    lines.push(tr('panel_splitter.readme.warning_unsafe_fallback_body_3', 'Please verify these tiles manually in your laser software:'));
    for (const tile of unsafeTiles) {
      lines.push(`  - ${tile.label}`);
    }
  }

  if (settings.exportMode === 'fast-clip') {
    lines.push('');
    lines.push(tr('panel_splitter.readme.warning_fast_clip_title', '⚠️  WARNING: FAST CLIP MODE'));
    lines.push(tr('panel_splitter.readme.warning_fast_clip_body_1', 'Tiles were exported using clipPath, not real geometry trimming.'));
    lines.push(tr('panel_splitter.readme.warning_fast_clip_body_2', 'Some laser software (e.g., older LightBurn versions) may ignore clip paths.'));
    lines.push(tr('panel_splitter.readme.warning_fast_clip_body_3', 'If you see artifacts, re-export using Laser-Safe Trim mode.'));
  }

  if (settings.registrationMarks.enabled) {
    lines.push('');
    lines.push(tr('panel_splitter.readme.registration_marks_title', 'REGISTRATION MARKS'));
    lines.push(`  ${tr('panel_splitter.readme.type_label', 'Type')}: ${settings.registrationMarks.type}`);
    lines.push(`  ${tr('panel_splitter.readme.placement_label', 'Placement')}: ${settings.registrationMarks.placement}`);
    lines.push(`  ${tr('panel_splitter.readme.reg_size_label', 'Size')}: ${settings.registrationMarks.size} mm`);
    lines.push(`  ${tr('panel_splitter.readme.stroke_width_label', 'Stroke Width')}: ${settings.registrationMarks.strokeWidth} mm`);
    if (settings.registrationMarks.type === 'pinhole') {
      lines.push(`  ${tr('panel_splitter.readme.hole_diameter_label', 'Hole Diameter')}: ${settings.registrationMarks.holeDiameter} mm`);
    }
  }

  lines.push('');
  lines.push(tr('panel_splitter.readme.assembly_tips_title', 'ASSEMBLY TIPS'));
  lines.push(tr('panel_splitter.readme.assembly_tip_1', '1. Start with tile R01C01 (top-left corner)'));
  lines.push(tr('panel_splitter.readme.assembly_tip_2', '2. Work left-to-right, then top-to-bottom'));
  lines.push(tr('panel_splitter.readme.assembly_tip_3', '3. If overlap is set, align overlapping edges carefully'));
  lines.push(tr('panel_splitter.readme.assembly_tip_4', '4. Use registration marks if guides were enabled'));
  lines.push('');
  lines.push(tr('panel_splitter.readme.generated_by', 'Generated by Panel Splitter - LaserFilesPro'));
  lines.push(
    tr('panel_splitter.readme.date_line', 'Date: {date}').replace('{date}', new Date().toISOString())
  );

  return lines.join('\n');
}

export async function exportToZip(
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const { svgInfo, settings, gridInfo, tiles } = options;
  const baseName = getBaseFileName(svgInfo.fileName);
  const nonEmptyTiles = tiles.filter(t => !t.isEmpty && t.svgContent);

  const zip = new JSZip();
  
  // Create panel-splitter folder inside ZIP
  const folder = zip.folder('panel-splitter');
  if (!folder) throw new Error('panel_splitter.error.zip_create_folder_failed');
  
  const hasAssemblyMap = settings.assemblyMap.enabled;
  const total = nonEmptyTiles.length + 1 + (hasAssemblyMap ? 1 : 0);

  // Add tiles with standardized naming: tile-r{row}-c{col}.svg
  for (let i = 0; i < nonEmptyTiles.length; i++) {
    const tile = nonEmptyTiles[i];
    const row = tile.row + 1;
    const col = tile.col + 1;
    const fileName = `tile-r${row}-c${col}.svg`;
    
    // Add metadata comment to SVG
    const svgWithMetadata = tile.svgContent!.replace(
      '<svg',
      `<!-- Panel Splitter: row ${row} / col ${col} -->\n<svg`
    );
    
    folder.file(fileName, svgWithMetadata);
    onProgress?.(i + 1, total);
  }

  const readme = generateReadme(options);
  folder.file('README.txt', readme);

  if (hasAssemblyMap) {
    const assemblyMap = generateAssemblyMapSVG(svgInfo, settings, gridInfo, tiles, options.t);
    folder.file('assembly_map.svg', assemblyMap);
  }

  onProgress?.(total, total);

  // Generate standardized ZIP filename: panel-splitter-{cols}x{rows}-{bedW}x{bedH}.zip
  const zipFilename = `panel-splitter-${gridInfo.cols}x${gridInfo.rows}-${settings.bedWidth}x${settings.bedHeight}.zip`;
  
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, zipFilename);
}
