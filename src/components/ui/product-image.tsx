"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { useState } from "react";

type ProductImageProps = {
  src: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
};

export function ProductImage({
  src,
  alt,
  className = "",
  imageClassName = "",
  sizes = "96px",
}: ProductImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSource !== src;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400 ${className}`}
    >
      {showImage && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized
          className={`object-cover ${imageClassName}`}
          onError={() => setFailedSource(src)}
        />
      ) : (
        <Package aria-hidden="true" size={22} strokeWidth={1.7} />
      )}
    </div>
  );
}
