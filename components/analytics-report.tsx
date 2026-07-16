"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Download, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { computeAnalytics } from "@/lib/analytics"
import { KpiCard } from "./kpi-card"
import { TopCustomersChart, SalesTrendChart } from "./charts"
import { Panel } from "./ui/panel"
import { PRIMARY_BTN } from "@/lib/ui"
import type { NormalizedRow } from "@/lib/types"

type InsightsStatus = "idle" | "loading" | "error"

export function AnalyticsReport({
	rows,
	signedIn = false,
}: {
	rows: NormalizedRow[]
	signedIn?: boolean
}) {
	const [scope, setScope] = useState<"session" | "all">("session")
	const [allRows, setAllRows] = useState<NormalizedRow[] | null>(null)
	const [insights, setInsights] = useState<string[] | null>(null)
	const [status, setStatus] = useState<InsightsStatus>("idle")
	const [pdfBusy, setPdfBusy] = useState(false)
	const lastSig = useRef<string>("")

	useEffect(() => {
		if (scope !== "all" || allRows) return
		let active = true
		fetch("/api/entries")
			.then(async (r) => (r.ok ? r.json() : null))
			.then((d) => {
				if (active) setAllRows(d?.rows ?? [])
			})
			.catch(() => {
				if (active) setAllRows([])
			})
		return () => {
			active = false
		}
	}, [scope, allRows])

	const sourceRows = scope === "all" ? allRows ?? [] : rows
	const analytics = useMemo(() => computeAnalytics(sourceRows), [sourceRows])

	useEffect(() => {
		if (!sourceRows.length) return
		const sig = JSON.stringify(analytics)
		if (sig === lastSig.current) return
		lastSig.current = sig

		let cancelled = false
		setStatus("loading")
		fetch("/api/insights", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ metrics: analytics }),
		})
			.then(async (res) => {
				if (!res.ok) throw new Error("failed")
				const data = await res.json()
				if (!cancelled) {
					setInsights(Array.isArray(data.insights) ? data.insights : [])
					setStatus("idle")
				}
			})
			.catch(() => {
				if (!cancelled) setStatus("error")
			})

		return () => {
			cancelled = true
		}
	}, [analytics, sourceRows.length])

	async function handleDownloadPdf() {
		try {
			setPdfBusy(true)
			const { downloadReport } = await import("./report-pdf")
			await downloadReport(analytics, insights ?? [])
			toast.success("Report downloaded")
		} catch {
			toast.error("Couldn't generate the PDF")
		} finally {
			setPdfBusy(false)
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold text-primary">Business Report</h2>
					<p className="text-sm text-muted">A quick read on your sales</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					{signedIn ? (
						<div className="inline-flex rounded-btn border border-subtle bg-surface p-0.5 text-sm">
							<button
								onClick={() => setScope("session")}
								className={scope === "session" ? "rounded-[8px] bg-elevated px-3 py-1 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" : "px-3 py-1 text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[8px]"}
							>
								This session
							</button>
							<button
								onClick={() => setScope("all")}
								className={scope === "all" ? "rounded-[8px] bg-elevated px-3 py-1 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" : "px-3 py-1 text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-[8px]"}
							>
								All data
							</button>
						</div>
					) : null}
					<Button
						onClick={handleDownloadPdf}
						disabled={pdfBusy}
						className={PRIMARY_BTN}
					>
						{pdfBusy ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin text-accent-contrast" /> Preparing...
							</>
						) : (
							<>
								<Download className="mr-2 h-4 w-4" /> Download Report PDF
							</>
						)}
					</Button>
				</div>
			</div>


			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<KpiCard label="Total Sales" value={analytics.totalSales} format="inr" />
				<KpiCard label="Collected" value={analytics.collected} format="inr" />
				<KpiCard
					label="Outstanding"
					value={analytics.outstanding}
					format="inr"
					accent="pending"
				/>
				<KpiCard label="Orders" value={analytics.orderCount} format="int" />
			</div>

			<Panel>
				<div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
					<Sparkles className="h-4 w-4 text-accent" /> Key Points
				</div>
				{status === "loading" && (
					<div className="flex items-center gap-2 text-sm text-muted">
						<Loader2 className="h-4 w-4 animate-spin text-accent" /> Analyzing...
					</div>
				)}
				{status === "error" && (
					<p className="text-sm text-muted">
						Couldn&apos;t generate insights right now — the numbers above are still
						accurate.
					</p>
				)}
				{status === "idle" && insights && (
					<ul className="space-y-2">
						{insights.map((line, i) => (
							<li key={i} className="flex gap-2 text-sm text-secondary">
								<span className="text-accent">•</span>
								<span>{line}</span>
							</li>
						))}
					</ul>
				)}
			</Panel>

			<div className="grid gap-4 md:grid-cols-2">
				<ChartCard title="Top Customers">
					<TopCustomersChart data={analytics.topCustomers} />
				</ChartCard>
				<ChartCard title="Sales Trend">
					<SalesTrendChart data={analytics.trend} />
				</ChartCard>
			</div>
		</div>
	)
}

function ChartCard({
	title,
	children,
}: {
	title: string
	children: React.ReactNode
}) {
	return (
		<Panel>
			<h3 className="mb-4 text-sm font-medium text-primary">{title}</h3>
			{children}
		</Panel>
	)
}
