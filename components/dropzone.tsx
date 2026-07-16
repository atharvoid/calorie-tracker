"use client"

import { useCallback, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { fileToScaledDataUrl } from "@/lib/image"
import { Panel } from "./ui/panel"

type DropzoneProps = {
	imageUrl: string | null
	onImage: (dataUrl: string | null) => void
}

export function Dropzone({ imageUrl, onImage }: DropzoneProps) {
	const [dragging, setDragging] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	const readFile = useCallback(
		async (file: File) => {
			if (!file.type.startsWith("image/")) return
			const dataUrl = await fileToScaledDataUrl(file)
			onImage(dataUrl)
		},
		[onImage]
	)

	function onDrop(e: React.DragEvent) {
		e.preventDefault()
		setDragging(false)
		const file = e.dataTransfer.files?.[0]
		if (file) void readFile(file)
	}

	if (imageUrl) {
		return (
			<Panel className="relative overflow-hidden p-0">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={imageUrl}
					alt="Upload preview"
					className="max-h-[280px] w-full object-contain"
				/>
				<button
					type="button"
					onClick={() => onImage(null)}
					className="absolute right-2 top-2 rounded-full bg-elevated p-1.5 text-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
					aria-label="Remove image"
				>
					<X className="h-4 w-4" />
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
			<ImagePlus className="h-8 w-8" />
			<span>Drag a photo here, or click to upload</span>
			<span className="text-xs text-muted">Bill, register, or handwritten notes</span>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0]
					if (file) void readFile(file)
				}}
			/>
		</button>
	)
}
