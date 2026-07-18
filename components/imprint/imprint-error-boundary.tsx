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
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-destructive/30 rounded-xl text-center bg-elevated/10">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm font-semibold text-primary">Unable to render Daily Imprint</p>
          {this.props.fallbackText && (
            <p className="text-xs text-muted mt-1 font-mono">{this.props.fallbackText}</p>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
