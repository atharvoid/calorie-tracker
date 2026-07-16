import * as XLSX from "xlsx"
import { normalizeRows } from "./normalize"
import type { RawOrderRow, ExtractResponse, OrderStatus } from "./types"

export async function parseArrayBufferToExtract(
	buf: ArrayBuffer
): Promise<ExtractResponse> {
	const wb = XLSX.read(buf, { type: "array", cellDates: true })
	const firstSheetName = wb.SheetNames[0]
	if (!firstSheetName) return normalizeRows([])
	const sheet = wb.Sheets[firstSheetName]
	const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
		defval: null,
	})
	const raw = records
		.map(recordToRaw)
		.filter(
			(r) => r.customer.trim() !== "" || r.amount != null || r.quantity != null
		)
	return normalizeRows(raw)
}

// Parse an .xlsx/.xls/.csv file into the same ExtractResponse shape as the LLM path.
export async function parseFileToExtract(file: File): Promise<ExtractResponse> {
	return parseArrayBufferToExtract(await file.arrayBuffer())
}


function recordToRaw(rec: Record<string, unknown>): RawOrderRow {
	const pick = (re: RegExp): unknown => {
		const key = Object.keys(rec).find((k) => re.test(k.toLowerCase()))
		return key != null ? rec[key] : null
	}

	const customer = pick(/customer|party|name|buyer|client/)
	const unit = pick(/unit|uom|measure/)

	return {
		customer: customer != null ? String(customer) : "",
		quantity: toNum(pick(/qty|quantity|count|pieces|pcs/)),
		unit: unit != null && String(unit).trim() !== "" ? String(unit) : null,
		rate: toNum(pick(/rate|price|per unit|unit price/)),
		amount: toNum(pick(/amount|total|value|net/)),
		date: toIsoDate(pick(/date/)),
		status: toStatus(pick(/status|payment|paid|state/)),
		confidence: 1,
		flags: [],
	}
}

function toNum(v: unknown): number | null {
	if (typeof v === "number") return Number.isFinite(v) ? v : null
	if (typeof v === "string") {
		const cleaned = v.replace(/[^0-9.-]/g, "")
		if (cleaned.trim() === "") return null
		const n = Number(cleaned)
		return Number.isNaN(n) ? null : n
	}
	return null
}

function toIsoDate(v: unknown): string | null {
	if (v instanceof Date && !Number.isNaN(v.getTime())) {
		return v.toISOString().slice(0, 10)
	}
	if (typeof v === "string" && v.trim() !== "") {
		const d = new Date(v)
		return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
	}
	return null
}

function toStatus(v: unknown): OrderStatus | null {
	if (typeof v !== "string") return null
	const s = v.toLowerCase()
	if (s.includes("paid") || s.includes("done") || s.includes("cleared")) return "Paid"
	if (s.includes("partial") || s.includes("half") || s.includes("part")) return "Partial"
	if (s.includes("pending") || s.includes("due") || s.includes("baaki") || s.includes("udhaar")) return "Pending"
	return null
}
