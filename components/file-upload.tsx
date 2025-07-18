"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { X, Upload, File, ImageIcon, Code, FileText, Music, Archive, AlertCircle } from "lucide-react"

interface FileUploadProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  maxFiles?: number
  maxSize?: number // in MB
}

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
  if (type.includes("javascript") || type.includes("typescript") || type.includes("html") || type.includes("css"))
    return <Code className="h-4 w-4" />
  if (type.includes("text") || type.includes("pdf")) return <FileText className="h-4 w-4" />
  if (type.includes("audio")) return <Music className="h-4 w-4" />
  if (type.includes("zip") || type.includes("tar")) return <Archive className="h-4 w-4" />
  return <File className="h-4 w-4" />
}

const getFileTypeColor = (type: string) => {
  if (type.startsWith("image/")) return "bg-green-100 text-green-800"
  if (type.includes("javascript") || type.includes("typescript")) return "bg-blue-100 text-blue-800"
  if (type.includes("html") || type.includes("css")) return "bg-purple-100 text-purple-800"
  if (type.includes("text") || type.includes("pdf")) return "bg-gray-100 text-gray-800"
  if (type.includes("audio")) return "bg-pink-100 text-pink-800"
  if (type.includes("zip") || type.includes("tar")) return "bg-orange-100 text-orange-800"
  return "bg-gray-100 text-gray-800"
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function FileUpload({ files, onFilesChange, maxFiles = 5, maxSize = 50 }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [errors, setErrors] = useState<string[]>([])

  const validateFile = (file: File): string | null => {
    const maxSizeBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `File "${file.name}" is too large (${formatFileSize(file.size)}). Maximum size is ${maxSize}MB.`
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/svg+xml",
      "text/javascript",
      "application/javascript",
      "text/typescript",
      "text/html",
      "text/css",
      "application/json",
      "text/plain",
      "text/markdown",
      "application/pdf",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "application/zip",
      "application/x-tar",
      "application/gzip",
    ]

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(js|ts|html|css|json|txt|md)$/i)) {
      return `File type "${file.type}" is not supported for "${file.name}".`
    }

    return null
  }

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles)
      const validationErrors: string[] = []

      if (files.length + fileArray.length > maxFiles) {
        validationErrors.push(`Maximum ${maxFiles} files allowed. You're trying to add ${fileArray.length} more.`)
        setErrors(validationErrors)
        return
      }

      const validFiles: File[] = []
      fileArray.forEach((file) => {
        const error = validateFile(file)
        if (error) {
          validationErrors.push(error)
        } else {
          validFiles.push(file)
        }
      })

      if (validationErrors.length > 0) {
        setErrors(validationErrors)
      } else {
        setErrors([])
        onFilesChange([...files, ...validFiles])

        // Simulate upload progress
        validFiles.forEach((file) => {
          const fileId = `${file.name}-${file.size}`
          let progress = 0
          const interval = setInterval(() => {
            progress += Math.random() * 30
            if (progress >= 100) {
              progress = 100
              clearInterval(interval)
              setTimeout(() => {
                setUploadProgress((prev) => {
                  const newProgress = { ...prev }
                  delete newProgress[fileId]
                  return newProgress
                })
              }, 500)
            }
            setUploadProgress((prev) => ({ ...prev, [fileId]: progress }))
          }, 100)
        })
      }
    },
    [files, maxFiles, onFilesChange],
  )

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      // Only set inactive if we're leaving the drop zone completely
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX
      const y = e.clientY
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragActive(false)
      }
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFiles(e.target.files)
      }
    },
    [handleFiles],
  )

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index)
      onFilesChange(newFiles)
    },
    [files, onFilesChange],
  )

  const clearErrors = () => setErrors([])

  useEffect(() => {
    return () => {
      // Cleanup any remaining drag state
      setDragActive(false)
      setUploadProgress({})
    }
  }, [])

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? "border-blue-400 bg-blue-50"
            : files.length > 0
              ? "border-green-300 bg-green-50"
              : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Click to upload</span> or drag and drop files here
        </p>
        <p className="text-xs text-gray-500">
          Images, code files, documents, audio, archives • Max {maxFiles} files • {maxSize}MB each
        </p>
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          accept=".png,.jpg,.jpeg,.gif,.svg,.js,.ts,.html,.css,.json,.txt,.md,.pdf,.mp3,.wav,.ogg,.zip,.tar.gz"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">Upload Errors</h4>
              <ul className="mt-1 text-xs text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
            <Button variant="ghost" size="sm" onClick={clearErrors} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Attached Files ({files.length}/{maxFiles})
          </h4>
          {files.map((file, index) => {
            const fileId = `${file.name}-${file.size}`
            const progress = uploadProgress[fileId]
            return (
              <div key={index} className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
                <div className={`p-2 rounded ${getFileTypeColor(file.type)}`}>{getFileIcon(file.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    <Badge variant="secondary" className="text-xs">
                      {file.type.split("/")[0]}
                    </Badge>
                  </div>
                  {progress !== undefined && (
                    <div className="mt-1">
                      <Progress value={progress} className="h-1" />
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeFile(index)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* File Type Guide */}
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-700">Supported file types</summary>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <strong>Images:</strong> PNG, JPG, GIF, SVG
          </div>
          <div>
            <strong>Code:</strong> JS, TS, HTML, CSS, JSON
          </div>
          <div>
            <strong>Documents:</strong> TXT, MD, PDF
          </div>
          <div>
            <strong>Audio:</strong> MP3, WAV, OGG
          </div>
          <div>
            <strong>Archives:</strong> ZIP, TAR.GZ
          </div>
          <div>
            <strong>Max Size:</strong> {maxSize}MB per file
          </div>
        </div>
      </details>
    </div>
  )
}
