import { createFileRoute } from '@tanstack/react-router'
import { ChatLayout } from '@/features/chat/components/chat-layout'

export const Route = createFileRoute('/_authenticated/chat')({
  component: ChatLayout,
})
