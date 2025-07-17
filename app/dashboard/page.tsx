"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
} from "lucide-react"
import dynamic from "next/dynamic"
import { useAuth } from "@/hooks/useAuth"
import { useConversations } from "@/hooks/useConversations"
import { api } from "@/lib/api"
import { FileUpload } from "@/components/file-upload"
import { GamePreview } from "@/components/game-preview"
import { MessageItem } from "@/components/message-item"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

export default function Dashboard() {
  const router = useRouter()
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth()
  const {
    conversations,
    activeConversation,
    isLoading,
    isSending,
    createConversation,
    loadConversation,
    sendMessage,
    editMessage,
    getLatestMessageContent,
    getLatestLLMResponse,
  } = useConversations()

  const [inputMessage, setInputMessage] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [framework, setFramework] = useState("phaser.js")
  const [code, setCode] = useState(`// 🎮 Welcome to CLAW v2 - Phaser.js Game Development
// Your generated game code will appear here

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }
    
    preload() {
        // Load game assets
        console.log('🚀 Ready to create amazing games!');
    }
    
    create() {
        // Initialize game objects
        this.add.text(400, 300, 'Start building your game!', {
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(0.5);
    }
    
    update() {
        // Game loop
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: GameScene,
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 300 }, debug: false }
    }
};

// Start the game
const game = new Phaser.Game(config);`)

  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [systemStatus, setSystemStatus] = useState<any>(null)

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

  // Update code when AI responds with code
  useEffect(() => {
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
  }, [activeConversation, getLatestLLMResponse])

  const loadSystemStatus = async () => {
    const response = await api.healthCheck()
    if (response.success) {
      setSystemStatus(response.data)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return

    const content = inputMessage
    setInputMessage("")

    // Create new conversation if none exists
    if (!activeConversation) {
      const title = content.slice(0, 50) + (content.length > 50 ? "..." : "")
      await createConversation(title)
    }

    if (activeConversation) {
      await sendMessage(content, attachedFiles)
      setAttachedFiles([])
    }
  }

  const handleNewConversation = async () => {
    const title = `New Game Project ${new Date().toLocaleDateString()}`
    await createConversation(title)
  }

  const handleDownloadCode = async (downloadUrl?: string) => {
    if (!downloadUrl && !activeConversation) return

    const downloadId = downloadUrl ? downloadUrl.split("/").pop() : activeConversation?._id
    if (!downloadId) return

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
            <Button variant="ghost" size="sm" className="h-8" onClick={() => handleDownloadCode()}>
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
            <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={() => handleDownloadCode()}>
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Sidebar */}
        <div
          className={`w-full md:w-96 border-r border-gray-200 flex flex-col bg-gray-50 ${
            activeTab === "preview" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-gray-900">Game Development Chat</h2>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleNewConversation}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Framework Selector */}
            <div className="mb-3">
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phaser.js">
                    <div className="flex items-center space-x-2">
                      <Gamepad2 className="h-3 w-3" />
                      <span>Phaser.js (Recommended)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conversation List */}
            {conversations.length > 0 && (
              <div className="space-y-1">
                {conversations.slice(0, 3).map((conversation) => (
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
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
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

              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Generating your game...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Show game preview for latest response */}
              {activeConversation?.messages &&
                (() => {
                  const lastMessage = activeConversation.messages[activeConversation.messages.length - 1]
                  if (lastMessage?.role === "assistant") {
                    const llmResponse = getLatestLLMResponse(lastMessage)
                    if (llmResponse?.codeResponse) {
                      return (
                        <div className="mt-4">
                          <GamePreview
                            codeResponse={llmResponse.codeResponse}
                            onDownload={() => handleDownloadCode(llmResponse.codeResponse?.downloadUrl)}
                          />
                        </div>
                      )
                    }
                  }
                  return null
                })()}
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200 bg-white space-y-3">
            {/* File Upload */}
            <FileUpload files={attachedFiles} onFilesChange={setAttachedFiles} maxFiles={5} maxSize={50} />

            {/* Message Input */}
            <div className="flex space-x-3">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Describe your game idea... (e.g., 'Create a space shooter with boss battles')"
                className="flex-1 border-gray-200 focus:border-gray-900 focus:ring-0"
                onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 px-4"
                disabled={isSending || !inputMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              💡 Try: "Create a platformer with collectible coins" or "Make a puzzle game with match-3 mechanics"
            </div>
          </div>
        </div>

        {/* Code/Preview Area */}
        <div
          className={`flex-1 flex flex-col ${
            activeTab === "code" ? "hidden md:flex" : activeTab === "preview" ? "flex" : "flex"
          }`}
        >
          <div className="flex-1 flex">
            {/* Code Editor */}
            <div
              className={`${activeTab === "preview" ? "hidden md:block md:w-1/2" : "w-full"} border-r border-gray-200`}
            >
              <div className="h-full bg-gray-50">
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
            </div>

            {/* Preview */}
            <div
              className={`${
                activeTab === "code" ? "hidden md:block md:w-1/2" : "w-full"
              } bg-gray-100 flex items-center justify-center p-6`}
            >
              <div
                className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${getViewportClass()}`}
              >
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <div className="text-center text-white">
                    <Gamepad2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">Game Preview</h3>
                    <p className="text-gray-400 mb-4">Your generated game will appear here</p>
                    <div className="text-sm text-gray-500">Generate a game using the chat to see it in action!</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
