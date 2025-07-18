"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { api, type Conversation, type Message, type LLMResponse, type StreamEvent, type PreviewStatus } from "@/lib/api"
import { useAuth } from "./useAuth"

interface StreamingState {
  isStreaming: boolean
  currentThinking: string
  currentTextChunks: string[]
  currentFiles: { [fileName: string]: { content: string; isComplete: boolean } }
  totalFiles: number
  completedFiles: number
  previewId?: string
  previewStatus?: PreviewStatus
  downloadId?: string
  error?: string
}

export function useConversations() {
  const { isAuthenticated } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentThinking: "",
    currentTextChunks: [],
    currentFiles: {},
    totalFiles: 0,
    completedFiles: 0,
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const previewPollingRef = useRef<NodeJS.Timeout | null>(null)

  // Load conversations on auth status change
  useEffect(() => {
    if (isAuthenticated) {
      loadConversations()
    }
  }, [isAuthenticated])

  // Cleanup EventSource and polling on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (previewPollingRef.current) {
        clearInterval(previewPollingRef.current)
      }
    }
  }, [])

  const loadConversations = async () => {
    setIsLoading(true)
    const response = await api.getConversations()

    if (response.success && response.data) {
      setConversations(response.data)

      if (response.data.length > 0 && !activeConversation) {
        await loadConversation(response.data[0]._id)
      } else if (activeConversation) {
        await loadConversation(activeConversation._id)
      }
    }

    setIsLoading(false)
  }

  const createConversation = async (title: string) => {
    setIsLoading(true)
    const response = await api.createConversation(title)

    if (response.success && response.data) {
      const newConversation = response.data
      setConversations((prev) => [newConversation, ...prev])
      setActiveConversation(newConversation)
      setIsLoading(false)
      return newConversation
    }
    setIsLoading(false)
    return null
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
    })
  }

  // Poll preview status
  const pollPreviewStatus = useCallback(async (previewId: string) => {
    try {
      const response = await api.getPreviewStatus(previewId)
      if (response.success && response.data) {
        setStreamingState((prev) => ({
          ...prev,
          previewStatus: response.data,
        }))

        // Stop polling if preview is ready or errored
        if (response.data.status === "ready" || response.data.status === "error") {
          if (previewPollingRef.current) {
            clearInterval(previewPollingRef.current)
            previewPollingRef.current = null
          }
        }
      }
    } catch (error) {
      console.error("Failed to poll preview status:", error)
    }
  }, [])

  const handleStreamEvent = useCallback(
    (event: StreamEvent) => {
      console.log("📡 Processing stream event:", event.type, event)

      switch (event.type) {
        case "thinking":
          setStreamingState((prev) => ({
            ...prev,
            currentThinking: event.content || "",
          }))
          break

        case "text_chunk":
          setStreamingState((prev) => ({
            ...prev,
            currentTextChunks: [...prev.currentTextChunks, event.chunk || ""],
          }))
          break

        case "code_start":
          setStreamingState((prev) => ({
            ...prev,
            totalFiles: event.totalFiles || 0,
            completedFiles: 0,
            currentFiles: {},
          }))
          break

        case "file_start":
          if (event.fileName) {
            setStreamingState((prev) => ({
              ...prev,
              currentFiles: {
                ...prev.currentFiles,
                [event.fileName!]: { content: "", isComplete: false },
              },
            }))
          }
          break

        case "file_chunk":
          if (event.fileName && event.chunk) {
            setStreamingState((prev) => ({
              ...prev,
              currentFiles: {
                ...prev.currentFiles,
                [event.fileName!]: {
                  ...prev.currentFiles[event.fileName!],
                  content: (prev.currentFiles[event.fileName!]?.content || "") + event.chunk,
                },
              },
            }))
          }
          break

        case "file_complete":
          if (event.fileName) {
            setStreamingState((prev) => ({
              ...prev,
              completedFiles: prev.completedFiles + 1,
              currentFiles: {
                ...prev.currentFiles,
                [event.fileName!]: {
                  ...prev.currentFiles[event.fileName!],
                  isComplete: true,
                },
              },
            }))
          }
          break

        case "preview_start":
          setStreamingState((prev) => ({
            ...prev,
            previewStatus: { previewId: "", status: "building" },
          }))
          break

        case "preview_ready":
          if (event.url) {
            setStreamingState((prev) => ({
              ...prev,
              previewStatus: {
                previewId: event.previewId || "",
                status: "ready",
                url: event.url,
              },
            }))
          }
          break

        case "download_ready":
          if (event.url) {
            // Extract download ID from URL
            const downloadId = event.url.split("/").pop()
            setStreamingState((prev) => ({
              ...prev,
              downloadId: downloadId,
            }))
          }
          break

        case "complete":
          console.log("✅ Stream complete:", event.response)
          setStreamingState((prev) => ({
            ...prev,
            isStreaming: false,
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
      }
    },
    [activeConversation, pollPreviewStatus],
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

      // Clear any existing preview polling
      if (previewPollingRef.current) {
        clearInterval(previewPollingRef.current)
        previewPollingRef.current = null
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
    if (previewPollingRef.current) {
      clearInterval(previewPollingRef.current)
      previewPollingRef.current = null
    }
    setStreamingState((prev) => ({
      ...prev,
      isStreaming: false,
    }))
  }, [])

  const getLatestMessageContent = (message: Message): string => {
    if (!message.content || message.content.length === 0) return ""
    return message.content[message.content.length - 1].text
  }

  const getLatestLLMResponse = (message: Message): LLMResponse | null => {
    if (!message.llmResponse || message.llmResponse.length === 0) return null
    return message.llmResponse[message.llmResponse.length - 1]
  }

  // Get current streaming code for the editor
  const getCurrentStreamingCode = (): string => {
    const files = Object.values(streamingState.currentFiles)
    const mainFile = files.find((f) => f.content.includes("Phaser.Game") || f.content.includes("game"))
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
