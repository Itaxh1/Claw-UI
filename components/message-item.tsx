"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User, Sparkles, Edit3, Check, X, Paperclip, Download, Code, Eye, Clock, AlertCircle } from "lucide-react"
import type { Message, LLMResponse } from "@/lib/api"

interface MessageItemProps {
  message: Message
  getLatestContent: (message: Message) => string
  getLatestLLMResponse: (message: Message) => LLMResponse | null
  onEdit: (messageId: string, text: string) => Promise<void>
  onDownloadAttachment: (attachmentId: string) => void
}

export function MessageItem({
  message,
  getLatestContent,
  getLatestLLMResponse,
  onEdit,
  onDownloadAttachment,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const content = getLatestContent(message)
  const llmResponse = getLatestLLMResponse(message)

  const handleEdit = () => {
    setEditText(content)
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText === content) {
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

  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          message.role === "user" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-900"
        }`}
      >
        <div className="flex items-start space-x-3">
          {message.role === "assistant" && (
            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
              <Sparkles className="h-3 w-3 text-gray-600" />
            </div>
          )}
          {message.role === "user" && (
            <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center mt-0.5">
              <User className="h-3 w-3 text-gray-300" />
            </div>
          )}

          <div className="flex-1">
            {/* Message Content */}
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="bg-gray-50 border-gray-200"
                  placeholder="Edit your message..."
                />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleSaveEdit} disabled={isSubmitting}>
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
                  <Badge variant="secondary" className="mt-2 text-xs">
                    v{message.content.length}
                  </Badge>
                )}
              </div>
            )}

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-gray-500">Attachments:</div>
                {message.attachments.map((attachment) => (
                  <div key={attachment._id} className="flex items-center space-x-2 bg-gray-50 rounded p-2 text-xs">
                    <Paperclip className="h-3 w-3" />
                    <span className="flex-1 truncate">{attachment.originalName}</span>
                    <span className="text-gray-500">{(attachment.size / 1024).toFixed(1)}KB</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => onDownloadAttachment(attachment._id)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* LLM Response */}
            {llmResponse && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center space-x-2">
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

                {llmResponse.textResponse && (
                  <div className="bg-gray-50 rounded p-3 text-sm">
                    <p className="whitespace-pre-wrap">{llmResponse.textResponse}</p>
                  </div>
                )}

                {llmResponse.codeResponse && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Code className="h-4 w-4" />
                      <span className="text-sm font-medium">Generated Code</span>
                      <Badge variant="secondary" className="text-xs">
                        {llmResponse.codeResponse.framework}
                      </Badge>
                    </div>

                    <ScrollArea className="max-h-40 bg-gray-900 rounded p-3">
                      <div className="space-y-2">
                        {llmResponse.codeResponse.files.map((file, index) => (
                          <div key={index} className="text-xs">
                            <div className="text-gray-400 mb-1">{file.path}</div>
                            <pre className="text-gray-200 whitespace-pre-wrap">{file.content.slice(0, 200)}...</pre>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {llmResponse.codeResponse.previewUrl && (
                      <Button size="sm" variant="outline" className="w-full bg-transparent">
                        <Eye className="h-3 w-3 mr-2" />
                        View Preview
                      </Button>
                    )}
                  </div>
                )}

                {llmResponse.thinking && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-500">AI Thinking Process</summary>
                    <div className="mt-2 bg-gray-50 rounded p-2 text-gray-600 whitespace-pre-wrap">
                      {llmResponse.thinking}
                    </div>
                  </details>
                )}

                {llmResponse.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 text-red-600 text-xs">
                    {llmResponse.error}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs opacity-60">{new Date(message.createdAt).toLocaleTimeString()}</p>
              {message.role === "user" && !isEditing && (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleEdit}>
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
