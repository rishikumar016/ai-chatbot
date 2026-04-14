import { createFileRoute } from '@tanstack/react-router'
import { ChatArea } from '@/features/chat/components/chat-area'

export const Route = createFileRoute('/_authenticated/chat/$conversationId')({
  component: ChatArea,
})
