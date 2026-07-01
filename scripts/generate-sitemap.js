#!/usr/bin/env node
/**
 * Generate docs/sitemap.xml from docs/docs-manifest.json.
 *
 * Usage: node scripts/generate-sitemap.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'docs/docs-manifest.json');
const OUT_PATH = path.join(ROOT, 'docs/sitemap.xml');
const BASE = 'https://simulator.rajanagori.in';

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function priorityFor(docPath, sectionId) {
  if (docPath === 'index.md') {
    return { priority: '0.9', changefreq: 'weekly' };
  }
  if (sectionId === 'start') {
    return { priority: '0.88', changefreq: 'monthly' };
  }
  if (sectionId === 'zero-to-hero') {
    return { priority: '0.85', changefreq: 'monthly' };
  }
  if (sectionId === 'catalog') {
    return { priority: '0.85', changefreq: 'weekly' };
  }
  if (sectionId === 'quick-ref') {
    return { priority: '0.7', changefreq: 'monthly' };
  }
  if (sectionId === 'modules') {
    return { priority: '0.65', changefreq: 'monthly' };
  }
  if (sectionId === 'platform' || sectionId === 'guides' || sectionId === 'governance' || sectionId === 'learning') {
    return { priority: '0.6', changefreq: 'monthly' };
  }
  if (sectionId === 'reference') {
    return { priority: '0.55', changefreq: 'monthly' };
  }
  return { priority: '0.6', changefreq: 'monthly' };
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const lastmod = todayIso();
  const urls = [
    { loc: `${BASE}/`, priority: '1.0', changefreq: 'weekly', lastmod },
    { loc: `${BASE}/guide.html`, priority: '0.95', changefreq: 'weekly', lastmod },
  ];

  for (const section of manifest.sections) {
    for (const item of section.items) {
      const meta = priorityFor(item.path, section.id);
      urls.push({
        loc: `${BASE}/guide.html?p=${encodeURIComponent(item.path)}`,
        lastmod,
        ...meta,
      });
    }
  }

  urls.push({ loc: `${BASE}/404.html`, priority: '0.1', changefreq: 'yearly', lastmod });

  const body = urls.map((entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${body}
</urlset>
`;

  fs.writeFileSync(OUT_PATH, xml);
  console.log(`Wrote ${urls.length} URLs to docs/sitemap.xml`);
}

main();
