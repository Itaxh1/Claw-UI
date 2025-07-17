const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface User {
  _id: string
  username: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface MessageContent {
  version: number
  text: string
  editedAt: string
}

export interface CodeFile {
  path: string
  content: string
  type: string
  language: string
  size: number
  description: string
}

export interface CodeResponse {
  files: CodeFile[]
  framework: string
  language: string
  gameFeatures: string[]
  downloadUrl: string
  instructions: string
}

export interface LLMResponse {
  version: number
  provider: string
  textResponse: string
  codeResponse?: CodeResponse
  thinking?: string
  status: "generating" | "completed" | "error" | "verified"
  error?: string
  createdAt: string
  metrics?: {
    generationTime: number
    codeLines: number
    filesGenerated: number
  }
}

export interface Attachment {
  _id: string
  messageId: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  uploadedAt: string
  downloadUrl: string
}

export interface Message {
  _id: string
  conversationId: string
  role: "user" | "assistant"
  content: MessageContent[]
  attachments?: Attachment[]
  llmResponse?: LLMResponse[]
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  _id: string
  userId: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  messageCount?: number
  lastMessage?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp?: string
}

export interface HealthStatus {
  status: string
  timestamp: string
  uptime: number
  version: string
  responseTime: number
  services: {
    database: string
    llmProviders: Array<{
      name: string
      status: string
      responseTime: number
    }>
  }
  environment: string
  features: {
    phaserGeneration: boolean
    fileUploads: boolean
    messageVersioning: boolean
    selfCorrection: boolean
    mobileOptimization: boolean
  }
}

export interface ApiStatus {
  api: {
    name: string
    version: string
    description: string
    documentation: string
    repository: string
  }
  capabilities: {
    gameFrameworks: string[]
    llmProviders: string[]
    features: string[]
    gameTypes: string[]
  }
  limits: {
    maxFileSize: string
    maxFilesPerMessage: number
    maxConversationsPerUser: number
    maxMessageLength: number
    rateLimitGeneral: string
    rateLimitGeneration: string
    tokenExpiry: string
  }
}

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("claw-token")
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: this.getAuthHeaders(),
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      })

      const rawData = await response.json() // This is the raw JSON response from the server

      if (!response.ok) {
        return {
          success: false,
          error: rawData.error || "Unknown error",
          message: rawData.message || rawData.error || "An error occurred",
        }
      }

      // Extract the actual payload based on the API's common response structure
      // If the server response itself has a 'data' field, use that as the payload.
      // Otherwise, assume the entire rawData is the payload (e.g., for health check).
      const payload = rawData.data !== undefined ? rawData.data : rawData

      return {
        success: rawData.success, // Use the success status from the rawData
        data: payload as T, // Cast the extracted payload to the expected type T
        message: rawData.message,
        timestamp: rawData.timestamp,
      }
    } catch (error) {
      return {
        success: false,
        error: "NetworkError",
        message: error instanceof Error ? error.message : "Network error occurred",
      }
    }
  }

  // Authentication
  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<{ user: User; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    })
    return response
  }

  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    return response
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request("/api/auth/profile")
  }

  // Conversations
  async createConversation(title: string): Promise<ApiResponse<Conversation>> {
    return this.request("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
    })
  }

  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return this.request("/api/conversations")
  }

  async getConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    return this.request(`/api/conversations/${conversationId}`)
  }

  // Messages
  async sendMessage(
    conversationId: string,
    text: string,
    framework = "phaser.js",
    files?: File[],
  ): Promise<ApiResponse<Message>> {
    const formData = new FormData()
    formData.append("text", text)
    formData.append("framework", framework)

    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("attachments", file)
      })
    }

    try {
      const token = localStorage.getItem("claw-token")
      const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      })

      const rawData = await response.json() // Raw server response

      if (!response.ok) {
        return {
          success: false,
          error: rawData.error || "Unknown error",
          message: rawData.message || rawData.error || "An error occurred",
        }
      }

      // Extract the actual payload from rawData.data
      const payload = rawData.data !== undefined ? rawData.data : rawData

      return {
        success: rawData.success,
        data: payload as Message, // Cast to Message type
        message: rawData.message,
      }
    } catch (error) {
      return {
        success: false,
        error: "NetworkError",
        message: error instanceof Error ? error.message : "Network error occurred",
      }
    }
  }

  async editMessage(conversationId: string, messageId: string, text: string): Promise<ApiResponse<Message>> {
    return this.request(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: "PUT",
      body: JSON.stringify({ text }),
    })
  }

  // File Attachments
  async getMessageAttachments(conversationId: string, messageId: string): Promise<ApiResponse<Attachment[]>> {
    return this.request(`/api/conversations/${conversationId}/messages/${messageId}/attachments`)
  }

  async downloadAttachment(conversationId: string, messageId: string, attachmentId: string): Promise<Blob | null> {
    try {
      const token = localStorage.getItem("claw-token")
      const response = await fetch(
        `${API_BASE_URL}/api/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      )
      if (response.ok) {
        return await response.blob()
      }
      return null
    } catch (error) {
      console.error("Download attachment error:", error)
      return null
    }
  }

  // Downloads
  async downloadCode(downloadId: string): Promise<Blob | null> {
    try {
      const token = localStorage.getItem("claw-token")
      const response = await fetch(`${API_BASE_URL}/api/download/${downloadId}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })
      if (response.ok) {
        return await response.blob()
      }
      return null
    } catch (error) {
      console.error("Download error:", error)
      return null
    }
  }

  // System
  async healthCheck(): Promise<ApiResponse<HealthStatus>> {
    return this.request("/health")
  }

  async getApiStatus(): Promise<ApiResponse<ApiStatus>> {
    return this.request("/api/status")
  }
}

export const api = new ApiClient()
