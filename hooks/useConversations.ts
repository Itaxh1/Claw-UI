"use client"

import { useState, useEffect, useCallback } from "react"
import { api, type Conversation, type Message, type LLMResponse } from "@/lib/api"
import { useAuth } from "./useAuth"

export function useConversations() {
  const { isAuthenticated } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(false) // For loading conversations/active conversation
  const [isSending, setIsSending] = useState(false) // For sending a message

  // Load conversations on auth status change
  useEffect(() => {
    if (isAuthenticated) {
      loadConversations()
    }
  }, [isAuthenticated])

  const loadConversations = async () => {
    setIsLoading(true)
    const response = await api.getConversations()

    if (response.success && response.data) {
      setConversations(response.data)

      // Load the first conversation if available and none is active
      if (response.data.length > 0 && !activeConversation) {
        // Only load if activeConversation is null, otherwise keep current active
        await loadConversation(response.data[0]._id)
      } else if (activeConversation) {
        // If there's an active conversation, reload it to ensure its messages are up-to-date
        await loadConversation(activeConversation._id)
      }
    }

    setIsLoading(false)
  }

  const createConversation = async (title: string) => {
    setIsLoading(true) // Indicate loading for conversation creation
    const response = await api.createConversation(title)

    if (response.success && response.data) {
      const newConversation = response.data
      setConversations((prev) => [newConversation, ...prev])
      setActiveConversation(newConversation) // Set the new conversation as active immediately
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
      setActiveConversation(response.data) // This updates the full conversation object
    }

    setIsLoading(false)
  }

  const sendMessage = useCallback(
    async (text: string, framework = "phaser.js", files?: File[]) => {
      if (!activeConversation || !text.trim()) return null

      setIsSending(true)

      // No longer adding temporary message here.
      // The UI will show a "Generating..." indicator based on `isSending`.

      const response = await api.sendMessage(activeConversation._id, text, framework, files) // Pass framework

      if (response.success && response.data) {
        // After sending, reload the active conversation to get the latest messages
        // This ensures the activeConversation object's messages array is fully up-to-date
        await loadConversation(activeConversation._id)
      } else {
        // Handle error: maybe show a toast or revert UI state if needed
        console.error("Failed to send message or get response:", response.error || response.message)
        // If there was an error, we still want to refresh the conversation to ensure consistency
        // in case the backend partially processed something or to clear any stale state.
        await loadConversation(activeConversation._id)
      }

      setIsSending(false)
      return response.data
    },
    [activeConversation], // Removed loadConversation from dependencies
  )

  const editMessage = useCallback(
    async (messageId: string, text: string) => {
      if (!activeConversation) return null

      setIsSending(true) // Use isSending for editing too, or a separate state

      const response = await api.editMessage(activeConversation._id, messageId, text)

      if (response.success && response.data) {
        // Reload the conversation to get updated messages
        await loadConversation(activeConversation._id)
      }

      setIsSending(false)
      return response.data
    },
    [activeConversation], // Removed loadConversation from dependencies
  )

  const getLatestMessageContent = (message: Message): string => {
    if (!message.content || message.content.length === 0) return ""
    return message.content[message.content.length - 1].text
  }

  const getLatestLLMResponse = (message: Message): LLMResponse | null => {
    if (!message.llmResponse || message.llmResponse.length === 0) return null
    return message.llmResponse[message.llmResponse.length - 1]
  }

  return {
    conversations,
    activeConversation,
    messages: activeConversation?.messages || [], // Derive messages from activeConversation
    isLoading,
    isSending,
    createConversation, // Keep original name
    loadConversation, // Keep original name
    sendMessage,
    editMessage,
    refreshConversations: loadConversations,
    getLatestMessageContent,
    getLatestLLMResponse,
  }
}
