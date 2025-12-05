"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"
import { Input } from "./ui/input"

// Adaugă o hartă de nume pentru a face căutarea funcțională
const EMOJI_NAMES: Record<string, string[]> = {
  "😀": ["smile", "happy", "joy", "laugh", "face"],
  "😃": ["big smile", "grinning", "cheerful"],
  "😄": ["grinning face with smiling eyes", "happy"],
  "😁": ["beaming face with smiling eyes", "grin"],
  "😆": ["grinning squinting face", "laughing", "squint"],
  "😅": ["grinning face with sweat", "relief", "sweat"],
  "🤣": ["rolling on the floor laughing", "rofl"],
  "😂": ["face with tears of joy", "lol", "crying"],
  "🙂": ["slightly smiling face", "simple smile"],
  "🙃": ["upside-down face", "sarcasm", "silly"],
  "😉": ["winking face", "wink", "flirt"],
  "😊": ["smiling face with smiling eyes", "cute", "blush"],
  "😇": ["smiling face with halo", "angel", "innocent"],
  "🥰": ["smiling face with hearts", "in love", "crush"],
  "😍": ["smiling face with heart-eyes", "love", "adoring"],
  "🤩": ["star-struck", "excited", "wow"],
  "😘": ["face blowing a kiss", "kiss", "muah"],
  "😗": ["kissing face", "kiss"],
  "😚": ["kissing face with closed eyes"],
  "😙": ["kissing face with smiling eyes"],
  "😋": ["face savoring food", "yummy", "delicious"],
  "😛": ["face with tongue", "playful"],
  "😜": ["winking face with tongue"],
  "🤪": ["zany face", "silly", "crazy"],
  "😝": ["pouting face with tongue"],
  "🤑": ["money-mouth face", "rich"],
  "🤗": ["hugging face", "hug", "comfort"],
  "🤭": ["hand over mouth", "oops", "surprise"],
  "🤫": ["shushing face", "quiet"],
  "🤔": ["thinking face", "hmmm"],
  // Emojis for other categories (simplified for example)
  "😢": ["sad", "cry", "upset"],
  "😭": ["crying loudly"],
  "👋": ["wave", "hello", "hand"],
  "❤️": ["heart", "love", "red"],
  "🎉": ["party", "celebrate"],
  "⭐": ["star", "shine"],
  "🚀": ["rocket", "space"],
  "🎮": ["game", "controller"],
  "🍕": ["pizza", "food"],
  "🐶": ["dog", "animal"],
  "🌍": ["earth", "world"],
  "⏰": ["clock", "time"],
};

// Common emoji categories
const EMOJI_CATEGORIES = {
  "😀": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔"],
  "😢": ["😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲"],
  "👋": ["👋", "🤚", "🖐", "✋", "🖖", "👌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏"],
  "❤️": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐"],
  "🎉": ["🎉", "🎊", "🎈", "🎁", "🎀", "🎂", "🍰", "🧁", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "☕️", "🍵", "🧃", "🥤", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸"],
  "⭐": ["⭐", "🌟", "✨", "💫", "⚡", "☄️", "💥", "🔥", "🌈", "☀️", "🌤", "⛅", "☁️", "🌦", "🌧", "⛈", "🌩", "❄️", "☃️", "⛄", "🌨", "💨", "🌪", "🌫", "☂️", "☔", "💧", "💦", "🌊", "🎆"],
  "🚀": ["🚀", "✈️", "🛫", "🛬", "🛩", "💺", "🚁", "🚟", "🚠", "🚡", "🛰", "🚢", "⛴", "🛥", "🚤", "🛶", "⛵", "🚣", "🚁", "🛸", "🚗", "🚕", "🚙", "🚌", "🚎", "🏎", "🚓", "🚑", "🚒", "🚐"],
  "🎮": ["🎮", "🕹", "🎰", "🎲", "🧩", "♠️", "♥️", "♦️", "♣️", "🃏", "🀄", "🎴", "🎯", "🎳", "🎱", "🏓", "🏸", "🥅", "🏒", "🏑", "🏏", "⛳", "🏹", "🎣", "🥊", "🥋", "🎽", "🏅", "🎖", "🏆"],
  "🍕": ["🍕", "🍔", "🍟", "🌭", "🍿", "🧂", "🥓", "🥚", "🍳", "🥞", "🥐", "🥨", "🍞", "🥖", "🥯", "🧀", "🥗", "🥙", "🥪", "🌮", "🌯", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🍤"],
  "🐶": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇"],
  "🌍": ["🌍", "🌎", "🌏", "🌐", "🗺", "🧭", "🏔", "⛰", "🌋", "🗻", "🏕", "🏖", "🏜", "🏝", "🏞", "🏟", "🏛", "🏗", "🧱", "🏘", "🏚", "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨", "🏩"],
  "⏰": ["⏰", "⏱", "⏲", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛", "🕜", "🕝", "🕞", "🕟", "🕠", "🕡", "🕢", "🕣", "🕤", "🕥", "🕦", "🕧", "⌚", "📱", "📲"],
}

// Flatten all emojis for search
const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat()

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  className?: string
}

// Clasă utilitară personalizată pentru scrollbar discret, 
// pe care trebuie să o definești în CSS-ul tău global, de ex:
// .scrollbar-custom::-webkit-scrollbar { width: 6px; }
// .scrollbar-custom::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 3px; }
const SCROLLBAR_CLASS = "scrollbar-custom"

export function EmojiPicker({ onEmojiSelect, className }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(Object.keys(EMOJI_CATEGORIES)[0]) // Selectează prima categorie la început

  // Logica de filtrare a emoji-urilor bazată pe căutare
  const filteredEmojis = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      // Dacă nu există căutare, afișează categoria selectată sau pe toate
      if (selectedCategory) {
        return EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES] || []
      }
      return ALL_EMOJIS
    }

    // Filtrează TOATE emoji-urile după nume/etichetă
    const results = ALL_EMOJIS.filter(emoji => {
      const names = EMOJI_NAMES[emoji] || []
      // Verifică dacă emoji-ul (caracterul) sau oricare dintre numele sale conține termenul de căutare
      return names.some(name => name.toLowerCase().includes(query)) || emoji.includes(query)
    })
    
    return results
  }, [searchQuery, selectedCategory])

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
  }
  
  // Dacă există căutare, ignorăm categoria selectată și afișăm doar rezultatele căutării
  const showCategories = !searchQuery

  return (
    <div className={cn("flex flex-col h-full bg-background rounded-lg", className)}>
      {/* Search bar */}
      <div className="p-3 border-b border-border sticky top-0 bg-background z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emojis..."
            className="pl-9 h-9 text-sm rounded-full bg-muted/50 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Category tabs */}
      {showCategories && (
        <div className={cn("flex gap-1 p-2 border-b border-border overflow-x-auto", SCROLLBAR_CLASS)}>
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "text-xl p-1.5 rounded-full transition-colors shrink-0",
                selectedCategory === category
                  ? "bg-primary/20 text-primary"
                  : "hover:bg-muted text-foreground/70"
              )}
              title={`Category: ${category}`}
              aria-label={`Select category ${category}`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className={cn("flex-1 overflow-y-auto p-3", SCROLLBAR_CLASS)}>
        {filteredEmojis.length > 0 ? (
          <div className="grid grid-cols-8 gap-1">
            {filteredEmojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                onClick={() => handleEmojiClick(emoji)}
                className={cn(
                  "text-xl sm:text-2xl p-2 rounded-lg hover:bg-muted transition-colors",
                  "touch-manipulation active:scale-95"
                )}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : (
            <div className="text-center text-muted-foreground py-10">
                No emojis found for "{searchQuery}" 😔
            </div>
        )}
      </div>
    </div>
  )
}