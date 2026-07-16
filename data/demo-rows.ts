import { normalizeRows } from "@/lib/normalize"
import type { RawOrderRow } from "@/lib/types"

const RAW: RawOrderRow[] = [
	row("Ram Traders", 5, "Box", 2000, "2026-07-01", "Paid"),
	row("Shah Enterprises", 12, "Pcs", 850, "2026-07-01", "Pending"),
	row("Balaji Trading", 8, "Bags", 1200, "2026-07-02", "Partial"),
	row("Gupta & Sons", 20, "Pcs", 450, "2026-07-02", "Paid"),
	row("Ram Traders", 10, "Box", 2000, "2026-07-03", "Paid"),
	row("Verma Traders", 6, "Bags", 1500, "2026-07-03", "Pending"),
	row("Krishna Agencies", 15, "Pcs", 700, "2026-07-04", "Paid"),
	row("Shah Enterprises", 9, "Pcs", 850, "2026-07-05", "Partial"),
	row("Ram Traders", 7, "Box", 2100, "2026-07-05", "Pending"),
	row("Balaji Trading", 5, "Bags", 1250, "2026-07-06", "Paid"),
	row("Gupta & Sons", 25, "Pcs", 460, "2026-07-06", "Pending"),
	row("Krishna Agencies", 12, "Pcs", 720, "2026-07-07", "Paid"),
]

export const DEMO_ROWS = normalizeRows(RAW).rows

function row(
	customer: string,
	quantity: number,
	unit: string,
	rate: number,
	date: string,
	status: "Paid" | "Pending" | "Partial"
): RawOrderRow {
	return {
		customer,
		quantity,
		unit,
		rate,
		amount: null,
		date,
		status,
		confidence: 1,
		flags: [],
	}
}
