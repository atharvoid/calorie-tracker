from pathlib import Path


def edit(path: str, replacements: list[tuple[str, str]]) -> None:
    file = Path(path)
    text = file.read_text()
    for old, new in replacements:
        text = text.replace(old, new)
    file.write_text(text)


# Mobile shell: Sheet adoption, larger touch targets, and contextual Add tooltip.
shell = Path("components/nutrition/nutrition-shell.tsx")
text = shell.read_text()
text = text.replace(
    'import { useCallback, useEffect, useState, useRef } from "react"',
    'import { useCallback, useEffect, useState } from "react"',
)
text = text.replace(
    'import { BarChart2, Clock, Settings, Utensils, Plus, LogOut } from "lucide-react"',
    'import { BarChart2, Clock, Settings, Utensils, Plus } from "lucide-react"',
)
text = text.replace('import { signOutAction } from "@/components/auth-actions"\n', "")
text = text.replace(
    'import { ThemeToggle } from "@/components/theme-toggle"',
    'import { ThemeToggle } from "@/components/theme-toggle"\n'
    'import { MobileUserSheet } from "./mobile-user-sheet"\n'
    'import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"',
)
text = text.replace(
    '\tconst [menuOpen, setMenuOpen] = useState(false)\n\tconst menuRef = useRef<HTMLDivElement>(null)\n',
    "",
)
if "\t// Close avatar menu when clicking outside" in text:
    start = text.index("\t// Close avatar menu when clicking outside")
    end = text.index("\n\tconst experience =", start)
    text = text[:start] + text[end + 1 :]
if "\t\t\t\t\t{/* User profile dropdown */}" in text:
    start = text.index("\t\t\t\t\t{/* User profile dropdown */}")
    end = text.index("\n\t\t\t\t</div>\n\t\t\t</header>", start)
    replacement = (
        '\t\t\t\t\t{/* User profile sheet */}\n'
        "\t\t\t\t\t{user && <MobileUserSheet user={user} />}"
    )
    text = text[:start] + replacement + text[end:]
old_add = '''\t\t\t\t\t{activeTab === "today" && (
\t\t\t\t\t\t<button
\t\t\t\t\t\t\tonClick={() => window.dispatchEvent(new CustomEvent("open_meal_composer"))}
\t\t\t\t\t\t\tclassName="bg-accent/15 text-accent hover:bg-accent/25 rounded-full p-1.5 focus:outline-none"
\t\t\t\t\t\t\taria-label="Add meal"
\t\t\t\t\t\t>
\t\t\t\t\t\t\t<Plus className="h-4 w-4" />
\t\t\t\t\t\t</button>
\t\t\t\t\t)}'''
new_add = '''\t\t\t\t\t{activeTab === "today" && (
\t\t\t\t\t\t<Tooltip>
\t\t\t\t\t\t\t<TooltipTrigger
\t\t\t\t\t\t\t\tonClick={() => window.dispatchEvent(new CustomEvent("open_meal_composer"))}
\t\t\t\t\t\t\t\tclassName="bg-accent/15 text-accent hover:bg-accent/25 focus-visible:ring-accent flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full transition-colors ease-premium focus-visible:ring-2 focus-visible:outline-none"
\t\t\t\t\t\t\t\taria-label="Add meal"
\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t<Plus className="h-4 w-4" />
\t\t\t\t\t\t\t</TooltipTrigger>
\t\t\t\t\t\t\t<TooltipContent>Add meal</TooltipContent>
\t\t\t\t\t\t</Tooltip>
\t\t\t\t\t)}'''
text = text.replace(old_add, new_add)
shell.write_text(text)

# History strip: explicit tooltips, 40px arrows, 64px day targets, visible focus.
week = Path("components/nutrition/week-navigator.tsx")
text = week.read_text()
text = text.replace(
    'import { cn } from "@/lib/utils"',
    'import { cn } from "@/lib/utils"\n'
    'import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"',
)
text = text.replace(
    '''\t\t\t\t<button
\t\t\t\t\tonClick={goPrev}
\t\t\t\t\tclassName="text-muted hover:text-primary hover:bg-elevated rounded-lg p-1.5 transition-colors"
\t\t\t\t\taria-label="Previous week"
\t\t\t\t>
\t\t\t\t\t<ChevronLeft className="h-4.5 w-4.5" />
\t\t\t\t</button>''',
    '''\t\t\t\t<Tooltip>
\t\t\t\t\t<TooltipTrigger
\t\t\t\t\t\tonClick={goPrev}
\t\t\t\t\t\tclassName="text-muted hover:text-primary hover:bg-elevated focus-visible:ring-accent flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors ease-premium focus-visible:ring-2 focus-visible:outline-none"
\t\t\t\t\t\taria-label="Previous week"
\t\t\t\t\t>
\t\t\t\t\t\t<ChevronLeft className="h-4.5 w-4.5" />
\t\t\t\t\t</TooltipTrigger>
\t\t\t\t\t<TooltipContent>Previous week</TooltipContent>
\t\t\t\t</Tooltip>''',
)
text = text.replace(
    '''\t\t\t\t<button
\t\t\t\t\tonClick={goNext}
\t\t\t\t\tdisabled={allNextFuture}
\t\t\t\t\tclassName="text-muted hover:text-primary hover:bg-elevated rounded-lg p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-30"
\t\t\t\t\taria-label="Next week"
\t\t\t\t>
\t\t\t\t\t<ChevronRight className="h-4.5 w-4.5" />
\t\t\t\t</button>''',
    '''\t\t\t\t<Tooltip>
\t\t\t\t\t<TooltipTrigger
\t\t\t\t\t\tonClick={goNext}
\t\t\t\t\t\tdisabled={allNextFuture}
\t\t\t\t\t\tclassName="text-muted hover:text-primary hover:bg-elevated focus-visible:ring-accent flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors ease-premium focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
\t\t\t\t\t\taria-label="Next week"
\t\t\t\t\t>
\t\t\t\t\t\t<ChevronRight className="h-4.5 w-4.5" />
\t\t\t\t\t</TooltipTrigger>
\t\t\t\t\t<TooltipContent>Next week</TooltipContent>
\t\t\t\t</Tooltip>''',
)
text = text.replace(
    '"flex flex-col items-center rounded-xl px-1 py-2 text-center transition-colors focus:outline-none",',
    '"focus-visible:ring-accent flex min-h-16 flex-col items-center rounded-xl px-1 py-2 text-center transition-colors ease-premium focus-visible:ring-2 focus-visible:outline-none",',
)
text = text.replace(
    'className="tabular text-muted sm:text-2xs mt-0.5 hidden font-mono text-[9px] sm:inline"',
    'className="tabular text-muted text-2xs mt-0.5 hidden font-mono sm:inline"',
)
week.write_text(text)

# Compact metric hierarchy: 12px card padding, 12px gaps, no sub-11px text.
edit(
    "components/nutrition/macro-summary.tsx",
    [
        (
            'className="grid grid-cols-3 gap-2 max-[349px]:grid-cols-1 sm:gap-4"',
            'className="grid grid-cols-3 gap-3 max-[349px]:grid-cols-1 sm:gap-4"',
        ),
        (
            'className="bg-elevated border-subtle flex flex-col justify-between rounded-xl border p-2 sm:p-3"',
            'className="bg-elevated border-subtle flex min-h-28 flex-col justify-between rounded-xl border p-3"',
        ),
        (
            'className="text-muted tabular sm:text-2xs mt-0.5 text-[9px] leading-none"',
            'className="text-muted tabular text-2xs mt-1 leading-tight"',
        ),
        (
            'className="text-muted mt-0.5 block text-right text-[9px] font-medium"',
            'className="text-muted text-2xs mt-1 block text-right font-medium"',
        ),
    ],
)
edit(
    "components/nutrition/calorie-progress.tsx",
    [
        (
            'className="grid grid-cols-2 gap-2 sm:grid-cols-3"',
            'className="grid grid-cols-2 gap-3 sm:grid-cols-3"',
        ),
        ("rounded-xl border p-2.5 sm:p-3", "rounded-xl border p-3"),
        (
            'className="text-muted sm:text-2xs mt-0.5 text-[9px]"',
            'className="text-muted text-2xs mt-1"',
        ),
    ],
)

# Composer: labelled 500-char field, balanced panel padding, 44px controls.
edit(
    "components/nutrition/meal-composer.tsx",
    [
        (
            'className="bg-canvas/40 md:bg-surface border-subtle md:rounded-card flex-1 overflow-y-auto border px-4 py-6 pb-28 shadow-lg md:relative md:p-5 md:pb-0"',
            'className="bg-canvas/40 md:bg-surface border-subtle md:rounded-card flex-1 overflow-y-auto border p-5 pb-28 shadow-lg md:relative md:pb-0"',
        ),
        (
            'className="text-muted hover:text-primary hover:bg-elevated absolute top-4 right-4 rounded-lg p-1.5 transition-colors"',
            'className="text-muted hover:text-primary hover:bg-elevated focus-visible:ring-accent absolute top-3 right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors ease-premium focus-visible:ring-2 focus-visible:outline-none"',
        ),
        ('className="mb-4"', 'className="mb-5 pr-12"'),
        (
            "\t\t\t\t\t\t\t<textarea\n",
            '\t\t\t\t\t\t\t<label htmlFor="meal-description" className="text-primary text-xs font-semibold">\n'
            "\t\t\t\t\t\t\t\tMeal description\n"
            "\t\t\t\t\t\t\t</label>\n"
            "\t\t\t\t\t\t\t<textarea\n"
            '\t\t\t\t\t\t\t\tid="meal-description"\n',
        ),
        (
            '\t\t\t\t\t\t\t\tplaceholder="e.g. 2 fried eggs with 2 slices of whole wheat toast and a cup of black coffee for breakfast"',
            "\t\t\t\t\t\t\t\tmaxLength={500}\n"
            '\t\t\t\t\t\t\t\tplaceholder="e.g. 2 fried eggs with 2 slices of whole wheat toast and a cup of black coffee for breakfast"',
        ),
        ("flex h-10 flex-1", "flex h-11 flex-1"),
    ],
)

edit(
    "app/globals.css",
    [("animation-timing-function: ease-out;", "animation-timing-function: var(--ease-premium);")],
)
