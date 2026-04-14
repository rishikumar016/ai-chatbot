import { createFileRoute } from '@tanstack/react-router'
import { CraftHome } from '@/features/home'

export const Route = createFileRoute('/_authenticated/')({
  component: CraftHome,
})
