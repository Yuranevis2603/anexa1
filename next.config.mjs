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
    ],
  },
};

export default nextConfig;
