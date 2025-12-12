"use client"

import { cn } from "@/lib/utils"
import { Trash2, Reply, Send, X, ZoomIn, ZoomOut, RotateCcw, Download, Copy, FileText, File, Image as ImageIcon, FileVideo, FileAudio, FileCode, FileSpreadsheet, FileArchive, Play, Pause, Volume2 } from "lucide-react"
import { Message } from "./chat-messages"
import { Button } from "./ui/button"
import React, { useState, useRef, useEffect, memo } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer"
import { Dialog, DialogContent } from "./ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import Image from "next/image"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"
import { toast } from 'sonner'

interface ChatBubbleProps {
  message: Message
  isOwn?: boolean
  isGroupChat?: boolean
  currentUserId?: string
  chatId?: string | null
  groupId?: string | null
  onReply?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onDelete?: (messageId: string) => void
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

// FUNCTII AUXILIARE
function formatTime(timestamp: string) {
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return timestamp
    return date.toLocaleTimeString('ro-RO', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return timestamp
  }
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return ImageIcon
  if (fileType.startsWith('video/')) return FileVideo
  if (fileType.startsWith('audio/')) return FileAudio
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('word') || fileType.includes('document')) return FileText
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return FileSpreadsheet
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return FileArchive
  if (fileType.includes('code') || fileType.includes('text')) return FileCode
  return File
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatAudioTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Logica principală a componentei
function ChatBubbleComponent({
  message,
  isOwn = false,
  isGroupChat = false,
  currentUserId,
  onReply,
  onReact,
  onDelete
}: ChatBubbleProps) {
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isSwipingRef = useRef(false)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)


  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) acc[reaction.emoji] = []
    acc[reaction.emoji].push(reaction.userId)
    return acc
  }, {} as Record<string, string[]>) || {}

  const hasReactions = Object.keys(groupedReactions).length > 0

  const isReactionSelected = (emoji: string) => {
    if (!currentUserId) return false
    return message.reactions?.some(r => r.emoji === emoji && r.userId === currentUserId) || false
  }

  // --- LONG PRESS & SWIPE LOGIC (Păstrată) ---
  useEffect(() => {
    if (!isMobile || !bubbleRef.current) return
    const bubble = bubbleRef.current

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button') || target.closest('[role="button"]') || target.tagName === 'IMG') return

      const touch = e.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
      isSwipingRef.current = false

      longPressTimerRef.current = setTimeout(() => {
        setSheetOpen(true)
        e.preventDefault()
      }, 500)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

      if (deltaX > 30 && deltaX > deltaY * 2) {
        isSwipingRef.current = true
        setSwipeOffset(Math.min(deltaX, 100))
      } else if (deltaY > 30 || (deltaX < 30 && deltaY > 10)) {
        touchStartRef.current = null
        setSwipeOffset(0)
        isSwipingRef.current = false
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      if (!touchStartRef.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x

      if (isSwipingRef.current && deltaX > 60) {
        onReply?.(message.id)
      }

      setTimeout(() => {
        setSwipeOffset(0)
        isSwipingRef.current = false
      }, 200)

      touchStartRef.current = null
    }

    const handleTouchCancel = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      touchStartRef.current = null
      setSwipeOffset(0)
      isSwipingRef.current = false
    }

    bubble.addEventListener('touchstart', handleTouchStart, { passive: false })
    bubble.addEventListener('touchmove', handleTouchMove, { passive: true })
    bubble.addEventListener('touchend', handleTouchEnd, { passive: true })
    bubble.addEventListener('touchcancel', handleTouchCancel, { passive: true })

    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
      bubble.removeEventListener('touchstart', handleTouchStart)
      bubble.removeEventListener('touchmove', handleTouchMove)
      bubble.removeEventListener('touchend', handleTouchEnd)
      bubble.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [isMobile, message.id, onReply, isOwn])

  if (message.deletedForEveryone) return null

  // Helpers (Păstrate)
  const handleCopy = async () => { 
    if (!message.content) return
    try {
      await navigator.clipboard.writeText(message.content)
      toast.success('Message copied to clipboard')
    } catch (err) {
      console.error('Failed to copy:', err)
      const textArea = document.createElement('textarea')
      textArea.value = message.content
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        toast.success('Message copied to clipboard')
      } catch (e) {
        console.error('Fallback copy failed:', e)
        toast.error('Failed to copy message')
      }
      document.body.removeChild(textArea)
    }
  }

  const handleDownload = async (dataUri: string, fileName: string, fileType: string) => {
    try {
      const response = await fetch(dataUri)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      toast.success('File downloaded')
    } catch (e) {
      console.error("Download failed", e)
      toast.error('Failed to download file')
    }
  }

  const handleAudioPlay = async () => {
    if (!message.fileData?.dataUri) {
      console.error('No audio data URI found')
      return
    }
    
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      
      const audio = new Audio(message.fileData.dataUri)
      audio.preload = 'auto'
      
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration || 0)
      })
      
      audio.addEventListener('timeupdate', () => {
        setAudioProgress(audio.currentTime)
      })
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false)
        setAudioProgress(0)
        if (audioRef.current) {
          audioRef.current.currentTime = 0
        }
      })
      
      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e, audio.error)
        setIsPlaying(false)
        toast.error('Failed to play audio')
      })
      
      audioRef.current = audio
      
      audio.load()
      await audio.play()
      setIsPlaying(true)
    } catch (err: any) {
      console.error('Error playing audio:', err)
      toast.error(err?.message || 'Failed to play audio')
      setIsPlaying(false)
    }
  }
  
  const handleAudioPause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  const isFileOnly = (message.fileData || message.imageUrl) && !message.content;
  const showExternalTimestamp = !(message.fileData && (message.fileData.fileType.startsWith('audio/') || message.fileData.fileName.includes('voice-message')));


  return (
    <>
      <div
        className={cn(
          "flex items-end gap-2 px-1 relative",
          isOwn ? "justify-end" : "justify-start",
          hasReactions ? "pb-6" : "py-0.5"
        )}
      >
        <div className={cn("flex flex-col max-w-[90%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%] relative group", isOwn ? "items-end" : "items-start")}>
          {/* Swipe Indicator (Păstrat) */}
          {isMobile && swipeOffset > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0 flex items-center justify-center bg-primary/20 rounded-l-2xl transition-all duration-200"
              style={{ width: `${swipeOffset}px` }}
            >
              <Reply className="h-5 w-5 text-primary" />
            </div>
          )}

          <div
            ref={bubbleRef}
            className={cn(
              "relative flex flex-col w-full leading-relaxed shadow-sm transition-all",
              "hover:shadow-md",
              isOwn ? "bg-primary text-primary-foreground rounded-lg rounded-br-[4px]" : "bg-muted text-foreground rounded-lg rounded-bl-[4px]",
              !isFileOnly ? "p-[10px] gap-2" : "p-0 gap-0", 
              isMobile && swipeOffset > 0 && "translate-x-2"
            )}
            style={isMobile && swipeOffset > 0 ? { transform: `translateX(${swipeOffset}px)` } : undefined}
          >
            
            {/* Hover Menu code (Păstrat) */}
            <div
              className={cn(
                "absolute flex items-center gap-1 z-10",
                "bg-background/95 backdrop-blur-sm border border-border rounded-md px-1.5 py-1 shadow-lg",
                "touch-manipulation transition-opacity duration-150",
                "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto",
                "hidden md:flex",
                isOwn ? "-top-10 right-0" : "-top-10 left-0 flex-row-reverse"
              )}
            >
              {/* Reactions Buttons (Păstrat) */}
              <div className="flex items-center gap-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    className={cn("text-lg hover:scale-110 transition-all cursor-pointer rounded p-0.5", isReactionSelected(emoji) && "bg-primary/20 scale-110")}
                    onClick={(e) => { e.stopPropagation(); onReact?.(message.id, emoji); }}
                  >{emoji}</button>
                ))}
              </div>
              <div className="h-4 w-px bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleCopy(); }} title="Copy message"><Copy className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onReply?.(message.id); }} title="Reply"><Reply className="h-3.5 w-3.5" /></Button>
              {isOwn && <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete?.(message.id); }} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>}
            </div>

            {/* Sender Name (Păstrat) */}
            {isGroupChat && !isOwn && (
              <div className={cn("text-sm sm:text-xs font-medium mb-0.5", !isFileOnly ? "" : "p-[10px] pb-0")} style={{ color: '#00a8ff' }}>{message.sender.name}</div>
            )}

            {/* Reply Preview (Păstrat) */}
            {message.replyTo && (
              <div className={cn("mb-1 pb-1.5 border-l-2 pl-2 text-xs", isOwn ? "border-primary-foreground/30 text-primary-foreground/80" : "border-muted-foreground/30 text-muted-foreground", !isFileOnly ? "" : "p-[10px] pt-0")}>
                <div className="font-medium">{message.replyTo.senderName}</div>
                <div className="truncate">{message.replyTo.content}</div>
              </div>
            )}

            <div className={cn("flex items-end gap-2", !isFileOnly ? "" : "p-[10px]")}> 
              {/* --- FILE DISPLAY (Image or File) --- */}
              {message.imageUrl && !message.fileData && (
                <div
                  className="rounded-lg overflow-hidden max-w-[300px] sm:max-w-[250px] relative aspect-square cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setImageViewerOpen(true)
                  }}
                >
                  <Image
                    src={message.imageUrl}
                    alt="Shared image"
                    width={300}
                    height={300}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              )}

              {/* New file display with metadata */}
              {message.fileData && (
                <div className={cn("rounded-lg overflow-hidden max-w-[300px] sm:max-w-[280px] w-full", isFileOnly ? "p-0" : "")}>
                  {message.fileData.fileType.startsWith('audio/') || message.fileData.fileName.includes('voice-message') ? (
                    
                    /* Player de mesaje vocale - design modern și compact */
                    <div 
                      className={cn(
                        "flex items-end gap-1 p-0.5 transition-all rounded-none", // flex-col pentru a așeza elementele unul sub altul
                        "w-full",
                        isOwn 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-foreground"
                      )}
                    >
                      {/* Linia 1: Buton Play + Waveform + Ora */}
                      <div className="flex items-center gap-3 w-full">
                        {/* Play/Pause Button - Mare și Alb */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isPlaying) {
                              handleAudioPause()
                            } else {
                              handleAudioPlay()
                            }
                          }}
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-all transform hover:scale-105 active:scale-95",
                            "bg-white text-primary shadow-lg"
                          )}
                        >
                          {isPlaying ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5 ml-0.5" />
                          )}
                        </button>
                        
                        {/* Waveform Container */}
                        <div className="flex flex-col justify-center min-w-[100px] relative h-full">
                          
                          {/* Container Time and Waveform (Flex pentru aliniere) */}
                          <div className="flex items-center gap-2 w-full">
                            {/* Durată Curentă - Poziționat la stânga, sub butonul de Play */}
                            <span className={cn(
                              "text-sm font-medium shrink-0 min-w-[40px]", 
                              isOwn ? "text-primary-foreground" : "text-foreground"
                            )}>
                              {formatAudioTime(audioDuration > 0 ? audioDuration : audioProgress)}
                            </span>

                            {/* Waveform Area (h-10 pentru a face barele vizibile) */}
                            <div className="flex-1 relative h-10"> 
                              {/* Waveform Visualization (Background - Static) */}
                            

                              {/* Waveform Visualization (Progress Overlay - Activ) */}
                              <div 
                                className="flex items-end gap-0.5 h-full w-full absolute top-0 left-0 overflow-hidden transition-all duration-300"
                                style={{ width: `${(audioDuration > 0 ? (audioProgress / audioDuration) : 0) * 100}%` }}
                              >
                                {Array.from({ length: 40 }).map((_, i) => {
                                  const wavePattern = Math.abs(Math.sin((i / 40) * Math.PI * 4)) * 0.6 + 0.4
                                  const height = wavePattern * 100
                                  
                                  return (
                                    <div
                                      key={`fg-wave-${i}`}
                                      className={cn(
                                        "w-0.5 rounded-full",
                                        isOwn ? "bg-white" : "bg-foreground"
                                      )}
                                      style={{ height: `${height}%` }}
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Ora trimiterii - Poziționat la dreapta jos (în afara rândului de waveform) */}
                      <div className="flex justify-end w-full mt-1.5">
                        <span className={cn(
                          "text-[10px] font-medium",
                          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ) : message.fileData.fileType.startsWith('image/') ? (
                    <div
                      className="relative aspect-square cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setImageViewerOpen(true)
                      }}
                    >
                      <Image
                        src={message.fileData.dataUri}
                        alt={message.fileData.fileName}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {/* Image dimensions overlay */}
                      {message.fileData.width && message.fileData.height && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                          {message.fileData.width} × {message.fileData.height}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Stil pentru fișiere generice (integrat în bulă) */
                    <div
                      className="flex items-center gap-3 p-0 transition-colors rounded-lg cursor-pointer w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(message.fileData!.dataUri, message.fileData!.fileName, message.fileData!.fileType)
                      }}
                    >
                      {/* Icon Container */}
                      <div className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-lg shrink-0",
                        isOwn ? "bg-primary-foreground/10 text-primary-foreground" : "bg-muted-foreground/10 text-foreground"
                      )}>
                        {React.createElement(getFileIcon(message.fileData.fileType), { className: "h-6 w-6" })}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-sm font-medium truncate", isOwn ? "text-primary-foreground" : "text-foreground")} title={message.fileData.fileName}>
                          {message.fileData.fileName}
                        </div>
                        <div className={cn("text-xs mt-0.5", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {formatFileSize(message.fileData.fileSize)}
                        </div>
                      </div>
                      
                      <Download className={cn(
                        "h-5 w-5 shrink-0 transition-transform hover:scale-110",
                        isOwn ? "text-primary-foreground/80" : "text-muted-foreground"
                      )} />
                    </div>
                  )}
                </div>
              )}

              {/* Message Content */}
              {message.content && (
                <div className="break-words whitespace-pre-wrap text-base sm:text-sm">
                  {message.content}
                </div>
              )}

              {/* Timestamp - Doar dacă NU este mesaj audio/voce */}
              {showExternalTimestamp && (
                <div className={cn("flex items-center justify-end gap-1 mt-0.5 text-xs sm:text-[11px]", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  <span>{formatTime(message.timestamp)}</span>
                  {isOwn && message.status === 'sending' && <Send className="h-3 w-3 opacity-60 animate-pulse" />}
                </div>
              )}
            </div>

            {/* Reactions Display (Păstrat) */}
            {hasReactions && (
              <div className="absolute -bottom-5 left-0 flex gap-0.5 flex-wrap">
                {Object.entries(groupedReactions).map(([emoji, userIds]) => (
                  <div key={emoji} onClick={(e) => { e.stopPropagation(); onReact?.(message.id, emoji); }} className="bg-background border border-border rounded-full px-1.5 py-0.5 text-sm flex items-center gap-1 cursor-pointer hover:bg-muted shadow-sm">
                    <span>{emoji}</span>
                    {userIds.length > 1 && <span className="text-[10px] text-muted-foreground">{userIds.length}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Reaction menu) (Păstrat) */}
      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent className="pb-safe">
          <DrawerHeader><DrawerTitle>Options</DrawerTitle></DrawerHeader>
          <div className="px-4 pb-4 space-y-2">
            <div className="flex justify-center items-center gap-2 py-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button key={emoji} className={cn("text-2xl p-2 rounded-lg transition-all", isReactionSelected(emoji) ? "bg-primary/20 scale-110" : "hover:bg-muted")} onClick={() => { onReact?.(message.id, emoji); setSheetOpen(false); }}>{emoji}</button>
              ))}
            </div>
            <div className="h-px bg-border my-2" />
            <Button variant="ghost" className="w-full text-base justify-start gap-3 h-12" onClick={() => { handleCopy(); setSheetOpen(false); }}><Copy className="h-6 w-6" /><span>Copy message</span></Button>
            <Button variant="ghost" className="w-full text-base justify-start gap-3 h-12" onClick={() => { onReply?.(message.id); setSheetOpen(false); }}><Reply className="h-6 w-6" /><span>Reply to message</span></Button>
            {isOwn && <Button variant="ghost" className="w-full text-base justify-start gap-3 h-12 text-destructive" onClick={() => { onDelete?.(message.id); setSheetOpen(false); }}><Trash2 className="h-6 w-6" /><span>Delete for everyone</span></Button>}
          </div>
        </DrawerContent>
      </Drawer>

      {/* --- ADVANCED IMAGE VIEWER (Lightbox) (Păstrat) --- */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen} modal={true}>
        <DialogContent showCloseButton={false} className="!max-w-none w-screen h-screen p-0 m-0 border-none bg-black/95 flex flex-col items-center justify-center overflow-hidden focus:outline-none z-[9999]">

          {(message.imageUrl || (message.fileData?.fileType.startsWith('image/') && message.fileData?.dataUri)) && (
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={4}
              centerOnInit={true}
              wheel={{ step: 0.2 }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  {/* Toolbar Comenzi Sus */}
                  <div className="absolute top-6 sm:top-0 left-0 right-0 p-4 z-50 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-10 w-10" onClick={() => zoomIn()}>
                        <ZoomIn className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-10 w-10" onClick={() => zoomOut()}>
                        <ZoomOut className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-10 w-10" onClick={() => resetTransform()}>
                        <RotateCcw className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-10 w-10" onClick={() => {
                        const imageUrl = message.imageUrl || message.fileData?.dataUri
                        const fileName = message.fileData?.fileName || `papel-img-${Date.now()}.jpg`
                        const fileType = message.fileData?.fileType || 'image/jpeg'
                        if (imageUrl) handleDownload(imageUrl, fileName, fileType)
                      }}>
                        <Download className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-white bg-white/10 hover:bg-red-500/80 hover:text-white rounded-full h-10 w-10" onClick={() => setImageViewerOpen(false)}>
                        <X className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>

                  {/* Zona de Vizualizare */}
                  <TransformComponent
                    wrapperClass="!w-screen !h-screen flex items-center justify-center"
                    contentClass="!w-full !h-full flex items-center justify-center"
                  >
                    <img
                      src={message.imageUrl || message.fileData?.dataUri || ""}
                      alt="Full screen"
                      className="max-h-screen max-w-screen object-contain"
                      style={{ width: 'auto', height: 'auto' }}
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export const ChatBubble = memo(ChatBubbleComponent) as React.FC<ChatBubbleProps>