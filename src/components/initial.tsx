import { cn } from "@/lib/utils";

/** A person, as the first letter of their name in a disc. */

const SHELL = {
  sm: "size-7 text-xs",
  md: "size-8 text-xs",
  lg: "size-11 text-[0.9375rem]",
} as const;

/** "?" rather than an empty circle: a nameless account still gets a mark. */
function initialOf(...candidates: Array<string | null | undefined>) {
  for (const c of candidates) {
    const t = (c ?? "").trim();
    if (t) return t.charAt(0).toUpperCase();
  }
  return "?";
}

export function Initial({
  name,
  email,
  size = "sm",
  className,
}: {
  name?: string | null;
  email?: string | null;
  size?: keyof typeof SHELL;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold",
        SHELL[size],
        className,
      )}
    >
      {initialOf(name, email)}
    </span>
  );
}
