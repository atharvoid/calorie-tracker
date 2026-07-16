"use client"

import { useRef, useState } from "react"
import { FileSpreadsheet, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Panel } from "./ui/panel"
import { GHOST_BTN } from "@/lib/ui"

type FileDropProps = {
	file: File | null
	onFile: (file: File | null) => void
}

export function FileDrop({ file, onFile }: FileDropProps) {
	const [dragging, setDragging] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	function accept(f: File | undefined) {
		if (!f) return
		if (/\.(xlsx|xls|csv)$/i.test(f.name)) onFile(f)
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault()
		setDragging(false)
		accept(e.dataTransfer.files?.[0])
	}

	if (file) {
		return (
			<Panel className="flex min-h-[280px] flex-col items-center justify-center gap-3">
				<FileSpreadsheet className="h-10 w-10 text-accent" />
				<span className="text-sm text-primary">{file.name}</span>
				<button
					type="button"
					onClick={() => onFile(null)}
					className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded", GHOST_BTN)}
				>
					<X className="h-3.5 w-3.5" /> Remove
				</button>
			</Panel>
		)
	}

	return (
		<button
			type="button"
			onClick={() => inputRef.current?.click()}
			onDragOver={(e) => {
				e.preventDefault()
				setDragging(true)
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={onDrop}
			className={cn(
				"flex min-h-[280px] w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
				dragging
					? "border-accent bg-elevated text-primary"
					: "border-subtle text-muted hover:bg-elevated"
			)}
		>
			<FileSpreadsheet className="h-8 w-8" />
			<span>Drag an Excel/CSV file here, or click to upload</span>
			<span className="text-xs text-muted">.xlsx, .xls, or .csv</span>
			<input
				ref={inputRef}
				type="file"
				accept=".xlsx,.xls,.csv"
				className="hidden"
				onChange={(e) => accept(e.target.files?.[0])}
			/>
		</button>
	)
}
