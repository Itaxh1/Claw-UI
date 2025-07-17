"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Download, Code, Eye, Gamepad2, Zap, Shield, Target, Star, FileText } from "lucide-react"
import type { CodeResponse } from "@/lib/api"

interface GamePreviewProps {
  codeResponse: CodeResponse
  onDownload: () => void
  onPreview?: () => void
}

const getGameFeatureIcon = (feature: string) => {
  const lowerFeature = feature.toLowerCase()
  if (lowerFeature.includes("physics")) return <Zap className="h-3 w-3" />
  if (lowerFeature.includes("particle")) return <Star className="h-3 w-3" />
  if (lowerFeature.includes("mobile")) return <Gamepad2 className="h-3 w-3" />
  if (lowerFeature.includes("shield") || lowerFeature.includes("power")) return <Shield className="h-3 w-3" />
  if (lowerFeature.includes("enemy") || lowerFeature.includes("ai")) return <Target className="h-3 w-3" />
  return <Star className="h-3 w-3" />
}

export function GamePreview({ codeResponse, onDownload, onPreview }: GamePreviewProps) {
  const [activeFile, setActiveFile] = useState(0)

  const totalLines = codeResponse.files.reduce((sum, file) => sum + (file.content.split("\n").length || 0), 0)
  const mainFiles = codeResponse.files.filter((file) => ["html", "js", "css"].includes(file.type))
  const assetFiles = codeResponse.files.filter((file) => !["html", "js", "css"].includes(file.type))

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Gamepad2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Game Generated Successfully!</h3>
              <p className="text-sm text-gray-600">
                {codeResponse.framework} • {totalLines} lines • {codeResponse.files.length} files
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onPreview && (
              <Button size="sm" variant="outline" onClick={onPreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
            <Button size="sm" onClick={onDownload} className="bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Download ZIP
            </Button>
          </div>
        </div>

        {/* Game Features */}
        <div className="flex flex-wrap gap-2">
          {codeResponse.gameFeatures.map((feature, index) => (
            <Badge key={index} variant="secondary" className="bg-white/80 text-gray-700">
              {getGameFeatureIcon(feature)}
              <span className="ml-1">{feature}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* File Tabs */}
      <div className="border-b bg-gray-50">
        <div className="flex overflow-x-auto">
          {codeResponse.files.map((file, index) => (
            <button
              key={index}
              onClick={() => setActiveFile(index)}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeFile === index
                  ? "border-blue-500 text-blue-600 bg-white"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Code className="h-4 w-4" />
              <span>{file.path}</span>
              <Badge variant="outline" className="text-xs">
                {file.language}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* File Content */}
      <div className="h-80">
        <ScrollArea className="h-full">
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">{codeResponse.files[activeFile].path}</span>
                <Badge variant="secondary" className="text-xs">
                  {codeResponse.files[activeFile].size} bytes
                </Badge>
              </div>
              <p className="text-xs text-gray-500">{codeResponse.files[activeFile].description}</p>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
              <code>{codeResponse.files[activeFile].content}</code>
            </pre>
          </div>
        </ScrollArea>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 p-4 border-t">
        <div className="flex items-start space-x-2">
          <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
            <Play className="h-3 w-3 text-green-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">How to Run Your Game</h4>
            <div className="text-sm text-gray-600 space-y-1">
              {codeResponse.instructions.split("\n").map((instruction, index) => (
                <p key={index}>{instruction}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* File Structure Overview */}
      <details className="border-t">
        <summary className="p-4 cursor-pointer hover:bg-gray-50 text-sm font-medium text-gray-700">
          File Structure ({codeResponse.files.length} files)
        </summary>
        <div className="px-4 pb-4 space-y-2">
          {mainFiles.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 mb-1">Core Files</h5>
              {mainFiles.map((file, index) => (
                <div key={index} className="flex items-center space-x-2 text-xs text-gray-600 ml-2">
                  <Code className="h-3 w-3" />
                  <span>{file.path}</span>
                  <span className="text-gray-400">({file.size} bytes)</span>
                </div>
              ))}
            </div>
          )}
          {assetFiles.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 mb-1">Assets</h5>
              {assetFiles.map((file, index) => (
                <div key={index} className="flex items-center space-x-2 text-xs text-gray-600 ml-2">
                  <FileText className="h-3 w-3" />
                  <span>{file.path}</span>
                  <span className="text-gray-400">({file.size} bytes)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
