import React from "react"
import { cn } from "@/lib/utils"

interface StampedStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
}

export function StampedState({ label, className, ...props }: StampedStateProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center border-2 border-dashed border-accent/40 text-accent/80 rounded px-2.5 py-1 text-[11px] font-black uppercase tracking-widest font-mono select-none rotate-[-2deg]",
        className
      )}
      {...props}
    >
      {label}
    </div>
  )
}
