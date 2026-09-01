import { api } from './client'

export type ConversationType = 'DIRECT' | 'GROUP'

export interface ConversationMember {
  id: string
  conversationId: string
  userId: string
  joinedAt: string
  user?: { id: string; email: string; firstName: string; lastName: string; avatarUrl: string | null }
  lastReadAt?: string | null
}

export interface Conversation {
  id: string
  tenantId: string
  type: ConversationType
  name: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
  lastMessageAt: string | null
  members: ConversationMember[]
  _count?: { messages: number }
  lastMessage?: { id: string; body: string; createdAt: string; senderId: string } | null
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
  sender?: { id: string; firstName: string; lastName: string; email: string }
}

export const chatApi = {
  listConversations() {
    return api.get<Conversation[]>('/chat/conversations').then((r) => r.data)
  },
  getConversation(id: string) {
    return api.get<Conversation>(`/chat/conversations/${id}`).then((r) => r.data)
  },
  unreadCount() {
    return api.get<{ count: number }>('/chat/unread-count').then((r) => r.data)
  },
  createConversation(body: {
    type: ConversationType
    otherUserId?: string
    name?: string
    memberIds?: string[]
  }) {
    return api.post<Conversation>('/chat/conversations', body).then((r) => r.data)
  },
  listMessages(conversationId: string, query?: { limit?: number; cursor?: string }) {
    return api
      .get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`, { params: query })
      .then((r) => r.data)
  },
  sendMessage(conversationId: string, body: { body: string; documentIds?: string[] }) {
    return api
      .post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, body)
      .then((r) => r.data)
  },
  markRead(conversationId: string) {
    return api.post(`/chat/conversations/${conversationId}/read`).then(() => undefined)
  },
}

export const notificationsApi = {
  list(limit?: number) {
    return api
      .get<Array<{ id: string; tenantId: string; userId: string; type: string; title: string; body?: string | null; readAt: string | null; createdAt: string; data?: unknown }>>(
        '/notifications',
        { params: limit ? { limit } : undefined },
      )
      .then((r) => r.data)
  },
  unreadCount() {
    return api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data)
  },
  markRead(id: string) {
    return api.post(`/notifications/${id}/read`).then((r) => r.data)
  },
  markAllRead() {
    return api.post('/notifications/read-all').then((r) => r.data)
  },
}