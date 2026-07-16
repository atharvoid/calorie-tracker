import type { NormalizedRow, OrderStatus } from "./types"

export type CustomerTotal = { customer: string; amount: number }
export type TrendPoint = { date: string; amount: number }
export type StatusSplit = { status: OrderStatus; count: number; amount: number }

export type AnalyticsData = {
	totalSales: number
	collected: number
	outstanding: number
	orderCount: number
	customerCount: number
	topCustomers: CustomerTotal[]
	statusSplit: StatusSplit[]
	trend: TrendPoint[]
	topUnit: string | null
}

export function computeAnalytics(rows: NormalizedRow[]): AnalyticsData {
	const totalSales = sum(rows.map((r) => r.amount ?? 0))
	const collected = sum(
		rows.filter((r) => r.status === "Paid").map((r) => r.amount ?? 0)
	)
	const outstanding = Math.max(0, totalSales - collected)
	const orderCount = rows.length
	const customerCount = new Set(rows.map((r) => r.customer)).size

	const byCustomer = new Map<string, number>()
	for (const r of rows) {
		byCustomer.set(r.customer, (byCustomer.get(r.customer) ?? 0) + (r.amount ?? 0))
	}
	const topCustomers = [...byCustomer.entries()]
		.map(([customer, amount]) => ({ customer, amount }))
		.sort((a, b) => b.amount - a.amount)
		.slice(0, 5)

	const statuses: OrderStatus[] = ["Paid", "Pending", "Partial"]
	const statusSplit = statuses
		.map((status) => {
			const group = rows.filter((r) => r.status === status)
			return {
				status,
				count: group.length,
				amount: sum(group.map((r) => r.amount ?? 0)),
			}
		})
		.filter((s) => s.count > 0)

	const byDate = new Map<string, number>()
	for (const r of rows) {
		if (!r.date) continue
		byDate.set(r.date, (byDate.get(r.date) ?? 0) + (r.amount ?? 0))
	}
	const trend = [...byDate.entries()]
		.map(([date, amount]) => ({ date, amount }))
		.sort((a, b) => a.date.localeCompare(b.date))

	const byUnit = new Map<string, number>()
	for (const r of rows) {
		if (!r.unit) continue
		byUnit.set(r.unit, (byUnit.get(r.unit) ?? 0) + (r.quantity ?? 0))
	}
	const topUnit =
		[...byUnit.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

	return {
		totalSales,
		collected,
		outstanding,
		orderCount,
		customerCount,
		topCustomers,
		statusSplit,
		trend,
		topUnit,
	}
}

function sum(ns: number[]): number {
	return ns.reduce((a, b) => a + b, 0)
}
