"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Code,
  FileText,
  ImageIcon,
  Download,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from "lucide-react"

interface CodeFile {
  path: string
  content: string
  type: string
  language: string
}

interface CodeViewerProps {
  files: CodeFile[]
  className?: string
}

interface FileTreeNode {
  name: string
  path: string
  type: "file" | "folder"
  children?: FileTreeNode[]
  file?: CodeFile
}

export function CodeViewer({ files, className = "" }: CodeViewerProps) {
  const [activeFile, setActiveFile] = useState(files[0]?.path || "")
  const [copiedFile, setCopiedFile] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Initialize expanded folders and active file when files change
  useEffect(() => {
    if (files.length > 0) {
      // Auto-expand all folders initially
      const foldersToExpand = new Set<string>()

      files.forEach((file) => {
        const parts = file.path.split("/")
        for (let i = 1; i < parts.length; i++) {
          const folderPath = parts.slice(0, i).join("/")
          if (folderPath) {
            foldersToExpand.add(folderPath)
          }
        }
      })

      setExpandedFolders(foldersToExpand)

      // Set active file to first file if none selected
      if (!activeFile || !files.find((f) => f.path === activeFile)) {
        setActiveFile(files[0].path)
      }
    }
  }, [files, activeFile])

  if (!files || files.length === 0) {
    return (
      <div className={`glass-card flex items-center justify-center p-8 ${className}`}>
        <div className="text-center text-secondary-liquid">
          <Code className="h-16 w-16 mx-auto mb-4 opacity-50 system-blue" />
          <p className="text-primary-liquid">No code files to display</p>
        </div>
      </div>
    )
  }

  // Build file tree structure - simplified version
  const buildFileTree = (files: CodeFile[]): FileTreeNode[] => {
    const fileNodes: FileTreeNode[] = files.map(file => ({
      name: file.path.split('/').pop() || file.path,
      path: file.path,
      type: "file" as const,
      file: file
    }))
    
    return fileNodes.sort((a, b) => a.name.localeCompare(b.name))
  }

  const fileTree = buildFileTree(files)
  const activeFileData = files.find((f) => f.path === activeFile) || files[0]

  const getFileIcon = (type: string) => {
    switch (type) {
      case "html":
        return <FileText className="h-4 w-4 system-orange" />
      case "js":
      case "javascript":
        return <Code className="h-4 w-4 system-yellow" />
      case "css":
        return <FileText className="h-4 w-4 system-blue" />
      case "json":
        return <FileText className="h-4 w-4 system-green" />
      case "asset":
        return <ImageIcon className="h-4 w-4 system-purple" />
      default:
        return <FileText className="h-4 w-4 text-secondary-liquid" />
    }
  }

  const handleCopyFile = async (filePath: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedFile(filePath)
      setTimeout(() => setCopiedFile(null), 2000)
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
    }
  }

  const handleDownloadFile = (file: CodeFile) => {
    const blob = new Blob([file.content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = file.path
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadAll = () => {
    const allContent = files.map((file) => `// File: ${file.path}\n${file.content}\n\n${"=".repeat(50)}\n\n`).join("")

    const blob = new Blob([allContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "game-files.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const renderFileTree = (nodes: FileTreeNode[]) => {
    return nodes.map((node) => (
      <button
        key={node.path}
        onClick={() => setActiveFile(node.path)}
        className={`flex items-center w-full text-left px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
          activeFile === node.path 
            ? "bg-surface-tertiary text-primary-liquid border border-blue-500/30" 
            : "text-secondary-liquid hover:bg-surface-secondary hover:text-primary-liquid"
        }`}
      >
        {node.file && getFileIcon(node.file.type)}
        <span className="ml-2 truncate flex-1 text-primary-liquid">{node.name}</span>
        {node.file && (
          <Badge variant="outline" className="ml-2 text-xs shrink-0 bg-surface-quaternary border-none text-tertiary-liquid">
            {node.file.language}
          </Badge>
        )}
      </button>
    ))
  }

  return (
    <div className={`flex h-full ${className} animate-liquid-fade-in`}>
      {/* File Tree Sidebar - 30% of code area */}
      <div className="w-[30%] glass-surface flex flex-col shrink-0 rounded-l-2xl">
        {/* Header */}
        <div className="p-4 glass-elevated rounded-tl-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary-liquid">Files ({files.length})</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadAll} 
              className="h-8 px-3 text-xs liquid-button text-white"
            >
              <Download className="h-3 w-3 mr-1" />
              All
            </Button>
          </div>
        </div>

        {/* File Tree */}
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-1">{renderFileTree(fileTree)}</div>
        </ScrollArea>
      </div>

      {/* Code Editor - 70% of code area */}
      <div className="w-[70%] flex flex-col min-w-0">
        {/* File Header */}
        <div className="glass-elevated p-4 shrink-0 rounded-tr-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              {getFileIcon(activeFileData.type)}
              <span className="text-sm font-medium text-primary-liquid truncate">{activeFileData.path}</span>
              <Badge variant="outline" className="text-xs shrink-0 bg-surface-quaternary border-none text-tertiary-liquid">
                {activeFileData.language}
              </Badge>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyFile(activeFileData.path, activeFileData.content)}
                className="h-8 px-2 hover:bg-surface-tertiary rounded-xl transition-all"
              >
                {copiedFile === activeFileData.path ? (
                  <Check className="h-4 w-4 system-green" />
                ) : (
                  <Copy className="h-4 w-4 text-secondary-liquid" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleDownloadFile(activeFileData)} 
                className="h-8 px-2 hover:bg-surface-tertiary rounded-xl transition-all"
              >
                <Download className="h-4 w-4 text-secondary-liquid" />
              </Button>
            </div>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 min-h-0 bg-surface-primary">
          <div className="w-full h-full bg-surface-primary text-primary-liquid p-6 overflow-auto font-mono text-sm rounded-br-2xl">
            <pre className="whitespace-pre-wrap leading-relaxed">{activeFileData.content}</pre>
          </div>
        </div>

        {/* File Info Footer */}
        <div className="bg-surface-secondary px-4 py-3 shrink-0 rounded-br-2xl">
          <div className="flex items-center justify-between text-xs text-tertiary-liquid">
            <div className="flex items-center space-x-4">
              <span className="text-secondary-liquid">{activeFileData.language}</span>
              <span>{Math.round(activeFileData.content.length / 1024)} KB</span>
              <span>{activeFileData.content.split("\n").length} lines</span>
            </div>
            <div>
              {files.findIndex((f) => f.path === activeFile) + 1} of {files.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}