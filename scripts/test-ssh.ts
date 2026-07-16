import { spawn } from "child_process"

const lt = spawn(
	"ssh",
	[
		"-o", "StrictHostKeyChecking=no",
		"-o", "ServerAliveInterval=30",
		"-p", "443",
		"-R", "80:localhost:3000",
		"serveo.net"
	],
	{ shell: true }
)

lt.stdout.on("data", (data) => {
	console.log(`[STDOUT]: ${data.toString()}`)
})

lt.stderr.on("data", (data) => {
	console.log(`[STDERR]: ${data.toString()}`)
})

setTimeout(() => {
	console.log("Stopping test...")
	lt.kill()
	process.exit()
}, 8000)
