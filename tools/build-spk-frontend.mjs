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

  const rpcScript = '  <script src="/assets/js/gas-rpc.js?v=20260811-3"></script>\n';
  html = html.replace("</head>", rpcScript + "</head>");

  const portalHomeButton = `
  <style>
    .polyta-portal-home {
      position: fixed;
      left: max(16px, env(safe-area-inset-left));
      bottom: max(16px, env(safe-area-inset-bottom));
      z-index: 10050;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 42px;
      padding: 9px 15px;
      border: 1px solid #7d0a17;
      border-radius: 12px;
      color: #fff;
      background: linear-gradient(180deg, #e63b52, #c8102e 55%, #8a0b1f);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.42), 0 6px 18px rgba(38,8,14,.28);
      font: 800 12px/1.15 "Segoe UI", sans-serif;
      letter-spacing: .035em;
      text-decoration: none;
      transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
    }
    .polyta-portal-home:hover {
      color: #fff;
      filter: brightness(1.06);
      transform: translateY(-2px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 9px 22px rgba(38,8,14,.34);
    }
    .polyta-portal-home:active { transform: translateY(0); }
    .polyta-portal-home:focus-visible { outline: 3px solid rgba(230,59,82,.38); outline-offset: 3px; }
    .polyta-portal-home__arrow { font-size: 20px; line-height: 1; }
    @media (max-width: 480px) {
      .polyta-portal-home { min-height: 40px; padding: 8px 12px; font-size: 11px; }
    }
    @media print { .polyta-portal-home { display: none !important; } }
  </style>
  <a class="polyta-portal-home no-print" href="/" aria-label="Kembali ke portal utama POLYTA GLOBAL MANDIRI">
    <span class="polyta-portal-home__arrow" aria-hidden="true">←</span>
    <span>Kembali ke Portal Utama</span>
  </a>
`;
  html = html.replace("</body>", portalHomeButton + "</body>");
  return html;
}

for (const [sourceName, relativeOutput] of routes) {
  const outputFile = path.join(outputRoot, relativeOutput);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, convertTemplate(sourceName), "utf8");
  console.log(`Dibuat: ${path.relative(projectRoot, outputFile)}`);
}
