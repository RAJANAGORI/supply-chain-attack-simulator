function extractCodeBlocks(sectionBody) {
  const blocks = [];
  const re = /```(\w*)\n([\s\S]*?)```/g;
  let match = re.exec(sectionBody);
  while (match) {
    blocks.push({ lang: match[1] || 'text', content: match[2].trim() });
    match = re.exec(sectionBody);
  }
  return blocks;
}

function extractBulletList(sectionBody) {
  return sectionBody
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^-\s+/, '').trim());
}

function parseSections(markdown) {
  const sections = {};
  const parts = markdown.split(/^##\s+/m);
  const preamble = parts.shift() || '';

  for (const part of parts) {
    const newline = part.indexOf('\n');
    const heading = newline === -1 ? part.trim() : part.slice(0, newline).trim();
    const body = newline === -1 ? '' : part.slice(newline + 1).trim();
    sections[heading.toLowerCase()] = body;
  }

  return { preamble, sections };
}

function parseTitle(preamble) {
  const line = preamble.split('\n').find((entry) => entry.startsWith('# '));
  if (!line) return { scenarioId: '', scenarioName: '', title: '' };

  const title = line.replace(/^#\s+/, '').trim();
  const match = title.match(/Scenario\s+(\d+)\s*\(([^)]+)\)/i);
  return {
    scenarioId: match ? match[1].padStart(2, '0') : '',
    scenarioName: match ? match[2].trim() : '',
    title
  };
}

function parseSampleLogs(sectionBody) {
  const logs = [];
  for (const block of extractCodeBlocks(sectionBody)) {
    if (block.lang !== 'json') continue;
    try {
      logs.push(JSON.parse(block.content));
    } catch {
      logs.push({ raw: block.content });
    }
  }
  return logs;
}

function parseDetectMarkdown(markdown, sourceFile = '') {
  const { preamble, sections } = parseSections(markdown);
  const { scenarioId, scenarioName, title } = parseTitle(preamble);

  const iocsSection = sections.iocs || '';
  const sigmaSection = sections['sigma (example)'] || sections.sigma || '';
  const yaraSection = sections['yara-like text rule (example)'] || sections['yara-like text rule'] || '';
  const sampleSection = sections['sample log lines'] || '';
  const edrSection = sections['edr/siem what to expect'] || '';

  const sigmaBlocks = extractCodeBlocks(sigmaSection);
  const yaraBlocks = extractCodeBlocks(yaraSection);

  return {
    scenario_id: scenarioId,
    scenario_name: scenarioName,
    title,
    iocs: extractBulletList(iocsSection),
    sigma: sigmaBlocks.length > 0 ? sigmaBlocks[0].content : sigmaSection.trim(),
    yara: yaraBlocks.length > 0 ? yaraBlocks[0].content : yaraSection.trim(),
    edr_expectations: extractBulletList(edrSection).join('\n') || edrSection.trim(),
    sample_logs: parseSampleLogs(sampleSection),
    mitre: {
      tactic: null,
      technique: null
    },
    source_file: sourceFile,
    ingested_at: new Date().toISOString(),
    raw_markdown: markdown
  };
}

module.exports = {
  parseDetectMarkdown,
  extractCodeBlocks,
  extractBulletList
};
