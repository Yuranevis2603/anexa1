import { redirect } from "next/navigation";

// Superseded by the standalone /admin panel — keep this path alive as a
// redirect so old bookmarks/links to the account-approval queue still land
// somewhere useful instead of 404ing.
export default function LegacyAdminRedirect() {
  redirect("/admin/users");
}
