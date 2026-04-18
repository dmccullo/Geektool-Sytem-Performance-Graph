import { fileURLToPath } from "node:url";
import path from "node:path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { collectMetrics } from "./metrics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number.parseInt(process.env.PORT || "26498", 10);
const HOST = process.env.HOST || "127.0.0.1";

const app = Fastify({ logger: true });

app.get("/api/health", async () => ({ ok: true }));

app.get("/api/metrics", async (_req, reply) => {
  try {
    const metrics = await collectMetrics();
    return reply.send(metrics);
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ error: "metrics_failed" });
  }
});

const uiRoot = path.join(__dirname, "..", "..", "public");

await app.register(fastifyStatic, {
  root: uiRoot,
  prefix: "/",
});

app.setNotFoundHandler((req, reply) => {
  if (req.url.startsWith("/api")) {
    return reply.status(404).send({ error: "not_found" });
  }
  return reply.sendFile("index.html");
});

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err: unknown) {
  const code = err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "";
  if (code === "EADDRINUSE") {
    app.log.error(
      { port: PORT, host: HOST },
      "Port already in use — another copy of this server (or another app) is listening.",
    );
    console.error(`
Port ${PORT} is already in use on ${HOST}.

Fix one of:
  1) Stop the other process, then run npm start again:
       lsof -nP -iTCP:${PORT} -sTCP:LISTEN
       kill <PID>

  2) Use a different port (update your GeekTool Web URL to match):
       PORT=26499 npm start
`);
    process.exit(1);
  }
  throw err;
}

app.log.info(`Dashboard API at http://${HOST}:${PORT}/api/metrics`);
app.log.info(`UI at http://${HOST}:${PORT}/`);
