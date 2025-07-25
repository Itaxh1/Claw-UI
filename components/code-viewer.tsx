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
import dynamic from "next/dynamic"
import type { CodeFile } from "@/lib/api"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

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
      <div className={`bg-gray-50 flex items-center justify-center ${className}`}>
        <div className="text-center text-gray-500">
          <Code className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>No code files to display</p>
        </div>
      </div>
    )
  }

  // Build file tree structure
  const buildFileTree = (files: CodeFile[]): FileTreeNode[] => {
    const root: { [key: string]: FileTreeNode } = {}

    files.forEach((file) => {
      const parts = file.path.split("/")
      let current = root

      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            name: part,
            path: parts.slice(0, index + 1).join("/"),
            type: index === parts.length - 1 ? "file" : "folder",
            children: index === parts.length - 1 ? undefined : {},
            file: index === parts.length - 1 ? file : undefined,
          }
        }
        if (current[part].children) {
          current = current[part].children as { [key: string]: FileTreeNode }
        }
      })
    })

    const convertToArray = (obj: { [key: string]: FileTreeNode }): FileTreeNode[] => {
      return Object.values(obj)
        .map((node) => ({
          ...node,
          children: node.children ? convertToArray(node.children as { [key: string]: FileTreeNode }) : undefined,
        }))
        .sort((a, b) => {
          // Folders first, then files
          if (a.type !== b.type) {
            return a.type === "folder" ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        })
    }

    return convertToArray(root)
  }

  const fileTree = buildFileTree(files)
  const activeFileData = files.find((f) => f.path === activeFile) || files[0]

  const getFileIcon = (type: string) => {
    switch (type) {
      case "html":
        return <FileText className="h-4 w-4 text-orange-600" />
      case "js":
      case "javascript":
        return <Code className="h-4 w-4 text-yellow-600" />
      case "css":
        return <FileText className="h-4 w-4 text-blue-600" />
      case "json":
        return <FileText className="h-4 w-4 text-green-600" />
      case "asset":
        return <ImageIcon className="h-4 w-4 text-purple-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getLanguageForMonaco = (language: string) => {
    switch (language.toLowerCase()) {
      case "javascript":
      case "js":
        return "javascript"
      case "html":
        return "html"
      case "css":
        return "css"
      case "json":
        return "json"
      case "typescript":
      case "ts":
        return "typescript"
      default:
        return "plaintext"
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

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
    }
    setExpandedFolders(newExpanded)
  }

  const renderFileTree = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        {node.type === "folder" ? (
          <div>
            <button
              onClick={() => toggleFolder(node.path)}
              className="flex items-center w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
              style={{ paddingLeft: `${8 + depth * 16}px` }}
            >
              {expandedFolders.has(node.path) ? (
                <ChevronDown className="h-4 w-4 mr-1 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1 text-gray-500" />
              )}
              {expandedFolders.has(node.path) ? (
                <FolderOpen className="h-4 w-4 mr-2 text-blue-600" />
              ) : (
                <Folder className="h-4 w-4 mr-2 text-blue-600" />
              )}
              <span className="text-gray-700">{node.name}</span>
            </button>
            {expandedFolders.has(node.path) && node.children && <div>{renderFileTree(node.children, depth + 1)}</div>}
          </div>
        ) : (
          <button
            onClick={() => setActiveFile(node.path)}
            className={`flex items-center w-full text-left px-2 py-1 rounded text-sm ${
              activeFile === node.path ? "bg-blue-100 text-blue-900" : "text-gray-700 hover:bg-gray-100"
            }`}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
          >
            {node.file && getFileIcon(node.file.type)}
            <span className="ml-2 truncate flex-1">{node.name}</span>
            {node.file && (
              <Badge variant="outline" className="ml-2 text-xs shrink-0">
                {node.file.language}
              </Badge>
            )}
          </button>
        )}
      </div>
    ))
  }

  return (
    <div className={`flex h-full ${className}`}>
      {/* File Tree Sidebar - 30% of code area */}
      <div className="w-[30%] border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Files ({files.length})</h3>
            <Button variant="outline" size="sm" onClick={handleDownloadAll} className="h-7 px-2 text-xs bg-transparent">
              <Download className="h-3 w-3 mr-1" />
              All
            </Button>
          </div>
        </div>

        {/* File Tree */}
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">{renderFileTree(fileTree)}</div>
        </ScrollArea>
      </div>

      {/* Code Editor - 70% of code area */}
      <div className="w-[70%] flex flex-col min-w-0">
        {/* File Header */}
        <div className="border-b border-gray-200 bg-white p-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              {getFileIcon(activeFileData.type)}
              <span className="text-sm font-medium text-gray-900 truncate">{activeFileData.path}</span>
              <Badge variant="outline" className="text-xs shrink-0">
                {activeFileData.language}
              </Badge>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyFile(activeFileData.path, activeFileData.content)}
                className="h-7 px-2"
              >
                {copiedFile === activeFileData.path ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDownloadFile(activeFileData)} className="h-7 px-2">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 min-h-0">
          <MonacoEditor
            height="100%"
            language={getLanguageForMonaco(activeFileData.language)}
            value={activeFileData.content}
            theme="vs-light"
            options={{
              readOnly: true,
              minimap: { enabled: true },
              fontSize: 14,
              fontFamily:
                "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Mono', 'Roboto Mono', Consolas, 'Courier New', monospace",
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              folding: true,
              bracketPairColorization: { enabled: true },
              padding: { top: 16, bottom: 16 },
              smoothScrolling: true,
              cursorBlinking: "blink",
              renderWhitespace: "selection",
              showFoldingControls: "always",
              foldingHighlight: true,
              unfoldOnClickAfterEndOfLine: true,
              scrollbar: {
                vertical: "visible",
                horizontal: "visible",
                useShadows: false,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
          />
        </div>

        {/* File Info Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-4">
              <span>{activeFileData.language}</span>
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
