// Downscale an image file to a JPEG data URL (max edge ~1600px) for fast, small uploads.
export async function fileToScaledDataUrl(
	file: File,
	maxEdge = 1600,
	quality = 0.85
): Promise<string> {
	const dataUrl = await readAsDataUrl(file)
	const img = await loadImage(dataUrl)
	const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
	if (scale === 1) return dataUrl

	const canvas = document.createElement("canvas")
	canvas.width = Math.round(img.width * scale)
	canvas.height = Math.round(img.height * scale)
	const ctx = canvas.getContext("2d")
	if (!ctx) return dataUrl
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
	return canvas.toDataURL("image/jpeg", quality)
}

function readAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = reject
		reader.readAsDataURL(file)
	})
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = reject
		img.src = src
	})
}
