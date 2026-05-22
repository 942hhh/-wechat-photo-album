"use client";

import { AlbumCard } from "./AlbumCard";

interface Album {
  id: string;
  name: string;
  coverPhotoUrl: string | null;
  photoCount: number;
}

interface AlbumListProps {
  albums: Album[];
}

export function AlbumList({ albums }: AlbumListProps) {
  if (albums.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {albums.map((album) => (
        <AlbumCard key={album.id} {...album} />
      ))}
    </div>
  );
}
