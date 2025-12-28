import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function downloadZip(
  filename: string,
  files: { name: string; content: string }[]
) {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.name, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, filename);
}
