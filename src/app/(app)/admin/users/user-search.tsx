"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/** One search box, debounced into the URL. */
export function UserSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  /*
     Patched onto the URL that is there, not built from scratch. Typing used to
     push `/admin/users?q=…` and nothing else, so it silently dropped every
     other parameter — harmless while `q` was the only one, and a search that
     cancels the role filter the moment you use it now that there is one.
  */
  const to = (next: URLSearchParams) => {
    const s = next.toString();
    return s ? `/admin/users?${s}` : "/admin/users";
  };

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      startTransition(() => router.push(to(next)));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, params]);

  /*
     No card of its own. One 384px input inside a 1271px card left 887px of
     empty card above the table, and the four figures are the role filter now —
     so this belongs in the list's own header, beside the count it filters.
  */
  return (
    <div className="flex w-full items-center gap-3 sm:w-80">
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          /* The magnifier and the label already say "search"; spending those
             seven characters on the placeholder cut the useful half off at
             390px. */
          placeholder="Name, roll number or email"
          className="pl-9"
          aria-label="Search users"
        />
      </div>
      {q ? (
        <button
          type="button"
          /* Clears the search, not the role filter beside it. */
          onClick={() => {
            setQ("");
            const next = new URLSearchParams(params.toString());
            next.delete("q");
            startTransition(() => router.push(to(next)));
          }}
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
        >
          <X className="size-3.5" />
          Clear
        </button>
      ) : null}
      {pending ? (
        <span className="shrink-0 text-xs text-muted-foreground">
          Updating…
        </span>
      ) : null}
    </div>
  );
}
