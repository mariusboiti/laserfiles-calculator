import { downloadTextFile } from '@/lib/studio/export/download';

export function exportSingleSvg(filename: string, svg: string) {
  downloadTextFile(filename, svg, 'image/svg+xml');
}
