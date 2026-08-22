import AuthCard from "@/components/auth/AuthCard";

export const dynamic = "force-dynamic";

export default function RegisterPage({ searchParams }: { searchParams: { invite?: string } }) {
  return <AuthCard initialView="register" initialInvite={searchParams.invite} />;
}
