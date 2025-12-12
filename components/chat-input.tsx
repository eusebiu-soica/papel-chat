"use client"

import { SendHorizontal, Smile, Paperclip, Loader2, X, Mic, MicOff, Trash2 } from "lucide-react"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { useRef, useState, KeyboardEvent, useEffect } from "react"
import { Textarea } from "./ui/textarea"
import { EmojiPicker } from "./emoji-picker"
import { useIsMobile } from "@/hooks/use-mobile"
import { fileToBase64 } from "@/lib/image-utils"
import Image from "next/image"
// @ts-ignore - react-media-recorder types may not be perfect
import { useReactMediaRecorder } from "react-media-recorder"

interface FileData {
  dataUri: string
  fileName: string
  fileType: string
  fileSize: number
  width?: number
  height?: number
}

interface ChatInputProps {
  onSendMessage: (message: string, fileData?: FileData | null) => void
  className?: string
  placeholder?: string
  replyingTo?: { id: string; content: string; senderName: string } | null
  onCancelReply?: () => void
  isLoading?: boolean
}

export function ChatInput({
  onSendMessage,
  className,
  placeholder = "Write a message...",
  replyingTo,
  onCancelReply,
  isLoading = false
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMobile = useIsMobile()
  const autoSendVoiceRef = useRef(false);
  const isCancellingRef = useRef(false);


  const hasText = message.trim().length > 0 || selectedFile !== null

  // Voice recording
  const {
    status: recordingStatus,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    clearBlobUrl
  } = useReactMediaRecorder({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      
    },
    onStop: async (blobUrl, blob) => {
      if (isCancellingRef.current) {
        isCancellingRef.current = false;
        return; // IGNORĂ înregistrarea, a fost cancel
      }
    
      const audioFile = new File([blob], `voice-${Date.now()}.webm`, {
        type: blob.type,
      });
    
      const { dataUri } = await fileToBase64(audioFile);
    
      setSelectedFile({
        dataUri,
        fileName: audioFile.name,
        fileType: audioFile.type,
        fileSize: audioFile.size,
      });
    }
    
  })

  // Recording timer
  useEffect(() => {
    if (recordingStatus === 'recording') {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [recordingStatus])

  useEffect(() => {
    if (selectedFile && autoSendVoiceRef.current && recordingStatus !== "recording") {
      onSendMessage("", selectedFile)
      setSelectedFile(null)
      clearBlobUrl()
      setRecordingTime(0)
      autoSendVoiceRef.current = false
    }
  }, [selectedFile, recordingStatus, onSendMessage])


  

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = () => {
    startRecording()
    setShowEmojiPicker(false) // Close emoji picker if open
    // Blur textarea to prevent keyboard
    if (textareaRef.current) {
      textareaRef.current.blur()
    }
  }

  const handleStopRecording = () => {
    if (recordingStatus === 'recording') {
      stopRecording()
    }
  }

  const handleSendVoiceMessage = () => {
    if (recordingStatus === 'recording') {
      autoSendVoiceRef.current = true
      handleStopRecording()
      // The onStop callback will set selectedFile, then useEffect will send it
    } else if (selectedFile) {
      // If already stopped, just send
      onSendMessage("", selectedFile)
      setSelectedFile(null)
      clearBlobUrl()
      setRecordingTime(0)
    }
  }

  const handleCancelRecording = () => {
    isCancellingRef.current = true
    if (recordingStatus === 'recording') {
      stopRecording()
    }
    clearBlobUrl()
    setRecordingTime(0)
    setSelectedFile(null)
    autoSendVoiceRef.current = false
  }

  const handleSubmit = () => {
    if ((message.trim() || selectedFile) && !isLoading && !uploadingFile && recordingStatus !== 'recording') {
      onSendMessage(message.trim() || "", selectedFile)
      setMessage("")
      setSelectedFile(null)
      setShowEmojiPicker(false)
      clearBlobUrl()
      setRecordingTime(0)
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
        setTimeout(() => {
          textareaRef.current?.focus()
        }, 0)
      }
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploadingFile(true)
    try {
      const { dataUri, width, height } = await fileToBase64(file)

      const fileData: FileData = {
        dataUri,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        width,
        height
      }

      setSelectedFile(fileData)
    } catch (error: any) {
      console.error('Error processing file:', error)
      alert(error?.message || 'Failed to process file. Please try again.')
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }


  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Blur the textarea first to prevent mobile keyboard from opening
    textarea.blur()

    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const textBefore = message.substring(0, start)
    const textAfter = message.substring(end)

    const newMessage = textBefore + emoji + textAfter
    setMessage(newMessage)

    // Update textarea height without focusing (to keep keyboard closed)
    setTimeout(() => {
      // Set cursor position without focusing
      const newPosition = start + emoji.length
      textarea.setSelectionRange(newPosition, newPosition)

      // Update height
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`

      // Don't refocus - keep keyboard closed
    }, 0)
  }

  const iconButtonClasses = "h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all touch-manipulation active:scale-95 shrink-0"

  return (
    // MODIFICARE 1: Eliminăm 'relative' dacă nu este strict necesar. 
    // Ne bazăm pe structura flex-col pentru a așeza elementele unul sub altul.
    <div className={cn("flex w-full flex-col bg-background", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-primary mb-0.5">Replying to {replyingTo.senderName}</div>
            <div className="text-xs text-muted-foreground truncate">{replyingTo.content}</div>
          </div>
          <button
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground ml-2 transition-colors"
            aria-label="Cancel reply"
          >
            ✕
          </button>
        </div>
      )}

      {/* Voice recording preview */}
      {recordingStatus === 'recording' && (
        <div className="px-4 py-3 border-b border-border bg-primary/5 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75"></div>
              <div className="relative w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Mic className="h-5 w-5 text-primary animate-pulse" />
              </div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-primary">Recording voice message...</div>
              <div className="text-xs text-muted-foreground font-mono">{formatRecordingTime(recordingTime)}</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancelRecording}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* File preview - show for images and files, but not for voice messages */}
      {selectedFile && recordingStatus !== 'recording' && !selectedFile.fileName.includes('voice-') && (
        <div className="relative px-4 py-2 border-b border-border bg-muted/30">
          <div className="relative inline-block max-w-[200px] rounded-lg overflow-hidden">
            {selectedFile.fileType.startsWith('image/') ? (
              <Image
                src={selectedFile.dataUri}
                alt={selectedFile.fileName}
                width={200}
                height={200}
                className="max-w-full max-h-[200px] object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg min-w-[150px]">
                <Paperclip className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground truncate max-w-full" title={selectedFile.fileName}>
                  {selectedFile.fileName}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {(selectedFile.fileSize / 1024).toFixed(1)} KB
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFile(null)}
              className="absolute top-1 right-1 bg-background/80 hover:bg-background rounded-full p-1 transition-colors"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}



      {/* Input container - Rămâne întotdeauna vizibil în partea de jos */}
      <div
        className={cn(
          "flex items-center gap-2 p-2 sm:p-3 relative bg-card border-none md:border md:border-input md:rounded-[8px] md:shadow-sm md:m-3 md:p-1.5 z-10", // Am adăugat z-10 pentru siguranță
          // Opțional: Adăugăm o bordură de sus doar când nu este deschis picker-ul (dacă InputContainer este Fixed/Static).
          !showEmojiPicker && "border-t md:border-t-0"
        )}
      >

        {/* Paperclip icon - Far left */}
        <Button
          variant="ghost"
          size="icon"
          className={iconButtonClasses}
          onClick={handleFileClick}
          disabled={uploadingFile}
          title="Add attachment"
        >
          {uploadingFile ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>

        {/* Text Input - Center */}
        <div className="flex-1 relative min-w-0">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyPress}
            onFocus={(e) => {
              // Prevent keyboard from opening if emoji picker is open
              if (showEmojiPicker) {
                e.target.blur()
              }
            }}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              "min-h-[2.5rem] max-h-[120px] resize-none",
              "bg-transparent text-foreground placeholder:text-muted-foreground",
              "border-none px-0 py-2 ml-3",
              "text-sm sm:text-base",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              isLoading && "opacity-60 cursor-not-allowed",
              "w-full"
            )}
            rows={1}
          />
        </div>

        {/* Right side buttons */}
        <div className="flex items-center space-x-1 pr-1">
          {/* Butonul de Emoji (Custom Toggle) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const willOpen = !showEmojiPicker
              setShowEmojiPicker(willOpen);

              // When opening emoji picker, blur textarea to close keyboard
              if (willOpen && textareaRef.current) {
                textareaRef.current.blur()
              }

              // When closing picker, optionally refocus (but user can tap to focus if needed)
              // We don't auto-focus to avoid keyboard popup
            }}
            className={cn(
              iconButtonClasses,
              showEmojiPicker && "bg-destructive/10 text-destructive hover:bg-destructive/20"
            )}
            title={showEmojiPicker ? "Close emoji picker" : "Add emoji"}
          >
            {showEmojiPicker ? (
              <X className="h-4 w-4" />
            ) : (
              <Smile className="h-4 w-4" />
            )}
          </Button>

          {/* Microphone or Send button - Far right */}
          {recordingStatus === 'recording' ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancelRecording}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Cancel recording"
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75"></div>
                  <Mic className="h-4 w-4 text-primary relative" />
                </div>
                <span className="text-sm font-medium text-primary min-w-[2.5rem]">
                  {formatRecordingTime(recordingTime)}
                </span>
              </div>
              <Button
                onClick={handleSendVoiceMessage}
                size="icon"
                className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full transition-all touch-manipulation active:scale-95"
                title="Send voice message"
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
          ) : hasText ? (
            <Button
              onClick={handleSubmit}
              size="icon"
              disabled={isLoading || uploadingFile}
              className={cn(
                "h-8 w-8 shrink-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all touch-manipulation active:scale-95",
                isLoading && "opacity-60 cursor-not-allowed"
              )}
              title="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={iconButtonClasses}
              onClick={handleStartRecording}
              title="Record voice message"
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {/* MODIFICARE 2: Containerul Picker-ului este poziționat DEASUPRA Input-ului */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          // Dacă este deschis, are înălțimea de 40vh, altfel 0.
          showEmojiPicker ? "h-[45vh] border-t border-border shadow-lg" : "h-0 border-t-0"
        )}
      >
        {/* Adăugăm padding intern și scroll doar când este deschis */}
        <div className={cn(
          "w-full h-full bg-card overflow-y-auto"
        )}>
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        </div>
      </div>
    </div>
  )
}