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
  const [isConverting, setIsConverting] = useState<string | null>(null) // Track conversion state

  // State for custom resizable panels
  const [chatPanelWidth, setChatPanelWidth] = useState(25)
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

  // Updated Deploy button - opens preview URL
  const handleDeploy = () => {
    const previewUrl = streamingState.previewUrl
    if (previewUrl) {
      console.log("🚀 Opening preview URL:", previewUrl)
      window.open(previewUrl, "_blank", "noopener,noreferrer")
    } else {
      alert("No preview URL available. Please generate a game first.")
    }
  }

  // Download HTML ZIP with all files
  const handleDownloadHtmlZip = async () => {
    const currentFiles = getCurrentFiles()
    if (currentFiles.length === 0) {
      alert("No files available to download. Please generate a game first.")
      return
    }

    try {
      // Create a zip file with all the generated files
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()

      // Add all files to the zip
      currentFiles.forEach((file) => {
        zip.file(file.path, file.content)
      })

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" })

      // Download the zip file
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

  // Convert to Unity code
  const handleConvertToUnity = async () => {
    if (!activeConversation) {
      alert("No active conversation. Please generate a game first.")
      return
    }

    setIsConverting("unity")
    try {
      console.log("🔄 Converting to Unity...")

      // Send a message to convert the current game to Unity
      await sendMessage("Convert this game to Unity C# code with proper Unity components and structure.")
    } catch (error) {
      console.error("❌ Failed to convert to Unity:", error)
      alert("Failed to convert to Unity. Please try again.")
    } finally {
      setIsConverting(null)
    }
  }

  // Convert to Godot code
  const handleConvertToGodot = async () => {
    if (!activeConversation) {
      alert("No active conversation. Please generate a game first.")
      return
    }

    setIsConverting("godot")
    try {
      console.log("🔄 Converting to Godot...")

      // Send a message to convert the current game to Godot
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
    if (inputRef.current && !isSending && !streamingState.isStreaming) {
      inputRef.current.focus()
    }
  }, [attachedFiles, isSending, streamingState.isStreaming])

  // Get current files for code viewer
  const getCurrentFiles = () => {
    // First check streaming state for generated files
    if (streamingState.generatedFiles.length > 0) {
      return streamingState.generatedFiles
    }

    // Then check the latest message for completed files
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

  // Redirect if not authenticated
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

  const currentFiles = getCurrentFiles()
  const hasPreviewUrl = !!streamingState.previewUrl
  const hasFiles = currentFiles.length > 0

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <img src="/claw-logo.svg" alt="CLAW Logo" className="h-10 w-10 object-contain drop-shadow-lg" />
            <div>
              <span className="font-semibold text-gray-900 text-xl">CLAW</span>
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
              Code ({currentFiles.length})
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

            {/* Updated Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8" disabled={!hasFiles}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleDownloadHtmlZip} disabled={!hasFiles}>
                  <FileArchive className="h-4 w-4 mr-2" />
                  Download HTML ZIP
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleConvertToUnity}
                  disabled={!hasFiles || isConverting === "unity" || streamingState.isStreaming}
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

            {/* Updated Deploy Button */}
            <Button
              size="sm"
              className="h-8 bg-gray-900 hover:bg-gray-800"
              onClick={handleDeploy}
              disabled={!hasPreviewUrl}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {hasPreviewUrl ? "Open Preview" : "Deploy"}
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
              Code ({currentFiles.length})
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
              onClick={handleDownloadHtmlZip}
              disabled={!hasFiles}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <Button
            size="sm"
            className="w-full bg-gray-900 hover:bg-gray-800"
            onClick={handleDeploy}
            disabled={!hasPreviewUrl}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {hasPreviewUrl ? "Open Preview" : "Deploy Game"}
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
                <MessageItem key={message._id} message={message} onEdit={handleEditMessage} />
              ))}

              <StreamingStatus streamingState={streamingState} onStop={stopGeneration} />

              {(isSending || isConverting) && (
                <div className="flex justify-end mb-6">
                  <div className="flex items-center space-x-3 max-w-[85%]">
                    <div className="bg-blue-600 text-white rounded-2xl px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-300 border-t-white rounded-full animate-spin"></div>
                        <span className="text-sm">
                          {isConverting
                            ? `Converting to ${isConverting === "unity" ? "Unity" : "Godot"}...`
                            : "Generating your game..."}
                        </span>
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
                disabled={isSending || streamingState.isStreaming || !!isConverting}
                autoComplete="off"
              />
              <Button
                onClick={handleSendMessage}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 px-4"
                disabled={streamingState.isStreaming || isSending || !!isConverting || !inputMessage.trim()}
              >
                {streamingState.isStreaming || isSending || isConverting ? (
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
              {currentFiles.length > 0 ? (
                <CodeViewer files={currentFiles} className="h-full" />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-500">
                    <Code className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">Code Editor</h3>
                    <p className="text-gray-400 mb-4">Generated game files will appear here</p>
                    <div className="text-sm text-gray-500">
                      {streamingState.isStreaming
                        ? "Generating code files..."
                        : "Start a conversation to generate your game!"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Panel */}
            <div
              className={`bg-gray-100 flex items-center justify-center p-6 h-full ${activeTab === "code" ? "hidden" : "w-full"}`}
              style={{ width: activeTab === "preview" ? "100%" : "0%" }}
            >
              <div
                className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${getViewportClass()}`}
              >
                {streamingState.previewUrl ? (
                  <iframe
                    src={streamingState.previewUrl}
                    className="w-full h-full border-0"
                    title="Game Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                ) : activeConversation?.messages && activeConversation.messages.length > 0 ? (
                  (() => {
                    const lastMessage = activeConversation.messages[activeConversation.messages.length - 1]
                    const gameResponse = lastMessage?.role === "assistant" ? getLatestGameResponse(lastMessage) : null
                    const htmlFile = gameResponse?.files?.find((f) => f.path.includes(".html") || f.type === "html")

                    if (htmlFile && gameResponse?.status === "completed") {
                      // Create a blob URL for the HTML content
                      const blob = new Blob([htmlFile.content], { type: "text/html" })
                      const url = URL.createObjectURL(blob)

                      return (
                        <iframe
                          src={url}
                          className="w-full h-full border-0"
                          title="Game Preview"
                          sandbox="allow-scripts allow-same-origin allow-forms"
                          onLoad={() => {
                            // Clean up the blob URL after loading
                            setTimeout(() => URL.revokeObjectURL(url), 1000)
                          }}
                        />
                      )
                    }

                    return (
                      <div className="w-full h-full bg-black flex items-center justify-center">
                        <div className="text-center text-white">
                          <Gamepad2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <h3 className="text-xl font-semibold mb-2">Game Preview</h3>
                          <p className="text-gray-400 mb-4">Your generated game will appear here</p>
                          <div className="text-sm text-gray-500">
                            {streamingState.isStreaming
                              ? "Building preview..."
                              : "Generate a game using the chat to see it in action!"}
                          </div>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <div className="text-center text-white">
                      <Gamepad2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">Game Preview</h3>
                      <p className="text-gray-400 mb-4">Your generated game will appear here</p>
                      <div className="text-sm text-gray-500">Generate a game using the chat to see it in action!</div>
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
