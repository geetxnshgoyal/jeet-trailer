import type { MetadataRoute } from "next";
import { BUSINESS } from "@/lib/domain/business";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BUSINESS.name} Inventory & Workshop`,
    short_name: BUSINESS.name,
    description: `Inventory and workshop management for ${BUSINESS.name}, ${BUSINESS.address.city}.`,
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
