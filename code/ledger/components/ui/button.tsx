import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border border-transparent bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]",
        outline: "border border-[var(--line)] bg-white text-[var(--text)] hover:bg-[#f8fafc]",
        ghost: "border border-[var(--line)] bg-white text-[var(--text)] hover:bg-[#f8fafc]",
        danger: "border border-[#efb7b1] bg-[#fff5f4] text-[var(--danger)] hover:bg-[#ffecea]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant }), className)} {...props} />;
}
