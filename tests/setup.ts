import "@testing-library/jest-dom/vitest"

class MockIntersectionObserver implements IntersectionObserver {
	readonly root: Element | null = null
	readonly rootMargin: string = ""
	readonly thresholds: ReadonlyArray<number> = []
	disconnect = () => {}
	observe = () => {}
	takeRecords = () => []
	unobserve = () => {}
}

Object.defineProperty(window, "IntersectionObserver", {
	writable: true,
	configurable: true,
	value: MockIntersectionObserver,
})

Object.defineProperty(global, "IntersectionObserver", {
	writable: true,
	configurable: true,
	value: MockIntersectionObserver,
})
