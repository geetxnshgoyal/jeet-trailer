"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  isUploading: boolean;
}

export function PhotoUpload({ files, onFilesChange, isUploading }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      onFilesChange([...files, ...selected].slice(0, 10)); // max 10 photos
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return;
    if (e.dataTransfer.files) {
      const dropped = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );
      onFilesChange([...files, ...dropped].slice(0, 10));
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 ${
          isUploading
            ? "border-muted bg-muted/10 pointer-events-none"
            : "border-border hover:border-primary hover:bg-primary/5"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="hidden"
          disabled={isUploading}
        />
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold">Click to upload or drag & drop</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            PNG, JPG, WEBP, or HEIC (max 8MB per file, up to 10 photos)
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {files.map((file, index) => {
            const url = URL.createObjectURL(file);
            return (
              <div
                key={index}
                className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-muted"
              >
                <img
                  src={url}
                  alt={file.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  onLoad={() => URL.revokeObjectURL(url)}
                />
                {!isUploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white hover:bg-black/90 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
