"use client"

import { cn } from "@/lib/utils"
import { Trash2, Reply, Send, X, ZoomIn, ZoomOut, RotateCcw, Download, Copy } from "lucide-react"
import { Message } from "./chat-messages"
import { Button } from "./ui/button"
import React, { useState, useRef, useEffect, memo } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog" // Asigura-te ca ai DialogTitle/Description pentru accesibilitate
import { useIsMobile } from "@/hooks/use-mobile"
import Image from "next/image" // Optimizare thumbnail
// Importam libraria de zoom
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
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
  const bubbleRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isSwipingRef = useRef(false)

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return timestamp
      return date.toLocaleTimeString('ro-RO', { hour: 'numeric', minute: '2-digit' })
    } catch {
      return timestamp
    }
  }

  // Group reactions logic...
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

  // --- LONG PRESS & SWIPE LOGIC FOR MOBILE ---
  useEffect(() => {
    if (!isMobile || !bubbleRef.current) return
    const bubble = bubbleRef.current

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      // Don't handle if touching buttons, images, or interactive elements
      if (target.closest('button') || target.closest('[role="button"]') || target.tagName === 'IMG') return
      
      const touch = e.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
      isSwipingRef.current = false
      
      // Start long press timer (500ms)
      longPressTimerRef.current = setTimeout(() => {
        // Long press detected - open menu
        setSheetOpen(true)
        // Prevent default context menu
        e.preventDefault()
      }, 500)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return
      
      // Cancel long press if user moves finger
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      
      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

      // Detect swipe right (for reply)
      if (deltaX > 30 && deltaX > deltaY * 2) {
        isSwipingRef.current = true
        setSwipeOffset(Math.min(deltaX, 100))
      } else if (deltaY > 30 || (deltaX < 30 && deltaY > 10)) {
        // Vertical scroll or small movement - cancel
        touchStartRef.current = null
        setSwipeOffset(0)
        isSwipingRef.current = false
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      // Cancel long press timer if touch ends
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      if (!touchStartRef.current) return
      
      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      
      // Complete swipe right for reply
      if (isSwipingRef.current && deltaX > 60) {
        onReply?.(message.id)
      }

      // Reset swipe
      setTimeout(() => {
        setSwipeOffset(0)
        isSwipingRef.current = false
      }, 200)
      
      touchStartRef.current = null
    }

    const handleTouchCancel = () => {
      // Cancel long press on touch cancel
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

  // Helper to copy message content
  const handleCopy = async () => {
    if (!message.content) return
    try {
      await navigator.clipboard.writeText(message.content)
      toast.success('Message copied to clipboard')
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback for older browsers
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

  // Helper pentru download imagine
  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `papel-img-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error("Download failed", e)
    }
  }

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
          {/* Swipe Indicator */}
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
              "relative rounded-2xl px-3 py-1.5 text-sm w-full leading-relaxed shadow-sm transition-all",
              "hover:shadow-md",
              isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm",
              isMobile && swipeOffset > 0 && "translate-x-2"
            )}
            style={isMobile && swipeOffset > 0 ? { transform: `translateX(${swipeOffset}px)` } : undefined}
          >
             {/* ... Hover Menu code (Păstrat identic) ... */}
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
               {/* Reactions Buttons */}
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

            {/* Sender Name */}
            {isGroupChat && !isOwn && (
              <div className="text-sm sm:text-xs font-medium mb-0.5" style={{ color: '#00a8ff' }}>{message.sender.name}</div>
            )}

            {/* Reply Preview */}
            {message.replyTo && (
              <div className={cn("mb-1 pb-1.5 border-l-2 pl-2 text-xs", isOwn ? "border-primary-foreground/30 text-primary-foreground/80" : "border-muted-foreground/30 text-muted-foreground")}>
                <div className="font-medium">{message.replyTo.senderName}</div>
                <div className="truncate">{message.replyTo.content}</div>
              </div>
            )}

            {/* --- IMAGINEA IN CHAT (Thumbnail) --- */}
            {message.imageUrl && (
              <div 
                className="mb-2 rounded-lg overflow-hidden max-w-[300px] sm:max-w-[250px] relative aspect-square cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  setImageViewerOpen(true)
                }}
              >
                {/* Folosim Next/Image pentru performanta */}
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

            {/* Message Content */}
            {message.content && (
              <div className="break-words whitespace-pre-wrap text-base sm:text-sm">
                {message.content}
              </div>
            )}

            {/* Timestamp */}
            <div className={cn("flex items-center justify-end gap-1 mt-0.5 text-xs sm:text-[11px]", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
              <span>{formatTime(message.timestamp)}</span>
              {isOwn && message.status === 'sending' && <Send className="h-3 w-3 opacity-60 animate-pulse" />}
            </div>

            {/* Reactions Display */}
            {hasReactions && (
              <div className="absolute -bottom-5 left-0 flex gap-0.5 flex-wrap">
                {Object.entries(groupedReactions).map(([emoji, userIds]) => (
                  <div key={emoji} onClick={(e) => {e.stopPropagation(); onReact?.(message.id, emoji);}} className="bg-background border border-border rounded-full px-1.5 py-0.5 text-sm flex items-center gap-1 cursor-pointer hover:bg-muted shadow-sm">
                    <span>{emoji}</span>
                    {userIds.length > 1 && <span className="text-[10px] text-muted-foreground">{userIds.length}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Reaction menu) */}
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

      {/* --- ADVANCED IMAGE VIEWER (Lightbox) --- */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen} modal={true}>
        <DialogContent showCloseButton={false} className="!max-w-none w-screen h-screen p-0 m-0 border-none bg-black/95 flex flex-col items-center justify-center overflow-hidden focus:outline-none z-[9999]">
          
          {/* Accessibility Hidden Titles */}
          <VisuallyHidden>
            <DialogTitle>Image Preview</DialogTitle>
            <DialogDescription>Full screen view of shared image</DialogDescription>
          </VisuallyHidden>

          {message.imageUrl && (
             <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4} // Poti mari pana la 4x
                centerOnInit={true}
                wheel={{ step: 0.2 }} // Zoom lin cu rotita
             >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    {/* Toolbar Comenzi Sus */}
                    <div className="absolute top-6 sm:top-0 left-0 right-0 p-4 z-50 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                        <div className="flex items-center gap-2">
                            {/* Butoane Zoom */}
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
                             {/* Buton Download */}
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-10 w-10" onClick={() => handleDownload(message.imageUrl!)}>
                                <Download className="h-5 w-5" />
                            </Button>
                             {/* Buton Close */}
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
                        src={message.imageUrl ||""} 
                        alt="Full screen" 
                        className="max-h-screen max-w-screen object-contain"
                        style={{ width: 'auto', height: 'auto' }} // Important pentru aspect ratio corect
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

export const ChatBubble = memo(ChatBubbleComponent)