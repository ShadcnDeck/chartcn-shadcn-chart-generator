"use client"

import { useRef, useState } from "react"
import { UploadCloud } from "lucide-react"

import { cn } from "@/lib/utils"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_EXTENSIONS = [".csv", ".tsv", ".txt", ".json", ".md"]

interface FileUploadProps {
  /** Receives the file's text; format detection happens downstream. */
  onText: (text: string) => void
}

export function FileUpload({ onText }: FileUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File | undefined) {
    if (!file) return

    const name = file.name.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      setError(`Supported files: ${ACCEPTED_EXTENSIONS.join(", ")}`)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File is larger than 2MB.")
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setFileName(file.name)
      onText(String(reader.result ?? ""))
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFile(e.dataTransfer.files[0])
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          isDragging ? "border-primary bg-accent" : "border-border hover:border-primary/40"
        )}
      >
        <UploadCloud className={cn("size-6 transition-transform", isDragging && "-translate-y-0.5 scale-110")} />
        <p>Drag and drop a file here, or click to browse</p>
        <p className="text-xs">CSV, TSV, JSON, or Markdown table · Max 2MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {fileName && !error && (
        <p className="text-sm text-muted-foreground">Loaded: {fileName}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
