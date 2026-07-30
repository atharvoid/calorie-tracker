"use client"

import { FileText, ImageIcon, FileSpreadsheet } from "lucide-react"
import { cn } from "@/lib/utils"

export type InputMode = "text" | "photo" | "file"

const TABS: { id: InputMode; label: string; Icon: typeof FileText }[] = [
	{ id: "text", label: "Paste Text", Icon: FileText },
	{ id: "photo", label: "Upload Photo", Icon: ImageIcon },
	{ id: "file", label: "Upload File", Icon: FileSpreadsheet },
]

type InputToggleProps = {
	mode: InputMode
	onChange: (mode: InputMode) => void
}

export function InputToggle({ mode, onChange }: InputToggleProps) {
	return (
		<div className="rounded-btn border-subtle bg-surface inline-flex flex-wrap border p-0.5">
			{TABS.map((t) => (
				<button
					key={t.id}
					type="button"
					onClick={() => onChange(t.id)}
					className={cn(
						"rounded-btn focus-visible:ring-accent inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
						mode === t.id ? "bg-elevated text-primary" : "text-muted hover:text-primary"
					)}
				>
					<t.Icon className="h-4 w-4" />
					{t.label}
				</button>
			))}
		</div>
	)
}
