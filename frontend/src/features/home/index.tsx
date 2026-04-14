import { EmptyChat } from '@/features/chat/components/empty-chat'
import { MessageInput } from '@/features/chat/components/message-input'

export function CraftHome() {
  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <EmptyChat />
      <MessageInput />
    </div>
  )
}
