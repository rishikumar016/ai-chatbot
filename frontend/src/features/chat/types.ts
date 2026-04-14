export interface Message {
  _id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  updatedAt: string
}

export interface Pagination {
  page: number
  limit: number
  totalMessages: number
  totalPages: number
}

export interface Conversation {
  _id: string
  title: string
  messages: Message[]
  totalTokensUsed: number
  createdAt: string
  updatedAt: string
  pagination?: Pagination
}
