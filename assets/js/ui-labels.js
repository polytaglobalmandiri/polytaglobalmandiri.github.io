/* Standardisasi istilah operasional yang terlihat oleh pengguna.
   Nama properti, nilai formulir, dan nama kolom basis data tidak disentuh. */
(function () {
  "use strict";

  var rules = [
    [/Industri Kemasan Plastik/gi, "Plastic Packaging Industry"],
    [/(?:Masa|Massa)\s+Jenis/gi, "Density"],
    [/Tebal\s+(?:Blowing|Blow)/gi, "Mikron"],
    [/Giliran\s+Kerja/gi, "Shift"],
    [/Jenis\s+Pengepakan/gi, "Jenis Packing"],
    [/\bPengepakan\b/gi, "Packing"],
    [/\bPelipatan\b/gi, "Folding"],
    [/\bLipatan\b/gi, "Folding"],
    [/\bPemasaran\b/gi, "Marketing"],
    [/\bPelanggan\b/gi, "Customer"],
    [/\bPesanan\b/gi, "Order"]
  ];
  var visibleAttributes = ["placeholder", "title", "aria-label", "alt"];
  var skippedTags = { SCRIPT: true, STYLE: true, NOSCRIPT: true, TEMPLATE: true };

  function standardize(value) {
    var output = String(value == null ? "" : value);
    rules.forEach(function (rule) { output = output.replace(rule[0], rule[1]); });
    return output;
  }

  function processText(textNode) {
    if (!textNode || !textNode.parentElement || skippedTags[textNode.parentElement.tagName]) return;
    var next = standardize(textNode.nodeValue);
    if (next !== textNode.nodeValue) textNode.nodeValue = next;
  }

  function processAttributes(element) {
    if (!element || element.nodeType !== 1 || skippedTags[element.tagName]) return;
    visibleAttributes.forEach(function (name) {
      if (!element.hasAttribute(name)) return;
      var current = element.getAttribute(name);
      var next = standardize(current);
      if (next !== current) element.setAttribute(name, next);
    });
  }

  function processTree(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      processText(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) processAttributes(root);

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === 3) processText(node);
      else processAttributes(node);
    }
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "characterData") processText(mutation.target);
      else if (mutation.type === "attributes") processAttributes(mutation.target);
      else Array.prototype.forEach.call(mutation.addedNodes, processTree);
    });
  });

  processTree(document.documentElement);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: visibleAttributes
  });

  window.PGMStandardizeLabels = {
    text: standardize,
    refresh: function () { processTree(document.documentElement); }
  };
})();
