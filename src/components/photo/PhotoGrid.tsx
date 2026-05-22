"use client";

import { PhotoCard } from "./PhotoCard";

interface Photo {
  id: string;
  thumbnailUrl: string;
  likeCount: number;
  commentCount: number;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoDelete?: () => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function PhotoGrid({
  photos,
  onPhotoDelete,
  selectMode = false,
  selectedIds,
  onToggleSelect,
}: PhotoGridProps) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-px bg-zinc-200">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          {...photo}
          onDelete={onPhotoDelete}
          selectMode={selectMode}
          selected={selectedIds?.has(photo.id) ?? false}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
