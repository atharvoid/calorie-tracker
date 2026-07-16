export type OrderStatus = "Paid" | "Pending" | "Partial"

// Exactly what the LLM returns (pre-normalization).
export interface RawOrderRow {
	customer: string
	quantity: number | null
	unit: string | null
	rate: number | null
	amount: number | null
	date: string | null // ISO YYYY-MM-DD or null
	status: OrderStatus | null
	confidence: number // 0..1
	flags: string[]
}

// What the UI consumes (post-normalization).
export interface NormalizedRow {
	id: string
	customer: string
	quantity: number | null
	unit: string | null
	rate: number | null
	amount: number | null // recomputed deterministically
	amountFormatted: string // "₹10,000" or "—"
	date: string | null
	dateFormatted: string // "03 Jul" or "—"
	status: OrderStatus // defaulted to "Pending" if null
	confidence: number
	flags: string[]
	needsReview: boolean // confidence < 0.85 OR amount missing
}

export interface ExtractMeta {
	rowCount: number
	totalAmount: number
	totalAmountFormatted: string
	pendingCount: number
}

export interface ExtractResponse {
	rows: NormalizedRow[]
	meta: ExtractMeta
}

export interface ExtractError {
	error: string
}
