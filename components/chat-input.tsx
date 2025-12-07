"use client"

import { SendHorizontal, Smile, Paperclip, ImageIcon, Loader2, X } from "lucide-react"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { useRef, useState, KeyboardEvent } from "react"
import { Textarea } from "./ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "./ui/drawer"
import { EmojiPicker } from "./emoji-picker"
import { useIsMobile } from "@/hooks/use-mobile"
import { compressImageToBase64 } from "@/lib/image-utils" 

interface ChatInputProps {
  onSendMessage: (message: string, imageUrl?: string | null) => void
  className?: string
  placeholder?: string
  replyingTo?: { id: string; content: string; senderName: string } | null
  onCancelReply?: () => void
  isLoading?: boolean
}

export function ChatInput({
  onSendMessage,
  className,
  placeholder = "Type here...", 
  replyingTo,
  onCancelReply,
  isLoading = false
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isMobile = useIsMobile() 
  const hasText = message.trim().length > 0 || selectedImage !== null

  // ... (handleSubmit, handleKeyPress, handleInput rămân la fel) ...
  const handleSubmit = () => {
    if ((message.trim() || selectedImage) && !isLoading && !uploadingImage) {
      onSendMessage(message.trim() || "", selectedImage)
      setMessage("")
      setSelectedImage(null)
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
        // Auto-focus after sending
        setTimeout(() => {
          textareaRef.current?.focus()
        }, 0)
      }
    }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB')
      return
    }

    setUploadingImage(true)
    try {
      // 🚀 NEW: Convert image to compressed base64 instead of uploading to Storage
      // This stores the image encrypted in Firestore, eliminating the need for Storage
      const base64DataUri = await compressImageToBase64(file)
      
      // Store the base64 data URI (will be encrypted in the adapter)
      setSelectedImage(base64DataUri)
    } catch (error: any) {
      console.error('Error processing image:', error)
      alert(error?.message || 'Failed to process image. Please try again.')
    } finally {
      setUploadingImage(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleImageClick = () => {
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
  // ... (sfârșit funcții auxiliare) ...

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const textBefore = message.substring(0, start)
    const textAfter = message.substring(end)
    
    const newMessage = textBefore + emoji + textAfter
    setMessage(newMessage)
    
    // Mută cursorul și păstrează focusul pe Textarea
    setTimeout(() => {
      // Re-focusează Textarea după inserare
      textarea.focus() 
      const newPosition = start + emoji.length
      textarea.setSelectionRange(newPosition, newPosition)
      
      // Re-calculează înălțimea
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }, 0)

    // Închide Picker-ul doar pe mobil (Drawer) după selecție
    if (isMobile) {
      setEmojiPickerOpen(false)
    }
    // Pe Desktop (Popover), NU închidem, permițând selecția multiplă.
  }

  // Clasa de bază comună pentru butoane
  const iconButtonClasses = "h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all touch-manipulation active:scale-95 shrink-0"
  
  return (
    <div className={cn("flex w-full flex-col bg-background border-t border-border", className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
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

      {/* Image preview */}
      {selectedImage && (
        <div className="relative px-4 py-2 border-b border-border bg-muted/30">
          <div className="relative inline-block max-w-[200px] rounded-lg overflow-hidden">
            <img 
              src={selectedImage} 
              alt="Selected" 
              className="max-w-full max-h-[200px] object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-1 right-1 bg-background/80 hover:bg-background rounded-full p-1 transition-colors"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input container - ACUM CU TOT CU BORDER */}
      <div className="flex items-center gap-2 p-2 sm:p-3 relative bg-card border-none md:border md:border-input md:rounded-xl md:shadow-sm md:m-3 md:p-1.5">
        
        {/* Butoane Stânga (Emoji + Separator) */}
        <div className="flex items-center space-x-1 pl-1">
          {/* Emoji button with picker */}
          {isMobile ? (
            <Drawer open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={iconButtonClasses}
                  title="Add emoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="h-[400px]">
                <DrawerHeader>
                  <DrawerTitle>Select Emoji</DrawerTitle>
                </DrawerHeader>
                {/* Folosim h-full pentru a umple spațiul rămas în Drawer, eliminând overflow-hidden */}
                <div className="flex-1"> 
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={iconButtonClasses}
                  title="Add emoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[350px] h-[400px] p-0" 
                align="start"
                side="top"
                // ACEASTĂ PROPRIETATE AJUTĂ LA PĂSTRAREA FOCUSULUI PE TEXTAREA DUPĂ SELECTARE
                onOpenAutoFocus={(e) => e.preventDefault()}
                // De asemenea, asigură că Textarea nu-și pierde focusul dacă Popover-ul este deschis.
                onCloseAutoFocus={() => textareaRef.current?.focus()} 
              >
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </PopoverContent>
            </Popover>
          )}
          
          {/* Separator - Doar pe desktop (md:block) */}
          <div className="block h-6 w-px bg-border mx-1"></div>
        </div>

        {/* Text Input - flex-1 pentru a ocupa spațiul */}
        <div className="flex-1 relative min-w-0">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              "min-h-[2.5rem] max-h-[120px] resize-none",
              "bg-transparent text-foreground placeholder:text-muted-foreground",
              "border-none px-0 py-2",
              "text-sm sm:text-base",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              isLoading && "opacity-60 cursor-not-allowed",
              "w-full"
            )}
            rows={1}
          />
        </div>

        <div className="flex items-center space-x-1 pr-1">
          {hasText ? (
            <Button
              onClick={handleSubmit}
              size="icon"
              disabled={isLoading}
              className={cn(
                "h-9 px-6 shrink-0 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all touch-manipulation active:scale-95 text-sm",
                "md:h-8 md:px-8 md:py-1",
              )}
              title="Send message"
            >
              {isLoading ? (
                <>Sending...</>
              ) : (
                 <>Send</>
              )}
               
            </Button>
          ) : (
            /* Butoane Atașamente - Apare când nu este text */
            <>
              {/* Image button */}
              <Button
                variant="ghost"
                size="icon"
                className={iconButtonClasses}
                onClick={handleImageClick}
                disabled={uploadingImage}
                title="Send image"
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImageIcon className="h-4 w-4" />
                )}
              </Button>
              
              {/* Attachment button */}
              <Button
                variant="ghost"
                size="icon"
                className={iconButtonClasses}
                onClick={() => console.log("Attachment")}
                title="Add attachment"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}