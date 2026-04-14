import { createFileRoute } from '@tanstack/react-router'
import { requireGuest } from '@/lib/auth-guard'
import { Otp } from '@/features/auth/otp'

export const Route = createFileRoute('/(auth)/otp')({
  beforeLoad: requireGuest,
  component: Otp,
})
