"use client"
import React, { useEffect, useState, useCallback, useRef } from "react"
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
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!streamingState.isStreaming && streamingState.generatedFiles.length > 0 && isChatView) {
      setIsChatView(false)
      setActiveTab("preview")
    }
  }, [streamingState.isStreaming, streamingState.generatedFiles])

  useEffect(() => {
    setSelectedMessageId(null)
  }, [activeConversation])

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
    const previewUrl = streamingState.previewUrl || getSelectedPreviewUrl()
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
    if (previewRef.current && (streamingState.previewUrl || getSelectedPreviewUrl() || getCurrentFiles().length > 0)) {
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
      let targetMessage = activeConversation.messages[activeConversation.messages.length - 1]
      if (selectedMessageId) {
        const found = activeConversation.messages.find((m) => m._id === selectedMessageId)
        if (found && found.gameResponse) {
          targetMessage = found
        }
      }
      const gameResponse = getLatestGameResponse(targetMessage)
      return gameResponse?.files || []
    }
    return []
  }

  const getSelectedPreviewUrl = () => {
    if (streamingState.previewUrl) {
      return streamingState.previewUrl
    }
    if (activeConversation?.messages) {
      let targetMessage = activeConversation.messages[activeConversation.messages.length - 1]
      if (selectedMessageId) {
        const found = activeConversation.messages.find((m) => m._id === selectedMessageId)
        if (found && found.gameResponse) {
          targetMessage = found
        }
      }
      const gameResponse = getLatestGameResponse(targetMessage)
      return gameResponse?.previewUrl || ""
    }
    return ""
  }

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground text-lg font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground text-lg font-medium">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  const currentFiles = getCurrentFiles()
  const hasPreviewUrl = !!streamingState.previewUrl || !!getSelectedPreviewUrl()
  const hasFiles = currentFiles.length > 0

  return (
    <div className="h-screen flex flex-col font-sans bg-background text-foreground">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shadow-glow glass-strong animate-slideInRight">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-10 w-10 p-0 text-black hover:bg-secondary hover:text-black rounded-full"
            onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
          >
            <MessagesSquare className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-3">
            
            <img src="/claw-logo.svg" alt="CLAW Logo" className="h-10 w-10 object-contain rounded-md" />
            <div>
              <span className="font-bold text-foreground text-xl text-glow">CLAW</span>
              <Badge variant="secondary" className="ml-2 text-xs bg-primary/20 text-primary border-primary/30">
                v2.0
              </Badge>
            </div>
          </div>
          <Separator orientation="vertical" className="h-6 bg-border" />
          <div className="flex items-center space-x-2">
            <Button
              variant={isChatView ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setIsChatView(true)
                setIsChatSidebarOpen(false)
              }}
              className={`game-button h-10 px-3 rounded-lg transition-all duration-200 ${
                isChatView
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-glow animate-pulse-glow"
                  : "text-black hover:bg-secondary hover:text-black"
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
                className={`game-button h-10 px-3 rounded-lg transition-all duration-200 ${
                  !isChatView
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-glow animate-pulse-glow"
                    : "text-black hover:bg-secondary hover:text-black"
                }`}
              >
                <Code className="h-5 w-5 mr-2" />
                Code/Preview
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="hidden md:flex items-center space-x-1 bg-secondary/50 rounded-lg p-1 glass">
            <Button
              variant={viewMode === "desktop" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("desktop")}
              className="game-button h-10 w-10 p-0 text-black hover:bg-secondary hover:text-black rounded-full transition-colors"
            >
              <Monitor className="h-5 w-5" />
            </Button>
            <Button
              variant={viewMode === "tablet" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("tablet")}
              className="game-button h-10 w-10 p-0 text-black hover:bg-secondary hover:text-black rounded-full transition-colors"
            >
              <Tablet className="h-5 w-5" />
            </Button>
            <Button
              variant={viewMode === "mobile" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("mobile")}
              className="game-button h-10 w-10 p-0 text-black hover:bg-secondary hover:text-black rounded-full transition-colors"
            >
              <Smartphone className="h-5 w-5" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6 bg-border hidden md:block" />
          <div className="hidden md:flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="game-button h-10 px-3 text-black hover:bg-secondary hover:text-black rounded-lg"
            >
              <Share className="h-5 w-5 mr-2" />
              Share
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="game-button h-10 px-3 text-black hover:bg-secondary hover:text-black rounded-lg"
                  disabled={!hasFiles}
                >
                  <Download className="h-5 w-5 mr-2" />
                  Export
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 game-card shadow-elevated rounded-lg border-border">
                <DropdownMenuItem
                  onClick={handleDownloadHtmlZip}
                  disabled={!hasFiles}
                  className="hover:bg-secondary hover:text-black focus:bg-secondary focus:text-black text-foreground"
                >
                  <FileArchive className="h-4 w-4 mr-2" />
                  Download HTML ZIP
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleConvertToUnity}
                  disabled={!hasFiles || isConverting === "unity" || streamingState.isStreaming}
                  className="hover:bg-secondary hover:text-black focus:bg-secondary focus:text-black text-foreground"
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
                  className="hover:bg-secondary hover:text-black focus:bg-secondary focus:text-black text-foreground"
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
              className="game-button h-10 px-3 text-primary-foreground rounded-lg"
              onClick={handleDeploy}
              disabled={!hasPreviewUrl}
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              {hasPreviewUrl ? "Open Preview" : "Deploy"}
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6 bg-border hidden md:block" />
          <div className="hidden md:flex items-center space-x-2">
            <span className="text-sm text-muted-foreground font-medium">Hi, {user?.username}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="game-button h-10 w-10 p-0 text-black hover:bg-secondary hover:text-black rounded-full"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-10 w-10 p-0 text-black hover:bg-secondary hover:text-black rounded-full"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card border-b border-border p-4 space-y-3 shadow-card glass animate-slideInRight">
          <div className="flex space-x-2">
            <Button
              variant={isChatView ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsChatView(true)
                setIsMobileMenuOpen(false)
                setIsChatSidebarOpen(false)
              }}
              className={`game-button flex-1 h-10 rounded-lg ${
                isChatView
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  : "text-black border-border hover:bg-secondary hover:text-black"
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
                className={`game-button flex-1 h-10 rounded-lg ${
                  !isChatView
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    : "text-black border-border hover:bg-secondary hover:text-black"
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
              className="game-button flex-1 h-10 text-black border-border hover:bg-secondary hover:text-black rounded-lg"
            >
              <Share className="h-5 w-5 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="game-button flex-1 h-10 text-black border-border hover:bg-secondary hover:text-black rounded-lg"
              onClick={handleDownloadHtmlZip}
              disabled={!hasFiles}
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </Button>
          </div>
          <Button
            size="sm"
            className="game-button w-full h-10 text-primary-foreground rounded-lg"
            onClick={handleDeploy}
            disabled={!hasPreviewUrl}
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            {hasPreviewUrl ? "Open Preview" : "Deploy Game"}
          </Button>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground font-medium">Hi, {user?.username}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="game-button h-10 text-black hover:bg-secondary hover:text-black rounded-lg"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      )}
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-0">
        {/* Chat Panel */}
        {isChatView && (
          <div className="flex flex-col bg-card w-full h-full">
            <div className="flex flex-1 overflow-hidden">
              {/* Chat Sidebar */}
              <div
                className={`bg-sidebar-background border-r border-sidebar-border transition-all duration-300 ease-in-out ${
                  isChatSidebarOpen ? "w-60" : "w-0"
                } md:w-60 overflow-hidden glass animate-slideInRight`}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sidebar-foreground text-sm">Conversations</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="game-button h-8 w-8 p-0 text-black hover:bg-sidebar-accent hover:text-black rounded-full"
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
                                ? "bg-sidebar-primary/20 text-sidebar-primary"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
                <div className="p-3 border-b border-border bg-card flex items-center justify-between">
                  <h2 className="font-semibold text-foreground text-lg text-glow">Game Development Chat</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="game-button h-8 w-8 p-0 text-black hover:bg-secondary hover:text-black rounded-full"
                    onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
                  >
                    {isChatSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-3 bg-secondary/10">
                  <div className="space-y-4">
                    {activeConversation?.messages?.map((message, idx) => {
                      if (!message) return null
                      const hasResponse = !!message.gameResponse
                      const prompt = message.gameResponse?.prompt || ""
                      const version = message.gameResponse?.version
                      const status = message.gameResponse?.status
                      const filesCount = message.gameResponse?.files?.length || 0
                      return (
                        <React.Fragment key={message._id || `msg-${idx}`}>
                          <MessageItem
                            message={message}
                            onEdit={handleEditMessage}
                            className="animate-fadeInUp game-card rounded-lg p-3 text-foreground shadow-card"
                          />
                          {hasResponse && (
                            <div className="flex justify-start mb-4">
                              <div className="max-w-[85%] game-card rounded-lg p-3 shadow-card border border-border">
                                <div className="flex items-center space-x-2 mb-2">
                                  {version && (
                                    <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                                      Version {version}
                                    </Badge>
                                  )}
                                  {status && (
                                    <Badge
                                      variant="outline"
                                      className={
                                        status === "completed"
                                          ? "text-game-success border-game-success"
                                          : "text-game-warning border-game-warning"
                                      }
                                    >
                                      {status.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>
                                {prompt && (
                                  <p className="text-muted-foreground text-sm mb-2">
                                    Prompt: {prompt.slice(0, 100)}
                                    {prompt.length > 100 ? "..." : ""}
                                  </p>
                                )}
                                {filesCount > 0 && (
                                  <p className="text-muted-foreground text-sm mb-2">Generated {filesCount} files</p>
                                )}
                                <Button
                                  variant={selectedMessageId === message._id ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setSelectedMessageId(message._id)}
                                  className={`game-button h-8 text-sm ${
                                    selectedMessageId === message._id
                                      ? "bg-primary text-primary-foreground"
                                      : "text-black border-primary hover:bg-primary hover:text-primary-foreground"
                                  }`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  {selectedMessageId === message._id ? "Viewing this Version" : "View Code & Preview"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      )
                    })}
                    <StreamingStatus streamingState={streamingState} onStop={stopGeneration} />
                    {(isSending || isConverting) && (
                      <div className="flex justify-end mb-2 animate-pulse">
                        <div className="flex items-center space-x-2 max-w-[85%]">
                          <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 shadow-glow">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-4 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                              <span className="text-sm font-medium">
                                {isConverting
                                  ? `Converting to ${isConverting === "unity" ? "Unity" : "Godot"}...`
                                  : "Generating your game..."}
                              </span>
                            </div>
                          </div>
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-glow">
                            <User className="h-4 w-4 text-primary-foreground" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="p-3 border-t border-border bg-card">
                  <details className="text-sm text-muted-foreground mb-2" onToggle={(e) => e.stopPropagation()}>
                    <summary
                      className="cursor-pointer hover:text-foreground flex items-center space-x-2"
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
                      className="game-input flex-1 text-sm text-foreground h-10"
                      disabled={isSending || streamingState.isStreaming || !!isConverting}
                      autoComplete="off"
                    />
                    <Button
                      onClick={handleSendMessage}
                      size="sm"
                      className="game-button h-10 w-10 p-0 text-primary-foreground"
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
        {/* Preview and Code Panels */}
        {!isChatView && hasFiles && (
          <div className="flex-1 flex flex-col md:flex-row m-2 md:m-4">
            {/* Code Viewer */}
            <div className="game-card rounded-lg" style={{ width: `${codePanelWidth}%` }}>
              <CodeViewer files={currentFiles} className="h-full" />
            </div>
            {/* Divider */}
            <div
              className="w-2 bg-border cursor-ew-resize flex items-center justify-center"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div className="w-1 h-10 bg-primary rounded-full" />
            </div>
            {/* Preview */}
            <div
              className="h-full bg-secondary/20 flex items-center justify-center p-3 md:p-4 rounded-lg glass"
              style={{ width: `${100 - codePanelWidth}%` }}
            >
              <div className={`game-card rounded-lg border border-border overflow-hidden transition-all duration-300 ${getViewportClass()}`}>
                {activeTab === "preview" && (streamingState.previewUrl || getSelectedPreviewUrl()) ? (
                  <div className="relative w-full h-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="game-button absolute top-2 right-2 h-8 w-8 p-0 text-black hover:bg-secondary hover:text-black rounded-full z-10"
                      onClick={handleReloadPreview}
                      disabled={isReloading || streamingState.isStreaming}
                    >
                      {isReloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    <iframe
                      ref={previewRef}
                      src={streamingState.previewUrl || getSelectedPreviewUrl()}
                      className="w-full h-full border-0"
                      title="Game Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-secondary/20 flex items-center justify-center rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <Gamepad2 className="h-16 w-16 mx-auto mb-4 opacity-50 animate-float" />
                      <h3 className="text-xl font-semibold mb-2 text-foreground">Game Preview</h3>
                      <p className="text-muted-foreground mb-4">Your generated game will appear here</p>
                      <div className="text-sm text-muted-foreground">
                        {streamingState.isStreaming ? "Building preview..." : "Generate a game using the chat to see it in action!"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}