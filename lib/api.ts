const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.claw.codes"

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
}

export interface CodeResponse {
  files: CodeFile[]
  framework: string
  language: string
  previewUrl?: string
  downloadUrl?: string
}

export interface LLMResponse {
  version: number
  provider: string
  textResponse: string
  thinking?: string
  codeResponse?: CodeResponse
  status: "generating" | "completed" | "error" | "verified"
  error?: string
  createdAt: string
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

export interface GameResponse {
  version: number
  prompt: string
  status: "generating" | "completed" | "error"
  files: CodeFile[]
  metadata: {
    gameType: string
    framework: string
    features: string[]
    totalFiles?: number
    projectId?: string
    chainUsed?: string
    chainSteps?: string[]
  }
  previewUrl?: string
  error?: string
  createdAt: string
}

export interface Message {
  _id: string
  role: "user" | "assistant"
  content?: MessageContent[]
  gameResponse?: GameResponse[]
  createdAt: string
  updatedAt: string
}

export interface ConversationSummary {
  _id: string
  title: string
  updatedAt: string
  lastGameResponse?: {
    status: "generating" | "completed" | "error"
    filesCount: number
    gameType: string
    framework: string
    previewFiles: Array<{
      path: string
      type: string
      size: number
    }>
  }
}

export interface Conversation {
  _id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
  summary: {
    totalMessages: number
    userMessages: number
    assistantMessages: number
    totalFiles: number
    lastActivity: string
    gameStatus: "none" | "generating" | "completed" | "error"
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface StreamInitResponse {
  messageId: string
  conversationId: string
  streamUrl: string
}

export interface StreamEvent {
  type:
    | "connected"
    | "thinking"
    | "thinking_detail"
    | "text_start"
    | "text_chunk"
    | "code_start"
    | "file_start"
    | "file_chunk"
    | "file_complete"
    | "file_generated"
    | "progress"
    | "verification"
    | "preview_start"
    | "preview_ready"
    | "download_ready"
    | "generation_complete"
    | "complete"
    | "error"
    | "preview_error"
    | "ping"
    | "end"

  // Content and chunks
  content?: string
  chunk?: string
  message?: string

  // File-related fields
  filename?: string
  fileName?: string
  file?: CodeFile
  fileType?: string
  index?: number
  totalFiles?: number
  filesCount?: number

  // Progress fields
  step?: number
  totalSteps?: number
  stepName?: string
  progress?: number

  // Complete event fields
  files?: CodeFile[]
  metadata?: {
    gameType: string
    framework: string
    totalFiles: number
    projectId: string
    chainUsed: string
    chainSteps: string[]
  }

  // URLs and IDs
  url?: string
  previewUrl?: string
  liveUrl?: string
  previewId?: string
  downloadId?: string

  // Setup instructions (for complete event)
  setupInstructions?: {
    previewUrl: string
    httpUrl: string
    subdomain: string
    generatedPath: string
    nginxPath: string
  }

  // Other fields
  size?: number
  response?: LLMResponse
  error?: string
  details?: string
  buildLogs?: string[]
  timestamp?: string
}

export interface PreviewStatus {
  status: "building" | "ready" | "error"
  url?: string
  port?: number
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
        credentials: "include",
        headers: this.getAuthHeaders(),
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      })

      let rawData: any

      // Clone the response to avoid "body already consumed" error
      const responseClone = response.clone()

      try {
        rawData = await response.json()
      } catch (jsonError) {
        console.error("JSON parsing failed:", jsonError)
        try {
          const responseText = await responseClone.text()
          console.error("Raw response text:", responseText)
          rawData = { error: responseText || "Invalid JSON response" }
        } catch (textError) {
          console.error("Failed to read response as text:", textError)
          rawData = { error: "Failed to parse response" }
        }
      }

      if (!response.ok) {
        console.error(`API Error ${response.status}:`, rawData)
        return {
          success: false,
          error: rawData.error || `HTTP ${response.status}: ${response.statusText}`,
          message: rawData.message || rawData.error || "An error occurred",
        }
      }

      return {
        success: rawData.success !== false,
        data: rawData.data as T,
        message: rawData.message,
      }
    } catch (error) {
      console.error("Network error:", error)
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
  ): Promise<ApiResponse<{ _id: string; username: string; email: string; createdAt: string; updatedAt: string }>> {
    const response = await this.request<{
      credentials: "include"
      _id: string
      username: string
      email: string
      createdAt: string
      updatedAt: string
    }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    })
    return response
  }

  async login(
    email: string,
    password: string,
  ): Promise<ApiResponse<{ token: string; user: { _id: string; username: string; email: string } }>> {
    const response = await this.request<{
      credentials: "include"
      token: string
      user: { _id: string; username: string; email: string }
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
    return response
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request("/api/auth/profile")
  }

  // Conversations - Updated to match new API structure
  async createConversation(title: string): Promise<ApiResponse<Conversation>> {
    return this.request("/api/conversations/", {
      method: "POST",
      body: JSON.stringify({ title }),
    })
  }

  async getConversations(): Promise<ApiResponse<ConversationSummary[]>> {
    return this.request("/api/conversations/")
  }

  async getConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    return this.request(`/api/conversations/${conversationId}`)
  }

  async deleteConversation(conversationId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/conversations/${conversationId}`, {
      method: "DELETE",
    })
  }

  // Messages - Updated to match new API spec
  async sendMessage(conversationId: string, text: string, files?: File[]): Promise<ApiResponse<StreamInitResponse>> {
    const formData = new FormData()
    formData.append("text", text)

    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("files", file)
      })
    }

    try {
      const token = this.getToken()
      const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/messages`, {
        credentials: "include",
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      })

      let rawData: any
      try {
        rawData = await response.json()
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError)
        const responseText = await response.text()
        console.error("Raw response:", responseText)
        rawData = { error: "Failed to parse response", details: responseText }
      }

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

  // Create EventSource connection for streaming - Updated URL structure
  createStreamConnection(
    conversationId: string,
    messageId: string,
    onEvent: (event: StreamEvent) => void,
    onError: (error: any) => void,
  ): EventSource {
    const token = this.getToken()
    const streamPath = `/api/conversations/${conversationId}/messages/${messageId}/stream`
    const fullUrl = `${API_BASE_URL}${streamPath}`

    console.log("🔗 Connecting to stream:", {
      conversationId,
      messageId,
      streamPath,
      hasToken: !!token,
      url: fullUrl,
    })

    // Use native EventSource with custom headers via URL params for auth
    const urlWithAuth = token ? `${fullUrl}?token=${encodeURIComponent(token)}` : fullUrl

    const eventSource = new EventSource(urlWithAuth)

    eventSource.onopen = () => {
      console.log("✅ Stream connection opened")
    }

    eventSource.onmessage = (event) => {
      try {
        const eventData: StreamEvent = JSON.parse(event.data)
        console.log("📡 Stream event received:", eventData.type, eventData)
        onEvent(eventData)
      } catch (parseError) {
        console.error("❌ Failed to parse stream event:", parseError, "Raw data:", event.data)
      }
    }

    eventSource.onerror = (error) => {
      console.error("❌ Stream connection error:", error)
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

  async deleteMessage(conversationId: string, messageId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: "DELETE",
    })
  }

  // File Attachments - Updated endpoints
  async getMessageAttachments(conversationId: string, messageId: string): Promise<ApiResponse<Attachment[]>> {
    return this.request(`/api/conversations/${conversationId}/messages/${messageId}/attachments`)
  }

  async downloadAttachment(conversationId: string, messageId: string, attachmentId: string): Promise<Blob | null> {
    try {
      const token = this.getToken()
      const response = await fetch(
        `${API_BASE_URL}/api/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}`,
        {
          credentials: "include",
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

  // Downloads - Updated endpoint structure
  async downloadCode(downloadId: string): Promise<Blob | null> {
    try {
      const token = this.getToken()
      const response = await fetch(`${API_BASE_URL}/api/download/${downloadId}`, {
        credentials: "include",
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

  // Preview Status - Updated endpoint structure
  async getPreviewStatus(previewId: string): Promise<ApiResponse<PreviewStatus>> {
    return this.request(`/api/preview/${previewId}/status`)
  }

  // System Health
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request("/health")
  }
}

export const api = new ApiClient()
