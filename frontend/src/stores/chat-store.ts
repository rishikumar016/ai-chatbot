import { create } from 'zustand'

interface ChatState {
  activeConversationId: string | null
  isTyping: boolean
  streamingContent: string
  isSearching: boolean
  setActiveConversation: (id: string | null) => void
  setIsTyping: (isTyping: boolean) => void
  appendStreamingContent: (chunk: string) => void
  resetStreaming: () => void
  setIsSearching: (isSearching: boolean) => void
}

export const useChatStore = create<ChatState>()((set) => ({
  activeConversationId: null,
  isTyping: false,
  streamingContent: '',
  isSearching: false,
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setIsTyping: (isTyping) => set({ isTyping }),
  appendStreamingContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),
  resetStreaming: () => set({ streamingContent: '', isTyping: false, isSearching: false }),
  setIsSearching: (isSearching) => set({ isSearching }),
}))
