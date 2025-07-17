"use client"

import { useState, useEffect, useCallback } from "react"
import { api, type Conversation, type Message, type LLMResponse } from "@/lib/api"
import { useAuth } from "./useAuth"

export function useConversations() {
  const { isAuthenticated } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Load conversations
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
        await loadConversation(response.data[0]._id)
      }
    }

    setIsLoading(false)
  }

  const createConversation = async (title: string) => {
    const response = await api.createConversation(title)

    if (response.success && response.data) {
      const newConversation = response.data
      setConversations((prev) => [newConversation, ...prev])
      await loadConversation(newConversation._id)
      return newConversation
    }

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

  const sendMessage = useCallback(
    async (text: string, files?: File[]) => {
      if (!activeConversation || !text.trim()) return null

      setIsSending(true)

      const response = await api.sendMessage(activeConversation._id, text, files)

      if (response.success && response.data) {
        // Reload the conversation to get updated messages
        await loadConversation(activeConversation._id)
      }

      setIsSending(false)
      return response.data
    },
    [activeConversation],
  )

  const editMessage = useCallback(
    async (messageId: string, text: string) => {
      if (!activeConversation) return null

      setIsSending(true)

      const response = await api.editMessage(activeConversation._id, messageId, text)

      if (response.success && response.data) {
        // Reload the conversation to get updated messages
        await loadConversation(activeConversation._id)
      }

      setIsSending(false)
      return response.data
    },
    [activeConversation],
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
    isLoading,
    isSending,
    createConversation,
    loadConversation,
    sendMessage,
    editMessage,
    refreshConversations: loadConversations,
    getLatestMessageContent,
    getLatestLLMResponse,
  }
}
