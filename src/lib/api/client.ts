const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

/** Keeps a request from hanging indefinitely when the backend stops answering. */
const DEFAULT_TIMEOUT_MS = 15_000

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// The backend returns {"error": "..."} for every failure (httpserver.WriteError),
// so prefer that over a generic string — callers surface it to the user.
export async function readErrorMessage(res: Response, path: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown }
    if (typeof body.error === 'string' && body.error !== '') return body.error
  } catch {
    // empty or non-JSON body — fall through to the generic message
  }
  return `API error ${res.status}: ${path}`
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`
  const res = await fetch(url, {
    ...options,
    signal: options?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res, path))
  }

  // Releasing a claim answers 204 with no body, where json() would throw and
  // make a successful call look like a failure.
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as unknown as T
  }

  return res.json() as Promise<T>
}
