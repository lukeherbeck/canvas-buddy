import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "dist");
const PORT = 5175;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".json": "application/json",
};

createServer((req, res) => {
  let urlPath = req.url === "/" || req.url === "" ? "/popup.html" : req.url;
  const filePath = join(ROOT, urlPath);

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found: " + urlPath);
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME[ext] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  res.end(readFileSync(filePath));
}).listen(PORT, () => {
  console.log("Serving on http://localhost:" + PORT);
});
