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
	for (const key of Object.keys(err)) {
		serialized[key] = (err as unknown as Record<string, unknown>)[key]
	}
	return serialized
}

function normalizeValue(val: unknown, seen = new WeakSet<object>()): unknown {
	if (val instanceof Error) {
		return serializeError(val)
	}
	if (val && typeof val === "object") {
		if (seen.has(val)) {
			return "[Circular]"
		}
		seen.add(val)

		if (Array.isArray(val)) {
			return val.map((item) => normalizeValue(item, seen))
		}

		const result: Record<string, unknown> = {}
		for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
			result[k] = normalizeValue(v, seen)
		}
		return result
	}
	return val
}

function formatLog(level: "info" | "warn" | "error", message: string, meta?: LogMetadata) {
	const normalizedMeta = meta
		? (normalizeValue(meta, new WeakSet<object>()) as Record<string, unknown>)
		: {}
	return {
		timestamp: new Date().toISOString(),
		level,
		message,
		...normalizedMeta,
	}
}

function safeWriteLog(level: "info" | "warn" | "error", message: string, meta?: LogMetadata) {
	try {
		const entry = formatLog(level, message, meta)
		const json = JSON.stringify(entry)
		if (level === "error") {
			console.error(json)
		} else if (level === "warn") {
			console.warn(json)
		} else {
			// eslint-disable-next-line no-console
			console.log(json)
		}
	} catch (err) {
		// Fall back to plain console.error if serialization fails so logging never crashes
		console.error(`[LOGGER_FALLBACK] [${level.toUpperCase()}] ${message}`, err)
	}
}

export const logger = {
	info: (message: string, meta?: LogMetadata) => safeWriteLog("info", message, meta),
	warn: (message: string, meta?: LogMetadata) => safeWriteLog("warn", message, meta),
	error: (message: string, meta?: LogMetadata) => safeWriteLog("error", message, meta),
}
