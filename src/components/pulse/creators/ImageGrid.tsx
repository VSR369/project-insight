/**
 * Image Grid Component
 * Displays uploaded images with remove and reorder capabilities
 */

import { useCallback } from "react";
import { X, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageItem {
  id: string;
  file: File;
  preview: string;
}

interface ImageGridProps {
  images: ImageItem[];
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddClick: () => void;
  maxImages?: number;
  className?: string;
}

export function ImageGrid({
  images,
  onRemove,
  onReorder,
  onAddClick,
  maxImages = 10,
  className,
}: ImageGridProps) {
  const canAddMore = images.length < maxImages;

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    (e.target as HTMLElement).classList.add("opacity-50");
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove("opacity-50");
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
  }, [onReorder]);

  if (images.length === 0) {
    return (
      <div 
        className={cn(
          "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors",
          className
        )}
        onClick={onAddClick}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Add Images</p>
            <p className="text-sm text-muted-foreground mt-1">
              Drag & drop or click to browse
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((image, index) => (
          <div
            key={image.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className="relative aspect-square rounded-lg overflow-hidden group cursor-move border bg-muted"
          >
            <img
              src={image.preview}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay with controls */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <div className="absolute top-2 left-2">
                <GripVertical className="h-5 w-5 text-white drop-shadow-md" />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={() => onRemove(image.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Position badge */}
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              {index + 1} of {images.length}
            </div>
          </div>
        ))}

        {/* Add more button */}
        {canAddMore && (
          <div
            className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
            onClick={onAddClick}
          >
            <div className="text-center">
              <Plus className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Add More</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Drag images to reorder • {images.length}/{maxImages} images
      </p>
    </div>
  );
}
