"use client"

import { useCallback, useEffect, useState } from "react"
import { KeyRound, Loader2, ShieldCheck, Trash2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Panel } from "@/components/ui/panel"
import { Button } from "@/components/ui/button"

type ByokStatus = {
	enabled: boolean
	hasKey: boolean
	keyLast4: string | null
	accessState: string
}

type Props = {
	onChanged?: () => void
}

export function ByokPanel({ onChanged }: Props) {
	const [status, setStatus] = useState<ByokStatus | null>(null)
	const [loading, setLoading] = useState(true)
	const [apiKey, setApiKey] = useState("")
	const [saving, setSaving] = useState(false)
	const [removing, setRemoving] = useState(false)

	const load = useCallback(async () => {
		try {
			const res = await fetch("/api/byok")
			if (res.ok) setStatus(await res.json())
		} catch {
			// silent — treated as "not available"
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load()
	}, [load])

	async function handleSave() {
		const trimmed = apiKey.trim()
		if (!trimmed) {
			toast.error("Enter an API key first")
			return
		}
		setSaving(true)
		try {
			const res = await fetch("/api/byok", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ apiKey: trimmed }),
			})
			const data = await res.json()
			if (!res.ok) throw new Error(data.error || "Could not verify that key")
			setApiKey("")
			toast.success("Key verified — your meal logs are now free and unlimited")
			await load()
			onChanged?.()
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Could not save that key")
		} finally {
			setSaving(false)
		}
	}

	async function handleRemove() {
		setRemoving(true)
		try {
			const res = await fetch("/api/byok", { method: "DELETE" })
			if (!res.ok) throw new Error("Could not remove key")
			toast.success("API key removed")
			await load()
			onChanged?.()
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Could not remove key")
		} finally {
			setRemoving(false)
		}
	}

	if (loading) {
		return (
			<Panel className="flex h-32 items-center justify-center">
				<Loader2 className="text-accent h-5 w-5 animate-spin" />
			</Panel>
		)
	}

	// Deployment has no BYOK_ENCRYPTION_KEY configured — hide the feature
	// rather than showing a form that will always fail.
	if (!status?.enabled) return null

	return (
		<Panel>
			<h2 className="text-primary mb-1 flex items-center gap-2 text-base font-bold">
				<KeyRound className="text-accent h-4.5 w-4.5" />
				Bring Your Own Key
			</h2>
			<p className="text-muted mb-3 text-xs leading-relaxed">
				Add your own free Google AI Studio API key and log meals with no trial limit, no daily cap,
				and no subscription — billed directly (and for free, within Google's generous quota) to your
				own account.
			</p>

			{status.hasKey ? (
				<div className="flex flex-wrap items-center gap-3">
					<span className="border-subtle bg-elevated text-secondary inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold">
						<ShieldCheck className="text-accent h-3.5 w-3.5" />
						Key saved •••• {status.keyLast4}
					</span>
					<button
						onClick={handleRemove}
						disabled={removing}
						className="border-danger/25 bg-danger/5 text-danger hover:bg-danger/10 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
					>
						{removing ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Trash2 className="h-3.5 w-3.5" />
						)}
						Remove key
					</button>
				</div>
			) : (
				<div className="space-y-3">
					<div className="flex flex-col gap-2 sm:flex-row">
						<input
							type="password"
							autoComplete="off"
							placeholder="AIza…"
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							className="border-subtle bg-elevated text-primary placeholder:text-muted focus:ring-accent w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
						/>
						<Button
							onClick={handleSave}
							disabled={saving}
							className="flex shrink-0 cursor-pointer items-center justify-center gap-2"
						>
							{saving && <Loader2 className="h-4 w-4 animate-spin" />}
							{saving ? "Verifying…" : "Verify & Save"}
						</Button>
					</div>
					<a
						href="https://aistudio.google.com/apikey"
						target="_blank"
						rel="noreferrer"
						className="text-accent inline-flex items-center gap-1 text-xs font-semibold hover:underline"
					>
						Get a free key from Google AI Studio <ExternalLink className="h-3 w-3" />
					</a>
				</div>
			)}
		</Panel>
	)
}
