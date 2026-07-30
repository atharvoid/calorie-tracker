"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type EditableCellProps = {
	value: string | number | null
	display?: string
	type?: "text" | "number" | "date"
	align?: "left" | "right"
	mono?: boolean
	placeholder?: string
	onCommit: (value: string) => void
}

export function EditableCell({
	value,
	display,
	type = "text",
	align = "left",
	mono = false,
	placeholder = "—",
	onCommit,
}: EditableCellProps) {
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState("")
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (editing) inputRef.current?.focus()
	}, [editing])

	function start() {
		setDraft(value == null ? "" : String(value))
		setEditing(true)
	}

	function commit() {
		setEditing(false)
		onCommit(draft.trim())
	}

	if (editing) {
		return (
			<input
				ref={inputRef}
				type={type}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === "Enter") commit()
					if (e.key === "Escape") setEditing(false)
				}}
				className={cn(
					"bg-elevated ring-accent w-full rounded-md px-2 py-1 text-sm ring-2 outline-none",
					mono && "tabular font-mono",
					align === "right" && "text-right"
				)}
			/>
		)
	}

	const shown = display ?? (value == null || value === "" ? placeholder : String(value))
	const isEmpty = value == null || value === ""

	return (
		<button
			type="button"
			onClick={start}
			className={cn(
				"hover:bg-elevated focus-visible:ring-accent w-full rounded-md px-2 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
				align === "right" ? "text-right" : "text-left",
				mono && "tabular font-mono",
				isEmpty && "text-muted"
			)}
		>
			{shown}
		</button>
	)
}
