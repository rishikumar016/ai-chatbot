import { useEffect, useRef } from 'react'
import { Loader2, Search, Sparkles } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import type { Message } from '../types'
import { ChatMessage } from './chat-message'

interface MessageListProps {
  messages: Message[]
  isTyping: boolean
  streamingContent: string
  isSearching: boolean
  hasOlderMessages: boolean
  isLoadingOlder: boolean
  onLoadOlder: () => void
}

export function MessageList({
  messages,
  isTyping,
  streamingContent,
  isSearching,
  hasOlderMessages,
  isLoadingOlder,
  onLoadOlder,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevMessageCount = useRef(messages.length)

  // Auto-scroll to bottom on new messages or streaming content, but not when loading older
  useEffect(() => {
    if (scrollRef.current && messages.length >= prevMessageCount.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    prevMessageCount.current = messages.length
  }, [messages, streamingContent, isTyping])

  return (
    <ScrollArea className='flex-1 px-4'>
      <div ref={scrollRef} className='mx-auto max-w-3xl py-6'>
        {/* Load older messages button */}
        {hasOlderMessages && (
          <div className='mb-4 flex justify-center'>
            <Button
              variant='ghost'
              size='sm'
              onClick={onLoadOlder}
              disabled={isLoadingOlder}
              className='text-xs text-muted-foreground'
            >
              {isLoadingOlder ? (
                <>
                  <Loader2 className='mr-1.5 h-3 w-3 animate-spin' />
                  Loading...
                </>
              ) : (
                'Load older messages'
              )}
            </Button>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message._id} message={message} />
        ))}

        {/* Streaming message bubble */}
        {isTyping && streamingContent && (
          <ChatMessage
            message={{
              _id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }}
          />
        )}

        {/* Searching indicator */}
        {isSearching && (
          <div className='flex items-center gap-2.5 py-2'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-craft-gold-glow'>
              <Search className='h-4 w-4 animate-pulse text-craft-gold' />
            </div>
            <span className='text-xs tracking-[0.15em] text-muted-foreground uppercase'>
              Searching the web...
            </span>
          </div>
        )}

        {/* Typing indicator (before first token arrives) */}
        {isTyping && !streamingContent && !isSearching && (
          <div className='flex items-center gap-2.5 py-4'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-craft-gold-glow'>
              <Sparkles className='h-4 w-4 animate-pulse text-craft-gold' />
            </div>
            <span className='text-xs tracking-[0.15em] text-muted-foreground uppercase'>
              The Curator is composing...
            </span>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
