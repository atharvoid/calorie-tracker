"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Panel } from "@/components/ui/panel"
import { Button } from "@/components/ui/button"
import type { UserProfileDTO } from "@/lib/nutrition-types"

type Props = {
	profile: UserProfileDTO
}

export function SettingsView({ profile }: Props) {
	const router = useRouter()
	const [signingOut, setSigningOut] = useState(false)

	async function handleSignOut() {
		setSigningOut(true)
		try {
			await fetch("/api/auth/signout", { method: "POST" })
			router.push("/")
			router.refresh()
		} catch {
			toast.error("Couldn't sign out")
			setSigningOut(false)
		}
	}

	return (
		<div className="space-y-4">
			<Panel className="space-y-1">
				<h2 className="text-primary text-sm font-bold">Account</h2>
				<p className="text-secondary text-sm">{profile.email}</p>
			</Panel>

			<Panel className="space-y-3">
				<h2 className="text-primary text-sm font-bold">Plan</h2>
				<p className="text-secondary text-sm">You're on the free plan.</p>
				<div className="flex gap-2">
					<Button variant="secondary" size="sm" disabled>
						Upgrade to Pro
					</Button>
					<Button variant="ghost" size="sm" disabled>
						Manage Billing
					</Button>
				</div>
				<p className="text-muted text-2xs leading-relaxed">
					Plan management is coming soon. Your data stays free to export at any time.
				</p>
			</Panel>

			<Panel>
				<Button variant="danger" size="sm" onClick={handleSignOut} disabled={signingOut}>
					{signingOut ? "Signing out…" : "Sign out"}
				</Button>
			</Panel>
		</div>
	)
}
