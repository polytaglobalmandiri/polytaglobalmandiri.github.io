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
  html = html.replace(/(<meta\s+name=["']theme-color["']\s+content=["'])#[0-9a-f]+(["'])/i, "$1#e4e4e9$2");
  html = html.replace(/<\?!=\s*appUrl\s*\?>/g, siteRoot);
  html = html.replace(/<\?=\s*spkNumber\s*\?>/g, "");
  html = html.replace(/<\?=\s*dbRow\s*\?>/g, "");
  html = html.replace(/<\?=\s*printMode\s*\?>/g, "release");

  html = html.replaceAll(siteRoot + "?page=Input-SPK", siteRoot + "input-spk/");
  html = html.replaceAll(siteRoot + "?page=Keluar-Bahan", siteRoot + "keluar-bahan/");
  html = html.replaceAll(siteRoot + "?page=Penarikan-Data", siteRoot + "penarikan-data/");
  html = html.replaceAll(siteRoot + "?page=Cetak-SPK&amp;", siteRoot + "cetak-spk/?");
  html = html.replaceAll(siteRoot + "?page=Cetak-SPK", siteRoot + "cetak-spk/");

  html = html.replace(
    /<svg class="polyta-logo"[\s\S]*?<\/svg>/,
    '<img class="polyta-logo" src="/assets/img/logo-polyta.png" alt="">'
  );
  html = html.replace("Plastic Packaging Industry", "SPK Automasi · Portal Internal");

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

  const rpcScript = '  <script src="/assets/js/gas-rpc.js?v=20260811-5"></script>\n';
  const portalTheme = '  <link rel="stylesheet" href="/assets/css/spk-portal-theme.css?v=20260811-1">\n';
  html = html.replace("</head>", rpcScript + portalTheme + "</head>");

  const portalHomeStyles = `
  <style>
    .polyta-portal-home {
      text-decoration: none;
    }
    .polyta-portal-home i { font-size: .78rem; }
    .polyta-portal-home:focus-visible { outline: 3px solid rgba(230,59,82,.38); outline-offset: 3px; }
    @media (max-width: 900px) {
      .polyta-portal-home { width: 39px !important; flex: 0 0 39px !important; padding-inline: 0 !important; justify-content: center; }
      .polyta-portal-home span { display: none; }
    }
    @media print { .polyta-portal-home { display: none !important; } }
  </style>
`;
  html = html.replace("</head>", portalHomeStyles + "</head>");

  const navigationClass = sourceName === "FE-Dashboard.html"
    ? "nav-link-app"
    : sourceName === "FE-Keluar-Bahan.html"
      ? "nav-link"
      : sourceName === "FE-Cetak-SPK.html"
        ? "toolbar-button dashboard"
        : "app-nav-link";
  const portalHomeButton = `<a class="${navigationClass} polyta-portal-home no-print" href="/" target="_top" title="Kembali ke portal utama">
  <i class="fa-solid fa-house" aria-hidden="true"></i><span>Portal Utama</span>
</a>`;
  const fullscreenButtonPattern = /^([ \t]*)<button\s+id="btnFullscreen"/m;
  if (!fullscreenButtonPattern.test(html)) {
    throw new Error(`Tombol layar penuh tidak ditemukan pada ${sourceName}.`);
  }
  html = html.replace(fullscreenButtonPattern, (_, indentation) => {
    const indentedPortalButton = portalHomeButton
      .split("\n")
      .map(line => indentation + line)
      .join("\n");
    return indentedPortalButton + '\n' + indentation + '<button id="btnFullscreen"';
  });

  const portalFooter = `
  <footer class="polyta-spk-footer no-print">
    © 2026 POLYTA GLOBAL MANDIRI · Akses berbasis peran
  </footer>
`;
  html = html.replace("</body>", portalFooter + "</body>");
  return html;
}

for (const [sourceName, relativeOutput] of routes) {
  const outputFile = path.join(outputRoot, relativeOutput);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, convertTemplate(sourceName), "utf8");
  console.log(`Dibuat: ${path.relative(projectRoot, outputFile)}`);
}
