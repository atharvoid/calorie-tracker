"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, ExternalLink, RefreshCw, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Panel } from "./ui/panel"
import { EmptyState } from "./ui/empty-state"
import { PRIMARY_BTN, GHOST_BTN } from "@/lib/ui"
import { cn } from "@/lib/utils"

type Preview = {
	header: string[]
	rows: string[][]
	spreadsheetId: string | null
}

export function SheetPanel() {
	const [preview, setPreview] = useState<Preview | null>(null)
	const [loading, setLoading] = useState(true)
	const [connecting, setConnecting] = useState(false)

	const load = useCallback(async () => {
		setLoading(true)
		try {
			const res = await fetch("/api/sheet/preview")
			if (res.ok) setPreview(await res.json())
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load()
	}, [load])

	async function connect() {
		setConnecting(true)
		try {
			const res = await fetch("/api/sheet/connect", { method: "POST" })
			if (!res.ok) {
				const body = await res.json().catch(() => ({}))
				throw new Error(body?.detail || body?.error || "Unknown error")
			}
			toast.success("Google Sheet connected")
			await load()
		} catch (e) {
			toast.error(`Couldn't connect the sheet: ${(e as Error).message}`)
		} finally {
			setConnecting(false)
		}
	}

	if (loading) {
		return (
			<Panel className="text-muted flex h-[280px] items-center justify-center text-sm">
				<Loader2 className="text-accent mr-2 h-4 w-4 animate-spin" /> Loading your sheet...
			</Panel>
		)
	}

	if (!preview?.spreadsheetId) {
		return (
			<EmptyState
				icon={<FileSpreadsheet className="text-muted h-8 w-8" />}
				title="Connect a Google Sheet to sync your meals"
				hint="Creates a new 'Calorie Tracker' spreadsheet with a Meals tab in your Google Drive."
				action={
					<Button onClick={connect} disabled={connecting} className={PRIMARY_BTN}>
						{connecting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connecting...
							</>
						) : (
							"Connect Google Sheet"
						)}
					</Button>
				}
			/>
		)
	}

	const sheetUrl = `https://docs.google.com/spreadsheets/d/${preview.spreadsheetId}`

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<p className="text-secondary tabular font-mono text-sm">
					{preview.rows.length} rows synced
				</p>
				<div className="flex flex-wrap items-center gap-3">
					<button
						onClick={() => void load()}
						className={cn(
							"inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm",
							GHOST_BTN
						)}
					>
						<RefreshCw className="h-3.5 w-3.5" /> Refresh
					</button>
					<a
						href={sheetUrl}
						target="_blank"
						rel="noreferrer"
						className="text-accent focus-visible:ring-accent inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm hover:underline focus-visible:ring-2 focus-visible:outline-none"
					>
						Open in Google Sheets <ExternalLink className="h-3.5 w-3.5" />
					</a>
				</div>
			</div>
			<Panel className="overflow-x-auto p-0">
				<table className="w-full min-w-[640px] text-sm">
					<thead>
						<tr className="border-subtle border-b text-left">
							{preview.header.map((h, i) => (
								<th
									key={i}
									className="text-muted px-4 py-3 text-xs font-medium tracking-wide uppercase"
								>
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{preview.rows.map((row, ri) => (
							<tr
								key={ri}
								className="border-subtle hover:bg-elevated/20 border-b transition-colors last:border-0"
							>
								{row.map((cell, ci) => {
									const isNumeric = /^\s*₹?\s*[0-9,.-]+\s*$/.test(cell)
									return (
										<td
											key={ci}
											className={cn("text-secondary px-4 py-2", isNumeric && "tabular font-mono")}
										>
											{cell}
										</td>
									)
								})}
							</tr>
						))}
					</tbody>
				</table>
			</Panel>
		</div>
	)
}
