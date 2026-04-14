import { useParams } from '@tanstack/react-router'
import { useApi } from '@/api'
import { useChatStore } from '@/stores/chat-store'
import { EmptyChat } from './empty-chat'
import { MessageInput } from './message-input'
import { MessageList } from './message-list'

export function ChatArea() {
  const { conversationId } = useParams({ strict: false })
  const { useConversationById } = useApi()
  const {
    data: conversation,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useConversationById(conversationId ?? '')
  const { isTyping, streamingContent, isSearching } = useChatStore()

  const hasMessages = conversation && conversation.messages.length > 0

  if (isLoading) {
    return (
      <div className='flex flex-1 items-center justify-center'>
        <p className='text-sm text-muted-foreground'>Loading conversation...</p>
      </div>
    )
  }

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      {hasMessages ? (
        <MessageList
          messages={conversation.messages}
          isTyping={isTyping}
          streamingContent={streamingContent}
          isSearching={isSearching}
          hasOlderMessages={!!hasNextPage}
          isLoadingOlder={isFetchingNextPage}
          onLoadOlder={() => fetchNextPage()}
        />
      ) : (
        <EmptyChat />
      )}
      <MessageInput conversationId={conversationId} />
    </div>
  )
}
