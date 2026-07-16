"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Download, BarChart3, CloudUpload } from "lucide-react"
import { cn } from "@/lib/utils"
import { StatusPill } from "./status-pill"
import { EditableCell } from "./editable-cell"
import { Button } from "@/components/ui/button"
import { Panel } from "./ui/panel"
import { PRIMARY_BTN, SECONDARY_BTN } from "@/lib/ui"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select"
import type { NormalizedRow, ExtractMeta, OrderStatus } from "@/lib/types"

const ROW_INITIAL = { opacity: 0, y: 8 }
const ROW_ANIMATE = { opacity: 1, y: 0 }
const rowTransition = (i: number) => ({
	delay: i * 0.03,
	duration: 0.25,
	ease: [0.2, 0.8, 0.2, 1] as const,
})

const STATUSES: OrderStatus[] = ["Paid", "Pending", "Partial"]
const HEADERS = ["Customer", "Qty", "Unit", "Rate", "Amount", "Date", "Status"]

type EditableTableProps = {
	rows: NormalizedRow[]
	meta: ExtractMeta
	onEdit: (id: string, patch: Partial<NormalizedRow>) => void
	onExport: () => void
	onSendToAnalytics?: () => void
	onSendToSheet?: () => void
}

export function EditableTable({
	rows,
	meta,
	onEdit,
	onExport,
	onSendToAnalytics,
	onSendToSheet,
}: EditableTableProps) {
	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<p className="text-sm text-secondary font-mono tabular">
					{meta.rowCount} orders · {meta.pendingCount} pending · {meta.totalAmountFormatted}
				</p>
				<div className="flex flex-wrap items-center gap-2">
					{onSendToAnalytics && (
						<Button
							onClick={onSendToAnalytics}
							className={SECONDARY_BTN}
						>
							<BarChart3 className="mr-2 h-4 w-4" /> Send to Analytics
						</Button>
					)}
					{onSendToSheet && (
						<Button
							onClick={onSendToSheet}
							className={SECONDARY_BTN}
						>
							<CloudUpload className="mr-2 h-4 w-4" /> Send to Sheet
						</Button>
					)}
					<Button
						onClick={onExport}
						className={PRIMARY_BTN}
					>
						<Download className="mr-2 h-4 w-4" /> Download Excel
					</Button>
				</div>
			</div>

			<Panel className="overflow-x-auto p-0">
				<table className="w-full min-w-[640px] text-sm">
					<thead>
						<tr className="border-b border-subtle text-left">
							{HEADERS.map((h, idx) => (
								<th
									key={h}
									className={cn(
										"px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted",
										idx >= 1 && idx <= 4 && "text-right"
									)}
								>
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((r, i) => (
							<motion.tr
								key={r.id}
								initial={ROW_INITIAL}
								animate={ROW_ANIMATE}
								transition={rowTransition(i)}
								className="border-b border-subtle last:border-0 hover:bg-elevated/20 transition-colors"
							>
								<td className="px-2 py-1.5">
									<div className="flex items-center gap-1">
										{r.needsReview && (
											<AlertTriangle
												className="h-3.5 w-3.5 shrink-0 text-pending animate-pulse"
												aria-label="Please verify"
											/>
										)}
										<EditableCell
											value={r.customer}
											onCommit={(v) => onEdit(r.id, { customer: v })}
										/>
									</div>
								</td>
								<td className="px-2 py-1.5">
									<EditableCell
										value={r.quantity}
										type="number"
										align="right"
										mono
										onCommit={(v) => onEdit(r.id, { quantity: toNum(v) })}
									/>
								</td>
								<td className="px-2 py-1.5">
									<EditableCell
										value={r.unit}
										align="right"
										onCommit={(v) => onEdit(r.id, { unit: v || null })}
									/>
								</td>
								<td className="px-2 py-1.5">
									<EditableCell
										value={r.rate}
										display={r.rate != null ? r.rate.toLocaleString("en-IN") : undefined}
										type="number"
										align="right"
										mono
										onCommit={(v) => onEdit(r.id, { rate: toNum(v) })}
									/>
								</td>
								<td className="px-4 py-1.5 text-right font-mono tabular text-secondary">
									{r.amountFormatted}
								</td>
								<td className="px-2 py-1.5">
									<EditableCell
										value={r.date}
										display={r.dateFormatted}
										type="date"
										align="right"
										onCommit={(v) => onEdit(r.id, { date: v || null })}
									/>
								</td>
								<td className="px-4 py-1.5">
									<Select
										value={r.status}
										onValueChange={(v) => onEdit(r.id, { status: v as OrderStatus })}
									>
										<SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
											<StatusPill status={r.status} />
										</SelectTrigger>
										<SelectContent className="bg-elevated border-subtle">
											{STATUSES.map((s) => (
												<SelectItem key={s} value={s}>
													{s}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</td>
							</motion.tr>
						))}
					</tbody>
					<tfoot>
						<tr className="border-t border-subtle text-sm">
							<td className="px-4 py-3 text-muted" colSpan={4}>
								{meta.rowCount} orders · {meta.pendingCount} pending
							</td>
							<td className="px-4 py-3 text-right font-mono tabular font-semibold text-primary">
								{meta.totalAmountFormatted}
							</td>
							<td colSpan={2} />
						</tr>
					</tfoot>
				</table>
			</Panel>
		</div>
	)
}

function toNum(v: string): number | null {
	if (v.trim() === "") return null
	const n = Number(v.replace(/[^0-9.-]/g, ""))
	return Number.isNaN(n) ? null : n
}
