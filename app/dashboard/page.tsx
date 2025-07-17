"use client"

import { useEffect, useState } from "react"
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
  User,
  Sparkles,
  Menu,
  X,
  Plus,
  LogOut,
  MessageSquare,
} from "lucide-react"
import dynamic from "next/dynamic"
import { useAuth } from "@/hooks/useAuth"
import { useChat } from "@/hooks/useChat"
import { api } from "@/lib/api"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

export default function Dashboard() {
  const router = useRouter()
  const { user, logout, isAuthenticated } = useAuth()
  const { chats, activeChat, messages, isSending, createNewChat, loadChat, sendMessage } = useChat()

  const [inputMessage, setInputMessage] = useState("")
  const [code, setCode] = useState(`import React from 'react'

export default function Component() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Hello World
        </h1>
        <p className="text-gray-600">
          Start building something amazing.
        </p>
      </div>
    </div>
  )
}`)
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [framework, setFramework] = useState("next.js")

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, router])

  // Update code when AI responds with code
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.type === "assistant" && lastMessage.code) {
      setCode(lastMessage.code)
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return

    const content = inputMessage
    setInputMessage("")

    // Create new chat if none exists
    if (!activeChat) {
      await createNewChat(content.slice(0, 50) + "...")
    }

    await sendMessage(content, framework)
  }

  const handleNewChat = async () => {
    await createNewChat()
  }

  const handleDownloadCode = async () => {
    if (!activeChat) return

    // In a real implementation, you'd get a download ID from the API
    const downloadId = activeChat._id
    const blob = await api.downloadCode(downloadId)

    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${activeChat.title || "code"}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleLogout = () => {
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

  if (!isAuthenticated) {
    return null
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
            <span className="font-semibold text-gray-900">CLAW</span>
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

          {activeChat && (
            <Badge variant="secondary" className="hidden md:inline-flex">
              {activeChat.title}
            </Badge>
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
            <Button variant="ghost" size="sm" className="h-8" onClick={handleDownloadCode}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" className="h-8 bg-gray-900 hover:bg-gray-800">
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
            <Button variant="outline" size="sm" className="flex-1 bg-transparent" onClick={handleDownloadCode}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <Button size="sm" className="w-full bg-gray-900 hover:bg-gray-800">
            Deploy
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
          className={`w-full md:w-80 border-r border-gray-200 flex flex-col bg-gray-50 ${
            activeTab === "preview" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-gray-900">Chat</h2>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleNewChat}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat List */}
            {chats.length > 0 && (
              <div className="mt-3 space-y-1">
                {chats.slice(0, 3).map((chat) => (
                  <button
                    key={chat._id}
                    onClick={() => loadChat(chat._id)}
                    className={`w-full text-left px-2 py-1 rounded text-xs truncate ${
                      activeChat?._id === chat._id ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <MessageSquare className="h-3 w-3 inline mr-1" />
                    {chat.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message._id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.type === "user"
                        ? "bg-gray-900 text-white"
                        : "bg-white border border-gray-200 text-gray-900"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {message.type === "assistant" && (
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
                          <Sparkles className="h-3 w-3 text-gray-600" />
                        </div>
                      )}
                      {message.type === "user" && (
                        <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center mt-0.5">
                          <User className="h-3 w-3 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        {message.code && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">Code generated ✓</div>
                        )}
                        <p className="text-xs opacity-60 mt-2">{new Date(message.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-600">Generating...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-3 mb-2">
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1"
              >
                <option value="next.js">Next.js</option>
                <option value="react">React</option>
                <option value="vue">Vue</option>
                <option value="svelte">Svelte</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Describe what you want to build..."
                className="flex-1 border-gray-200 focus:border-gray-900 focus:ring-0"
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                size="sm"
                className="bg-gray-900 hover:bg-gray-800 px-3"
                disabled={isSending}
              >
                <Send className="h-4 w-4" />
              </Button>
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
                  defaultLanguage="typescript"
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
                <div className="w-full h-full bg-white">
                  <div className="p-8 h-full flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">Hello World</h1>
                      <p className="text-gray-600">Start building something amazing.</p>
                    </div>
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
