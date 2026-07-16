import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { entries } from "@/db/schema"
import { recomputeRow } from "@/lib/normalize"
import type { NormalizedRow, OrderStatus } from "@/lib/types"

export async function getUserEntries(userId: string): Promise<NormalizedRow[]> {
	const rows = await db
		.select()
		.from(entries)
		.where(eq(entries.userId, userId))
		.orderBy(desc(entries.createdAt))

	return rows.map((e) =>
		recomputeRow({
			id: e.id,
			customer: e.customer,
			quantity: e.quantity != null ? Number(e.quantity) : null,
			unit: e.unit,
			rate: e.rate != null ? Number(e.rate) : null,
			amount: e.amount != null ? Number(e.amount) : null,
			amountFormatted: "",
			date: e.date,
			dateFormatted: "",
			status: (e.status as OrderStatus) ?? "Pending",
			confidence: e.confidence != null ? Number(e.confidence) : 1,
			flags: (e.flags as string[]) ?? [],
			needsReview: false,
		})
	)
}
