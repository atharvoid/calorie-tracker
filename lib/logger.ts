type LogMetadata = {
	requestId?: string
	[key: string]: unknown
}

function formatLog(level: "info" | "warn" | "error", message: string, meta?: LogMetadata) {
	return {
		timestamp: new Date().toISOString(),
		level,
		message,
		...meta,
	}
}

export const logger = {
	info: (message: string, meta?: LogMetadata) => {
		const entry = formatLog("info", message, meta)
		// eslint-disable-next-line no-console
		console.log(JSON.stringify(entry))
	},
	warn: (message: string, meta?: LogMetadata) => {
		const entry = formatLog("warn", message, meta)
		console.warn(JSON.stringify(entry))
	},
	error: (message: string, meta?: LogMetadata) => {
		const entry = formatLog("error", message, meta)
		console.error(JSON.stringify(entry))
	},
}
