"use client"

import { Toaster } from "sonner"
import { useTheme } from "@/components/theme-provider"

/**
 * The Toaster was previously hardcoded to `theme="dark"` in the root layout,
 * so toasts stayed dark for light-mode users. Sonner needs the resolved theme
 * as a prop, and the root layout is a server component, so this thin client
 * wrapper is the smallest correct place to read it.
 */
export function AppToaster() {
	const { theme } = useTheme()

	return (
		<Toaster
			theme={theme}
			position="bottom-right"
			richColors
			toastOptions={{
				style: {
					background: "var(--bg-elevated)",
					border: "1px solid var(--border-default)",
					color: "var(--text-primary)",
				},
			}}
		/>
	)
}
