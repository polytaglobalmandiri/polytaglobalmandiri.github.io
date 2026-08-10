import fs from "node:fs";
import path from "node:path";

const sourceDirectory = process.argv[2];
const projectRoot = path.resolve(import.meta.dirname, "..");
const outputRoot = path.join(projectRoot, "spk-automasi");
const siteRoot = "/spk-automasi/";

if (!sourceDirectory || !fs.existsSync(sourceDirectory)) {
  throw new Error("Berikan direktori hasil clone proyek GAS sebagai argumen pertama.");
}
const routes = [
  ["FE-Dashboard.html", "index.html"],
  ["FE-Input-SPK.html", "input-spk/index.html"],
  ["FE-Keluar-Bahan.html", "keluar-bahan/index.html"],
  ["FE-Penarikan-Data.html", "penarikan-data/index.html"],
  ["FE-Cetak-SPK.html", "cetak-spk/index.html"]
];

function readSource(fileName) {
  return fs.readFileSync(path.join(sourceDirectory, fileName), "utf8");
}

function expandPartials(html) {
  const pattern = /<\?!=\s*includePartial\(['"]([^'"]+)['"],\s*appUrl\)\s*\?>/g;
  let previous;
  do {
    previous = html;
    html = html.replace(pattern, (_, partialName) => readSource(partialName + ".html"));
  } while (html !== previous);
  return html;
}

function convertTemplate(sourceName) {
  let html = expandPartials(readSource(sourceName));
  html = html.replace(/<\?!=\s*appUrl\s*\?>/g, siteRoot);
  html = html.replace(/<\?=\s*spkNumber\s*\?>/g, "");
  html = html.replace(/<\?=\s*dbRow\s*\?>/g, "");
  html = html.replace(/<\?=\s*printMode\s*\?>/g, "release");

  html = html.replaceAll(siteRoot + "?page=Input-SPK", siteRoot + "input-spk/");
  html = html.replaceAll(siteRoot + "?page=Keluar-Bahan", siteRoot + "keluar-bahan/");
  html = html.replaceAll(siteRoot + "?page=Penarikan-Data", siteRoot + "penarikan-data/");
  html = html.replaceAll(siteRoot + "?page=Cetak-SPK&amp;", siteRoot + "cetak-spk/?");
  html = html.replaceAll(siteRoot + "?page=Cetak-SPK", siteRoot + "cetak-spk/");

  if (sourceName === "FE-Cetak-SPK.html") {
    html = html.replace(
      "const REQUESTED_SPK = document.body.dataset.spk || '';",
      "const REQUESTED_SPK = new URLSearchParams(window.location.search).get('spk') || '';"
    );
    html = html.replace(
      "let requestedDbRow = Math.max(0, Math.floor(Number(document.body.dataset.row) || 0));",
      "let requestedDbRow = Math.max(0, Math.floor(Number(new URLSearchParams(window.location.search).get('row')) || 0));"
    );
  }

  const rpcScript = '  <script src="/assets/js/gas-rpc.js?v=20260811-1"></script>\n';
  html = html.replace("</head>", rpcScript + "</head>");
  return html;
}

for (const [sourceName, relativeOutput] of routes) {
  const outputFile = path.join(outputRoot, relativeOutput);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, convertTemplate(sourceName), "utf8");
  console.log(`Dibuat: ${path.relative(projectRoot, outputFile)}`);
}
