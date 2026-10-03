import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn("h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-900", className)}
      {...props}
    />
  );
}
