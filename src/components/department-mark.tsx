import { Medallion } from "@/components/medallion";
import { departmentIcon, departmentTint } from "@/lib/complaints/icons";
import { cn } from "@/lib/utils";

/** A department's trade, as one mark. */
export function DepartmentMark({
  slug,
  className,
}: {
  slug: string | null | undefined;
  className?: string;
}) {
  return (
    <Medallion
      icon={departmentIcon(slug)}
      size="sm"
      className={cn(departmentTint(slug), className)}
    />
  );
}
