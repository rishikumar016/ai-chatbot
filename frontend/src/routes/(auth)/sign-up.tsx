import { createFileRoute } from '@tanstack/react-router'
import { requireGuest } from '@/lib/auth-guard'
import { SignUp } from '@/features/auth/sign-up'

export const Route = createFileRoute('/(auth)/sign-up')({
  beforeLoad: requireGuest,
  component: SignUp,
})
