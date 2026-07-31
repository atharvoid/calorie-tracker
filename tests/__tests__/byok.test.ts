import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
	ByokError,
	decryptApiKey,
	encryptApiKey,
	isByokEnabled,
	keyFingerprint,
	looksLikeGoogleApiKey,
	secretsMatch,
} from "@/lib/byok"

/**
 * BYOK credential handling (issue #10, task B-14).
 *
 * These are user secrets held on someone else's behalf, so the failure modes
 * that matter are silent ones: an envelope that decrypts after tampering, or a
 * rotated BYOK_ENCRYPTION_KEY that returns garbage instead of raising. Both are
 * asserted here rather than assumed from the AES-GCM contract.
 *
 * lib/byok.ts reads process.env inside each call rather than at module load,
 * so swapping the key between tests is enough — no module registry reset.
 */

const KEY_A = Buffer.alloc(32, 0x11).toString("base64")
const KEY_B = Buffer.alloc(32, 0x22).toString("base64")
const SAMPLE_KEY = "AIzaSyDoNotUseThisItIsATestValue1234567"

let originalKey: string | undefined

beforeEach(() => {
	originalKey = process.env.BYOK_ENCRYPTION_KEY
	process.env.BYOK_ENCRYPTION_KEY = KEY_A
})

afterEach(() => {
	if (originalKey === undefined) {
		delete process.env.BYOK_ENCRYPTION_KEY
	} else {
		process.env.BYOK_ENCRYPTION_KEY = originalKey
	}
})

describe("envelope round-trip", () => {
	it("decrypts back to the original plaintext", () => {
		expect(decryptApiKey(encryptApiKey(SAMPLE_KEY))).toBe(SAMPLE_KEY)
	})

	it("trims surrounding whitespace before encrypting", () => {
		expect(decryptApiKey(encryptApiKey(`  ${SAMPLE_KEY}\n`))).toBe(SAMPLE_KEY)
	})

	it("produces the documented v1.<iv>.<tag>.<ciphertext> shape", () => {
		const parts = encryptApiKey(SAMPLE_KEY).split(".")
		expect(parts).toHaveLength(4)
		expect(parts[0]).toBe("v1")
		for (const part of parts.slice(1)) expect(part.length).toBeGreaterThan(0)
	})

	it("never stores the plaintext anywhere in the envelope", () => {
		expect(encryptApiKey(SAMPLE_KEY)).not.toContain(SAMPLE_KEY)
	})

	it("uses a fresh IV, so the same key encrypts to different envelopes", () => {
		expect(encryptApiKey(SAMPLE_KEY)).not.toBe(encryptApiKey(SAMPLE_KEY))
	})

	it("rejects an empty key", () => {
		expect(() => encryptApiKey("   ")).toThrow(ByokError)
	})
})

describe("tamper detection", () => {
	it("rejects a modified ciphertext via the GCM auth tag", () => {
		const [version, iv, tag, data] = encryptApiKey(SAMPLE_KEY).split(".")
		// Flip one character of the ciphertext.
		const flipped = (data[0] === "A" ? "B" : "A") + data.slice(1)
		expect(() => decryptApiKey([version, iv, tag, flipped].join("."))).toThrow(ByokError)
	})

	it("rejects a modified auth tag", () => {
		const [version, iv, tag, data] = encryptApiKey(SAMPLE_KEY).split(".")
		const flipped = (tag[0] === "A" ? "B" : "A") + tag.slice(1)
		expect(() => decryptApiKey([version, iv, flipped, data].join("."))).toThrow(ByokError)
	})

	it("rejects an envelope with the wrong number of segments", () => {
		expect(() => decryptApiKey("v1.only.three")).toThrow(ByokError)
	})

	it("rejects an unknown envelope version", () => {
		const envelope = encryptApiKey(SAMPLE_KEY).replace(/^v1\./, "v2.")
		expect(() => decryptApiKey(envelope)).toThrow(ByokError)
	})

	it("does not leak crypto internals in the error message", () => {
		const [version, iv, tag, data] = encryptApiKey(SAMPLE_KEY).split(".")
		const flipped = (data[0] === "A" ? "B" : "A") + data.slice(1)
		try {
			decryptApiKey([version, iv, tag, flipped].join("."))
			expect.unreachable("decryptApiKey should have thrown")
		} catch (error) {
			expect(error).toBeInstanceOf(ByokError)
			expect((error as ByokError).message).not.toMatch(/auth tag|unsupported state/i)
		}
	})
})

describe("encryption key handling", () => {
	it("rejects an envelope encrypted under a different BYOK_ENCRYPTION_KEY", () => {
		const envelope = encryptApiKey(SAMPLE_KEY)
		process.env.BYOK_ENCRYPTION_KEY = KEY_B
		expect(() => decryptApiKey(envelope)).toThrow(ByokError)
	})

	it("surfaces a decryption_failed code after rotation, not a crash", () => {
		const envelope = encryptApiKey(SAMPLE_KEY)
		process.env.BYOK_ENCRYPTION_KEY = KEY_B
		try {
			decryptApiKey(envelope)
			expect.unreachable("decryptApiKey should have thrown")
		} catch (error) {
			expect((error as ByokError).code).toBe("decryption_failed")
		}
	})

	it("refuses to operate when the key is not 32 bytes", () => {
		process.env.BYOK_ENCRYPTION_KEY = Buffer.alloc(16, 0x33).toString("base64")
		expect(() => encryptApiKey(SAMPLE_KEY)).toThrow(/32 bytes/)
	})

	it("reports BYOK as disabled when no key is configured", () => {
		delete process.env.BYOK_ENCRYPTION_KEY
		expect(isByokEnabled()).toBe(false)
		expect(() => encryptApiKey(SAMPLE_KEY)).toThrow(ByokError)
	})

	it("reports BYOK as enabled when a key is configured", () => {
		expect(isByokEnabled()).toBe(true)
	})
})

describe("key shape and display", () => {
	it("accepts a Google AI Studio key", () => {
		expect(looksLikeGoogleApiKey(SAMPLE_KEY)).toBe(true)
	})

	it("tolerates surrounding whitespace", () => {
		expect(looksLikeGoogleApiKey(`  ${SAMPLE_KEY}  `)).toBe(true)
	})

	it.each([
		["empty", ""],
		["wrong prefix", "sk-live-0123456789012345678901234567890123"],
		["too short", "AIzaShort"],
		["illegal characters", "AIza!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"],
	])("rejects a %s candidate", (_label, candidate) => {
		expect(looksLikeGoogleApiKey(candidate)).toBe(false)
	})

	it("exposes only the last four characters for display", () => {
		const fingerprint = keyFingerprint(SAMPLE_KEY)
		expect(fingerprint).toHaveLength(4)
		expect(SAMPLE_KEY.endsWith(fingerprint)).toBe(true)
	})
})

describe("secretsMatch", () => {
	it("matches identical secrets", () => {
		expect(secretsMatch("shared-secret", "shared-secret")).toBe(true)
	})

	it("rejects differing secrets of equal length", () => {
		expect(secretsMatch("shared-secreta", "shared-secretb")).toBe(false)
	})

	it("rejects a length mismatch without throwing", () => {
		expect(secretsMatch("short", "considerably-longer")).toBe(false)
	})

	it.each([
		["both missing", undefined, undefined],
		["left missing", undefined, "value"],
		["right missing", "value", undefined],
		["left empty", "", ""],
		["right null", "value", null],
	])("fails closed when %s", (_label, a, b) => {
		expect(secretsMatch(a as string | null | undefined, b as string | null | undefined)).toBe(false)
	})
})
