"use client"

import React from "react"
import { AlertCircle } from "lucide-react"

interface Props {
	children: React.ReactNode
	fallbackText?: string
}

interface State {
	hasError: boolean
}

export class ImprintErrorBoundary extends React.Component<Props, State> {
	public state: State = {
		hasError: false,
	}

	public static getDerivedStateFromError(): State {
		return { hasError: true }
	}

	public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ImprintErrorBoundary caught an error:", error, errorInfo)
	}

	public render() {
		if (this.state.hasError) {
			return (
				<div className="border-destructive/30 bg-elevated/10 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center">
					<AlertCircle className="text-destructive mb-2 h-8 w-8" />
					<p className="text-primary text-sm font-semibold">Unable to render Daily Imprint</p>
					{this.props.fallbackText && (
						<p className="text-muted mt-1 font-mono text-xs">{this.props.fallbackText}</p>
					)}
				</div>
			)
		}

		return this.props.children
	}
}
