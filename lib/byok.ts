import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto"

/**
 * BYOK (bring your own key) credential handling.
 *
 * User-supplied AI API keys are secrets we hold on someone else's behalf, so
 * they are encrypted at rest with AES-256-GCM using a key that lives only in
 * the environment. The database never sees plaintext, and the plaintext is only
 * ever materialised inside a single request.
 *
 * Envelope format (single TEXT column):
 *   v1.<base64url iv>.<base64url authTag>.<base64url ciphertext>
 */

const ENVELOPE_VERSION = "v1"
const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12
const KEY_BYTES = 32

export class ByokError extends Error {
	readonly code: ByokErrorCode
	constructor(code: ByokErrorCode, message: string) {
		super(message)
		this.name = "ByokError"
		this.code = code
	}
}

export type ByokErrorCode =
	| "byok_disabled"
	| "invalid_key_format"
	| "key_verification_failed"
	| "decryption_failed"

/** True when the deployment is configured to accept user API keys. */
export function isByokEnabled(): boolean {
	return Boolean(process.env.BYOK_ENCRYPTION_KEY)
}

function encryptionKey(): Buffer {
	const raw = process.env.BYOK_ENCRYPTION_KEY
	if (!raw) {
		throw new ByokError(
			"byok_disabled",
			"BYOK_ENCRYPTION_KEY is not set, so bring-your-own-key is disabled."
		)
	}
	const key = Buffer.from(raw, "base64")
	if (key.length !== KEY_BYTES) {
		throw new ByokError(
			"byok_disabled",
			`BYOK_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes. Generate one with: openssl rand -base64 32`
		)
	}
	return key
}

/**
 * Shape check only — this does not prove the key works. Google AI Studio keys
 * are 39 characters starting with "AIza". We validate loosely so a future key
 * format change does not lock users out, then confirm with a live probe.
 */
export function looksLikeGoogleApiKey(candidate: string): boolean {
	return /^AIza[0-9A-Za-z_-]{30,60}$/.test(candidate.trim())
}

/** Last four characters, for showing the user which key is stored. */
export function keyFingerprint(apiKey: string): string {
	const trimmed = apiKey.trim()
	return trimmed.slice(-4)
}

export function encryptApiKey(apiKey: string): string {
	const plaintext = apiKey.trim()
	if (!plaintext) {
		throw new ByokError("invalid_key_format", "API key must not be empty.")
	}
	const iv = randomBytes(IV_BYTES)
	const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv)
	const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
	const authTag = cipher.getAuthTag()
	return [
		ENVELOPE_VERSION,
		iv.toString("base64url"),
		authTag.toString("base64url"),
		ciphertext.toString("base64url"),
	].join(".")
}

export function decryptApiKey(envelope: string): string {
	const parts = envelope.split(".")
	if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
		throw new ByokError("decryption_failed", "Stored API key envelope is malformed.")
	}
	const [, ivPart, tagPart, dataPart] = parts
	try {
		const decipher = createDecipheriv(
			ALGORITHM,
			encryptionKey(),
			Buffer.from(ivPart, "base64url")
		)
		decipher.setAuthTag(Buffer.from(tagPart, "base64url"))
		return Buffer.concat([
			decipher.update(Buffer.from(dataPart, "base64url")),
			decipher.final(),
		]).toString("utf8")
	} catch {
		// Do not leak crypto internals to the caller.
		throw new ByokError(
			"decryption_failed",
			"Stored API key could not be decrypted. It may have been encrypted with a different BYOK_ENCRYPTION_KEY."
		)
	}
}

/**
 * Constant-time comparison helper for webhook secrets and similar checks.
 * Returns false (rather than throwing) on length mismatch.
 */
export function secretsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
	if (!a || !b) return false
	const bufA = Buffer.from(a)
	const bufB = Buffer.from(b)
	if (bufA.length !== bufB.length) return false
	return timingSafeEqual(bufA, bufB)
}

/**
 * Live probe against the Gemini API. Confirms the key is real and enabled
 * before we store it, so users get an immediate error instead of a failure on
 * their first meal log.
 */
export async function verifyGoogleApiKey(apiKey: string): Promise<void> {
	if (!looksLikeGoogleApiKey(apiKey)) {
		throw new ByokError(
			"invalid_key_format",
			"That does not look like a Google AI Studio API key. Keys start with 'AIza'."
		)
	}

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 10_000)
	try {
		const response = await fetch(
			"https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
			{ headers: { "x-goog-api-key": apiKey.trim() }, signal: controller.signal }
		)
		if (!response.ok) {
			throw new ByokError(
				"key_verification_failed",
				"Google rejected that API key. Check that it is active and that the Generative Language API is enabled."
			)
		}
	} catch (error) {
		if (error instanceof ByokError) throw error
		throw new ByokError(
			"key_verification_failed",
			"Could not reach Google to verify that API key. Please try again."
		)
	} finally {
		clearTimeout(timeout)
	}
}
