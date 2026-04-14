import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { Conversation, Message } from '@/features/chat/types'
import { apiClient } from './auth'
import { streamSSE } from '@/lib/sse'
import { useChatStore } from '@/stores/chat-store'
import { useCallback, useRef } from 'react'

// ── Response types (match backend shapes) ─────────────────────────────

interface CreateConversationResponse {
  id: string
  title: string
  messages: []
  userMessage?: {
    id: string
    role: string
    content: string
    timestamp: string
  }
  assistantMessage?: {
    id: string
    role: string
    content: string
    timestamp: string
  }
  tokensUsed?: number
}

interface ConversationListItem {
  _id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface SendMessageResponse {
  userMessage: {
    id: string
    role: string
    content: string
    timestamp: string
  }
  assistantMessage: {
    id: string
    role: string
    content: string
    timestamp: string
  }
  tokensUsed: number
}

// ── Raw API calls ─────────────────────────────────────────────────────

export const chatApi = {
  createConversation: (data?: { content?: string }) =>
    apiClient.post<CreateConversationResponse>(
      '/chat/conversations',
      data ?? {}
    ),

  getConversations: () =>
    apiClient.get<ConversationListItem[]>('/chat/conversations'),

  getConversation: (id: string) =>
    apiClient.get<Conversation>(`/chat/conversations/${id}`),

  getConversationPage: (id: string, page: number, limit: number = 50) =>
    apiClient.get<Conversation>(
      `/chat/conversations/${id}?page=${page}&limit=${limit}`
    ),

  deleteConversation: (id: string) =>
    apiClient.delete(`/chat/conversations/${id}`),

  sendMessage: (conversationId: string, content: string) =>
    apiClient.post<SendMessageResponse>(
      `/chat/conversations/${conversationId}/messages`,
      { content }
    ),
}

// ── Query keys ────────────────────────────────────────────────────────

export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...chatKeys.all, 'conversation', id] as const,
}

const MESSAGES_PER_PAGE = 50

// ── React Query hooks ─────────────────────────────────────────────────

export function useChatHooks() {
  const queryClient = useQueryClient()

  return {
    useConversations: () => {
      return useQuery({
        queryKey: chatKeys.conversations(),
        queryFn: async () => {
          const res = await chatApi.getConversations()
          return Array.isArray(res.data) ? res.data : []
        },
      })
    },

    /**
     * Paginated conversation fetcher using infinite query.
     * Page 1 = most recent messages. Higher pages = older messages.
     */
    useConversationById: (id: string) => {
      return useInfiniteQuery({
        queryKey: chatKeys.conversation(id),
        queryFn: async ({ pageParam }) => {
          const res = await chatApi.getConversationPage(
            id,
            pageParam,
            MESSAGES_PER_PAGE
          )
          return res.data
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
          if (!lastPage.pagination) return undefined
          const { page, totalPages } = lastPage.pagination
          return page < totalPages ? page + 1 : undefined
        },
        enabled: !!id,
        select: (data) => {
          // Merge pages: newer pages first, so reverse to get chronological order
          // Page 1 = newest, page N = oldest. We want oldest first in the array.
          const allMessages: Message[] = []
          // Iterate pages in reverse (oldest page first)
          for (let i = data.pages.length - 1; i >= 0; i--) {
            allMessages.push(...data.pages[i].messages)
          }
          const firstPage = data.pages[0]
          return {
            _id: firstPage._id,
            title: firstPage.title,
            messages: allMessages,
            totalTokensUsed: firstPage.totalTokensUsed,
            createdAt: firstPage.createdAt,
            updatedAt: firstPage.updatedAt,
            pagination: firstPage.pagination,
          }
        },
      })
    },

    useCreateConversation: () => {
      return useMutation({
        mutationFn: (data?: { content?: string }) =>
          chatApi.createConversation(data),
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: chatKeys.conversations(),
          })
        },
      })
    },

    useDeleteConversation: () => {
      return useMutation({
        mutationFn: (id: string) => chatApi.deleteConversation(id),
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: chatKeys.conversations(),
          })
        },
      })
    },

    useSendMessage: () => {
      return useMutation({
        mutationFn: ({
          conversationId,
          content,
        }: {
          conversationId: string
          content: string
        }) => chatApi.sendMessage(conversationId, content),
        onSuccess: (_data, variables) => {
          queryClient.invalidateQueries({
            queryKey: chatKeys.conversation(variables.conversationId),
          })
        },
      })
    },

    /**
     * Stream a message to an existing conversation via SSE.
     * Returns { send, abort } — call send(conversationId, content) to start.
     */
    useStreamMessage: () => {
      const abortRef = useRef<AbortController | null>(null)
      const {
        setIsTyping,
        appendStreamingContent,
        resetStreaming,
        setIsSearching,
      } = useChatStore()

      const send = useCallback(
        (conversationId: string, content: string): Promise<void> => {
          return new Promise((resolve, reject) => {
            resetStreaming()
            setIsTyping(true)

            // Optimistically add the user message to the cache
            queryClient.setQueryData(
              chatKeys.conversation(conversationId),
              (old: unknown) => {
                if (!old || typeof old !== 'object') return old
                const oldData = old as {
                  pages: Conversation[]
                  pageParams: number[]
                }
                if (!oldData.pages?.length) return old
                const newPages = [...oldData.pages]
                newPages[0] = {
                  ...newPages[0],
                  messages: [
                    ...newPages[0].messages,
                    {
                      _id: `temp-user-${Date.now()}`,
                      role: 'user' as const,
                      content,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  ],
                }
                return { ...oldData, pages: newPages }
              }
            )

            abortRef.current = streamSSE(
              `/chat/conversations/${conversationId}/messages/stream`,
              { content },
              {
                onToken: (chunk) => {
                  appendStreamingContent(chunk)
                },
                onToolStart: () => {
                  setIsSearching(true)
                },
                onToolResult: () => {
                  setIsSearching(false)
                },
                onDone: () => {
                  resetStreaming()
                  queryClient.invalidateQueries({
                    queryKey: chatKeys.conversation(conversationId),
                  })
                  queryClient.invalidateQueries({
                    queryKey: chatKeys.conversations(),
                  })
                  resolve()
                },
                onError: (err) => {
                  resetStreaming()
                  queryClient.invalidateQueries({
                    queryKey: chatKeys.conversation(conversationId),
                  })
                  reject(new Error(err))
                },
              }
            )
          })
        },
        [
          queryClient,
          setIsTyping,
          appendStreamingContent,
          resetStreaming,
          setIsSearching,
        ]
      )

      const abort = useCallback(() => {
        abortRef.current?.abort()
        resetStreaming()
      }, [resetStreaming])

      return { send, abort }
    },

    /**
     * Create a new conversation and stream the first AI response via SSE.
     * Returns { send, abort } — call send(content) to start.
     */
    useStreamCreateConversation: () => {
      const abortRef = useRef<AbortController | null>(null)
      const {
        setIsTyping,
        appendStreamingContent,
        resetStreaming,
        setIsSearching,
      } = useChatStore()

      const send = useCallback(
        (
          content: string
        ): Promise<{ conversationId: string; title: string }> => {
          return new Promise((resolve, reject) => {
            resetStreaming()
            setIsTyping(true)

            let conversationId = ''
            let title = ''

            abortRef.current = streamSSE(
              '/chat/conversations/stream',
              { content },
              {
                onConversation: (data) => {
                  conversationId = data.id
                  title = data.title
                },
                onToken: (chunk) => {
                  appendStreamingContent(chunk)
                },
                onToolStart: () => {
                  setIsSearching(true)
                },
                onToolResult: () => {
                  setIsSearching(false)
                },
                onDone: () => {
                  resetStreaming()
                  queryClient.invalidateQueries({
                    queryKey: chatKeys.conversations(),
                  })
                  if (conversationId) {
                    queryClient.invalidateQueries({
                      queryKey: chatKeys.conversation(conversationId),
                    })
                  }
                  resolve({ conversationId, title })
                },
                onError: (err) => {
                  resetStreaming()
                  reject(new Error(err))
                },
              }
            )
          })
        },
        [
          queryClient,
          setIsTyping,
          appendStreamingContent,
          resetStreaming,
          setIsSearching,
        ]
      )

      const abort = useCallback(() => {
        abortRef.current?.abort()
        resetStreaming()
      }, [resetStreaming])

      return { send, abort }
    },
  }
}
