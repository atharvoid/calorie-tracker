"use client"

import { LogOut, UserRound } from "lucide-react"

import { signOutAction } from "@/components/auth-actions"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet"

type MobileUserSheetProps = {
	user: {
		name?: string | null
		email?: string | null
		image?: string | null
	}
}

export function MobileUserSheet({ user }: MobileUserSheetProps) {
	const displayName = user.name || "Your account"
	const initial = (user.name ?? user.email ?? "?")[0].toUpperCase()

	return (
		<Sheet>
			<SheetTrigger
				className="focus-visible:ring-accent flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full transition-transform ease-premium active:scale-95 focus-visible:ring-2 focus-visible:outline-none"
				aria-label="Open account menu"
			>
				{user.image ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={user.image}
						alt=""
						className="border-subtle ring-accent/20 h-8 w-8 rounded-full border object-cover ring-1"
					/>
				) : (
					<div className="border-subtle bg-elevated text-primary flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold">
						{initial}
					</div>
				)}
			</SheetTrigger>

			<SheetContent className="pb-[calc(20px+env(safe-area-inset-bottom))]">
				<SheetHeader>
					<div className="bg-accent/10 text-accent mb-1 flex h-10 w-10 items-center justify-center rounded-full">
						<UserRound className="h-5 w-5" />
					</div>
					<SheetTitle>{displayName}</SheetTitle>
					<SheetDescription className="break-all">{user.email || "Signed in"}</SheetDescription>
				</SheetHeader>

				<div className="border-subtle bg-elevated/40 rounded-xl border p-4">
					<p className="text-primary text-sm font-semibold">Account</p>
					<p className="text-muted mt-1 text-xs leading-relaxed">
						Your nutrition history and settings stay connected to this signed-in account.
					</p>
				</div>

				<SheetFooter>
					<form action={signOutAction} className="w-full">
						<button
							type="submit"
							className="border-danger/20 bg-danger/5 text-danger hover:bg-danger/10 focus-visible:ring-danger flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ease-premium focus-visible:ring-2 focus-visible:outline-none"
						>
							<LogOut className="h-4 w-4" />
							Sign out
						</button>
					</form>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}
