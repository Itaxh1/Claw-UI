"use client"

import type React from "react"

import { useState, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FolderPlus, Folder, FolderOpen, Trash2, Edit3, Plus, ChevronRight, ChevronDown, File } from "lucide-react"

interface FileNode {
  id: string
  name: string
  type: "file" | "folder"
  content?: string
  children?: FileNode[]
  isOpen?: boolean
}

interface FileManagerProps {
  fileStructure: FileNode[]
  setFileStructure: React.Dispatch<React.SetStateAction<FileNode[]>>
  activeFile: string | null
  onFileSelect: (fileId: string) => void
}

// Memoized file item component for performance
const FileItem = memo(
  ({
    node,
    level = 0,
    activeFile,
    onFileSelect,
    onToggleFolder,
    onRename,
    onDelete,
  }: {
    node: FileNode
    level?: number
    activeFile: string | null
    onFileSelect: (fileId: string) => void
    onToggleFolder: (nodeId: string) => void
    onRename: (nodeId: string, newName: string) => void
    onDelete: (nodeId: string) => void
  }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(node.name)

    const handleRename = () => {
      if (editName.trim() && editName !== node.name) {
        onRename(node.id, editName.trim())
      }
      setIsEditing(false)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleRename()
      } else if (e.key === "Escape") {
        setEditName(node.name)
        setIsEditing(false)
      }
    }

    return (
      <div>
        <div
          className={`flex items-center space-x-1 px-2 py-1 rounded cursor-pointer hover:bg-slate-700/30 group ${
            activeFile === node.id ? "bg-slate-700/50 text-cyan-400" : "text-slate-300"
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => {
            if (node.type === "file") {
              onFileSelect(node.id)
            } else {
              onToggleFolder(node.id)
            }
          }}
        >
          {node.type === "folder" && (
            <div className="w-4 h-4 flex items-center justify-center">
              {node.isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </div>
          )}

          <div className="w-4 h-4 flex items-center justify-center">
            {node.type === "folder" ? (
              node.isOpen ? (
                <FolderOpen className="h-3 w-3" />
              ) : (
                <Folder className="h-3 w-3" />
              )
            ) : (
              <File className="h-3 w-3" />
            )}
          </div>

          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyPress}
              className="h-6 text-xs bg-slate-600 border-slate-500 text-slate-200"
              autoFocus
            />
          ) : (
            <span className="text-xs flex-1 truncate">{node.name}</span>
          )}

          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-slate-400 hover:text-slate-200"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
            >
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-slate-400 hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(node.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {node.type === "folder" && node.isOpen && node.children && (
          <div>
            {node.children.map((child) => (
              <FileItem
                key={child.id}
                node={child}
                level={level + 1}
                activeFile={activeFile}
                onFileSelect={onFileSelect}
                onToggleFolder={onToggleFolder}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    )
  },
)

FileItem.displayName = "FileItem"

export function FileManager({ fileStructure, setFileStructure, activeFile, onFileSelect }: FileManagerProps) {
  const [newItemName, setNewItemName] = useState("")
  const [isCreating, setIsCreating] = useState<"file" | "folder" | null>(null)

  // Lightweight file operations using callbacks to minimize re-renders
  const toggleFolder = useCallback(
    (nodeId: string) => {
      setFileStructure((prev) => {
        const toggleNode = (nodes: FileNode[]): FileNode[] => {
          return nodes.map((node) => {
            if (node.id === nodeId && node.type === "folder") {
              return { ...node, isOpen: !node.isOpen }
            }
            if (node.children) {
              return { ...node, children: toggleNode(node.children) }
            }
            return node
          })
        }
        return toggleNode(prev)
      })
    },
    [setFileStructure],
  )

  const renameNode = useCallback(
    (nodeId: string, newName: string) => {
      setFileStructure((prev) => {
        const renameInNodes = (nodes: FileNode[]): FileNode[] => {
          return nodes.map((node) => {
            if (node.id === nodeId) {
              return { ...node, name: newName }
            }
            if (node.children) {
              return { ...node, children: renameInNodes(node.children) }
            }
            return node
          })
        }
        return renameInNodes(prev)
      })
    },
    [setFileStructure],
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      setFileStructure((prev) => {
        const deleteFromNodes = (nodes: FileNode[]): FileNode[] => {
          return nodes
            .filter((node) => {
              if (node.id === nodeId) return false
              if (node.children) {
                return { ...node, children: deleteFromNodes(node.children) }
              }
              return true
            })
            .map((node) => {
              if (node.children) {
                return { ...node, children: deleteFromNodes(node.children) }
              }
              return node
            })
        }
        return deleteFromNodes(prev)
      })
    },
    [setFileStructure],
  )

  const createNewItem = useCallback(
    (type: "file" | "folder") => {
      if (!newItemName.trim()) return

      const newNode: FileNode = {
        id: Date.now().toString(),
        name: newItemName.trim(),
        type,
        content: type === "file" ? "// New file\n" : undefined,
        children: type === "folder" ? [] : undefined,
        isOpen: type === "folder" ? false : undefined,
      }

      setFileStructure((prev) => [...prev, newNode])
      setNewItemName("")
      setIsCreating(null)

      if (type === "file") {
        onFileSelect(newNode.id)
      }
    },
    [newItemName, setFileStructure, onFileSelect],
  )

  return (
    <div className="flex flex-col h-full">
      {/* File Actions */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-center space-x-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCreating("file")}
            className="flex-1 h-8 text-xs text-slate-400 hover:text-cyan-400"
          >
            <Plus className="h-3 w-3 mr-1" />
            File
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCreating("folder")}
            className="flex-1 h-8 text-xs text-slate-400 hover:text-purple-400"
          >
            <FolderPlus className="h-3 w-3 mr-1" />
            Folder
          </Button>
        </div>

        {isCreating && (
          <div className="flex space-x-2">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`${isCreating} name...`}
              className="h-7 text-xs bg-slate-700/50 border-slate-600 text-slate-200"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  createNewItem(isCreating)
                } else if (e.key === "Escape") {
                  setIsCreating(null)
                  setNewItemName("")
                }
              }}
              autoFocus
            />
            <Button variant="ghost" size="sm" onClick={() => createNewItem(isCreating)} className="h-7 px-2 text-xs">
              ✓
            </Button>
          </div>
        )}
      </div>

      {/* File Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {fileStructure.map((node) => (
            <FileItem
              key={node.id}
              node={node}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              onToggleFolder={toggleFolder}
              onRename={renameNode}
              onDelete={deleteNode}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
