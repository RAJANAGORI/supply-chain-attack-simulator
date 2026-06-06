const fs = require('fs');
const path = require('path');
const { createEsClient, getRepoRoot } = require('./client');

const TEMPLATE_DIR = path.join(getRepoRoot(), 'observability/elasticsearch/templates');

async function applyTemplates(client = createEsClient()) {
  const files = fs.readdirSync(TEMPLATE_DIR).filter((name) => name.endsWith('.template.json'));
  const applied = [];

  for (const file of files) {
    const templateName = file.replace('.template.json', '');
    const body = JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf8'));
    await client.indices.putIndexTemplate({ name: templateName, body });
    applied.push(templateName);
  }

  return applied;
}

async function main() {
  const client = createEsClient();
  const applied = await applyTemplates(client);
  process.stdout.write(`Applied index templates: ${applied.join(', ')}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`apply-templates failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { applyTemplates };
