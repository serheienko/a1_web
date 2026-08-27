import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Third-party cover art for the profile's Favorites tiles (see
    // lib/covers.ts) — next/image needs each remote host allow-listed,
    // and this is also what gives us automatic resizing/recompression
    // so cover files stay small.
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "media.rawg.io" },
    ],
  },
};

export default nextConfig;
