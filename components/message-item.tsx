"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { User, Bot, Edit, Code, FileText, Image, Gamepad2, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import type { Message, GameResponse } from "@/lib/api"

interface MessageItemProps {
  message: Message
  onEdit?: (messageId: string, text: string) => void
  onDownloadAttachment?: (attachmentId: string) => void
}

export function MessageItem({ message, onEdit, onDownloadAttachment }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState("")

  const handleEdit = () => {
    if (message.role === "user" && message.content && message.content.length > 0) {
      setEditText(message.content[message.content.length - 1].text)
      setIsEditing(true)
    }
  }

  const handleSaveEdit = () => {
    if (onEdit && editText.trim()) {
      onEdit(message._id, editText.trim())
      setIsEditing(false)
    }
  }

  const getLatestContent = (): string => {
    if (message.role === "user") {
      if (!message.content || message.content.length === 0) return ""
      return message.content[message.content.length - 1].text
    }
    return ""
  }

  const getLatestGameResponse = (): GameResponse | null => {
    if (!message.gameResponse || message.gameResponse.length === 0) return null
    return message.gameResponse[message.gameResponse.length - 1]
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "generating":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "source":
        return <Code className="h-4 w-4" />
      case "asset":
        return <Image className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-start space-x-3 max-w-[85%]">
          {isEditing ? (
            <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 flex-1">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-transparent border-none resize-none text-white placeholder-blue-200 focus:outline-none"
                rows={3}
                placeholder="Edit your message..."
              />
              <div className="flex space-x-2 mt-2">
                <Button size="sm" variant="secondary" onClick={handleSaveEdit}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 relative group">
              <p className="text-sm whitespace-pre-wrap">{getLatestContent()}</p>
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 bg-white text-gray-600 hover:bg-gray-100"
                  onClick={handleEdit}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    )
  }

  // Assistant message
  const gameResponse = getLatestGameResponse()

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start space-x-3 max-w-[85%]">
        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="bg-gray-100 rounded-2xl px-4 py-3 flex-1">
          {gameResponse ? (
            <div className="space-y-3">
              {/* Status and Metadata */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Gamepad2 className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Game Generated</span>
                  {getStatusIcon(gameResponse.status)}
                </div>
                {gameResponse.metadata && (
                  <div className="flex space-x-1">
                    <Badge variant="secondary" className="text-xs">
                      {gameResponse.metadata.gameType}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {gameResponse.metadata.framework}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Game Description */}
              {gameResponse.prompt && (
                <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border">{gameResponse.prompt}</p>
              )}

              {/* Files */}
              {gameResponse.files && gameResponse.files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Code className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Generated Files ({gameResponse.files.length})
                    </span>
                  </div>
                  <ScrollArea className="max-h-32">
                    <div className="space-y-1">
                      {gameResponse.files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white rounded p-2 border text-xs"
                        >
                          <div className="flex items-center space-x-2">
                            {getFileIcon(file.type)}
                            <span className="font-mono">{file.path}</span>
                            <Badge variant="outline" className="text-xs">
                              {file.language}
                            </Badge>
                          </div>
                          <span className="text-gray-500">{Math.round(file.content.length / 1024)}KB</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Features */}
              {gameResponse.metadata?.features && gameResponse.metadata.features.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-900">Features:</span>
                  <div className="flex flex-wrap gap-1">
                    {gameResponse.metadata.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {gameResponse.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-900">Generation Error</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">{gameResponse.error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processing your request...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
