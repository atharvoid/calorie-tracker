import { z } from "zod"

export const orderRowSchema = z.object({
	customer: z.string().describe("Party/buyer name in clean Title Case"),
	quantity: z.number().nullable().describe("Numeric count only, no unit"),
	unit: z.string().nullable().describe("Unit of measure, e.g. Box, Bag, Pcs, Kg"),
	rate: z.number().nullable().describe("Per-unit price as a number, no symbols"),
	amount: z.number().nullable().describe("Total ONLY if explicitly stated; else null"),
	date: z.string().nullable().describe("ISO date YYYY-MM-DD, or null"),
	status: z.enum(["Paid", "Pending", "Partial"]).nullable(),
	confidence: z.number().min(0).max(1).describe("Overall confidence for this row"),
	flags: z.array(z.string()).describe("Short notes on any issues; empty if clean"),
})

export const extractionSchema = z.object({
	rows: z.array(orderRowSchema),
})

export type ExtractionResult = z.infer<typeof extractionSchema>

export const EXTRACTION_SYSTEM_PROMPT = `You are a precise data-entry extraction engine for an Indian trading / wholesale business.
Read messy, unstructured order notes (WhatsApp messages, transcribed handwriting, informal lists) and extract EVERY distinct order line.

General:
- Output must match the provided schema exactly. No commentary.
- One object per order line. If a single line contains multiple orders, split them.

Field rules:
- customer: the buyer/party name in clean Title Case. Expand common abbreviations: "ent."→"Enterprises", "trdng"/"trdg"→"Trading", "co"→"Co."; keep "& Sons".
- quantity: numeric count only (no unit). null if absent.
- unit: unit of measure (Box, Bag, Pcs, Kg, ...), Title Case. null if absent.
- rate: per-unit price as a plain number. Strip ₹, commas, "rs", "/-". null if absent.
- amount: ONLY if a total is explicitly written. If not written, set null (the system computes qty×rate). Strip symbols/commas.
- date: ISO YYYY-MM-DD. Parse forms like "3rd july", "4/7", "05 july". Assume the CURRENT year if year is missing. null if no date.
- status: one of Paid | Pending | Partial. Map: paid/done/cleared/"paid ho gaya"→Paid; pending/due/baaki/udhaar→Pending; half paid/part payment/"aadha"→Partial. If truly unstated, use null.
- confidence: 0..1. Lower it when fields are guessed, missing, or ambiguous.
- flags: short strings like "missing date", "ambiguous unit", "amount inferred". Empty array if clean.

Be literal and careful. Never invent customers or numbers that are not present.`
