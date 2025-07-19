"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  api,
  type Conversation,
  type ConversationSummary,
  type Message,
  type LLMResponse,
  type StreamEvent,
  type PreviewStatus,
} from "@/lib/api"
import { useAuth } from "./useAuth"

interface StreamingState {
  isStreaming: boolean
  currentThinking: string
  currentTextChunks: string[]
  currentFiles: { [fileName: string]: { content: string; isComplete: boolean; size?: number } }
  totalFiles: number
  completedFiles: number
  progress: number
  previewStatus?: PreviewStatus
  downloadUrl?: string
  downloadId?: string
  error?: string
  buildLogs: string[]
}

export function useConversations() {
  const { isAuthenticated } = useAuth()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentThinking: "",
    currentTextChunks: [],
    currentFiles: {},
    totalFiles: 0,
    completedFiles: 0,
    progress: 0,
    buildLogs: [],
  })

  const eventSourceRef = useRef<EventSource | null>(null)

  // Load conversations on auth status change
  useEffect(() => {
    if (isAuthenticated) {
      loadConversations()
    }
  }, [isAuthenticated])

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const loadConversations = async () => {
    setIsLoading(true)
    const response = await api.getConversations()

    if (response.success && response.data) {
      setConversations(response.data || [])

      if ((response.data || []).length > 0 && !activeConversation) {
        await loadConversation(response.data[0]._id)
      } else if (activeConversation) {
        await loadConversation(activeConversation._id)
      }
    } else {
      setConversations([])
    }

    setIsLoading(false)
  }

  const createConversation = async (title: string) => {
    console.log("🔄 Creating new conversation:", title)
    setIsLoading(true)

    try {
      const response = await api.createConversation(title)
      console.log("📥 Create conversation response:", response)

      if (response.success && response.data) {
        const newConversation = response.data
        console.log("✅ Conversation created successfully:", newConversation)

        // Add to conversations list (convert to summary format)
        const conversationSummary: ConversationSummary = {
          _id: newConversation._id,
          title: newConversation.title,
          updatedAt: newConversation.updatedAt,
        }
        setConversations((prev) => [conversationSummary, ...(prev || [])])
        setActiveConversation(newConversation)
        setIsLoading(false)
        return newConversation
      } else {
        console.error("❌ Failed to create conversation:", response.error || response.message)
        setIsLoading(false)
        return null
      }
    } catch (error) {
      console.error("💥 Conversation creation error:", error)
      setIsLoading(false)
      return null
    }
  }

  const loadConversation = async (conversationId: string) => {
    setIsLoading(true)
    const response = await api.getConversation(conversationId)

    if (response.success && response.data) {
      setActiveConversation(response.data)
    }

    setIsLoading(false)
  }

  const resetStreamingState = () => {
    setStreamingState({
      isStreaming: false,
      currentThinking: "",
      currentTextChunks: [],
      currentFiles: {},
      totalFiles: 0,
      completedFiles: 0,
      progress: 0,
      buildLogs: [],
    })
  }

  const handleStreamEvent = useCallback(
    (event: StreamEvent) => {
      console.log("📡 Processing stream event:", event.type, event)

      switch (event.type) {
        case "connected":
          console.log("🔗 Stream connected at:", event.timestamp)
          break

        case "thinking":
          setStreamingState((prev) => ({
            ...prev,
            currentThinking: event.content || "",
          }))
          break

        case "thinking_detail":
          setStreamingState((prev) => ({
            ...prev,
            currentThinking: event.content || "",
          }))
          break

        case "text_start":
          setStreamingState((prev) => ({
            ...prev,
            currentTextChunks: [],
            currentThinking: event.content || "📝 Generating documentation...",
          }))
          break

        case "text_chunk":
          setStreamingState((prev) => ({
            ...prev,
            currentTextChunks: [...prev.currentTextChunks, event.content || ""],
          }))
          break

        case "code_start":
          setStreamingState((prev) => ({
            ...prev,
            currentThinking: event.content || "💻 Writing game code...",
            totalFiles: 0,
            completedFiles: 0,
            currentFiles: {},
          }))
          break

        case "file_start":
          const fileName = event.filename || event.fileName
          if (fileName) {
            setStreamingState((prev) => ({
              ...prev,
              currentFiles: {
                ...prev.currentFiles,
                [fileName]: { content: "", isComplete: false },
              },
              progress: event.progress || prev.progress,
            }))
          }
          break

        case "file_chunk":
          const chunkFileName = event.filename || event.fileName
          if (chunkFileName && event.content) {
            setStreamingState((prev) => ({
              ...prev,
              currentFiles: {
                ...prev.currentFiles,
                [chunkFileName]: {
                  ...prev.currentFiles[chunkFileName],
                  content: (prev.currentFiles[chunkFileName]?.content || "") + event.content,
                },
              },
            }))
          }
          break

        case "file_complete":
          const completeFileName = event.filename || event.fileName
          if (completeFileName) {
            setStreamingState((prev) => ({
              ...prev,
              completedFiles: prev.completedFiles + 1,
              currentFiles: {
                ...prev.currentFiles,
                [completeFileName]: {
                  ...prev.currentFiles[completeFileName],
                  isComplete: true,
                  size: event.size,
                },
              },
            }))
          }
          break

        case "verification":
          setStreamingState((prev) => ({
            ...prev,
            currentThinking: event.content || "✅ Verifying code quality and dependencies...",
          }))
          break

        case "preview_start":
          setStreamingState((prev) => ({
            ...prev,
            currentThinking: event.content || "🚀 Setting up Vite development environment...",
            previewStatus: { status: "building" },
          }))
          break

        case "preview_ready":
          setStreamingState((prev) => ({
            ...prev,
            previewStatus: {
              status: "ready",
              url: event.url,
            },
            buildLogs: event.buildLogs || [],
          }))
          break

        case "download_ready":
          setStreamingState((prev) => ({
            ...prev,
            downloadUrl: event.url,
            downloadId: event.downloadId,
          }))
          break

        case "generation_complete":
          setStreamingState((prev) => ({
            ...prev,
            progress: event.progress || 100,
            currentThinking: "✅ Generation completed!",
          }))
          break

        case "complete":
          console.log("✅ Stream complete:", event.response)
          setStreamingState((prev) => ({
            ...prev,
            isStreaming: false,
            progress: 100,
          }))
          // Reload conversation to get the final message
          if (activeConversation) {
            loadConversation(activeConversation._id)
          }
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
          }
          break

        case "error":
          console.error("❌ Stream error:", event.error)
          setStreamingState((prev) => ({
            ...prev,
            isStreaming: false,
            error: event.error,
          }))
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
          }
          break

        case "preview_error":
          console.error("❌ Preview error:", event.error)
          setStreamingState((prev) => ({
            ...prev,
            previewStatus: { status: "error" },
            error: event.error,
            buildLogs: event.buildLogs || [],
          }))
          break

        case "end":
          console.log("🔚 Stream ended")
          setStreamingState((prev) => ({
            ...prev,
            isStreaming: false,
          }))
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
          }
          break

        case "ping":
          // Keep-alive event, ignore
          console.log("💓 Stream ping at:", event.timestamp)
          break
      }
    },
    [activeConversation],
  )

  const sendMessage = useCallback(
    async (text: string, files?: File[]) => {
      if (!activeConversation || !text.trim()) return null

      // Close any existing stream
      if (eventSourceRef.current) {
        console.log("🔌 Closing existing stream connection")
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      // Reset and start streaming state
      resetStreamingState()
      setStreamingState((prev) => ({ ...prev, isStreaming: true }))

      console.log("🚀 Sending message:", {
        text: text.substring(0, 100) + "...",
        filesCount: files?.length || 0,
        conversationId: activeConversation._id,
      })

      // Send message and get stream info
      const response = await api.sendMessage(activeConversation._id, text, files)

      if (response.success && response.data) {
        console.log("✅ Message sent successfully, stream data:", response.data)

        // Connect to the stream using the response data
        eventSourceRef.current = api.createStreamConnection(
          response.data.conversationId,
          response.data.messageId,
          handleStreamEvent,
          (error) => {
            console.error("❌ Stream connection error:", error)
            setStreamingState((prev) => ({
              ...prev,
              isStreaming: false,
              error: "Stream connection failed. Please try again.",
            }))
          },
        )

        return response.data
      } else {
        console.error("❌ Failed to send message:", response.error, response.message)
        setStreamingState((prev) => ({
          ...prev,
          isStreaming: false,
          error: response.error || response.message || "Failed to start generation",
        }))
        return null
      }
    },
    [activeConversation, handleStreamEvent],
  )

  const editMessage = useCallback(
    async (messageId: string, text: string) => {
      if (!activeConversation) return null

      setIsLoading(true)

      const response = await api.editMessage(activeConversation._id, messageId, text)

      if (response.success && response.data) {
        await loadConversation(activeConversation._id)
      }

      setIsLoading(false)
      return response.data
    },
    [activeConversation],
  )

  const stopGeneration = useCallback(() => {
    console.log("🛑 Stopping generation")
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setStreamingState((prev) => ({
      ...prev,
      isStreaming: false,
    }))
  }, [])

  // Helper functions for message content
  const getLatestMessageContent = (message: Message): string => {
    if (message.role === "user") {
      if (!message.content || message.content.length === 0) return ""
      return message.content[message.content.length - 1].text
    }
    // For assistant messages, return the text response from LLM
    if (!message.llmResponse || message.llmResponse.length === 0) return ""
    return message.llmResponse[message.llmResponse.length - 1].textResponse || ""
  }

  const getLatestLLMResponse = (message: Message): LLMResponse | null => {
    if (!message.llmResponse || message.llmResponse.length === 0) return null
    return message.llmResponse[message.llmResponse.length - 1]
  }

  // Get current streaming code for the editor
  const getCurrentStreamingCode = (): string => {
    const files = Object.values(streamingState.currentFiles)
    const mainFile = files.find((f) => f.content.includes("Phaser.Game") || f.content.includes("main.js"))
    return mainFile?.content || files[0]?.content || ""
  }

  return {
    conversations,
    activeConversation,
    messages: activeConversation?.messages || [],
    isLoading,
    streamingState,
    createConversation,
    loadConversation,
    sendMessage,
    editMessage,
    stopGeneration,
    refreshConversations: loadConversations,
    getLatestMessageContent,
    getLatestLLMResponse,
    getCurrentStreamingCode,
  }
}
