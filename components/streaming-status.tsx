"use client"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Loader2, StopCircle, Code, FileText, CheckCircle, AlertCircle, Gamepad2, Zap } from "lucide-react"

interface StreamingState {
  isStreaming: boolean
  currentThinking: string
  currentTextChunks: string[]
  currentFiles: { [fileName: string]: { content: string; isComplete: boolean; size?: number } }
  generatedFiles: Array<{
    path: string
    content: string
    type: string
    language: string
  }>
  totalFiles: number
  completedFiles: number
  progress: number
  step: number
  totalSteps: number
  stepName: string
  previewStatus?: {
    status: "building" | "ready" | "error"
    url?: string
  }
  previewUrl?: string
  downloadUrl?: string
  downloadId?: string
  error?: string
  buildLogs: string[]
  metadata?: {
    gameType: string
    framework: string
    totalFiles: number
    projectId: string
    chainUsed: string
    chainSteps: string[]
  }
}

interface StreamingStatusProps {
  streamingState: StreamingState
  onStop: () => void
}

export function StreamingStatus({ streamingState, onStop }: StreamingStatusProps) {
  if (!streamingState.isStreaming && !streamingState.error && streamingState.generatedFiles.length === 0) {
    return null
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case "html":
        return <FileText className="h-3 w-3 text-orange-600" />
      case "js":
      case "javascript":
        return <Code className="h-3 w-3 text-yellow-600" />
      case "css":
        return <FileText className="h-3 w-3 text-blue-600" />
      default:
        return <FileText className="h-3 w-3 text-gray-600" />
    }
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start space-x-3 max-w-[85%]">
        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="bg-gray-100 rounded-2xl px-4 py-3 flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Gamepad2 className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">
                {streamingState.isStreaming ? "Generating Game..." : "Game Generation"}
              </span>
              {streamingState.isStreaming && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            </div>
            {streamingState.isStreaming && (
              <Button variant="ghost" size="sm" onClick={onStop} className="h-6 px-2 text-xs">
                <StopCircle className="h-3 w-3 mr-1" />
                Stop
              </Button>
            )}
          </div>

          {/* Progress */}
          {(streamingState.progress > 0 || streamingState.step > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  {streamingState.stepName &&
                    `Step ${streamingState.step}/${streamingState.totalSteps}: ${streamingState.stepName}`}
                </span>
                <span className="text-gray-500">{streamingState.progress}%</span>
              </div>
              <Progress value={streamingState.progress} className="h-2" />
            </div>
          )}

          {/* Current Status */}
          {streamingState.currentThinking && (
            <div className="bg-white rounded-lg p-3 border">
              <p className="text-sm text-gray-700">{streamingState.currentThinking}</p>
            </div>
          )}

          {/* Chain Steps */}
          {streamingState.metadata?.chainSteps && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-900">AI Chain:</span>
              <div className="flex flex-wrap gap-1">
                {streamingState.metadata.chainSteps.map((step, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {step}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Generated Files */}
          {streamingState.generatedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-900">
                  Generated Files ({streamingState.generatedFiles.length})
                </span>
                {streamingState.metadata && (
                  <div className="flex space-x-1">
                    <Badge variant="secondary" className="text-xs">
                      {streamingState.metadata.gameType}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {streamingState.metadata.framework}
                    </Badge>
                  </div>
                )}
              </div>
              <ScrollArea className="max-h-32">
                <div className="space-y-1">
                  {streamingState.generatedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded p-2 border text-xs">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(file.type)}
                        <span className="font-mono">{file.path}</span>
                        <Badge variant="outline" className="text-xs">
                          {file.language}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">{Math.round(file.content.length / 1024)}KB</span>
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* File Progress (for streaming files) */}
          {streamingState.totalFiles > 0 && streamingState.generatedFiles.length === 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Files Generated</span>
                <span className="text-gray-500">
                  {streamingState.completedFiles}/{streamingState.totalFiles}
                </span>
              </div>
              <Progress value={(streamingState.completedFiles / streamingState.totalFiles) * 100} className="h-2" />
            </div>
          )}

          {/* Preview Status */}
          {streamingState.previewUrl && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Preview Ready!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Your game is ready to preview. Switch to the Preview tab to see it in action.
              </p>
            </div>
          )}

          {/* Error */}
          {streamingState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Generation Error</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{streamingState.error}</p>
            </div>
          )}

          {/* Build Logs */}
          {streamingState.buildLogs.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                Build Logs ({streamingState.buildLogs.length})
              </summary>
              <ScrollArea className="max-h-24 mt-2">
                <div className="bg-gray-900 text-green-400 p-2 rounded font-mono text-xs">
                  {streamingState.buildLogs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              </ScrollArea>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
