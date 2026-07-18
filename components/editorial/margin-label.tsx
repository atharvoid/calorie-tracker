import React from "react"
import { cn } from "@/lib/utils"

interface MarginLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
}

export function MarginLabel({ children, className, ...props }: MarginLabelProps) {
  return (
    <span
      className={cn(
        "inline-block border border-subtle bg-elevated px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted font-mono leading-none rounded-sm",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
