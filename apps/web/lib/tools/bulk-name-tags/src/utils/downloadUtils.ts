import JSZip from 'jszip';
import type { GeneratedSVG } from '../types';

export function downloadSVG(svg: string, fileName: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadZip(files: GeneratedSVG[], zipFileName: string): Promise<void> {
  const zip = new JSZip();

  files.forEach(file => {
    zip.file(file.fileName, file.svg);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
