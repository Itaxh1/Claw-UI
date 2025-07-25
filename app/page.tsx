"use client"

import type React from "react"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Send,
  Code,
  Eye,
  Share,
  Download,
  Monitor,
  Smartphone,
  Tablet,
  Sparkles,
  Menu,
  X,
  Plus,
  LogOut,
  MessageSquare,
  Gamepad2,
  Zap,
  Activity,
  Paperclip,
  Loader2,
  User,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useConversations } from "@/hooks/useConversations"
import { api } from "@/lib/api"
import { FileUpload } from "@/components/file-upload"
import { MessageItem } from "@/components/message-item"
import { StreamingStatus } from "@/components/streaming-status"
import { CodeViewer } from "@/components/code-viewer"

export default function Dashboard() {
  const router = useRouter()
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth()
  const {
    conversations,
    activeConversation,
    messages,
    isLoading,
    streamingState,
    createConversation,
    loadConversation,
    sendMessage,
    editMessage,
    stopGeneration,
    getLatestMessageContent,
    getLatestGameResponse,
    getCurrentStreamingCode,
  } = useConversations()

  const [inputMessage, setInputMessage] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [systemStatus, setSystemStatus] = useState<any>(null)
  const [isSending, setIsSending] = useState(false)

  // Updated layout: Chat 30%, Code 70% (Files 30% + Editor 40% within code area)
  const [chatPanelWidth, setChatPanelWidth] = useState(30)
  const [isResizing, setIsResizing] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    console.log("🏠 Dashboard - Auth state:", {
      isAuthenticated,
      authLoading,
      user: user ? { id: user._id, username: user.username } : null,
    })

    if (!authLoading) {
      if (!isAuthenticated) {
        console.log("❌ Dashboard - Not authenticated, redirecting to login")
        router.push("/")
      } else {
        console.log("✅ Dashboard - Authenticated, loading system status")
        loadSystemStatus()
      }
    }
  }, [isAuthenticated, authLoading, router, user])

  // Auto-switch to preview when generation completes with preview URL
  useEffect(() => {
    if (streamingState.previewUrl && !streamingState.isStreaming) {
      console.log("🎮 Preview URL available, switching to preview tab:", streamingState.previewUrl)
      setActiveTab("preview")
    }
  }, [streamingState.previewUrl, streamingState.isStreaming])

  const loadSystemStatus = async () => {
    const response = await api.healthCheck()
    if (response.success) {
      setSystemStatus(response.data)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending || streamingState.isStreaming) return

    setIsSending(true)
    const content = inputMessage
    setInputMessage("")

    let currentConversation = activeConversation

    // Create new conversation if none exists
    if (!currentConversation) {
      console.log("🔄 No active conversation, creating new one...")
      const title = content.slice(0, 50) + (content.length > 50 ? "..." : "")

      try {
        const newConversation = await createConversation(title)
        if (newConversation) {
          currentConversation = newConversation
          console.log("✅ New conversation created:", newConversation._id)
        } else {
          console.error("❌ Failed to create new conversation")
          setIsSending(false)
          alert("Failed to create conversation. Please try again.")
          return
        }
      } catch (error) {
        console.error("💥 Error creating conversation:", error)
        setIsSending(false)
        alert("Error creating conversation. Please check your connection and try again.")
        return
      }
    }

    if (currentConversation) {
      console.log("📤 Sending message to conversation:", currentConversation._id)
      try {
        await sendMessage(content, attachedFiles.length > 0 ? attachedFiles : undefined)
        setAttachedFiles([])
      } catch (error) {
        console.error("💥 Error sending message:", error)
        alert("Failed to send message. Please try again.")
      }
    }

    setIsSending(false)
  }

  const handleNewConversation = async () => {
    const title = `New Game Project ${new Date().toLocaleDateString()}`
    await createConversation(title)
  }

  const handleDownloadCode = async () => {
    const downloadId = streamingState.downloadId
    if (!downloadId) {
      console.warn("No download ID available")
      return
    }

    console.log("📦 Downloading code with ID:", downloadId)

    const blob = await api.downloadCode(downloadId)

    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${activeConversation?.title || "game"}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      console.error("Failed to download code")
    }
  }

  const handleDownloadAttachment = async (attachmentId: string) => {
    if (!activeConversation) return

    const message = activeConversation.messages.find((m) => m.attachments?.some((a) => a._id === attachmentId))
    if (!message) return

    const blob = await api.downloadAttachment(activeConversation._id, message._id, attachmentId)
    if (blob) {
      const attachment = message.attachments?.find((a) => a._id === attachmentId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = attachment?.originalName || "attachment"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleEditMessage = async (messageId: string, text: string) => {
    if (activeConversation) {
      await editMessage(messageId, text)
    }
  }

  const handleLogout = () => {
    console.log("🚪 Dashboard - Logging out")
    logout()
    router.push("/")
  }

  const getViewportClass = () => {
    switch (viewMode) {
      case "mobile":
        return "w-[375px] h-[667px]"
      case "tablet":
        return "w-[768px] h-[1024px]"
      default:
        return "w-full h-full"
    }
  }

  // Custom Resizable Panel Logic - Updated for 30% chat, 70% code
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = (e.clientX / window.innerWidth) * 100
      setChatPanelWidth(Math.max(20, Math.min(50, newWidth))) // 20-50% range
    },
    [isResizing],
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }, [handleMouseMove])

  useEffect(() => {
    if (inputRef.current && !isSending && !streamingState.isStreaming) {
      inputRef.current.focus()
    }
  }, [attachedFiles, isSending, streamingState.isStreaming])

  // Get files for code viewer - prioritize streaming files
  const getCodeFiles = () => {
    console.log("🔍 Getting code files:", {
      streamingFiles: streamingState.generatedFiles.length,
      isStreaming: streamingState.isStreaming,
    })

    // Always prioritize streaming files if available
    if (streamingState.generatedFiles.length > 0) {
      console.log("📁 Using streaming files:", streamingState.generatedFiles.length)
      return streamingState.generatedFiles
    }

    // Fallback to completed messages
    if (activeConversation?.messages) {
      const lastMessage = activeConversation.messages[activeConversation.messages.length - 1]
      if (lastMessage?.role === "assistant") {
        const gameResponse = getLatestGameResponse(lastMessage)
        if (gameResponse?.files) {
          console.log("📁 Using message files:", gameResponse.files.length)
          return gameResponse.files
        }
      }
    }

    console.log("📁 No files available")
    return []
  }

  // Get preview URL - prioritize streaming state
  const getPreviewUrl = () => {
    console.log("🔍 Getting preview URL:", {
      streamingPreviewUrl: streamingState.previewUrl,
      isStreaming: streamingState.isStreaming,
    })

    // FIXED: Use the liveUrl directly from streaming state
    if (streamingState.previewUrl) {
      console.log("🎮 Using streaming preview URL:", streamingState.previewUrl)
      return streamingState.previewUrl // liveUrl is already a full URL like "http://localhost:61422"
    }

    // Fallback to completed messages
    if (activeConversation?.messages) {
      const lastMessage = activeConversation.messages[activeConversation.messages.length - 1]
      if (lastMessage?.role === "assistant") {
        const gameResponse = getLatestGameResponse(lastMessage)
        if (gameResponse?.previewUrl) {
          const fullUrl = gameResponse.previewUrl.startsWith("http")
            ? gameResponse.previewUrl
            : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${gameResponse.previewUrl}`
          console.log("🎮 Using message preview URL:", fullUrl)
          return fullUrl
        }
      }
    }

    console.log("🎮 No preview URL available")
    return null
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const codeFiles = getCodeFiles()
  const previewUrl = getPreviewUrl()

  console.log("🎯 Render state:", {
    codeFilesCount: codeFiles.length,
    previewUrl,
    activeTab,
    isStreaming: streamingState.isStreaming,
  })

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <div>
              <span className="font-semibold text-gray-900">CLAW</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                v2.0
              </Badge>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="hidden md:flex items-center space-x-1">
            <Button
              variant={activeTab === "code" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("code")}
              className="h-8"
            >
              <Code className="h-4 w-4 mr-2" />
              Code ({codeFiles.length})
            </Button>
            <Button
              variant={activeTab === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("preview")}
              className="h-8"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
              {previewUrl && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Ready
                </Badge>
              )}
            </Button>
          </div>

          {activeConversation && (
            <div className="hidden md:flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                <Gamepad2 className="h-3 w-3 mr-1" />
                {activeConversation.title}
              </Badge>
              {systemStatus && (
                <Badge variant={systemStatus.status === "ok" ? "default" : "secondary"} className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  {systemStatus.status}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="hidden md:flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === "desktop" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("desktop")}
              className="h-7 w-7 p-0"
            >
              <Monitor className="h-3 w-3" />
            </Button>
            <Button
              variant={viewMode === "tablet" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("tablet")}
              className="h-7 w-7 p-0"
            >
              <Tablet className="h-3 w-3" />
            </Button>
            <Button
              variant={viewMode === "mobile" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("mobile")}
              className="h-7 w-7 p-0"
            >
              <Smartphone className="h-3 w-3" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6 hidden md:block" />

          <div className="hidden md:flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="h-8">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={handleDownloadCode}
              disabled={!streamingState.downloadId}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" className="h-8 bg-gray-900 hover:bg-gray-800">
              <Zap className="h-4 w-4 mr-2" />
              Deploy
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6 hidden md:block" />

          <div className="hidden md:flex items-center space-x-2">
            <span className="text-sm text-gray-600">Hi, {user?.username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 w-8 p-0">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-8 w-8 p-0"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 p-4 space-y-3">
          <div className="flex space-x-2">
            <Button
              variant={activeTab === "code" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab("code")
                setIsMobileMenuOpen(false)
              }}
              className="flex-1"
            >
              <Code className="h-4 w-4 mr-2" />
              Code ({codeFiles.length})
            </Button>
            <Button
              variant={activeTab === "preview" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTab("preview")
                setIsMobileMenuOpen(false)
              }}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="flex-1 bg-transparent">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent"
              onClick={handleDownloadCode}
              disabled={!streamingState.downloadId}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <Button size="sm" className="w-full bg-gray-900 hover:bg-gray-800">
            <Zap className="h-4 w-4 mr-2" />
            Deploy Game
          </Button>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-gray-600">Hi, {user?.username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      )}

      {/* Main Content - Updated Layout: 30% Chat, 70% Code */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Sidebar Panel - 30% */}
        <div className="flex flex-col bg-gray-50" style={{ width: `${chatPanelWidth}%` }}>
          {/* Chat Header */}
          <div className="p-3 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium text-gray-900 text-sm">Game Chat</h2>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleNewConversation}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Conversation List - Compact */}
            {conversations.length > 0 && (
              <ScrollArea className="h-32">
                <div className="space-y-1 pr-2">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation._id}
                      onClick={() => loadConversation(conversation._id)}
                      className={`w-full text-left px-2 py-1 rounded text-xs truncate ${
                        activeConversation?._id === conversation._id
                          ? "bg-blue-100 text-blue-900"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      {conversation.title}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Messages - Compact */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-1">
              {activeConversation?.messages.map((message) => (
                <MessageItem
                  key={message._id}
                  message={message}
                  onEdit={handleEditMessage}
                  onDownloadAttachment={handleDownloadAttachment}
                />
              ))}

              <StreamingStatus streamingState={streamingState} onStop={stopGeneration} />

              {isSending && (
                <div className="flex justify-end mb-4">
                  <div className="flex items-center space-x-2 max-w-[85%]">
                    <div className="bg-blue-600 text-white rounded-2xl px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 border-2 border-blue-300 border-t-white rounded-full animate-spin"></div>
                        <span className="text-xs">Generating...</span>
                      </div>
                    </div>
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat Input - Compact */}
          <div className="p-3 border-t border-gray-200 bg-white space-y-2">
            {/* File Upload - Compact */}
            <details className="text-xs text-gray-500" onToggle={(e) => e.stopPropagation()}>
              <summary
                className="cursor-pointer hover:text-gray-700 flex items-center space-x-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Paperclip className="h-3 w-3" />
                <span>Files ({attachedFiles.length})</span>
              </summary>
              <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                <FileUpload files={attachedFiles} onFilesChange={setAttachedFiles} maxFiles={5} maxSize={50} />
              </div>
            </details>

            {/* Message Input - Compact */}
            <div className="flex space-x-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your game..."
                className="flex-1 border-gray-200 focus:border-gray-900 focus:ring-0 text-sm h-8"
                disabled={isSending || streamingState.isStreaming}
                autoComplete="off"
              />
              <Button
                onClick={handleSendMessage}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 px-3 h-8"
                disabled={streamingState.isStreaming || isSending || !inputMessage.trim()}
              >
                {streamingState.isStreaming || isSending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>

            <div className="text-xs text-gray-500">💡 Try: "Create a platformer game"</div>
          </div>
        </div>

        {/* Custom Resizable Handle */}
        <div
          className="w-1 bg-gray-200 cursor-ew-resize hover:bg-gray-300 transition-colors"
          onMouseDown={handleMouseDown}
        />

        {/* Code/Preview Area Panel - 70% */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            {/* Code Editor Panel - Full width when active */}
            <div
              className={`h-full bg-gray-50 ${activeTab === "preview" ? "hidden" : "w-full"}`}
              style={{ width: activeTab === "code" ? "100%" : "0%" }}
            >
              {codeFiles.length > 0 ? (
                <CodeViewer files={codeFiles} className="h-full" />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Code className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">No Code Generated Yet</h3>
                    <p className="text-gray-400">Generate a game using the chat to see the code here</p>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Panel - Full width when active */}
            <div
              className={`bg-gray-100 flex items-center justify-center p-6 h-full ${activeTab === "code" ? "hidden" : "w-full"}`}
              style={{ width: activeTab === "preview" ? "100%" : "0%" }}
            >
              <div
                className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${getViewportClass()}`}
              >
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="Game Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    onLoad={() => console.log("🎮 Preview iframe loaded:", previewUrl)}
                    onError={() => console.error("🎮 Preview iframe error:", previewUrl)}
                  />
                ) : (
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <div className="text-center text-white">
                      <Gamepad2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">Game Preview</h3>
                      <p className="text-gray-400 mb-4">Your generated game will appear here</p>
                      <div className="text-sm text-gray-500">
                        {streamingState.isStreaming
                          ? "Generating your game..."
                          : "Generate a game using the chat to see it in action!"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
