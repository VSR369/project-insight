/**
 * Emoji Picker Component
 * Lightweight native emoji picker with categories
 * Per Phase D specification
 */

import { useState, useEffect, useCallback } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// =====================================================
// EMOJI DATA
// =====================================================

const EMOJI_CATEGORIES = {
  recent: { label: '🕐', name: 'Recent' },
  smileys: { label: '😀', name: 'Smileys' },
  gestures: { label: '👍', name: 'Gestures' },
  objects: { label: '💡', name: 'Objects' },
  symbols: { label: '⭐', name: 'Symbols' },
} as const;

const EMOJIS = {
  smileys: [
    '😀', '😊', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉',
    '😍', '🥰', '😘', '😎', '🤩', '🤔', '🤨', '😐', '😑', '🙄',
    '😏', '😌', '😴', '🤤', '😋', '😛', '😜', '🤪', '😝', '🤑',
    '🤗', '🤭', '🫢', '🫣', '🤫', '🤥', '😶', '😐', '😑', '😬',
  ],
  gestures: [
    '👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '👏', '🙌', '👐',
    '🤲', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
    '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
    '💪', '🦾', '🙅', '🙆', '💁', '🙋', '🤷', '🙇', '🎉', '🎊',
  ],
  objects: [
    '💡', '🔥', '✨', '💫', '⭐', '🌟', '💥', '💢', '💦', '💨',
    '🎯', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎵', '🎶', '🎹',
    '📱', '💻', '🖥️', '⌨️', '🖱️', '📧', '📝', '📊', '📈', '📉',
    '📚', '📖', '🔍', '🔎', '💰', '💎', '🏆', '🥇', '🎖️', '🏅',
  ],
  symbols: [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
    '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
    '⚛️', '🆔', '⚠️', '☢️', '☣️', '📵', '🔞', '❌', '⭕', '✅',
    '✔️', '❓', '❗', '💯', '🔝', '🔜', '🆕', '🆒', '🆙', '🆗',
  ],
} as const;

const STORAGE_KEY = 'pulse-recent-emojis';
const MAX_RECENT = 20;

// =====================================================
// COMPONENT
// =====================================================

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

export function EmojiPicker({ onSelect, disabled = false, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<keyof typeof EMOJI_CATEGORIES>('smileys');

  // Load recent emojis from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentEmojis(JSON.parse(stored));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSelect = useCallback((emoji: string) => {
    // Add to recent
    setRecentEmojis(prev => {
      const updated = [emoji, ...prev.filter(e => e !== emoji)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });

    onSelect(emoji);
    setOpen(false);
  }, [onSelect]);

  const renderEmojiGrid = (emojis: readonly string[] | string[]) => (
    <div className="grid grid-cols-8 gap-1">
      {emojis.map((emoji, i) => (
        <button
          key={`${emoji}-${i}`}
          type="button"
          className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-lg transition-colors"
          onClick={() => handleSelect(emoji)}
          aria-label={`Insert ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          disabled={disabled}
          className={className}
        >
          <Smile className="h-5 w-5 mr-2" />
          Emoji
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as keyof typeof EMOJI_CATEGORIES)}>
          <TabsList className="w-full grid grid-cols-5 h-8">
            {Object.entries(EMOJI_CATEGORIES).map(([key, { label, name }]) => (
              <TabsTrigger 
                key={key} 
                value={key} 
                className="px-1 text-base"
                title={name}
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="mt-2 max-h-48 overflow-y-auto">
            <TabsContent value="recent" className="mt-0">
              {recentEmojis.length > 0 ? (
                renderEmojiGrid(recentEmojis)
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No recent emojis yet
                </p>
              )}
            </TabsContent>
            <TabsContent value="smileys" className="mt-0">
              {renderEmojiGrid(EMOJIS.smileys)}
            </TabsContent>
            <TabsContent value="gestures" className="mt-0">
              {renderEmojiGrid(EMOJIS.gestures)}
            </TabsContent>
            <TabsContent value="objects" className="mt-0">
              {renderEmojiGrid(EMOJIS.objects)}
            </TabsContent>
            <TabsContent value="symbols" className="mt-0">
              {renderEmojiGrid(EMOJIS.symbols)}
            </TabsContent>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
