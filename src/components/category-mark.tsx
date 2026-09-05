import { Medallion } from "@/components/medallion";
import { categoryIcon, categoryTint } from "@/lib/complaints/icons";
import { CATEGORY_LABEL } from "@/lib/complaints/display";
import { cn } from "@/lib/utils";

/** What kind of problem a complaint is, as one mark. */
export function CategoryMark({
  category,
  className,
}: {
  category: string | null | undefined;
  className?: string;
}) {
  return (
    <Medallion
      icon={categoryIcon(category)}
      size="sm"
      className={cn(categoryTint(category), className)}
      label={
        (category ? CATEGORY_LABEL[category] : null) ??
        category ??
        "Kind not recorded"
      }
    />
  );
}
