import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { search } from "@/lib/search";
import SearchResultsView from "@/components/search/SearchResultsView";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const query = searchParams.q ?? "";
  const results = await search(supabase, query, 20);

  return <SearchResultsView initialQuery={query} initialResults={results} />;
}
