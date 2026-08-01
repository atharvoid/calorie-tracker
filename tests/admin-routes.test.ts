import { describe, it, expect, vi } from "vitest"
import fs from "fs"
import path from "path"
import { pathToFileURL } from "url"

// Mock auth module so it returns a normal signed-in non-admin user
vi.mock("@/auth", () => ({
	auth: vi.fn().mockResolvedValue({
		user: {
			id: "user-1",
			email: "non-admin@example.com",
		},
	}),
}))

function findRoutes(dir: string, fileList: string[] = []): string[] {
	if (!fs.existsSync(dir)) return fileList
	const files = fs.readdirSync(dir)
	for (const file of files) {
		const filePath = path.join(dir, file)
		if (fs.statSync(filePath).isDirectory()) {
			findRoutes(filePath, fileList)
		} else if (file === "route.ts" || file === "route.js") {
			fileList.push(filePath)
		}
	}
	return fileList
}

describe("Admin Route Guards Regression Test", () => {
	it("rejects non-admin users with 403 on all handlers under app/api/admin/", async () => {
		const adminDir = path.resolve("app/api/admin")
		const routes = findRoutes(adminDir)
		expect(routes.length).toBeGreaterThan(0)

		for (const routePath of routes) {
			const fileUrl = pathToFileURL(routePath).href
			const mod = await import(fileUrl)
			const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"]

			for (const method of methods) {
				if (typeof mod[method] === "function") {
					const req = new Request("http://localhost" + routePath.replace(/\\/g, "/"), { method })
					const res = await mod[method](req)
					expect(res.status).toBe(403)
				}
			}
		}
	})
})
