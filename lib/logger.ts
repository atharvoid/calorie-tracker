type LogMetadata = {
	requestId?: string
	[key: string]: unknown
}

function serializeError(err: Error): Record<string, unknown> {
	const serialized: Record<string, unknown> = {
		name: err.name,
		message: err.message,
		stack: err.stack,
	}
	// Copy any custom enumerable properties attached to the Error object
	for (const key of Object.keys(err)) {
		serialized[key] = (err as unknown as Record<string, unknown>)[key]
	}
	return serialized
}

function normalizeValue(val: unknown): unknown {
	if (val instanceof Error) {
		return serializeError(val)
	}
	if (val && typeof val === "object" && !Array.isArray(val)) {
		const result: Record<string, unknown> = {}
		for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
			result[k] = normalizeValue(v)
		}
		return result
	}
	return val
}

function formatLog(level: "info" | "warn" | "error", message: string, meta?: LogMetadata) {
	const normalizedMeta = meta ? (normalizeValue(meta) as Record<string, unknown>) : {}
	return {
		timestamp: new Date().toISOString(),
		level,
		message,
		...normalizedMeta,
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
