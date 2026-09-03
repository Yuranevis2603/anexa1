import LandingView from "@/components/landing/LandingView";

// Logged-in visitors are redirected to /dashboard by middleware.ts before
// this ever renders — keeping this component free of cookies()/auth checks
// lets Next.js render it as a static page (cached, no per-request work),
// which matters since this is the public marketing/SEO entry point.
export default function RootPage() {
  return <LandingView />;
}
