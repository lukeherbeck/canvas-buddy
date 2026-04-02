import { createServer } from "vite";
import { fileURLToPath } from "url";
import { join } from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const server = await createServer({
  configFile: false,
  root: join(__dirname, "src"),
  publicDir: join(__dirname, "src", "public"),
  server: { port: 5176 },
  optimizeDeps: { include: [] },
});

await server.listen();
server.printUrls();
