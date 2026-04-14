import { redirect } from '@tanstack/react-router'
import { authApi } from '@/api/modules/auth'
import { useAuthStore } from '@/stores/auth-store'

async function isAuthenticated(): Promise<boolean> {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) return true

  try {
    const res = await authApi.refreshToken()
    useAuthStore.getState().setAccessToken(res.data.accessToken)
    return true
  } catch {
    return false
  }
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    throw redirect({ to: '/sign-in' })
  }
}

export async function requireGuest() {
  if (await isAuthenticated()) {
    throw redirect({ to: '/' })
  }
}
