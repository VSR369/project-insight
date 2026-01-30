/**
 * PulseCardStack - Swipeable card deck component
 * Stories-style browsing through cards
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PulseCard } from './PulseCard';
import type { PulseCard as PulseCardType } from '@/hooks/queries/usePulseCards';
import type { PulseCardLayer } from '@/hooks/queries/usePulseCardLayers';

interface PulseCardStackProps {
  cards: PulseCardType[];
  featuredLayers?: Map<string, PulseCardLayer>;
  onShare?: (cardId: string) => void;
  className?: string;
}

export function PulseCardStack({
  cards,
  featuredLayers = new Map(),
  onShare,
  className,
}: PulseCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const goToNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }

    setTouchStart(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length]);

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No cards to display
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className={cn("relative", className)}>
      {/* Progress Indicators (Stories-style) */}
      <div className="flex gap-1 mb-4 px-2">
        {cards.map((_, idx) => (
          <button
            key={idx}
            className={cn(
              "flex-1 h-1 rounded-full transition-colors",
              idx === currentIndex
                ? "bg-primary"
                : idx < currentIndex
                ? "bg-primary/50"
                : "bg-muted"
            )}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to card ${idx + 1}`}
          />
        ))}
      </div>

      {/* Card Container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-label="Card stack"
        aria-live="polite"
      >
        <div
          className="transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            display: 'flex',
          }}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              className="w-full flex-shrink-0 px-2"
              style={{ minWidth: '100%' }}
            >
              <PulseCard
                card={card}
                featuredLayer={featuredLayers.get(card.id)}
                onShare={onShare ? () => onShare(card.id) : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-4 px-2">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          aria-label="Previous card"
          className="h-10 w-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {cards.length}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={goToNext}
          disabled={currentIndex === cards.length - 1}
          aria-label="Next card"
          className="h-10 w-10"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
