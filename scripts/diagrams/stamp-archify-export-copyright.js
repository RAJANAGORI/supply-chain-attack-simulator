#!/usr/bin/env node
/**
 * Stamp "© Raja Nagori · SCAS" onto Archify image exports.
 *
 * The live diagram stays clean. PNG, JPEG, WebP, SVG, copy, share cards,
 * and WebM all go through serializeSvg, which clones the picture and then
 * calls stampScasCopyright. Re-run this after `archify finalize` replaces
 * an HTML file.
 *
 *   node scripts/diagrams/stamp-archify-export-copyright.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCENARIOS = path.join(ROOT, '.archify/scenarios');

const CLONE = `        var clone = svg.cloneNode(true);

        var canonicalStateClean = cleanExportClone(clone);`;

const STAMPED = `        var clone = svg.cloneNode(true);

        var canonicalStateClean = cleanExportClone(clone);
        stampScasCopyright(clone);`;

const FN_ANCHOR = '      function serializeSvg(scale, opts) {';

const FN = `      function stampScasCopyright(root) {
        if (!root || root.querySelector('[data-scas-copyright]')) return;
        var box = root.viewBox && root.viewBox.baseVal;
        if (!box || !(box.width > 0) || !(box.height > 0)) return;
        var ns = 'http://www.w3.org/2000/svg';
        var g = document.createElementNS(ns, 'g');
        g.setAttribute('data-scas-copyright', '');
        var cx = box.x + box.width / 2;
        var cy = box.y + box.height / 2;
        var mark = document.createElementNS(ns, 'text');
        mark.setAttribute('x', String(cx));
        mark.setAttribute('y', String(cy));
        mark.setAttribute('text-anchor', 'middle');
        mark.setAttribute('dominant-baseline', 'middle');
        mark.setAttribute('transform', 'rotate(-28 ' + cx + ' ' + cy + ')');
        mark.setAttribute('fill', '#94a3b8');
        mark.setAttribute('font-size', String(Math.max(22, Math.round(Math.min(box.width, box.height) * 0.07))));
        mark.setAttribute('font-family', 'ui-sans-serif, system-ui, sans-serif');
        mark.setAttribute('font-weight', '700');
        mark.setAttribute('opacity', '0.2');
        mark.setAttribute('pointer-events', 'none');
        mark.textContent = 'Raja Nagori · SCAS';
        var credit = document.createElementNS(ns, 'text');
        credit.setAttribute('x', String(box.x + box.width - 14));
        credit.setAttribute('y', String(box.y + box.height - 12));
        credit.setAttribute('text-anchor', 'end');
        credit.setAttribute('fill', '#94a3b8');
        credit.setAttribute('font-size', '12');
        credit.setAttribute('font-family', 'ui-sans-serif, system-ui, sans-serif');
        credit.setAttribute('font-weight', '600');
        credit.setAttribute('opacity', '0.92');
        credit.setAttribute('pointer-events', 'none');
        credit.textContent = '© Raja Nagori · SCAS';
        g.appendChild(mark);
        g.appendChild(credit);
        root.appendChild(g);
      }

`;

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(abs, out);
    else if (ent.name.endsWith('.html')) out.push(abs);
  }
  return out;
}

function stampFile(file) {
  let text = fs.readFileSync(file, 'utf8');
  if (text.includes('function stampScasCopyright(') && text.includes('stampScasCopyright(clone);')) {
    return 'kept';
  }
  if (!text.includes(CLONE) || !text.includes(FN_ANCHOR)) {
    throw new Error(`export hook not found in ${path.relative(ROOT, file)}`);
  }
  if (text.split(CLONE).length !== 2 || text.split(FN_ANCHOR).length !== 2) {
    throw new Error(`export hook is not unique in ${path.relative(ROOT, file)}`);
  }
  text = text.replace(CLONE, STAMPED).replace(FN_ANCHOR, FN + FN_ANCHOR);
  fs.writeFileSync(file, text);
  return 'stamped';
}

function main() {
  const files = walk(SCENARIOS, []);
  const counts = { kept: 0, stamped: 0 };
  for (const file of files) counts[stampFile(file)] += 1;
  process.stdout.write(`archify html ${files.length}: stamped ${counts.stamped}, already stamped ${counts.kept}\n`);
}

main();
