"use client"

import { useMemo, useState } from "react"
import { Loader2, Sparkles, FileText } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { EditableTable } from "./editable-table"
import { Dropzone } from "./dropzone"
import { FileDrop } from "./file-drop"
import { InputToggle, type InputMode } from "./input-toggle"
import { Panel } from "./ui/panel"
import { EmptyState } from "./ui/empty-state"
import { DEMO_ROWS } from "@/data/demo-rows"
import { SAMPLE_TIDY, SAMPLE_MESSY, SAMPLE_UGLY } from "@/data/samples"
import { computeMeta, recomputeRow } from "@/lib/normalize"
import { exportToXlsx } from "@/lib/export-xlsx"
import { parseFileToExtract } from "@/lib/parse-file"
import { PRIMARY_BTN, SECONDARY_BTN, GHOST_BTN } from "@/lib/ui"
import { cn } from "@/lib/utils"
import type { ExtractResponse, NormalizedRow } from "@/lib/types"

type Status = "idle" | "loading" | "error"

type TransformPanelProps = {
	rows: NormalizedRow[]
	onRows: (rows: NormalizedRow[]) => void
	onSendToAnalytics: () => void
	signedIn?: boolean
}

export function TransformPanel({
	rows,
	onRows,
	onSendToAnalytics,
	signedIn = false,
}: TransformPanelProps) {
	const [mode, setMode] = useState<InputMode>("text")
	const [text, setText] = useState("")
	const [image, setImage] = useState<string | null>(null)
	const [file, setFile] = useState<File | null>(null)
	const [status, setStatus] = useState<Status>("idle")
	const [error, setError] = useState<string | null>(null)

	const meta = useMemo(() => (rows.length ? computeMeta(rows) : null), [rows])

	const canTransform =
		mode === "text"
			? text.trim().length > 0
			: mode === "photo"
				? image != null
				: file != null

	async function handleTransform() {
		if (!canTransform) return
		setStatus("loading")
		setError(null)
		try {
			let data: ExtractResponse
			if (mode === "file" && file) {
				data = await parseFileToExtract(file)
			} else {
				const endpoint =
					mode === "text" ? "/api/extract" : "/api/extract-image"
				const payload = mode === "text" ? { text } : { image }
				const res = await fetch(endpoint, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				})
				if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
				data = await res.json()
			}
			if (!data.rows.length) {
				throw new Error("No order rows found. Check the input and try again.")
			}
			onRows(data.rows)
			setStatus("idle")
		} catch (e) {
			setError(e instanceof Error ? e.message : "Something went wrong")
			setStatus("error")
		}
	}

	function handleEdit(id: string, patch: Partial<NormalizedRow>) {
		onRows(
			rows.map((r) => (r.id === id ? recomputeRow({ ...r, ...patch }) : r))
		)
	}

	function handleExport() {
		if (rows.length && meta) {
			exportToXlsx(rows, meta)
			toast.success("Exported orders.xlsx")
		}
	}

	async function handleSendToSheet() {
		if (!rows.length) return
		const res = await fetch("/api/sheet/append", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rows }),
		})
		if (res.ok) toast.success("Sent to your Google Sheet")
		else toast.error("Couldn't sync — are you signed in?")
	}

	function loadDemo() {
		setStatus("idle")
		setError(null)
		onRows(DEMO_ROWS)
	}

	const showTable = status === "idle" && rows.length > 0 && meta != null

	return (
		<div className="grid gap-6 md:grid-cols-2">
			<div className="flex flex-col gap-3">
				<InputToggle mode={mode} onChange={setMode} />

				{mode === "text" && (
					<Textarea
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Paste your WhatsApp orders / notes here..."
						className="min-h-[280px] resize-none border bg-surface text-foreground focus-visible:ring-2 focus-visible:ring-accent"
					/>
				)}
				{mode === "photo" && <Dropzone imageUrl={image} onImage={setImage} />}
				{mode === "file" && <FileDrop file={file} onFile={setFile} />}

				<div className="flex flex-wrap items-center gap-3">
					<Button
						onClick={handleTransform}
						disabled={status === "loading" || !canTransform}
						className={PRIMARY_BTN}
					>
						{status === "loading" ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin text-accent-contrast" /> Transforming...
							</>
						) : (
							<>
								<Sparkles className="mr-2 h-4 w-4" /> Transform
							</>
						)}
					</Button>

					<Button
						onClick={loadDemo}
						className={SECONDARY_BTN}
					>
						Load demo data
					</Button>

						{mode === "text" && (
						<div className="flex flex-wrap items-center gap-2 text-xs text-muted">
							<span className="text-muted">Try sample:</span>
							<button
								onClick={() => setText(SAMPLE_TIDY)}
								className={cn("px-1.5 py-0.5 rounded", GHOST_BTN)}
							>
								Tidy
							</button>
							<button
								onClick={() => setText(SAMPLE_MESSY)}
								className={cn("px-1.5 py-0.5 rounded", GHOST_BTN)}
							>
								Messy
							</button>
							<button
								onClick={() => setText(SAMPLE_UGLY)}
								className={cn("px-1.5 py-0.5 rounded", GHOST_BTN)}
							>
								Handwritten
							</button>
						</div>
					)}
				</div>
			</div>

			<div>
				{status === "loading" && <TableSkeleton />}
				{status === "error" && (
					<Panel className="border-danger/20 bg-danger/5 p-6 text-sm text-danger font-medium">
						{error}
					</Panel>
				)}
				{showTable && meta && (
					<EditableTable
						rows={rows}
						meta={meta}
						onEdit={handleEdit}
						onExport={handleExport}
						onSendToAnalytics={onSendToAnalytics}
						onSendToSheet={signedIn ? handleSendToSheet : undefined}
					/>
				)}
				{status === "idle" && rows.length === 0 && (
					<EmptyState
						icon={<FileText className="h-8 w-8 text-muted" />}
						title="Your clean table will appear here."
						hint="Paste text, upload a photo of a register, or drop an Excel/CSV file to transform data."
					/>
				)}
			</div>
		</div>
	)
}

function TableSkeleton() {
	return (
		<Panel className="space-y-2 p-4">
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="h-8 animate-pulse rounded bg-elevated" />
			))}
		</Panel>
	)
}
