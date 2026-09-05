import { z } from "zod";

/**
 * What the student picks. The `value` side is a frozen Postgres enum; only
 * these labels are ours to change, which is why renaming what students read
 * costs nothing.
 */
export const CATEGORIES = [
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "carpentry", label: "Carpentry & Furniture" },
  { value: "it_network", label: "IT & Network" },
  { value: "housekeeping", label: "Cleaning & Housekeeping" },
  { value: "civil", label: "Building & Infrastructure" },
  // Kept deliberately: a student who cannot place their problem should never
  // be forced to guess a trade. The admin routes it to General Maintenance.
  { value: "other", label: "Something else" },
] as const;

export const PRIORITIES = [
  { value: "low", label: "Low", hint: "Annoying, not urgent" },
  { value: "medium", label: "Medium", hint: "Should be fixed this week" },
  { value: "high", label: "High", hint: "Blocking normal use" },
  { value: "urgent", label: "Urgent", hint: "Unsafe or affecting many people" },
] as const;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // matches the bucket's own limit
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * The one schema. The browser runs it for instant feedback and the server runs
 * it again on the raw FormData, because client-side validation is a
 * convenience and never a control.
 */
export const complaintSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Give it a short title — at least 5 characters.")
    .max(120, "Keep the title under 120 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Describe the problem in a sentence or two.")
    .max(2000, "Keep the description under 2000 characters."),
  category: z.enum(
    CATEGORIES.map((c) => c.value) as [string, ...string[]],
    "Pick a category.",
  ),
  priority: z.enum(
    PRIORITIES.map((p) => p.value) as [string, ...string[]],
    "Pick a priority.",
  ),
  location_id: z.uuid("Pick where this is."),
  location_detail: z
    .string()
    .trim()
    .max(120, "Keep this short — a room number, a floor, or an area.")
    .optional()
    .or(z.literal("")),
});
