"use client"
import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Send,
  Code,
  Eye,
  Share,
  Download,
  Monitor,
  Smartphone,
  Tablet,
  Menu,
  X,
  Plus,
  LogOut,
  MessageSquare,
  Gamepad2,
  Activity,
  Paperclip,
  Loader2,
  User,
  ExternalLink,
  ChevronDown,
  FileArchive,
  MessagesSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
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
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false)
  const [isChatView, setIsChatView] = useState(true)
  const [systemStatus, setSystemStatus] = useState<any>(null)
  const [isSending, setIsSending] = useState(false)
  const [isConverting, setIsConverting] = useState<string | null>(null)
  const [codePanelWidth, setCodePanelWidth] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  const [isReloading, setIsReloading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLIFrameElement>(null)

  // Automatically switch to code/preview view when generation completes
  useEffect(() => {
    if (!streamingState.isStreaming && streamingState.generatedFiles.length > 0 && isChatView) {
      setIsChatView(false)
      setActiveTab("preview")
    }
  }, [streamingState.isStreaming, streamingState.generatedFiles])

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
    setIsChatSidebarOpen(false)
  }

  const handleDeploy = () => {
    const previewUrl = streamingState.previewUrl
    if (previewUrl) {
      console.log("🚀 Opening preview URL:", previewUrl)
      window.open(previewUrl, "_blank", "noopener,noreferrer")
    } else {
      alert("No preview URL available. Please generate a game first.")
    }
  }

  const handleDownloadHtmlZip = async () => {
    const currentFiles = getCurrentFiles()
    if (currentFiles.length === 0) {
      alert("No files available to download. Please generate a game first.")
      return
    }
    try {
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()
      currentFiles.forEach((file) => {
        zip.file(file.path, file.content)
      })
      const zipBlob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${activeConversation?.title || "game"}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      console.log("📦 Downloaded HTML ZIP with", currentFiles.length, "files")
    } catch (error) {
      console.error("❌ Failed to create ZIP file:", error)
      alert("Failed to create ZIP file. Please try again.")
    }
  }

  const handleConvertToUnity = async () => {
    if (!activeConversation) {
      alert("No active conversation. Please generate a game first.")
      return
    }
    setIsConverting("unity")
    try {
      console.log("🔄 Converting to Unity...")
      await sendMessage("Convert this game to Unity C# code with proper Unity components and structure.")
    } catch (error) {
      console.error("❌ Failed to convert to Unity:", error)
      alert("Failed to convert to Unity. Please try again.")
    } finally {
      setIsConverting(null)
    }
  }

  const handleConvertToGodot = async () => {
    if (!activeConversation) {
      alert("No active conversation. Please generate a game first.")
      return
    }
    setIsConverting("godot")
    try {
      console.log("🔄 Converting to Godot...")
      await sendMessage("Convert this game to Godot GDScript with proper Godot nodes and scene structure.")
    } catch (error) {
      console.error("❌ Failed to convert to Godot:", error)
      alert("Failed to convert to Godot. Please try again.")
    } finally {
      setIsConverting(null)
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
        return "w-[375px] h-[667px] max-w-full max-h-full"
      case "tablet":
        return "w-[768px] h-[1024px] max-w-full max-h-full"
      default:
        return "w-full h-full"
    }
  }

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
      setCodePanelWidth(Math.max(30, Math.min(70, newWidth)))
    },
    [isResizing],
  )

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }, [handleMouseMove])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    setIsResizing(true)
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd)
  }, [])

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isResizing) return
      e.preventDefault()
      const touch = e.touches[0]
      const newWidth = (touch.clientX / window.innerWidth) * 100
      setCodePanelWidth(Math.max(30, Math.min(70, newWidth)))
    },
    [isResizing],
  )

  const handleTouchEnd = useCallback(() => {
    setIsResizing(false)
    document.removeEventListener("touchmove", handleTouchMove)
    document.removeEventListener("touchend", handleTouchEnd)
  }, [handleTouchMove])

  const handleReloadPreview = () => {
    if (previewRef.current && (streamingState.previewUrl || getCurrentFiles().length > 0)) {
      setIsReloading(true)
      const reloadIframe = () => {
        const iframe = previewRef.current
        if (iframe) {
          const src = iframe.src
          iframe.src = ""
          setTimeout(() => {
            iframe.src = src
            setIsReloading(false)
          }, 100)
        }
      }
      reloadIframe()
    }
  }

  useEffect(() => {
    if (inputRef.current && !isSending && !streamingState.isStreaming) {
      inputRef.current.focus()
    }
  }, [attachedFiles, isSending, streamingState.isStreaming])

  const getCurrentFiles = () => {
    if (streamingState.generatedFiles.length > 0) {
      return streamingState.generatedFiles
    }
    if (activeConversation?.messages) {
      const lastMessage = activeConversation.messages[activeConversation.messages.length - 1]
      if (lastMessage?.role === "assistant") {
        const gameResponse = getLatestGameResponse(lastMessage)
        if (gameResponse?.files) {
          return gameResponse.files
        }
      }
    }
    return []
  }

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const currentFiles = getCurrentFiles()
  const hasPreviewUrl = !!streamingState.previewUrl
  const hasFiles = currentFiles.length > 0

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white shadow-sm">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-10 w-10 p-0 hover:bg-gray-100 rounded-full"
            onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
          >
            <MessagesSquare className="h-5 w-5 text-gray-600" />
          </Button>
          <div className="flex items-center space-x-3">
            <img src="/claw-logo.svg" alt="CLAW Logo" className="h-10 w-10 object-contain " />
            <div>
              <span className="font-semibold text-gray-900 text-xl">CLAW</span>
              <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-800">
                v2.0
              </Badge>
            </div>
          </div>
          <Separator orientation="vertical" className="h-6 bg-gray-200" />
          <div className="flex items-center space-x-2">
            <Button
              variant={isChatView ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setIsChatView(true)
                setIsChatSidebarOpen(false)
              }}
              className={`h-10 px-3 rounded-lg ${
                isChatView ? "bg-blue-500 text-white hover:bg-blue-600" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <MessagesSquare className="h-5 w-5 mr-2" />
              Chat
            </Button>
            {hasFiles && (
              <Button
                variant={!isChatView ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setIsChatView(false)
                  setActiveTab("preview")
                }}
                className={`h-10 px-3 rounded-lg ${
                  !isChatView ? "bg-blue-500 text-white hover:bg-blue-600" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Code className="h-5 w-5 mr-2" />
                Code/Preview
              </Button>
            )}
            {activeConversation && (
              <div className="hidden md:flex items-center space-x-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Gamepad2 className="h-4 w-4 mr-1" />
                  {activeConversation.title}
                </Badge>
                {systemStatus && (
                  <Badge
                    variant={systemStatus.status === "ok" ? "default" : "secondary"}
                    className="text-xs bg-gray-100 text-gray-600"
                  >
                    <Activity className="h-4 w-4 mr-1" />
                    {systemStatus.status}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="hidden md:flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === "desktop" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("desktop")}
              className="h-10 w-10 p-0 hover:bg-gray-200 rounded-full"
            >
              <Monitor className="h-5 w-5 text-gray-600" />
            </Button>
            <Button
              variant={viewMode === "tablet" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("tablet")}
              className="h-10 w-10 p-0 hover:bg-gray-200 rounded-full"
            >
              <Tablet className="h-5 w-5 text-gray-600" />
            </Button>
            <Button
              variant={viewMode === "mobile" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("mobile")}
              className="h-10 w-10 p-0 hover:bg-gray-200 rounded-full"
            >
              <Smartphone className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6 bg-gray-200 hidden md:block" />
          <div className="hidden md:flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="h-10 px-3 text-gray-600 hover:bg-gray-100 rounded-lg">
              <Share className="h-5 w-5 mr-2" />
              Share
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 text-gray-600 hover:bg-gray-100 rounded-lg"
                  disabled={!hasFiles}
                >
                  <Download className="h-5 w-5 mr-2" />
                  Export
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white shadow-lg rounded-lg">
                <DropdownMenuItem
                  onClick={handleDownloadHtmlZip}
                  disabled={!hasFiles}
                  className="hover:bg-gray-100 focus:bg-gray-100"
                >
                  <FileArchive className="h-4 w-4 mr-2" />
                  Download HTML ZIP
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleConvertToUnity}
                  disabled={!hasFiles || isConverting === "unity" || streamingState.isStreaming}
                  className="hover:bg-gray-100 focus:bg-gray-100"
                >
                  {isConverting === "unity" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Code className="h-4 w-4 mr-2" />
                  )}
                  Convert to Unity
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleConvertToGodot}
                  disabled={!hasFiles || isConverting === "godot" || streamingState.isStreaming}
                  className="hover:bg-gray-100 focus:bg-gray-100"
                >
                  {isConverting === "godot" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Code className="h-4 w-4 mr-2" />
                  )}
                  Convert to Godot
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              className="h-10 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
              onClick={handleDeploy}
              disabled={!hasPreviewUrl}
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              {hasPreviewUrl ? "Open Preview" : "Deploy"}
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6 bg-gray-200 hidden md:block" />
          <div className="hidden md:flex items-center space-x-2">
            <span className="text-sm text-gray-600 font-medium">Hi, {user?.username}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-10 w-10 p-0 text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-10 w-10 p-0 text-gray-600 hover:bg-gray-100 rounded-full"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 p-4 space-y-3 shadow-sm">
          <div className="flex space-x-2">
            <Button
              variant={isChatView ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsChatView(true)
                setIsMobileMenuOpen(false)
                setIsChatSidebarOpen(false)
              }}
              className={`flex-1 h-10 rounded-lg ${
                isChatView ? "bg-blue-500 text-white hover:bg-blue-600" : "text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
            >
              <MessagesSquare className="h-5 w-5 mr-2" />
              Chat
            </Button>
            {hasFiles && (
              <Button
                variant={!isChatView ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsChatView(false)
                  setActiveTab("preview")
                  setIsMobileMenuOpen(false)
                }}
                className={`flex-1 h-10 rounded-lg ${
                  !isChatView ? "bg-blue-500 text-white hover:bg-blue-600" : "text-gray-600 border-gray-300 hover:bg-gray-100"
                }`}
              >
                <Code className="h-5 w-5 mr-2" />
                Code/Preview
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-10 text-gray-600 border-gray-300 hover:bg-gray-100 rounded-lg"
            >
              <Share className="h-5 w-5 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-10 text-gray-600 border-gray-300 hover:bg-gray-100 rounded-lg"
              onClick={handleDownloadHtmlZip}
              disabled={!hasFiles}
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </Button>
          </div>
          <Button
            size="sm"
            className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            onClick={handleDeploy}
            disabled={!hasPreviewUrl}
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            {hasPreviewUrl ? "Open Preview" : "Deploy Game"}
          </Button>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="text-sm text-gray-600 font-medium">Hi, {user?.username}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-10 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Chat Panel (Shown when isChatView is true) */}
        {isChatView && (
          <div className="flex flex-col bg-white w-full h-full">
            <div className="flex flex-1 overflow-hidden">
              {/* Chat Sidebar for Conversations */}
              <div
                className={`bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out ${
                  isChatSidebarOpen ? "w-60" : "w-0"
                } md:w-60 overflow-hidden`}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm">Conversations</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 rounded-full"
                      onClick={handleNewConversation}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {conversations.length > 0 && (
                    <ScrollArea className="h-[calc(100vh-8rem)]">
                      <div className="space-y-1 pr-2">
                        {conversations.map((conversation) => (
                          <button
                            key={conversation._id}
                            onClick={() => {
                              loadConversation(conversation._id)
                              setIsChatSidebarOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors duration-200 ${
                              activeConversation?._id === conversation._id
                                ? "bg-blue-100 text-blue-900"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <MessageSquare className="h-4 w-4 inline mr-2" />
                            {conversation.title}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
              {/* Chat Messages */}
              <div className="flex-1 flex flex-col">
                <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 text-lg">Game Development Chat</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 rounded-full"
                    onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
                  >
                    {isChatSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-3 bg-gray-50">
                  <div className="space-y-2">
                    {activeConversation?.messages.map((message) => (
                      <MessageItem
                        key={message._id}
                        message={message}
                        onEdit={handleEditMessage}
                        className="animate-fade-in bg-white rounded-lg p-3 text-gray-800 shadow-sm"
                      />
                    ))}
                    <StreamingStatus streamingState={streamingState} onStop={stopGeneration} />
                    {(isSending || isConverting) && (
                      <div className="flex justify-end mb-2 animate-pulse">
                        <div className="flex items-center space-x-2 max-w-[85%]">
                          <div className="bg-blue-500 text-white rounded-lg px-3 py-2 shadow-sm">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-4 border-blue-300 border-t-white rounded-full animate-spin"></div>
                              <span className="text-sm font-medium">
                                {isConverting
                                  ? `Converting to ${isConverting === "unity" ? "Unity" : "Godot"}...`
                                  : "Generating your game..."}
                              </span>
                            </div>
                          </div>
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                            <User className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-3 border-t border-gray-200 bg-white">
                  <details className="text-sm text-gray-500 mb-2" onToggle={(e) => e.stopPropagation()}>
                    <summary
                      className="cursor-pointer hover:text-gray-700 flex items-center space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Paperclip className="h-4 w-4" />
                      <span>Attach Files ({attachedFiles.length})</span>
                    </summary>
                    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                      <FileUpload files={attachedFiles} onFilesChange={setAttachedFiles} maxFiles={5} maxSize={50} />
                    </div>
                  </details>
                  <div className="flex space-x-2">
                    <Input
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe your game idea..."
                      className="flex-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-sm text-gray-800 h-10"
                      disabled={isSending || streamingState.isStreaming || !!isConverting}
                      autoComplete="off"
                    />
                    <Button
                      onClick={handleSendMessage}
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg h-10 w-10 p-0"
                      disabled={streamingState.isStreaming || isSending || !!isConverting || !inputMessage.trim()}
                    >
                      {streamingState.isStreaming || isSending || isConverting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview and Code Panels (Shown when isChatView is false and files exist) */}
        {!isChatView && hasFiles && (
          <div className="flex-1 flex flex-col md:flex-row m-2 md:m-4">
            <div
              className="h-full bg-gray-50 flex items-center justify-center p-3 md:p-4 h-full rounded-lg shadow-sm"
              style={{ width: `${codePanelWidth}%` }}
            >
              <div
                className={`bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-300 ${getViewportClass()}`}
              >
                {activeTab === "preview" && (streamingState.previewUrl ? (
                  <div className="relative w-full h-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 rounded-full z-10"
                      onClick={handleReloadPreview}
                      disabled={isReloading || streamingState.isStreaming}
                    >
                      {isReloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <iframe
                      ref={previewRef}
                      src={streamingState.previewUrl}
                      className="w-full h-full border-0"
                      title="Game Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                  </div>
                ) : activeConversation?.messages && activeConversation.messages.length > 0 ? (
                  (() => {
                    const lastMessage = activeConversation.messages[activeConversation.messages.length - 1]
                    const gameResponse = lastMessage?.role === "assistant" ? getLatestGameResponse(lastMessage) : null
                    const htmlFile = gameResponse?.files?.find((f) => f.path.includes(".html") || f.type === "html")
                    if (htmlFile && gameResponse?.status === "completed") {
                      const blob = new Blob([htmlFile.content], { type: "text/html" })
                      const url = URL.createObjectURL(blob)
                      return (
                        <div className="relative w-full h-full">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 rounded-full z-10"
                            onClick={handleReloadPreview}
                            disabled={isReloading || streamingState.isStreaming}
                          >
                            {isReloading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <iframe
                            ref={previewRef}
                            src={url}
                            className="w-full h-full border-0"
                            title="Game Preview"
                            sandbox="allow-scripts allow-same-origin allow-forms"
                            onLoad={() => {
                              setTimeout(() => URL.revokeObjectURL(url), 1000)
                            }}
                          />
                        </div>
                      )
                    }
                    return (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg">
                        <div className="text-center text-gray-600">
                          <Gamepad2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <h3 className="text-xl font-semibold mb-2">Game Preview</h3>
                          <p className="text-gray-500 mb-4">Your generated game will appear here</p>
                          <div className="text-sm text-gray-400">
                            {streamingState.isStreaming
                              ? "Building preview..."
                              : "Generate a game using the chat to see it in action!"}
                          </div>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg">
                    <div className="text-center text-gray-600">
                      <Gamepad2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">Game Preview</h3>
                      <p className="text-gray-500 mb-4">Your generated game will appear here</p>
                      <div className="text-sm text-gray-400">Generate a game using the chat to see it in action!</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              className="w-2 bg-gray-200 cursor-ew-resize flex items-center justify-center"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div className="w-1 h-10 bg-gray-400 rounded-full" />
            </div>
            <div className="h-full bg-white rounded-lg shadow-sm" style={{ width: `${100 - codePanelWidth}%` }}>
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <div className="flex space-x-2">
                  <Button
                    variant={activeTab === "code" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("code")}
                    className={`h-8 px-3 rounded-lg ${
                      activeTab === "code" ? "bg-blue-500 text-white hover:bg-blue-600" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Code className="h-4 w-4 mr-2" />
                    Code
                  </Button>
                  <Button
                    variant={activeTab === "preview" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("preview")}
                    className={`h-8 px-3 rounded-lg ${
                      activeTab === "preview" ? "bg-blue-500 text-white hover:bg-blue-600" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </div>
              <CodeViewer files={currentFiles} className="h-[calc(100%-2.5rem)]" />
            </div>
          </div>
        )}
      </div>

      {/* Custom Animation Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}