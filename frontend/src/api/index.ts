import { useAuthHooks } from './modules/auth'
import { useChatHooks } from './modules/conversation'

export function useApi() {
  return {
    ...useAuthHooks(),
    ...useChatHooks(),
  }
}
