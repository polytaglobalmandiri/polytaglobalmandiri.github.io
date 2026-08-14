import fs from "node:fs";
import path from "node:path";

const sourceDirectory = process.argv[2];
const projectRoot = path.resolve(import.meta.dirname, "..");
const appRoot = path.join(projectRoot, "apps", "spk-automation");
const stagingRoot = path.join(projectRoot, "tools", ".build-spk");
const siteRoot = "/apps/spk-automation/";

if (!sourceDirectory || !fs.existsSync(sourceDirectory)) {
  throw new Error("Berikan direktori hasil clone proyek GAS sebagai argumen pertama.");
}

// Halaman yang terbit sudah lebih maju daripada sumber GAS: sebagian
// pengembangan dikerjakan langsung pada berkas statis di repositori ini dan
// belum dikembalikan ke GAS. Karena itu menimpa hasil build ke folder aplikasi
// dapat menghapus pekerjaan yang sudah jadi. Bawaannya sekarang menulis ke
// folder singgah supaya selisihnya wajib diperiksa lebih dulu; menimpa
// langsung harus diminta secara sengaja dengan --timpa.
const target = process.argv[3];
const overwriteApp = target === "--timpa";
const outputRoot = !target
  ? stagingRoot
  : overwriteApp
    ? appRoot
    : path.resolve(target);

// Versi aset lokal. Dinaikkan manual setiap berkasnya berubah supaya browser
// tidak menyajikan salinan lama. Nilainya harus sama dengan yang tercantum
// pada halaman yang sedang terbit.
const assetVersions = {
  "gas-rpc.js": "20260811-5",
  "responsive.css": "20260814-2",
  "routing-accessories.css": "20260812-1",
  "routing-bs.js": "20260812-1",
  "routing-accessories.js": "20260812-1",
  "modal-scroll-lock.js": "20260812-1",
  "responsive-header.js": "20260812-3",
  "footer-reveal.js": "20260813-1",
  "status.css": "20260814-4",
  "status.js": "20260814-4"
};

// Kaki halaman dipasang oleh build karena sumber GAS tidak memuatnya. Teksnya
// disamakan dengan kaki halaman portal pada assets/js/data.js.
const footerText = "Dikembangkan dan dikelola oleh: <strong>Team POLYTA GLOBAL MANDIRI</strong>";

// Lekukan mengikuti gaya masing-masing berkas sumber GAS: Dashboard memakai
// empat spasi, halaman lainnya dua. Disamakan supaya hasil build tidak
// memunculkan selisih semu pada git.
const routes = [
  { source: "FE-Dashboard.html", output: "index.html", indent: "    " },
  { source: "FE-Input-SPK.html", output: "create-spk/index.html", indent: "  " },
  { source: "FE-Keluar-Bahan.html", output: "material-issue/index.html", indent: "  " },
  { source: "FE-Penarikan-Data.html", output: "data-retrieval/index.html", indent: "  " },
  // Lembar cetak tidak memakai kaki halaman aplikasi: tiap lembarnya sudah
  // punya kaki sendiri yang ikut tercetak.
  { source: "FE-Cetak-SPK.html", output: "print-spk/index.html", indent: "  ", footer: false }
];

// Partial yang memuat skrip wizard Input SPK. Halaman yang memakainya butuh
// modul routing BS dan aksesoris, yang disisipkan tepat sesudahnya agar sudah
// termuat saat skrip halaman menjalankan wizard.
const wizardScriptPartial = "FE-SPK-Wizard-Script";

// Partial lapisan status. Pada GAS isinya ditulis sebaris karena di sana
// berkas terpisah tidak dapat dilayani; pada versi web isinya digantikan oleh
// assets/css/status.css dan assets/js/status.js yang dimuat sebagai berkas
// bersama, sehingga salinan sebarisnya tidak ikut ditulis.
const statusPartial = "FE-Polyta-Status";
const statusPartialNote =
  "<!-- Lapisan status dimuat dari /assets/css/status.css dan /assets/js/status.js. -->";

function asset(fileName) {
  const version = assetVersions[fileName];
  if (!version) throw new Error(`Versi aset ${fileName} belum didaftarkan.`);
  return `${fileName}?v=${version}`;
}

function readSource(fileName) {
  return fs.readFileSync(path.join(sourceDirectory, fileName), "utf8");
}

function expandPartials(html, indent, state) {
  const pattern = /<\?!=\s*includePartial\(['"]([^'"]+)['"],\s*appUrl\)\s*\?>/g;
  let previous;
  do {
    previous = html;
    html = html.replace(pattern, (_, partialName) => {
      if (partialName === statusPartial) return statusPartialNote;
      const content = readSource(partialName + ".html");
      if (partialName !== wizardScriptPartial) return content;
      state.usesWizard = true;
      return content
        + `\n${indent}<script src="../${asset("routing-bs.js")}"></script>`
        + `\n${indent}<script src="../${asset("routing-accessories.js")}"></script>`;
    });
  } while (html !== previous);
  return html;
}

// Halaman di akar app memuat aset dari folder yang sama, sedangkan subhalaman
// naik satu tingkat.
function applyAssetPrefix(html, outputPath) {
  const prefix = outputPath.includes("/") ? "../" : "";
  return html.replaceAll('src="../', `src="${prefix}`).replaceAll('href="../', `href="${prefix}`);
}

function convertTemplate(route) {
  const state = { usesWizard: false };
  let html = expandPartials(readSource(route.source), route.indent, state);
  html = html.replace(/<\?!=\s*appUrl\s*\?>/g, siteRoot);
  html = html.replace(/<\?=\s*spkNumber\s*\?>/g, "");
  html = html.replace(/<\?=\s*dbRow\s*\?>/g, "");
  html = html.replace(/<\?=\s*printMode\s*\?>/g, "release");

  html = html.replaceAll(siteRoot + "?page=Input-SPK", siteRoot + "create-spk/");
  html = html.replaceAll(siteRoot + "?page=Keluar-Bahan", siteRoot + "material-issue/");
  html = html.replaceAll(siteRoot + "?page=Penarikan-Data", siteRoot + "data-retrieval/");
  html = html.replaceAll(siteRoot + "?page=Cetak-SPK&amp;", siteRoot + "print-spk/?");
  html = html.replaceAll(siteRoot + "?page=Cetak-SPK", siteRoot + "print-spk/");

  // Di GAS nomor SPK dititipkan lewat atribut body oleh server; pada GitHub
  // Pages halaman ini statis, jadi nilainya dibaca dari query string.
  if (route.source === "FE-Cetak-SPK.html") {
    html = html.replace(
      "const REQUESTED_SPK = document.body.dataset.spk || '';",
      "const REQUESTED_SPK = new URLSearchParams(window.location.search).get('spk') || '';"
    );
    html = html.replace(
      "let requestedDbRow = Math.max(0, Math.floor(Number(document.body.dataset.row) || 0));",
      "let requestedDbRow = Math.max(0, Math.floor(Number(new URLSearchParams(window.location.search).get('row')) || 0));"
    );
  }

  // Lapisan status disisipkan tepat sesudah <title>, bukan menjelang
  // </head>. Penangkap galat di dalamnya harus sudah terpasang sebelum skrip
  // apa pun pada halaman ini dijalankan.
  const statusAssets = `\n${route.indent}<link rel="stylesheet" href="/assets/css/${asset("status.css")}">`
    + `\n${route.indent}<script src="/assets/js/${asset("status.js")}"></script>`;
  html = html.replace(/<title>[^<]*<\/title>/, match => match + statusAssets);

  const rpcScript = `  <script src="/assets/js/${asset("gas-rpc.js")}"></script>\n`;
  html = html.replace("</head>", rpcScript + "</head>");

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

  // Gaya bersama halaman statis. Sumber GAS tidak memuatnya karena di sana
  // berkas terpisah tidak dapat dilayani.
  const styleSheets = [`../${asset("responsive.css")}`];
  if (state.usesWizard) styleSheets.push(`../${asset("routing-accessories.css")}`);
  const styleTags = styleSheets
    .map(href => `${route.indent}<link rel="stylesheet" href="${href}">\n`)
    .join("");
  html = html.replace("</head>", styleTags + "</head>");

  if (route.footer !== false) {
    const footer = `${route.indent}<footer class="spk-app-footer no-print">\n`
      + `${route.indent}  <div class="spk-app-footer-inner">${footerText}</div>\n`
      + `${route.indent}</footer>\n`;
    html = html.replace("</body>", footer + "</body>");
  }

  const tailScripts = ["modal-scroll-lock.js", "responsive-header.js", "footer-reveal.js"]
    .map(name => `${route.indent}<script src="../${asset(name)}"></script>\n`)
    .join("");
  html = html.replace("</body>", tailScripts + "</body>");

  const navigationClass = route.source === "FE-Dashboard.html"
    ? "nav-link-app"
    : route.source === "FE-Keluar-Bahan.html"
      ? "nav-link"
      : route.source === "FE-Cetak-SPK.html"
        ? "toolbar-button dashboard"
        : "app-nav-link";
  const portalHomeButton = `<a class="${navigationClass} polyta-portal-home no-print" href="/" target="_top" title="Kembali ke portal utama">
  <i class="fa-solid fa-house" aria-hidden="true"></i><span>Portal Utama</span>
</a>`;
  const fullscreenButtonPattern = /^([ \t]*)<button\s+id="btnFullscreen"/m;
  if (!fullscreenButtonPattern.test(html)) {
    throw new Error(`Tombol layar penuh tidak ditemukan pada ${route.source}.`);
  }
  html = html.replace(fullscreenButtonPattern, (_, indentation) => {
    const indentedPortalButton = portalHomeButton
      .split("\n")
      .map(line => indentation + line)
      .join("\n");
    return indentedPortalButton + '\n' + indentation + '<button id="btnFullscreen"';
  });

  return applyAssetPrefix(html, route.output);
}

for (const route of routes) {
  const outputFile = path.join(outputRoot, route.output);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, convertTemplate(route), "utf8");
  console.log(`Dibuat: ${path.relative(projectRoot, outputFile)}`);
}

if (overwriteApp) {
  console.log("\nHalaman aplikasi ditimpa. Periksa `git diff` sebelum melakukan commit.");
} else {
  console.log(`\nHasil ditulis ke ${path.relative(projectRoot, outputRoot)}, bukan ke halaman terbit.`);
  console.log("Bandingkan lebih dulu, contohnya:");
  console.log(`  git diff --no-index apps/spk-automation ${path.relative(projectRoot, outputRoot).split(path.sep).join("/")}`);
  console.log("Jika hasilnya memang sudah benar, jalankan ulang dengan --timpa.");
}
