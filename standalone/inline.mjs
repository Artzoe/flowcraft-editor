import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const buildDir = fileURLToPath(new URL("../export-build/", import.meta.url));
const pagesDir = fileURLToPath(new URL("../docs/", import.meta.url));
const pagesFile = `${pagesDir}/index.html`;

const [html, css, javascript] = await Promise.all([
  readFile(`${buildDir}/index.html`, "utf8"),
  readFile(`${buildDir}/app.css`, "utf8"),
  readFile(`${buildDir}/app.js`, "utf8"),
]);

const shell = html
  .replace(/<link[^>]+href="\.\/app\.css"[^>]*>/, () => `<style>${css}</style>`)
  .replace(/<script[^>]+src="\.\/app\.js"[^>]*><\/script>/, "")
  .replace("</head>", "<meta name=\"flowcraft-offline\" content=\"true\" /></head>");

// Classic inline scripts execute immediately, so place the bundle after #root.
const bundled = shell.replace("</body>", () => `<script>${javascript}</script></body>`);

await mkdir(pagesDir, { recursive: true });
await Promise.all([
  writeFile(pagesFile, bundled, "utf8"),
  writeFile(`${pagesDir}/.nojekyll`, "", "utf8"),
]);
console.log(pagesFile);
