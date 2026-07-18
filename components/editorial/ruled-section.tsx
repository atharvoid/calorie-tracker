import React from "react"
import { cn } from "@/lib/utils"

interface RuledSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  children: React.ReactNode
}

export function RuledSection({ label, children, className, ...props }: RuledSectionProps) {
  return (
    <div className={cn("relative py-4 border-t border-subtle first:border-t-0", className)} {...props}>
      {label && (
        <span className="absolute -top-2.5 left-4 bg-surface px-1.5 text-[10px] font-bold tracking-wider uppercase text-muted font-mono">
          {label}
        </span>
      )}
      {children}
    </div>
  )
}
