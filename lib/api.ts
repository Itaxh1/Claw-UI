const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface User {
  _id: string
  username: string
  email: string
}

export interface Chat {
  _id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  _id: string
  chatId: string
  content: string
  type: "user" | "assistant"
  code?: string
  framework?: string
  timestamp: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "An error occurred",
        }
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      }
    }
  }

  // Authentication
  async register(username: string, email: string): Promise<ApiResponse<{ user: User }>> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email }),
    })
  }

  async getProfile(userId: string): Promise<ApiResponse<User>> {
    return this.request(`/api/auth/profile/${userId}`)
  }

  // Chat
  async createChat(userId: string, title: string): Promise<ApiResponse<Chat>> {
    return this.request("/api/chat/create", {
      method: "POST",
      body: JSON.stringify({ userId, title }),
    })
  }

  async getUserChats(userId: string): Promise<ApiResponse<Chat[]>> {
    return this.request(`/api/chat/user/${userId}`)
  }

  async getChat(chatId: string): Promise<ApiResponse<Chat & { messages: Message[] }>> {
    return this.request(`/api/chat/${chatId}`)
  }

  async sendMessage(chatId: string, content: string, framework = "next.js"): Promise<ApiResponse<Message>> {
    return this.request(`/api/chat/${chatId}/message`, {
      method: "POST",
      body: JSON.stringify({ content, framework }),
    })
  }

  // Download
  async downloadCode(downloadId: string): Promise<Blob | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/download/${downloadId}`)
      if (response.ok) {
        return await response.blob()
      }
      return null
    } catch (error) {
      console.error("Download error:", error)
      return null
    }
  }

  // Preview
  async getPreviewStatus(previewId: string): Promise<ApiResponse<{ status: string; url?: string }>> {
    return this.request(`/api/preview/${previewId}/status`)
  }
}

export const api = new ApiClient()
