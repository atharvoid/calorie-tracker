import * as XLSX from "xlsx"
import type { NormalizedRow, ExtractMeta } from "./types"

export function exportToXlsx(
	rows: NormalizedRow[],
	meta: ExtractMeta,
	filename = "orders.xlsx"
): void {
	const aoa: (string | number | null)[][] = [
		["Customer", "Quantity", "Unit", "Rate", "Amount", "Date", "Status"],
		...rows.map((r) => [
			r.customer,
			r.quantity,
			r.unit,
			r.rate,
			r.amount,
			r.date,
			r.status,
		]),
		[],
		["Total", null, null, null, meta.totalAmount, null, `${meta.pendingCount} pending`],
	]

	const ws = XLSX.utils.aoa_to_sheet(aoa)
	ws["!cols"] = [
		{ wch: 22 },
		{ wch: 10 },
		{ wch: 8 },
		{ wch: 10 },
		{ wch: 12 },
		{ wch: 12 },
		{ wch: 10 },
	]

	const wb = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(wb, ws, "Orders")
	XLSX.writeFile(wb, filename)
}
