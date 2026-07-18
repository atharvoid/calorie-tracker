"use client"

import { useState, useEffect } from "react"
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react"

export function ImprintLegend() {
  const [isOpen, setIsOpen] = useState(false)

  // Show legend automatically once per session
  useEffect(() => {
    const shown = sessionStorage.getItem("imprint_legend_shown")
    if (!shown) {
      setIsOpen(true)
      sessionStorage.setItem("imprint_legend_shown", "true")
    }
  }, [])

  return (
    <div className="border border-subtle bg-surface rounded-xl overflow-hidden text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 font-mono font-bold text-secondary hover:text-primary transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-accent" />
          <span>How to read the Imprint</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-subtle/40 grid grid-cols-1 sm:grid-cols-2 gap-4 text-secondary leading-relaxed">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-primary block">Meal Energy</span>
                The width & height of the island correspond directly to the calorie count.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-primary block">Protein Content</span>
                The number of nested outline contours increases with higher protein ratios.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-primary block">Carbohydrate Ratio</span>
                Higher carbohydrate concentration skews and leans the shape horizontally.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-primary block">Fat Density</span>
                The opacity of the color wash inside the shape represents fat energy percentage.
              </div>
            </div>
          </div>
        </div>
      )}

      {/*
        Estimated disclosure — persistent and always in the DOM.
        Placed outside the collapsible body so screen readers encounter it
        regardless of whether the legend panel is open or closed.
        Not repeated per-meal. One product-level statement only.
      */}
      <p
        className="px-4 py-2.5 border-t border-subtle/20 text-[10px] text-muted font-medium font-mono text-center"
        data-testid="imprint-estimated-disclosure"
      >
        Nutrition values are estimates and can be edited.
      </p>
    </div>
  )
}
