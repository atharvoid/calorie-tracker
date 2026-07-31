"use server"

import { signIn, signOut } from "@/auth"

/**
 * Starts the Google OAuth flow and lands the user on their day view.
 *
 * This previously lived inline in `app/page.tsx` as a `"use server"` function
 * declared inside the component file, duplicated across the hero and pricing
 * call-to-action forms.
 */
export async function signInAction() {
	await signIn("google", { redirectTo: "/?tab=today" })
}

export async function signOutAction() {
	await signOut({ redirectTo: "/" })
}
