export async function generateSilhouetteImage(prompt: string): Promise<{ dataUrl: string }> {
  const p = (prompt || '').trim();
  if (!p) throw new Error('Missing prompt');

  const res = await fetch('/api/ai/silhouette', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: p }),
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errJson: any = await res.json().catch(() => ({}));
      throw new Error(errJson?.error || 'AI image generation failed');
    }
    const text = await res.text().catch(() => '');
    throw new Error(text || 'AI image generation failed');
  }

  const json: any = await res.json();
  const dataUrl = typeof json?.dataUrl === 'string' ? json.dataUrl : '';
  if (!dataUrl) throw new Error('AI image endpoint returned no dataUrl');

  return { dataUrl };
}

export async function getSilhouetteAiStatus(): Promise<{ configured: boolean; message?: string }> {
  const res = await fetch('/api/ai/silhouette', { method: 'GET' });
  if (!res.ok) {
    return { configured: false, message: 'AI status check failed' };
  }
  const json: any = await res.json().catch(() => ({}));
  return {
    configured: !!json?.configured,
    message: typeof json?.message === 'string' ? json.message : undefined,
  };
}
