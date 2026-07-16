import type {
	RawOrderRow,
	NormalizedRow,
	ExtractResponse,
	ExtractMeta,
	OrderStatus,
} from "./types"

const CONFIDENCE_THRESHOLD = 0.85

export function formatINR(n: number): string {
	return "₹" + Math.round(n).toLocaleString("en-IN")
}

export function formatDate(iso: string | null): string {
	if (!iso) return "—"
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return "—"
	return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

export function toTitleCase(s: string): string {
	return s
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
		.join(" ")
}

// Recompute derived fields for ONE row after an inline edit.
export function recomputeRow(row: NormalizedRow): NormalizedRow {
	const amount =
		row.quantity != null && row.rate != null
			? row.quantity * row.rate
			: row.amount
	return {
		...row,
		amount,
		amountFormatted: amount != null ? formatINR(amount) : "—",
		dateFormatted: formatDate(row.date),
		needsReview: row.confidence < CONFIDENCE_THRESHOLD || amount == null,
	}
}

// Aggregate meta from current rows — recomputed live on every edit.
export function computeMeta(rows: NormalizedRow[]): ExtractMeta {
	const totalAmount = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0)
	const pendingCount = rows.filter((r) => r.status !== "Paid").length
	return {
		rowCount: rows.length,
		totalAmount,
		totalAmountFormatted: formatINR(totalAmount),
		pendingCount,
	}
}

export function normalizeRows(raw: RawOrderRow[]): ExtractResponse {
	const rows: NormalizedRow[] = raw.map((r, i) => {
		const quantity = typeof r.quantity === "number" ? r.quantity : null
		const rate = typeof r.rate === "number" ? r.rate : null

		let amount: number | null = null
		if (quantity != null && rate != null) amount = quantity * rate
		else if (typeof r.amount === "number") amount = r.amount

		const status: OrderStatus = r.status ?? "Pending"
		const confidence = clamp01(r.confidence)

		return {
			id: `row-${i}`,
			customer: r.customer ? toTitleCase(r.customer) : "Unknown",
			quantity,
			unit: r.unit ? toTitleCase(r.unit) : null,
			rate,
			amount,
			amountFormatted: amount != null ? formatINR(amount) : "—",
			date: r.date ?? null,
			dateFormatted: formatDate(r.date),
			status,
			confidence,
			flags: Array.isArray(r.flags) ? r.flags : [],
			needsReview: confidence < CONFIDENCE_THRESHOLD || amount == null,
		}
	})

	return { rows, meta: computeMeta(rows) }
}

function clamp01(n: number): number {
	if (typeof n !== "number" || Number.isNaN(n)) return 0
	return Math.min(1, Math.max(0, n))
}
