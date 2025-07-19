"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Brain,
  Code,
  FileText,
  Eye,
  Download,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Zap,
} from "lucide-react"

interface StreamingStatusProps {
  streamingState: {
    isStreaming: boolean
    currentThinking: string
    currentTextChunks: string[]
    currentFiles: { [fileName: string]: { content: string; isComplete: boolean; size?: number } }
    totalFiles: number
    completedFiles: number
    progress: number
    previewStatus?: {
      status: "building" | "ready" | "error"
      url?: string
    }
    downloadUrl?: string
    error?: string
    buildLogs: string[]
  }
  onStop: () => void
}

export function StreamingStatus({ streamingState, onStop }: StreamingStatusProps) {
  if (
    !streamingState.isStreaming &&
    !streamingState.error &&
    !streamingState.previewStatus &&
    !streamingState.downloadUrl
  ) {
    return null
  }

  const fileCount = Object.keys(streamingState.currentFiles).length
  const completedFileCount = Object.values(streamingState.currentFiles).filter((f) => f.isComplete).length

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {streamingState.error ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : streamingState.isStreaming ? (
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          <span className="font-medium text-gray-900">
            {streamingState.error
              ? "Generation Error"
              : streamingState.isStreaming
                ? "Generating Game..."
                : "Generation Complete"}
          </span>
        </div>
        {streamingState.isStreaming && (
          <Button variant="ghost" size="sm" onClick={onStop} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {streamingState.error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
          <p className="text-red-700 text-sm">{streamingState.error}</p>
        </div>
      )}

      {/* Thinking Phase */}
      {streamingState.currentThinking && (
        <div className="flex items-center space-x-2 mb-3">
          <Brain className="h-4 w-4 text-purple-500" />
          <span className="text-sm text-gray-600">{streamingState.currentThinking}</span>
        </div>
      )}

      {/* Overall Progress */}
      {streamingState.progress > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-xs text-gray-500">{streamingState.progress}%</span>
          </div>
          <Progress value={streamingState.progress} className="h-2" />
        </div>
      )}

      {/* File Generation Progress */}
      {fileCount > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Code className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                Generating Files ({completedFileCount}/{fileCount})
              </span>
            </div>
          </div>
          <div className="space-y-1">
            {Object.entries(streamingState.currentFiles).map(([fileName, file]) => (
              <div key={fileName} className="flex items-center space-x-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${file.isComplete ? "bg-green-500" : "bg-yellow-500"}`} />
                <FileText className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600 flex-1 truncate">{fileName}</span>
                {file.size && <span className="text-gray-400">{(file.size / 1024).toFixed(1)}KB</span>}
                {file.isComplete && <CheckCircle className="h-3 w-3 text-green-500" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Generation */}
      {streamingState.currentTextChunks.length > 0 && (
        <div className="mb-3">
          <div className="bg-gray-50 rounded p-2 text-xs text-gray-600 max-h-20 overflow-y-auto">
            {streamingState.currentTextChunks.join("")}
          </div>
        </div>
      )}

      {/* Preview Status */}
      {streamingState.previewStatus && (
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <Eye className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Live Preview</span>
            <Badge
              variant={
                streamingState.previewStatus.status === "ready"
                  ? "default"
                  : streamingState.previewStatus.status === "error"
                    ? "destructive"
                    : "secondary"
              }
              className="text-xs"
            >
              {streamingState.previewStatus.status === "building" && <Zap className="h-3 w-3 mr-1" />}
              {streamingState.previewStatus.status}
            </Badge>
          </div>

          {streamingState.previewStatus.status === "ready" && streamingState.previewStatus.url && (
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              onClick={() => window.open(streamingState.previewStatus!.url, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Live Preview
            </Button>
          )}

          {streamingState.previewStatus.status === "error" && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
              Preview build failed. Check build logs for details.
            </div>
          )}
        </div>
      )}

      {/* Build Logs */}
      {streamingState.buildLogs.length > 0 && (
        <details className="mb-3">
          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
            Build Logs ({streamingState.buildLogs.length})
          </summary>
          <div className="mt-2 bg-gray-900 text-green-400 rounded p-2 text-xs font-mono max-h-32 overflow-y-auto">
            {streamingState.buildLogs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </details>
      )}

      {/* Download Ready */}
      {streamingState.downloadUrl && (
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-green-50 text-green-700">
            <Download className="h-3 w-3 mr-1" />
            Download Ready
          </Badge>
        </div>
      )}
    </div>
  )
}
