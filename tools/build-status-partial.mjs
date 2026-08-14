/**
 * Menyusun partial FE-Polyta-Status.html untuk proyek Google Apps Script.
 *
 * Versi web memuat lapisan status sebagai dua berkas bersama, yaitu
 * assets/css/status.css dan assets/js/status.js. Apps Script tidak dapat
 * melayani berkas terpisah, sehingga di sana isinya harus ditulis sebaris.
 * Menyalinnya dengan tangan hampir pasti membuat keduanya menyimpang, jadi
 * partial tersebut dibangkitkan dari sumber yang sama oleh berkas ini.
 *
 * Pemakaian:
 *   node tools/build-status-partial.mjs "<direktori proyek GAS>"
 */

import fs from "node:fs";
import path from "node:path";

const targetDirectory = process.argv[2];
const projectRoot = path.resolve(import.meta.dirname, "..");

if (!targetDirectory || !fs.existsSync(targetDirectory)) {
  throw new Error("Berikan direktori proyek GAS sebagai argumen pertama.");
}

const styleSource = fs.readFileSync(path.join(projectRoot, "assets", "css", "status.css"), "utf8");
const scriptSource = fs.readFileSync(path.join(projectRoot, "assets", "js", "status.js"), "utf8");

// Apps Script memotong isi <script> pada kemunculan pertama "</script>".
// Sumbernya saat ini tidak memuat penggal tersebut, tetapi pemeriksaan ini
// menjaga agar penambahan di kemudian hari tidak diam-diam merusak halaman.
if (/<\/script/i.test(scriptSource) || /<\/style/i.test(styleSource)) {
  throw new Error("Sumber status memuat tanda penutup yang akan memotong partial GAS.");
}

const indent = (text, prefix) =>
  text
    .replace(/\s+$/, "")
    .split("\n")
    .map(line => (line.trim() ? prefix + line : ""))
    .join("\n");

const output =
  "<!-- BERKAS INI DIBANGKITKAN. Jangan disunting langsung.\n" +
  "     Sumbernya assets/css/status.css dan assets/js/status.js pada\n" +
  "     repositori polytaglobalmandiri.github.io. Untuk memperbaruinya:\n" +
  "       node tools/build-status-partial.mjs \"<direktori proyek GAS>\"\n" +
  "     lalu jalankan clasp push. -->\n" +
  "<style>\n" +
  indent(styleSource, "  ") +
  "\n</style>\n" +
  "<script>\n" +
  indent(scriptSource, "  ") +
  "\n</script>\n";

const outputFile = path.join(targetDirectory, "FE-Polyta-Status.html");
fs.writeFileSync(outputFile, output, "utf8");

console.log("Dibuat: " + outputFile);
console.log("Ukuran: " + output.length + " karakter");
console.log("\nJalankan clasp push agar versi Apps Script ikut berubah.");
