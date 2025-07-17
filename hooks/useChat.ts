"use client"

import { useState, useEffect, useCallback } from "react"
import { api, type Chat, type Message } from "@/lib/api"
import { useAuth } from "./useAuth"

export function useChat() {
  const { user } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Load user chats
  useEffect(() => {
    if (user) {
      loadUserChats()
    }
  }, [user])

  const loadUserChats = async () => {
    if (!user) return

    setIsLoading(true)
    const response = await api.getUserChats(user._id)

    if (response.success && response.data) {
      setChats(response.data)

      // Load the first chat if available
      if (response.data.length > 0 && !activeChat) {
        await loadChat(response.data[0]._id)
      }
    }

    setIsLoading(false)
  }

  const createNewChat = async (title = "New Chat") => {
    if (!user) return null

    const response = await api.createChat(user._id, title)

    if (response.success && response.data) {
      const newChat = response.data
      setChats((prev) => [newChat, ...prev])
      await loadChat(newChat._id)
      return newChat
    }

    return null
  }

  const loadChat = async (chatId: string) => {
    setIsLoading(true)
    const response = await api.getChat(chatId)

    if (response.success && response.data) {
      setActiveChat(response.data)
      setMessages(response.data.messages || [])
    }

    setIsLoading(false)
  }

  const sendMessage = useCallback(
    async (content: string, framework = "next.js") => {
      if (!activeChat || !content.trim()) return null

      setIsSending(true)

      // Add user message immediately for better UX
      const userMessage: Message = {
        _id: `temp-${Date.now()}`,
        chatId: activeChat._id,
        content,
        type: "user",
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMessage])

      const response = await api.sendMessage(activeChat._id, content, framework)

      if (response.success && response.data) {
        // Replace temp message with real one and add AI response
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg._id !== userMessage._id)
          return [...filtered, response.data!]
        })
      } else {
        // Remove temp message on error
        setMessages((prev) => prev.filter((msg) => msg._id !== userMessage._id))
      }

      setIsSending(false)
      return response.data
    },
    [activeChat],
  )

  return {
    chats,
    activeChat,
    messages,
    isLoading,
    isSending,
    createNewChat,
    loadChat,
    sendMessage,
    refreshChats: loadUserChats,
  }
}
