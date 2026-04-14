import { createFileRoute } from '@tanstack/react-router'
import { requireGuest } from '@/lib/auth-guard'
import { ForgotPassword } from '@/features/auth/forgot-password'

export const Route = createFileRoute('/(auth)/forgot-password')({
  beforeLoad: requireGuest,
  component: ForgotPassword,
})
