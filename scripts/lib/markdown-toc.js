'use strict';

const TOC_START = '## Table of Contents';
const TOC_END = '</div>';

/** Match marked@4.3.0 headerIds (used by docs/guide.html). */
function headingSlug(text, used = new Set()) {
  let slug = text
    .toLowerCase()
    .trim()
    .replace(/<[!/a-z].*?>/gi, '')
    .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
    .replace(/\s/g, '-');

  const base = slug;
  let n = 0;
  while (used.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  used.add(slug);
  return slug;
}

function stripExistingToc(content) {
  const start = content.indexOf(TOC_START);
  if (start === -1) return content;

  const end = content.indexOf(TOC_END, start);
  if (end === -1) return content;

  let after = content.slice(end + TOC_END.length);
  after = after.replace(/^\s*\n---\s*\n/, '\n');
  return content.slice(0, start) + after;
}

function extractH2Headings(content, { skip = [] } = {}) {
  const skipSet = new Set(['Table of Contents', ...skip]);
  const headings = [];
  for (const line of content.split('\n')) {
    const match = line.match(/^## (.+)$/);
    if (!match) continue;
    const title = match[1].trim();
    if (skipSet.has(title)) continue;
    headings.push(title);
  }
  return headings;
}

function buildTocBlock(headings, { trailingDivider = true } = {}) {
  const used = new Set();
  const lines = headings.map((title) => {
    const slug = headingSlug(title, used);
    return `- [${title}](#${slug})`;
  });

  const parts = [
    TOC_START,
    '',
    '<div class="doc-toc">',
    '',
    ...lines,
    '',
    TOC_END,
    '',
  ];
  if (trailingDivider) {
    parts.push('---', '');
  }
  return parts.join('\n');
}

function injectTocBeforeIndex(content, insertAt, { skip = [], trailingDivider = true } = {}) {
  const cleaned = stripExistingToc(content);
  const headings = extractH2Headings(cleaned, { skip });
  if (headings.length === 0) {
    throw new Error('No ## headings found for TOC');
  }
  const toc = buildTocBlock(headings, { trailingDivider });
  return cleaned.slice(0, insertAt) + toc + cleaned.slice(insertAt);
}

function injectTocBeforeFirstH2(content, options = {}) {
  const cleaned = stripExistingToc(content);
  const match = cleaned.match(/\n## /);
  if (!match || match.index === undefined) {
    throw new Error('No ## heading found');
  }
  return injectTocBeforeIndex(cleaned, match.index + 1, options);
}

function injectTocAfterLearnSection(content) {
  const marker = "## 📚 What You'll Learn";
  const cleaned = stripExistingToc(content);
  const learnIdx = cleaned.indexOf(marker);
  if (learnIdx === -1) {
    throw new Error('Missing "What You\'ll Learn" section');
  }
  const afterLearn = cleaned.slice(learnIdx);
  const dividerMatch = afterLearn.match(/\n---\s*\n/);
  if (!dividerMatch || dividerMatch.index === undefined) {
    throw new Error('Missing divider after learning objectives');
  }
  const insertAt = learnIdx + dividerMatch.index + dividerMatch[0].length;
  return injectTocBeforeIndex(cleaned, insertAt, {
    skip: ["📚 What You'll Learn"],
  });
}

function hasStructuredSections(content) {
  const cleaned = stripExistingToc(content);
  return /^## (?!Table of Contents)/m.test(cleaned);
}

/** Turn bullet-only quick-reference cards into ## sections for anchor navigation. */
function structureBulletQuickRef(content) {
  if (hasStructuredSections(content)) return stripExistingToc(content);

  const cleaned = stripExistingToc(content);
  const lines = cleaned.split('\n');
  const header = [];
  const bullets = [];
  const footer = [];
  let phase = 'header';

  for (const line of lines) {
    if (/^## /.test(line)) {
      return cleaned;
    }
    if (line.startsWith('- ')) {
      phase = 'bullets';
      bullets.push(line.slice(2));
      continue;
    }
    if (phase === 'bullets' && line.trim()) {
      footer.push(line);
      continue;
    }
    if (phase === 'header') {
      header.push(line);
    }
  }

  if (bullets.length === 0) {
    throw new Error('No bullet commands to structure');
  }

  const sections = bullets.map((bullet) => {
    const colon = bullet.indexOf(':');
    if (colon > 0 && colon < 100) {
      return {
        title: bullet.slice(0, colon).trim(),
        body: bullet.slice(colon + 1).trim(),
      };
    }
    return { title: bullet.slice(0, 48).trim(), body: bullet };
  });

  let out = `${header.join('\n').trimEnd()}\n\n`;
  for (const { title, body } of sections) {
    out += `## ${title}\n\n${body}\n\n`;
  }
  if (footer.length) {
    out += `## Expected outcome\n\n${footer.join('\n').trim()}\n\n`;
  }
  return out;
}

module.exports = {
  TOC_START,
  TOC_END,
  headingSlug,
  stripExistingToc,
  extractH2Headings,
  buildTocBlock,
  injectTocBeforeFirstH2,
  injectTocAfterLearnSection,
  structureBulletQuickRef,
  hasStructuredSections,
};
