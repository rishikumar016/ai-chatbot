import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'

const baseURL = import.meta.env.VITE_BASE_URL

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
})

// ── Request interceptor: attach access token ──────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string> | null = null

export async function getNewToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  refreshPromise = axios
    .get<{ accessToken: string }>(`${baseURL}/auth/refresh-token`, {
      withCredentials: true,
    })
    .then((res) => {
      const newToken = res.data.accessToken
      useAuthStore.getState().setAccessToken(newToken)
      return newToken
    })
    .catch((err) => {
      useAuthStore.getState().reset()
      throw err
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true

      try {
        const newToken = await getNewToken()

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch (err) {
        return Promise.reject(err)
      }
    }

    return Promise.reject(error)
  }
)

interface LoginData {
  email: string
  password: string
}

interface SignupData {
  firstName: string
  lastName: string
  email: string
  password: string
}

// ── Raw API calls ─────────────────────────────────────────────────────
export const authApi = {
  login: (data: LoginData) =>
    apiClient.post<{ accessToken: string }>('/auth/login', {
      email: data.email,
      password: data.password,
    }),

  register: (data: SignupData) =>
    apiClient.post<{ message: string }>('/auth/register', {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
    }),

  logout: () => apiClient.get('/auth/logout'),

  refreshToken: () =>
    apiClient.get<{ accessToken: string }>('/auth/refresh-token'),

  getUser: () =>
    apiClient.get('/auth/get-user', {
      headers: { 'Cache-Control': 'no-cache' },
    }),
}

// ── TanStack Query hooks ──────────────────────────────────────────────

export function useAuthHooks() {
  const { setAccessToken, reset, setUser } = useAuthStore()

  return {
    useLogin: () => {
      return useMutation({
        mutationFn: (data: LoginData) => authApi.login(data),
        onSuccess: (response) => {
          setAccessToken(response.data.accessToken)
        },
      })
    },

    useRegister: () => {
      return useMutation({
        mutationFn: (data: SignupData) => authApi.register(data),
      })
    },

    useLogout: () => {
      const navigate = useNavigate()

      return useMutation({
        mutationFn: () => authApi.logout(),
        onSettled: () => {
          reset()
          navigate({ to: '/sign-in' })
        },
      })
    },

    useFetchUser: () => {
      return useMutation({
        mutationFn: () => authApi.getUser(),
        onSuccess: (response) => {
          setUser(response.data.user)
        },
        onError: () => {
          useAuthStore.getState().reset()
        },
      })
    },
  }
}
