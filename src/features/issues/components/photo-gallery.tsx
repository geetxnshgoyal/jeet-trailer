"use client";

import { useState } from "react";
import { X, Download, Maximize2 } from "lucide-react";
import type { InstallationPhoto } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";

export function PhotoGallery({ photos }: { photos: InstallationPhoto[] }) {
  const [activePhoto, setActivePhoto] = useState<InstallationPhoto | null>(null);

  if (photos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No installation photos uploaded yet.
      </div>
    );
  }

  const handleDownload = async (photo: InstallationPhoto) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Get filename from path or default
      const filename = photo.path.split("/").pop() || "installation-photo.jpg";
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      // Fallback: open in new tab
      window.open(photo.url, "_blank");
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, i) => (
          <div
            key={i}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-border bg-muted transition-shadow hover:shadow-md"
            onClick={() => setActivePhoto(photo)}
          >
            <img
              src={photo.url}
              alt="Installation photo"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
              <span className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30 backdrop-blur-sm transition-colors">
                <Maximize2 className="h-4 w-4" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in">
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            onClick={() => setActivePhoto(null)}
            aria-label="Close fullscreen preview"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="relative max-h-[85vh] max-w-[90vw] flex flex-col items-center">
            <img
              src={activePhoto.url}
              alt="Installation fullscreen"
              className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
                onClick={() => handleDownload(activePhoto)}
              >
                <Download className="mr-2 h-4 w-4" /> Download Photo
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
