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
import dynamic from "next/dynamic"
import { useAuth } from "@/hooks/useAuth"
import { useConversations } from "@/hooks/useConversations"
import { api } from "@/lib/api"
import { FileUpload } from "@/components/file-upload"
import { MessageItem } from "@/components/message-item"
import { StreamingStatus } from "@/components/streaming-status"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

export default function Dashboard() {
  const router = useRouter()
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth()
  const {
    conversations,
    activeConversation,
    messages, // This is now derived from activeConversation
    isLoading,
    streamingState,
    createConversation,
    loadConversation,
    sendMessage,
    editMessage,
    stopGeneration,
    getLatestMessageContent,
    getLatestLLMResponse,
    getCurrentStreamingCode,
  } = useConversations()

  const [inputMessage, setInputMessage] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [code, setCode] = useState("") // Changed to empty string
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [systemStatus, setSystemStatus] = useState<any>(null)
  const [isSending, setIsSending] = useState(false) // Declare isSending variable

  // State for custom resizable panels
  const [chatPanelWidth, setChatPanelWidth] = useState(25) // Default width percentage
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

  // Update code when AI responds with code OR during streaming
  useEffect(() => {
    // First check if we have streaming code
    const streamingCode = getCurrentStreamingCode()
    if (streamingCode) {
      setCode(streamingCode)
      return
    }

    // Otherwise check for completed messages
    if (activeConversation?.messages) {
      const lastMessage = activeConversation.messages[activeConversation.messages.length - 1]
      if (lastMessage?.role === "assistant") {
        const llmResponse = getLatestLLMResponse(lastMessage)
        if (llmResponse?.codeResponse?.files) {
          const mainFile = llmResponse.codeResponse.files.find((f) => f.type === "js" || f.path.includes("game"))
          if (mainFile) {
            setCode(mainFile.content)
          }
        }
      }
    }
  }, [activeConversation, getLatestLLMResponse, getCurrentStreamingCode, streamingState])

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

    setIsSending(true) // Set isSending to true before sending message
    const content = inputMessage
    setInputMessage("")

    let currentConversation = activeConversation

    // Create new conversation if none exists
    if (!currentConversation) {
      const title = content.slice(0, 50) + (content.length > 50 ? "..." : "")
      const newConversation = await createConversation(title) // Capture the new conversation
      if (newConversation) {
        currentConversation = newConversation // Use the newly created conversation
      } else {
        console.error("Failed to create new conversation.")
        setIsSending(false) // Set isSending to false if conversation creation failed
        return
      }
    }

    if (currentConversation) {
      // Remove framework parameter - API doesn't seem to use it based on the docs
      await sendMessage(content, attachedFiles.length > 0 ? attachedFiles : undefined)
      setAttachedFiles([])
    }
    setIsSending(false) // Set isSending to false after message is sent
  }

  const handleNewConversation = async () => {
    const title = `New Game Project ${new Date().toLocaleDateString()}`
    await createConversation(title)
  }

  const handleDownloadCode = async (downloadId?: string) => {
    if (!downloadId && !streamingState.downloadId) {
      console.warn("No download ID available")
      return
    }

    const idToUse = downloadId || streamingState.downloadId
    if (!idToUse) return

    console.log("📦 Downloading code with ID:", idToUse)

    const blob = await api.downloadCode(idToUse)

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

    // Find the message with this attachment
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

  // Custom Resizable Panel Logic
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
      // Clamp width between 20% and 40%
      setChatPanelWidth(Math.max(20, Math.min(40, newWidth)))
    },
    [isResizing],
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }, [handleMouseMove])

  useEffect(() => {
    // Ensure input stays focusable after file operations
    if (inputRef.current && !isSending && !streamingState.isStreaming) {
      inputRef.current.focus()
    }
  }, [attachedFiles, isSending, streamingState.isStreaming])

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

  // Redirect if not authenticated (this should be handled by useEffect, but just in case)
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
              Code
            </Button>
            <Button
              variant={activeTab === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("preview")}
              className="h-8"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>

          {activeConversation && (
            <div className="hidden md:flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                <Gamepad2 className="h-3 w-3 mr-1" />
                {activeConversation.title}
              </Badge>
              {systemStatus && (
                <Badge
                  variant={
                    systemStatus.services.llmProviders.some((p: any) => p.status === "available")
                      ? "default"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  <Activity className="h-3 w-3 mr-1" />
                  {systemStatus.services.llmProviders.filter((p: any) => p.status === "available").length} LLMs
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
              onClick={() => handleDownloadCode()}
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
              Code
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
              onClick={() => handleDownloadCode()}
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

      {/* Main Content with Custom Resizable Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Sidebar Panel */}
        <div className="flex flex-col bg-gray-50" style={{ width: `${chatPanelWidth}%` }}>
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-gray-900">Game Development Chat</h2>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleNewConversation}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Conversation List */}
            {conversations.length > 0 && (
              <ScrollArea className="h-40">
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

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-1">
              {activeConversation?.messages.map((message) => (
                <MessageItem
                  key={message._id}
                  message={message}
                  getLatestContent={getLatestMessageContent}
                  getLatestLLMResponse={getLatestLLMResponse}
                  onEdit={handleEditMessage}
                  onDownloadAttachment={handleDownloadAttachment}
                />
              ))}

              <StreamingStatus streamingState={streamingState} onStop={stopGeneration} />

              {isSending && (
                <div className="flex justify-end mb-6">
                  <div className="flex items-center space-x-3 max-w-[85%]">
                    <div className="bg-blue-600 text-white rounded-2xl px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-300 border-t-white rounded-full animate-spin"></div>
                        <span className="text-sm">Generating your game...</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200 bg-white space-y-3">
            {/* File Upload - now collapsible */}
            <details className="text-xs text-gray-500" onToggle={(e) => e.stopPropagation()}>
              <summary
                className="cursor-pointer hover:text-gray-700 flex items-center space-x-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Paperclip className="h-4 w-4" />
                <span>Attach Files ({attachedFiles.length})</span>
              </summary>
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <FileUpload files={attachedFiles} onFilesChange={setAttachedFiles} maxFiles={5} maxSize={50} />
              </div>
            </details>

            {/* Message Input */}
            <div className="flex space-x-3">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your game idea... (e.g., 'Create a space shooter with boss battles')"
                className="flex-1 border-gray-200 focus:border-gray-900 focus:ring-0"
                disabled={isSending || streamingState.isStreaming}
                autoComplete="off"
              />
              <Button
                onClick={handleSendMessage}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 px-4"
                disabled={streamingState.isStreaming || isSending || !inputMessage.trim()}
              >
                {streamingState.isStreaming || isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              💡 Try: "Create a platformer with collectible coins" or "Make a puzzle game with match-3 mechanics"
            </div>
          </div>
        </div>

        {/* Custom Resizable Handle */}
        <div
          className="w-2 bg-gray-200 cursor-ew-resize flex items-center justify-center"
          onMouseDown={handleMouseDown}
        >
          <div className="w-1 h-8 bg-gray-400 rounded-full" />
        </div>

        {/* Code/Preview Area Panel */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex">
            {/* Code Editor Panel */}
            <div
              className={`h-full bg-gray-50 ${activeTab === "preview" ? "hidden" : "w-full"}`}
              style={{ width: activeTab === "code" ? "100%" : "0%" }}
            >
              <MonacoEditor
                height="100%"
                defaultLanguage="javascript"
                value={code}
                onChange={(value) => setCode(value || "")}
                theme="light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
                  lineNumbers: "on",
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: "on",
                  folding: true,
                  bracketPairColorization: { enabled: true },
                  padding: { top: 16, bottom: 16 },
                }}
              />
            </div>

            {/* Preview Panel */}
            <div
              className={`bg-gray-100 flex items-center justify-center p-6 h-full ${activeTab === "code" ? "hidden" : "w-full"}`}
              style={{ width: activeTab === "preview" ? "100%" : "0%" }}
            >
              <div
                className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${getViewportClass()}`}
              >
                {streamingState.previewStatus?.status === "ready" && streamingState.previewStatus.url ? (
                  <iframe
                    src={streamingState.previewStatus.url}
                    className="w-full h-full border-0"
                    title="Game Preview"
                  />
                ) : (
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <div className="text-center text-white">
                      <Gamepad2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">Game Preview</h3>
                      <p className="text-gray-400 mb-4">Your generated game will appear here</p>
                      <div className="text-sm text-gray-500">
                        {streamingState.previewStatus?.status === "building"
                          ? "Building preview..."
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
