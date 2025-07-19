"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Bot, Edit3, Check, X, Paperclip, Download, Code, Eye, Clock, AlertCircle, Copy } from "lucide-react"
import type { Message, LLMResponse } from "@/lib/api"

interface MessageItemProps {
  message: Message
  onEdit: (messageId: string, text: string) => Promise<void>
  onDownloadAttachment: (attachmentId: string) => void
}

export function MessageItem({ message, onEdit, onDownloadAttachment }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedFile, setCopiedFile] = useState<string | null>(null)

  const isUser = message.role === "user"

  // Get content for user messages
  const getUserContent = (): string => {
    if (!message.content || message.content.length === 0) return ""
    return message.content[message.content.length - 1].text
  }

  // Get latest LLM response for assistant messages
  const getLatestLLMResponse = (): LLMResponse | null => {
    if (!message.llmResponse || message.llmResponse.length === 0) return null
    return message.llmResponse[message.llmResponse.length - 1]
  }

  const handleEdit = () => {
    const content = getUserContent()
    setEditText(content)
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText === getUserContent()) {
      setIsEditing(false)
      return
    }

    setIsSubmitting(true)
    await onEdit(message._id, editText)
    setIsSubmitting(false)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditText("")
    setIsEditing(false)
  }

  const copyToClipboard = async (text: string, fileName: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedFile(fileName)
    setTimeout(() => setCopiedFile(null), 2000)
  }

  const content = getUserContent()
  const llmResponse = getLatestLLMResponse()

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6`}>
      <div className={`flex ${isUser ? "flex-row-reverse" : "flex-row"} items-start space-x-3 max-w-[85%]`}>
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser ? "bg-blue-600 ml-3" : "bg-gray-100 mr-3"
          }`}
        >
          {isUser ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-gray-600" />}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
          {/* User Message Bubble */}
          {isUser && (
            <div className="bg-blue-600 text-white rounded-2xl px-4 py-3">
              {isEditing ? (
                <div className="space-y-2 min-w-[200px]">
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="bg-blue-500 border-blue-400 text-white placeholder-blue-200"
                    placeholder="Edit your message..."
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={isSubmitting} variant="secondary">
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>

                  {/* Version indicator */}
                  {message.content && message.content.length > 1 && (
                    <Badge variant="secondary" className="mt-2 text-xs bg-blue-500 text-blue-100">
                      v{message.content.length}
                    </Badge>
                  )}
                </div>
              )}

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs opacity-75">Attachments:</div>
                  {message.attachments.map((attachment) => (
                    <div key={attachment._id} className="flex items-center space-x-2 rounded p-2 text-xs bg-blue-500">
                      <Paperclip className="h-3 w-3" />
                      <span className="flex-1 truncate">{attachment.originalName}</span>
                      <span className="opacity-75">{(attachment.size / 1024).toFixed(1)}KB</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-blue-100 hover:text-white"
                        onClick={() => onDownloadAttachment(attachment._id)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assistant Response Content */}
          {!isUser && llmResponse && (
            <div className="w-full max-w-4xl">
              {/* Status Badge */}
              <div className="flex items-center space-x-2 mb-3">
                <Badge variant="outline" className="text-xs">
                  {llmResponse.provider}
                </Badge>
                <Badge
                  variant={
                    llmResponse.status === "completed"
                      ? "default"
                      : llmResponse.status === "error"
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {llmResponse.status === "generating" && <Clock className="h-3 w-3 mr-1" />}
                  {llmResponse.status === "error" && <AlertCircle className="h-3 w-3 mr-1" />}
                  {llmResponse.status}
                </Badge>
              </div>

              {/* Text Response */}
              {llmResponse.textResponse && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {llmResponse.textResponse}
                  </p>
                </div>
              )}

              {/* Code Response - v0 Style */}
              {llmResponse.codeResponse && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Code className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-gray-900">Generated Code</span>
                        <Badge variant="secondary" className="text-xs">
                          {llmResponse.codeResponse.framework}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {llmResponse.codeResponse.files.length} files
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        {llmResponse.codeResponse.previewUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(llmResponse.codeResponse!.previewUrl, "_blank")}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        )}
                        {llmResponse.codeResponse.downloadUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const link = document.createElement("a")
                              link.href = llmResponse.codeResponse!.downloadUrl!
                              link.download = "game.zip"
                              link.click()
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* File Tabs */}
                  <Tabs defaultValue={llmResponse.codeResponse.files[0]?.path} className="w-full">
                    <div className="border-b border-gray-200 bg-gray-50">
                      <TabsList className="h-auto p-0 bg-transparent">
                        <ScrollArea className="w-full">
                          <div className="flex">
                            {llmResponse.codeResponse.files.map((file, index) => (
                              <TabsTrigger
                                key={index}
                                value={file.path}
                                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-white rounded-none"
                              >
                                <Code className="h-3 w-3" />
                                <span>{file.path}</span>
                                <Badge variant="outline" className="text-xs">
                                  {file.language}
                                </Badge>
                              </TabsTrigger>
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsList>
                    </div>

                    {/* File Contents */}
                    {llmResponse.codeResponse.files.map((file, index) => (
                      <TabsContent key={index} value={file.path} className="m-0">
                        <div className="relative">
                          {/* File Header */}
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">{file.path}</span>
                              <Badge variant="secondary" className="text-xs">
                                {file.content.length} chars
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(file.content, file.path)}
                              className="h-7 px-2"
                            >
                              {copiedFile === file.path ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>

                          {/* Code Content */}
                          <ScrollArea className="h-80">
                            <pre className="p-4 text-xs font-mono bg-gray-900 text-gray-100 overflow-x-auto">
                              <code>{file.content}</code>
                            </pre>
                          </ScrollArea>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )}

              {/* Thinking Process */}
              {llmResponse.thinking && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                    AI Thinking Process
                  </summary>
                  <div className="mt-2 bg-gray-50 rounded p-3 text-xs text-gray-600 whitespace-pre-wrap">
                    {llmResponse.thinking}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Message Actions */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
            {isUser && !isEditing && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs ml-2" onClick={handleEdit}>
                <Edit3 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
