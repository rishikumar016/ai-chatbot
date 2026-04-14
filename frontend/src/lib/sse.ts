import { useAuthStore } from '@/stores/auth-store'
import { getNewToken } from '@/api/modules/auth'

const baseURL = import.meta.env.VITE_BASE_URL

export interface SSECallbacks {
  onToken?: (content: string) => void
  onToolStart?: (name: string) => void
  onToolResult?: (name: string) => void
  onUserMessage?: (msg: {
    id: string
    role: string
    content: string
    timestamp: string
  }) => void
  onConversation?: (data: { id: string; title: string }) => void
  onDone?: (data: Record<string, unknown>) => void
  onError?: (error: string) => void
}

function buildFetchOptions(
  body: Record<string, unknown>,
  signal: AbortSignal
): RequestInit {
  const token = useAuthStore.getState().accessToken
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
    signal,
  }
}

async function readSSEStream(
  response: Response,
  callbacks: SSECallbacks
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) {
    callbacks.onError?.('No response body')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    let currentEvent = ''

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        const rawData = line.slice(6)
        try {
          const data = JSON.parse(rawData)
          switch (currentEvent) {
            case 'token':
              callbacks.onToken?.(data.content)
              break
            case 'tool_start':
              callbacks.onToolStart?.(data.name)
              break
            case 'tool_result':
              callbacks.onToolResult?.(data.name)
              break
            case 'userMessage':
              callbacks.onUserMessage?.(data)
              break
            case 'conversation':
              callbacks.onConversation?.(data)
              break
            case 'done':
              callbacks.onDone?.(data)
              break
            case 'error':
              callbacks.onError?.(data.message)
              break
          }
        } catch {
          // Skip malformed JSON lines
        }
        currentEvent = ''
      }
    }
  }
}

/**
 * Perform a streaming POST request via SSE using fetch + ReadableStream.
 * Automatically retries once on 401 after refreshing the access token.
 * Returns an AbortController so the caller can cancel.
 */
export function streamSSE(
  path: string,
  body: Record<string, unknown>,
  callbacks: SSECallbacks
): AbortController {
  const controller = new AbortController()
  const url = `${baseURL}${path}`

  ;(async () => {
    try {
      let response = await fetch(url, buildFetchOptions(body, controller.signal))

      // On 401, refresh the token and retry once
      if (response.status === 401) {
        try {
          await getNewToken()
          response = await fetch(url, buildFetchOptions(body, controller.signal))
        } catch {
          callbacks.onError?.('Session expired. Please sign in again.')
          return
        }
      }

      if (!response.ok) {
        const text = await response.text()
        callbacks.onError?.(text || `HTTP ${response.status}`)
        return
      }

      await readSSEStream(response, callbacks)
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        callbacks.onError?.(err.message || 'Stream failed')
      }
    }
  })()

  return controller
}
