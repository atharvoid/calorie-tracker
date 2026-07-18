import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Calorie Tracker — Log food, track macros, stay on target",
  description: "Track calories and macros through Telegram or the web. Powered by Gemini AI. Log a meal in seconds.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0B",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
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
        </ThemeProvider>
      </body>
    </html>
  )
}
