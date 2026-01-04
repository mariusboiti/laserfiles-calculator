export type ToolSession<TState = unknown> = {
  version: number;
  savedAt: number;
  state: TState;
};

function keyFor(toolSlug: string) {
  return `lfp:toolSession:${toolSlug}`;
}

export function saveSession<TState>(toolSlug: string, session: ToolSession<TState>) {
  try {
    localStorage.setItem(keyFor(toolSlug), JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearSession(toolSlug: string) {
  try {
    localStorage.removeItem(keyFor(toolSlug));
  } catch {
    // ignore
  }
}

export function loadSession<TState = unknown>(toolSlug: string): ToolSession<TState> | null {
  try {
    const raw = localStorage.getItem(keyFor(toolSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ToolSession<TState>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof (parsed as any).version !== 'number') return null;
    if (typeof (parsed as any).savedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isSessionRecent(session: ToolSession, maxAgeMs: number) {
  return Date.now() - session.savedAt <= maxAgeMs;
}

export function loadRecentSession<TState = unknown>(
  toolSlug: string,
  options?: { maxAgeMs?: number },
): ToolSession<TState> | null {
  const maxAgeMs = options?.maxAgeMs ?? 1000 * 60 * 60 * 24 * 7;
  const session = loadSession<TState>(toolSlug);
  if (!session) return null;
  if (!isSessionRecent(session, maxAgeMs)) return null;
  return session;
}
