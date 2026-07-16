import { cn } from "@/lib/utils";

/** Shimmer placeholder used while data loads. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton rounded-md", className)} {...props} />;
}

export { Skeleton };
