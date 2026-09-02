import AuthCard from "@/components/auth/AuthCard";

export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return <AuthCard initialView="login" oauthError={searchParams.error === "oauth"} />;
}
