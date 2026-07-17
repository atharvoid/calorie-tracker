import { auth, signIn } from "@/auth"
import { SECONDARY_BTN, GHOST_BTN } from "@/lib/ui"
import { cn } from "@/lib/utils"
import { signOutAction } from "./auth-actions"

async function doSignIn() {
	"use server"
	await signIn("google", { redirectTo: "/" })
}

export async function AuthButton() {
	const session = await auth()

	if (!session?.user) {
		return (
			<form action={doSignIn}>
				<button
					type="submit"
					className={cn("rounded-btn px-3.5 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap", SECONDARY_BTN)}
				>
					<span className="hidden min-[360px]:inline">Sign in with Google</span>
					<span className="inline min-[360px]:hidden">Sign In</span>
				</button>
			</form>
		)
	}

	return (
		<div className="flex items-center gap-3">
			{session.user.image ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={session.user.image}
					alt={session.user.name ?? ""}
					title={session.user.name ?? session.user.email ?? ""}
					className="h-8 w-8 rounded-full border border-subtle ring-1 ring-accent/20"
				/>
			) : (
				<div className="flex h-8 w-8 items-center justify-center rounded-full border border-subtle bg-elevated text-xs font-medium text-primary">
					{(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
				</div>
			)}
			<div className="hidden flex-col sm:flex">
				<span className="text-xs font-medium text-primary leading-none">
					{session.user.name}
				</span>
				<span className="mt-0.5 text-xs text-muted leading-none">
					{session.user.email}
				</span>
			</div>
			<form action={signOutAction}>
				<button
					type="submit"
					className={cn("text-xs px-2 py-1 rounded", GHOST_BTN)}
				>
					Sign out
				</button>
			</form>
		</div>
	)
}
