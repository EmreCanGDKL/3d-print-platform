export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal || controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();

  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error(fallbackMessage);
  }
}

