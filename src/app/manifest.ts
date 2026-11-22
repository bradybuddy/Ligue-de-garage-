import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

// Manifeste PWA : nécessaire pour « Ajouter à l'écran d'accueil » et, sur iPhone, pour les notifs web.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_TAGLINE,
    lang: "fr-CA",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F5F0",
    theme_color: "#F2A516",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
