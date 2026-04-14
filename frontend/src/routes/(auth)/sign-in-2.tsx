import { createFileRoute } from '@tanstack/react-router'
import { requireGuest } from '@/lib/auth-guard'
import { SignIn2 } from '@/features/auth/sign-in/sign-in-2'

export const Route = createFileRoute('/(auth)/sign-in-2')({
  beforeLoad: requireGuest,
  component: SignIn2,
})
