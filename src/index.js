import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { hostname } from "node:os";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));

logging.set_level(logging.NONE);
Object.assign(wisp.options, {
	allow_udp_streams: false,
	allow_private_ips: false,
	allow_loopback_ips: false,
	dns_servers: ["1.1.1.1", "1.0.0.1"],
});

const fastify = Fastify({
	logger: process.env.NODE_ENV !== "production",
	serverFactory: (handler) =>
		createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				res.setHeader("X-Content-Type-Options", "nosniff");
				res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url?.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
				else socket.end();
			}),
});

fastify.get("/health", async () => ({
	status: "ok",
	service: "nebulahub-browser",
}));

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
	maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
	immutable: false,
});
fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
	maxAge: "1d",
});
fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
	maxAge: "1d",
});
fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
	maxAge: "1d",
});

fastify.setNotFoundHandler((_request, reply) =>
	reply.code(404).type("text/html").sendFile("404.html")
);
fastify.server.on("listening", () => {
	const address = fastify.server.address();
	console.log(
		`NebulaHub Browser listening on http://${hostname()}:${address.port}`
	);
});

async function shutdown(signal) {
	console.log(`${signal} received; closing server.`);
	await fastify.close();
	process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const port = Number.parseInt(process.env.PORT || "8080", 10);
await fastify.listen({ port, host: "0.0.0.0" });
