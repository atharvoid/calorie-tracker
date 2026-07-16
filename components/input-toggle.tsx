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
		<div className="inline-flex flex-wrap rounded-btn border border-subtle bg-surface p-0.5">
			{TABS.map((t) => (
				<button
					key={t.id}
					type="button"
					onClick={() => onChange(t.id)}
					className={cn(
						"inline-flex items-center gap-1.5 rounded-btn px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
						mode === t.id
							? "bg-elevated text-primary"
							: "text-muted hover:text-primary"
					)}
				>
					<t.Icon className="h-4 w-4" />
					{t.label}
				</button>
			))}
		</div>
	)
}
