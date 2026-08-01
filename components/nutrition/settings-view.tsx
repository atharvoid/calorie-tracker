"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Save, CreditCard, Send, Download, LogOut } from "lucide-react"
import { toast } from "sonner"
import { Panel } from "@/components/ui/panel"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { ConnectTelegram } from "../connect-telegram"
import { signOutAction } from "../auth-actions"
import { ByokPanel } from "./byok-panel"
import { MONTHLY_PLAN_OPTION, TRIAL_DAYS, type BillingPlan } from "@/lib/pricing"

type EntitlementStatus = {
	accessState:
		| "pre_trial"
		| "trial"
		| "byok"
		| "active"
		| "grace"
		| "trial_ended"
		| "quota_exhausted"
		| "blocked"
	trialStartedAt: string | null
	trialEndsAt: string | null
	trialAiLogsUsed: number
	trialAiLogLimit: number
	paidAiLogsToday: number
	paidAiLogDate: string | null
	subscriptionStatus: string | null
	subscriptionEnd: string | null
}

type Settings = {
	maintenanceKcal: number | null
	targetKcal: number | null
	proteinTargetG: string | number | null
	carbsTargetG: string | number | null
	fatTargetG: string | number | null
	targetToleranceKcal: number | null
	timezone: string
}

type ApiResponse = { settings: Settings | null }

const TIMEZONES = [
	"Asia/Kolkata",
	"UTC",
	"America/New_York",
	"America/Los_Angeles",
	"Europe/London",
]

function parseNum(v: string | number | null | undefined): number | null {
	if (v === null || v === undefined || v === "") return null
	const n = Number(v)
	return Number.isFinite(n) ? n : null
}

type Props = {
	refreshKey?: number
}

export function SettingsView({ refreshKey }: Props) {
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [exporting, setExporting] = useState(false)
	const [form, setForm] = useState<{
		maintenanceKcal: string
		targetKcal: string
		proteinTargetG: string
		timezone: string
	}>({
		maintenanceKcal: "",
		targetKcal: "",
		proteinTargetG: "",
		timezone: "Asia/Kolkata",
	})

	const [billing, setBilling] = useState<EntitlementStatus | null>(null)
	const [billingLoading, setBillingLoading] = useState(true)
	const [actionLoading, setActionLoading] = useState(false)

	const loadBilling = useCallback(async () => {
		try {
			const res = await fetch("/api/billing/status")
			if (res.ok) {
				const data = await res.json()
				setBilling(data)
			}
		} catch (e) {
			console.error("Failed to load billing status", e)
		} finally {
			setBillingLoading(false)
		}
	}, [])

	useEffect(() => {
		void loadBilling()
	}, [loadBilling])

	async function handleUpgrade(plan: BillingPlan) {
		setActionLoading(true)
		try {
			const res = await fetch("/api/billing/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ plan }),
			})
			const data = await res.json()
			if (data.url) {
				window.location.href = data.url
			} else {
				toast.error(data.error || "Failed to trigger checkout")
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to upgrade")
		} finally {
			setActionLoading(false)
		}
	}

	async function handleManage() {
		setActionLoading(true)
		try {
			const res = await fetch("/api/billing/portal", {
				method: "POST",
			})
			const data = await res.json()
			if (data.url) {
				window.location.href = data.url
			} else {
				toast.error(data.error || "Failed to trigger portal")
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to load portal")
		} finally {
			setActionLoading(false)
		}
	}

	const load = useCallback(async (silent = false) => {
		if (!silent) setLoading(true)
		try {
			const res = await fetch("/api/nutrition/settings")
			if (!res.ok) return
			const json = (await res.json()) as ApiResponse
			const s = json.settings
			if (s) {
				setForm({
					maintenanceKcal: s.maintenanceKcal !== null ? String(s.maintenanceKcal) : "",
					targetKcal: s.targetKcal !== null ? String(s.targetKcal) : "",
					proteinTargetG: s.proteinTargetG !== null ? String(parseNum(s.proteinTargetG) ?? "") : "",
					timezone: s.timezone ?? "Asia/Kolkata",
				})
			}
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load()
	}, [load])

	useEffect(() => {
		if (refreshKey !== undefined && refreshKey > 0) {
			void load(true)
			void loadBilling()
		}
	}, [refreshKey, load, loadBilling])

	async function handleSave() {
		const maintenance = parseNum(form.maintenanceKcal)
		const target = parseNum(form.targetKcal)
		const protein = parseNum(form.proteinTargetG)

		if (maintenance !== null && (maintenance < 800 || maintenance > 8000)) {
			toast.error("Maintenance calories must be between 800 and 8000")
			return
		}
		if (target !== null && (target < 800 || target > 8000)) {
			toast.error("Target calories must be between 800 and 8000")
			return
		}

		setSaving(true)
		try {
			const res = await fetch("/api/nutrition/settings", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					maintenanceKcal: maintenance,
					targetKcal: target,
					proteinTargetG: protein,
					timezone: form.timezone,
				}),
			})
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
				throw new Error(body?.error?.message ?? "Save failed")
			}
			toast.success("Settings saved")
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Save failed")
		} finally {
			setSaving(false)
		}
	}

	const handleExportData = async () => {
		setExporting(true)
		try {
			const todayStr = new Date().toISOString().split("T")[0]
			const start = new Date()
			start.setDate(start.getDate() - 365)
			const startStr = start.toISOString().split("T")[0]

			const res = await fetch(
				`/api/nutrition/history?start=${startStr}&end=${todayStr}&sort=oldest&status=logged`
			)
			if (!res.ok) throw new Error("Export failed")
			const json = await res.json()

			const blob = new Blob([JSON.stringify(json.summaries, null, 2)], { type: "application/json" })
			const url = URL.createObjectURL(blob)
			const a = document.createElement("a")
			a.href = url
			a.download = `calorie_tracker_export_${todayStr}.json`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
			toast.success("Meal history exported successfully")
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to export data")
		} finally {
			setExporting(false)
		}
	}

	const maintenance = parseNum(form.maintenanceKcal)
	const target = parseNum(form.targetKcal)
	const diff = maintenance !== null && target !== null ? target - maintenance : null

	if (loading) {
		return (
			<Panel className="flex h-48 items-center justify-center">
				<Loader2 className="text-accent h-5 w-5 animate-spin" />
			</Panel>
		)
	}

	return (
		<div className="mx-auto max-w-xl space-y-6">
			{/* Nutrition Goals Section */}
			<Panel>
				<h2 className="text-primary mb-1 text-base font-bold">Nutrition Goals</h2>
				<p className="text-muted mb-4 text-xs leading-relaxed">
					Maintenance is your reference intake (energy balance). Target is your planned daily
					intake.
					<br />
					<span className="italic">This is not medical advice.</span>
				</p>

				<div className="space-y-4">
					{/* Maintenance kcal */}
					<div>
						<label
							className="text-secondary mb-1.5 block text-xs font-semibold"
							htmlFor="maintenance"
						>
							Maintenance calories
						</label>
						<div className="relative flex items-center">
							<input
								id="maintenance"
								type="number"
								inputMode="numeric"
								min={800}
								max={8000}
								placeholder="e.g. 2200"
								value={form.maintenanceKcal}
								onChange={(e) => setForm({ ...form, maintenanceKcal: e.target.value })}
								className="border-subtle bg-elevated text-primary placeholder:text-muted focus:ring-accent w-full rounded-lg border py-2 pr-20 pl-3 text-base focus:ring-2 focus:outline-none"
							/>
							<span className="text-muted pointer-events-none absolute right-3 text-xs font-medium">
								kcal / day
							</span>
						</div>
					</div>

					{/* Target kcal */}
					<div>
						<label className="text-secondary mb-1.5 block text-xs font-semibold" htmlFor="target">
							Target calories
						</label>
						<div className="relative flex items-center">
							<input
								id="target"
								type="number"
								inputMode="numeric"
								min={800}
								max={8000}
								placeholder="e.g. 1900"
								value={form.targetKcal}
								onChange={(e) => setForm({ ...form, targetKcal: e.target.value })}
								className="border-subtle bg-elevated text-primary placeholder:text-muted focus:ring-accent w-full rounded-lg border py-2 pr-20 pl-3 text-base focus:ring-2 focus:outline-none"
							/>
							<span className="text-muted pointer-events-none absolute right-3 text-xs font-medium">
								kcal / day
							</span>
						</div>
					</div>

					{/* Live preview */}
					{diff !== null && (
						<p className="text-secondary px-1 text-xs font-medium">
							{diff < 0
								? `Target is ${Math.abs(diff)} kcal below maintenance (deficit goal)`
								: diff > 0
									? `Target is ${diff} kcal above maintenance (surplus goal)`
									: "Target equals maintenance (maintenance goal)"}
						</p>
					)}

					{/* Protein target (optional) */}
					<div>
						<label className="text-secondary mb-1.5 block text-xs font-semibold" htmlFor="protein">
							Protein target (optional)
						</label>
						<div className="relative flex items-center">
							<input
								id="protein"
								type="number"
								inputMode="numeric"
								min={0}
								max={500}
								placeholder="e.g. 140"
								value={form.proteinTargetG}
								onChange={(e) => setForm({ ...form, proteinTargetG: e.target.value })}
								className="border-subtle bg-elevated text-primary placeholder:text-muted focus:ring-accent w-full rounded-lg border py-2 pr-20 pl-3 text-base focus:ring-2 focus:outline-none"
							/>
							<span className="text-muted pointer-events-none absolute right-3 text-xs font-medium">
								g / day
							</span>
						</div>
					</div>

					<div className="pt-2">
						<Button
							onClick={handleSave}
							disabled={saving}
							className="flex w-full cursor-pointer items-center justify-center gap-2 md:w-auto"
						>
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
							{saving ? "Saving…" : "Save Goals"}
						</Button>
					</div>
				</div>
			</Panel>

			{/* Daily Preferences Section */}
			<Panel>
				<h2 className="text-primary mb-1 text-base font-bold">Daily Preferences</h2>
				<p className="text-muted mb-4 text-xs">
					Configure default timezone settings for meal log timestamp alignment.
				</p>

				<div className="space-y-4">
					<div>
						<label className="text-secondary mb-1.5 block text-xs font-semibold" htmlFor="timezone">
							Timezone
						</label>
						<select
							id="timezone"
							value={form.timezone}
							onChange={(e) => setForm({ ...form, timezone: e.target.value })}
							className="border-subtle bg-elevated text-primary focus:ring-accent w-full animate-none rounded-lg border px-3 py-2 text-base focus:ring-2 focus:outline-none"
						>
							{TIMEZONES.map((tz) => (
								<option key={tz} value={tz}>
									{tz}
								</option>
							))}
						</select>
					</div>

					<div className="pt-2">
						<Button
							onClick={handleSave}
							disabled={saving}
							className="flex w-full cursor-pointer items-center justify-center gap-2 md:w-auto"
						>
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
							{saving ? "Saving…" : "Save Preferences"}
						</Button>
					</div>
				</div>
			</Panel>

			{/* Bring Your Own Key Section */}
			<ByokPanel onChanged={loadBilling} />

			{/* Telegram Connection Section */}
			<Panel>
				<h2 className="text-primary mb-1 flex items-center gap-2 text-base font-bold">
					<Send className="text-accent h-4.5 w-4.5" />
					Telegram Bot Log
				</h2>
				<p className="text-muted mb-3 text-xs leading-relaxed">
					Connect your Telegram account to log meals by sending a message to the bot. Once
					connected, use <code className="text-accent">/setkey</code> in the chat to add your own
					API key there too.
				</p>
				<ConnectTelegram />
			</Panel>

			{/* Subscription & Billing Section */}
			<Panel className="flex flex-col gap-4">
				<div>
					<h2 className="text-primary flex items-center gap-2 text-base font-bold">
						<CreditCard className="text-accent h-4.5 w-4.5" />
						Subscription & Billing
					</h2>
					<p className="text-secondary mt-1 text-xs">
						Manage your active plans, usage counts, and upgrades.
					</p>
				</div>

				{billingLoading ? (
					<div className="flex justify-center p-4">
						<Loader2 className="text-muted h-5 w-5 animate-spin" />
					</div>
				) : billing ? (
					<div className="text-secondary space-y-4 text-sm">
						<div className="border-subtle flex items-center justify-between border-b pb-3">
							<span>Status</span>
							<span className="text-primary font-bold capitalize">
								{billing.accessState.replace(/_/g, " ")}
							</span>
						</div>

						{/*
						 * This previously promised the trial "begins automatically when you log
						 * your first meal". The trial is moving behind a card-capture checkout,
						 * so that sentence was about to become false. It now states the fact
						 * (not started) without promising how it starts.
						 */}
						{billing.accessState === "pre_trial" && (
							<p className="text-muted text-xs leading-relaxed">
								Your {TRIAL_DAYS}-day trial has not started yet.
							</p>
						)}

						{billing.accessState === "byok" && (
							<p className="text-accent text-xs leading-relaxed font-semibold">
								You&apos;re logging with your own API key — unlimited and free, forever. No
								subscription needed.
							</p>
						)}

						{billing.accessState === "trial" && (
							<div className="space-y-2">
								<div className="flex justify-between text-xs font-semibold">
									<span>Trial usage</span>
									<span className="text-primary">
										{billing.trialAiLogsUsed} of {billing.trialAiLogLimit} meal logs used
									</span>
								</div>
								{billing.trialEndsAt && (
									<p className="text-muted text-xs">
										Your trial ends on {new Date(billing.trialEndsAt).toLocaleDateString()}
									</p>
								)}
							</div>
						)}

						{(billing.accessState === "trial_ended" ||
							billing.accessState === "quota_exhausted") && (
							<p className="text-danger text-xs leading-relaxed font-semibold">
								Your trial is complete. Your meal history is still available. Add your own API key
								above for free unlimited logging, or upgrade to keep using ours.
							</p>
						)}

						{(billing.accessState === "trial_ended" ||
							billing.accessState === "quota_exhausted" ||
							billing.accessState === "pre_trial" ||
							billing.accessState === "trial") && (
							<div className="space-y-3 pt-2">
								<button
									disabled={actionLoading}
									onClick={() => handleUpgrade(MONTHLY_PLAN_OPTION.plan)}
									className="rounded-btn bg-accent hover:bg-accent-hover w-full cursor-pointer px-4 py-2.5 text-center text-xs font-bold text-[color:var(--accent-contrast)] shadow-sm transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
								>
									{MONTHLY_PLAN_OPTION.label} — {MONTHLY_PLAN_OPTION.priceLabel}
								</button>
								<p className="text-muted text-2xs text-center leading-relaxed">
									Includes unlimited meal logging on the web, 25 AI Telegram logs a day, custom
									targets, and full data export. Or add your own API key above to skip payment
									entirely.
								</p>
							</div>
						)}

						{(billing.accessState === "active" || billing.accessState === "grace") && (
							<div className="space-y-3">
								<div className="flex items-center justify-between text-xs font-semibold">
									<span>Active subscription status:</span>
									<span className="text-accent font-bold uppercase">
										{billing.subscriptionStatus}
									</span>
								</div>
								{billing.subscriptionEnd && (
									<div className="flex items-center justify-between text-xs">
										<span>Renewal date:</span>
										<span>{new Date(billing.subscriptionEnd).toLocaleDateString()}</span>
									</div>
								)}
								<button
									disabled={actionLoading}
									onClick={handleManage}
									className="rounded-btn border-subtle bg-elevated text-primary hover:bg-surface w-full cursor-pointer border px-4 py-2.5 text-center text-xs font-bold transition-colors focus:outline-none"
								>
									Manage Subscription
								</button>
							</div>
						)}
					</div>
				) : (
					<p className="text-danger text-xs">Failed to load billing status.</p>
				)}
			</Panel>

			{/* Account and Data Section (Separate Destructive Action Section) */}
			<Panel className="flex flex-col gap-4">
				<div>
					<h2 className="text-primary text-base font-bold">Account & Data</h2>
					<p className="text-secondary mt-1 text-xs">
						Export your meal records or sign out of your tracker account.
					</p>
				</div>
				<div className="flex flex-col gap-3 pt-2">
					<button
						onClick={handleExportData}
						disabled={exporting}
						className="rounded-btn border-subtle bg-elevated text-primary hover:bg-surface flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 border px-4 py-2.5 text-center text-xs font-bold transition-colors focus:outline-none"
					>
						{exporting ? (
							<Loader2 className="text-muted h-4 w-4 animate-spin" />
						) : (
							<Download className="h-4 w-4" />
						)}
						{exporting ? "Exporting…" : "Export Logged Meals (JSON)"}
					</button>

					<Dialog>
						<DialogTrigger className="rounded-btn border-danger/25 bg-danger/5 text-danger hover:bg-danger/10 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 border px-4 py-2.5 text-center text-xs font-bold transition-colors focus:outline-none">
							<LogOut className="h-4 w-4" />
							Sign Out
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Sign out?</DialogTitle>
								<DialogDescription>
									You&apos;ll need to sign back in to log meals or view your history.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<DialogClose className="rounded-btn border-subtle bg-elevated text-primary hover:bg-surface cursor-pointer border px-4 py-2.5 text-center text-xs font-bold transition-colors focus:outline-none">
									Cancel
								</DialogClose>
								<form action={signOutAction}>
									<button
										type="submit"
										className="rounded-btn border-danger/25 bg-danger/5 text-danger hover:bg-danger/10 flex w-full cursor-pointer items-center justify-center gap-1.5 border px-4 py-2.5 text-center text-xs font-bold transition-colors focus:outline-none"
									>
										<LogOut className="h-4 w-4" />
										Sign Out
									</button>
								</form>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</Panel>
		</div>
	)
}
