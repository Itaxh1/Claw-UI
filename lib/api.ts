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
  previewUrl?: string
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

export interface StreamInitResponse {
  messageId: string
  conversationId: string
  streamUrl: string
}

export interface StreamEvent {
  type:
    | "thinking"
    | "text_chunk"
    | "code_start"
    | "file_start"
    | "file_chunk"
    | "file_complete"
    | "preview_start"
    | "preview_ready"
    | "download_ready"
    | "complete"
    | "error"
    | "end"
  content?: string
  chunk?: string
  fileName?: string
  file?: CodeFile
  totalFiles?: number
  url?: string
  previewId?: string
  downloadId?: string
  response?: LLMResponse
  error?: string
}

export interface HealthStatus {
  status: "ok" | "degraded" | "down"
  timestamp: string
  uptime: number
  version: string
  responseTime: number
  services: {
    database: "connected" | "disconnected" | "error"
    llmProviders: Array<{
      name: string
      status: "available" | "unavailable"
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
  timestamp: string
}

export interface PreviewStatus {
  previewId: string
  status: "building" | "ready" | "error"
  url?: string
  error?: string
  buildTime?: number
}

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("claw-token")
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private getToken(): string | null {
    return localStorage.getItem("claw-token")
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

      let rawData: any
      let responseText: string | null = null

      try {
        rawData = await response.json()
      } catch (jsonError) {
        try {
          responseText = await response.text()
          console.error("JSON parsing failed, raw response text:", responseText)
        } catch (textError) {
          console.error("Failed to read response as text:", textError)
        }
        rawData = {}
      }

      if (!response.ok) {
        return {
          success: false,
          error: rawData.error || responseText || "Unknown error from server",
          message: rawData.message || responseText || rawData.error || "An error occurred",
        }
      }

      const payload = rawData.data !== undefined ? rawData.data : rawData

      return {
        success: rawData.success !== false, // Default to true if not explicitly false
        data: payload as T,
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
    return this.request("/api/conversations/", {
      method: "POST",
      body: JSON.stringify({ title }),
    })
  }

  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return this.request("/api/conversations/")
  }

  async getConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    return this.request(`/api/conversations/${conversationId}`)
  }

  // Messages - Updated to match API spec exactly
  async sendMessage(conversationId: string, text: string, files?: File[]): Promise<ApiResponse<StreamInitResponse>> {
    const formData = new FormData()

    // Add text as form field (as per API spec)
    formData.append("text", text)

    // Add attachments if provided
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("attachments", file)
      })
    }

    try {
      const token = this.getToken()
      const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: formData,
      })

      let rawData: any
      try {
        rawData = await response.json()
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError)
        rawData = {}
      }

      console.log("📤 Send message response:", rawData)

      if (!response.ok) {
        return {
          success: false,
          error: rawData.error || `HTTP ${response.status}: ${response.statusText}`,
          message: rawData.message || "Failed to send message",
        }
      }

      return {
        success: rawData.success !== false,
        data: rawData.data as StreamInitResponse,
        message: rawData.message,
      }
    } catch (error) {
      console.error("❌ Send message error:", error)
      return {
        success: false,
        error: "NetworkError",
        message: error instanceof Error ? error.message : "Network error occurred",
      }
    }
  }

  // Create EventSource connection for streaming - Fixed token handling
  createStreamConnection(
    conversationId: string,
    messageId: string,
    onEvent: (event: StreamEvent) => void,
    onError: (error: any) => void,
  ): EventSource {
    const token = this.getToken()

    // Build the stream URL with token as query parameter since EventSource doesn't support headers
    const streamPath = `/api/conversations/${conversationId}/messages/${messageId}/stream`
    const fullUrl = `${API_BASE_URL}${streamPath}${token ? `?token=${encodeURIComponent(token)}` : ""}`

    console.log("🔗 Connecting to stream:", {
      conversationId,
      messageId,
      streamPath,
      hasToken: !!token,
      fullUrl: fullUrl.replace(token || "", "***TOKEN***"), // Hide token in logs
    })

    const eventSource = new EventSource(fullUrl)

    eventSource.onopen = (event) => {
      console.log("✅ Stream connection opened:", event)
    }

    eventSource.onmessage = (event) => {
      try {
        const data: StreamEvent = JSON.parse(event.data)
        console.log("📡 Stream event received:", data.type, data)
        onEvent(data)
      } catch (error) {
        console.error("❌ Failed to parse stream event:", error, "Raw data:", event.data)
        onError(error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("❌ EventSource error:", error)
      console.error("EventSource readyState:", eventSource.readyState)

      // EventSource readyState values:
      // 0 = CONNECTING
      // 1 = OPEN
      // 2 = CLOSED

      if (eventSource.readyState === EventSource.CLOSED) {
        console.log("🔌 Stream connection closed")
      }

      onError(error)
    }

    return eventSource
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
      const token = this.getToken()
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
      const token = this.getToken()
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

  // Preview Status
  async getPreviewStatus(previewId: string): Promise<ApiResponse<PreviewStatus>> {
    return this.request(`/api/preview/${previewId}/status`)
  }

  // System
  async healthCheck(): Promise<ApiResponse<HealthStatus>> {
    return this.request("/health")
  }
}

export const api = new ApiClient()
