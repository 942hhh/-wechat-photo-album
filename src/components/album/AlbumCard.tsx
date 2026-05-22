"use client";

import { useState } from "react";
import Link from "next/link";
import { CameraIcon } from "@/components/ui/Icons";

interface AlbumCardProps {
  id: string;
  name: string;
  coverPhotoUrl: string | null;
  photoCount: number;
}

export function AlbumCard({ id, name, coverPhotoUrl, photoCount }: AlbumCardProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Link
      href={`/a/${id}`}
      className="block rounded-xl bg-white overflow-hidden shadow-sm active:scale-[0.97] transition-transform"
    >
      <div className="aspect-square bg-zinc-100 relative">
        {coverPhotoUrl ? (
          <>
            {!loaded && <div className="absolute inset-0 img-loading" />}
            <img
              src={coverPhotoUrl}
              alt={name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
              loading="lazy"
              onLoad={() => setLoaded(true)}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300">
            <CameraIcon size={48} />
          </div>
        )}
        {photoCount > 0 && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/45 text-white text-[10px] font-medium">
            {photoCount}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-medium text-[15px] truncate">{name}</h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          {photoCount === 0 ? "暂无照片" : `${photoCount} 张照片`}
        </p>
      </div>
    </Link>
  );
}
