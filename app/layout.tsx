import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Fraunces } from "next/font/google"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
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

export const metadata: Metadata = {
	title: "Calorie Tracker — Log food, track macros, stay on target",
	description:
		"Track calories and macros through Telegram or the web. Powered by Gemini AI. Log a meal in seconds.",
}

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
	themeColor: "#0A0A0B",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="en"
			data-theme="dark"
			suppressHydrationWarning
			className={`dark ${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
		>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){try{var t=localStorage.getItem('logcals-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t;}else{document.documentElement.dataset.theme='dark';document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){document.documentElement.dataset.theme='dark';document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`,
					}}
				/>
			</head>
			<body className="font-sans antialiased">
				<ThemeProvider>
					<TooltipProvider>
						{children}
						<Toaster
							theme="dark"
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
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
