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
        return <FileText className="h-3 w-3 text-primary" />
      case "js":
      case "javascript":
        return <Code className="h-3 w-3 text-primary" />
      case "css":
        return <FileText className="h-3 w-3 text-primary" />
      default:
        return <FileText className="h-3 w-3 text-muted-foreground" />
    }
  }

  return (
    <div className="flex justify-start mb-4 animate-fadeInUp">
      <div className="flex items-start space-x-3 max-w-[85%]">
        <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-glow">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="bg-card rounded-2xl px-4 py-3 flex-1 space-y-3 shadow-card glass">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Gamepad2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {streamingState.isStreaming ? "Generating Game..." : "Game Generation"}
              </span>
              {streamingState.isStreaming && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
            {streamingState.isStreaming && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onStop}
                className="game-button h-6 px-2 text-xs text-black hover:bg-secondary hover:text-black shadow-glow"
              >
                <StopCircle className="h-3 w-3 mr-1 text-primary" />
                Stop
              </Button>
            )}
          </div>
          {/* Progress */}
          {(streamingState.progress > 0 || streamingState.step > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {streamingState.stepName &&
                    `Step ${streamingState.step}/${streamingState.totalSteps}: ${streamingState.stepName}`}
                </span>
                <span className="text-muted-foreground">{streamingState.progress}%</span>
              </div>
              <Progress value={streamingState.progress} className="h-2 bg-secondary/20" />
            </div>
          )}
          {/* Current Status */}
          {streamingState.currentThinking && (
            <div className="bg-card rounded-lg p-3 border border-border shadow-card">
              <p className="text-sm text-muted-foreground">{streamingState.currentThinking}</p>
            </div>
          )}
          {/* Chain Steps */}
          {streamingState.metadata?.chainSteps && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-foreground">AI Chain:</span>
              <div className="flex flex-wrap gap-1">
                {streamingState.metadata.chainSteps.map((step, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs text-primary border-primary"
                  >
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
                <span className="text-xs font-medium text-foreground">
                  Generated Files ({streamingState.generatedFiles.length})
                </span>
                {streamingState.metadata && (
                  <div className="flex space-x-1">
                    <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30">
                      {streamingState.metadata.gameType}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-primary border-primary">
                      {streamingState.metadata.framework}
                    </Badge>
                  </div>
                )}
              </div>
              <ScrollArea className="max-h-32">
                <div className="space-y-1">
                  {streamingState.generatedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-card rounded p-2 border border-border text-xs shadow-card"
                    >
                      <div className="flex items-center space-x-2">
                        {getFileIcon(file.type)}
                        <span className="font-mono text-foreground">{file.path}</span>
                        <Badge variant="outline" className="text-xs text-primary border-primary">
                          {file.language}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground">{Math.round(file.content.length / 1024)}KB</span>
                        <CheckCircle className="h-3 w-3 text-game-success" />
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
                <span className="text-muted-foreground">Files Generated</span>
                <span className="text-muted-foreground">
                  {streamingState.completedFiles}/{streamingState.totalFiles}
                </span>
              </div>
              <Progress
                value={(streamingState.completedFiles / streamingState.totalFiles) * 100}
                className="h-2 bg-secondary/20"
              />
            </div>
          )}
          {/* Preview Status */}
          {streamingState.previewUrl && (
            <div className="bg-game-success/10 border border-game-success rounded-lg p-3 shadow-glow">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-game-success" />
                <span className="text-sm font-medium text-game-success">Preview Ready!</span>
              </div>
              <p className="text-sm text-game-success mt-1">
                Your game is ready to preview. Switch to the Preview tab to see it in action.
              </p>
            </div>
          )}
          {/* Error */}
          {streamingState.error && (
            <div className="bg-game-warning/10 border border-game-warning rounded-lg p-3 shadow-glow">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-game-warning" />
                <span className="text-sm font-medium text-game-warning">Generation Error</span>
              </div>
              <p className="text-sm text-game-warning mt-1">{streamingState.error}</p>
            </div>
          )}
          {/* Build Logs */}
          {streamingState.buildLogs.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Build Logs ({streamingState.buildLogs.length})
              </summary>
              <ScrollArea className="max-h-24 mt-2">
                <div className="bg-gray-900 text-primary-foreground p-2 rounded font-mono text-xs">
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