/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Named lucide-react imports are already tree-shakeable, but this lets
    // Next's bundler resolve each icon to its own module directly instead
    // of through the package's barrel file — faster builds, slightly
    // smaller per-route chunks for pages that only use a couple of icons.
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "oqearxviszstqxxhaptq.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      // Google OAuth sign-up carries the member's Google profile photo
      // straight into profiles.avatar_url (see handle_new_user() in
      // supabase/schema.sql) — served from *.googleusercontent.com, not
      // Supabase storage. next/image throws on an unlisted hostname rather
      // than falling back gracefully, so this has to be explicit.
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
