import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Fraunces } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AppToaster } from "@/components/app-toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { headers } from "next/headers"
import "./globals.css"

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
})

// Expressive display face reserved for hero + onboarding headlines only —
// everyday UI keeps the Geist sans body font (see docs/UI_CHARACTER_REDESIGN_PLAN.md).
const fraunces = Fraunces({
	variable: "--font-fraunces",
	subsets: ["latin"],
	style: ["normal", "italic"],
})

const APP_NAME = "Calorie Tracker"
const APP_TITLE = "Calorie Tracker — Log food, track macros, stay on target"
const APP_DESCRIPTION =
	"Track calories and macros through Telegram or the web. Powered by Gemini AI. Log a meal in seconds."

// Without metadataBase, Next cannot resolve relative Open Graph image URLs and
// every shared link renders an empty preview card.
const APP_URL =
	process.env.NEXT_PUBLIC_APP_URL ||
	(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

export const metadata: Metadata = {
	metadataBase: new URL(APP_URL),
	title: APP_TITLE,
	description: APP_DESCRIPTION,
	applicationName: APP_NAME,
	robots: {
		index: true,
		follow: true,
	},
	openGraph: {
		type: "website",
		url: APP_URL,
		siteName: APP_NAME,
		title: APP_TITLE,
		description: APP_DESCRIPTION,
	},
	twitter: {
		card: "summary_large_image",
		title: APP_TITLE,
		description: APP_DESCRIPTION,
	},
}

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
	// A single value left the mobile browser chrome dark in light mode.
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
		{ media: "(prefers-color-scheme: dark)", color: "#0A0A0B" },
	],
}

/**
 * The theme is deliberately NOT hardcoded on <html> here.
 *
 * Previously this element shipped `className="dark"` and `data-theme="dark"`,
 * and the bootstrap script below then flipped it to light for light-mode
 * users — so every one of them saw a dark flash on first paint, with
 * `suppressHydrationWarning` hiding the evidence rather than the cause.
 *
 * The script runs before first paint, so letting it be the single source of
 * truth removes the flash in both directions.
 */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('logcals-theme');var m=(t==='light'||t==='dark')?t:'dark';var r=document.documentElement;r.dataset.theme=m;r.classList.toggle('dark',m==='dark');r.style.colorScheme=m;}catch(e){var r2=document.documentElement;r2.dataset.theme='dark';r2.classList.add('dark');r2.style.colorScheme='dark';}})();`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	const nonce = (await headers()).get("x-nonce") ?? undefined

	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
		>
			<head>
				<script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
			</head>
			<body className="font-sans antialiased">
				<ThemeProvider>
					<TooltipProvider>
						{children}
						<AppToaster />
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
