const fs = require('fs');
const path = require('path');
const { createEsClient, getRepoRoot, INDICES } = require('./client');
const { parseDetectMarkdown } = require('./parse-detect-md');

function findDetectFiles(repoRoot = getRepoRoot()) {
  const scenariosDir = path.join(repoRoot, 'scenarios');
  return fs
    .readdirSync(scenariosDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(scenariosDir, entry.name, 'DETECT.md'))
    .filter((filePath) => fs.existsSync(filePath))
    .sort();
}

async function loadRunbooks(client = createEsClient(), repoRoot = getRepoRoot()) {
  const detectFiles = findDetectFiles(repoRoot);
  const operations = [];

  for (const filePath of detectFiles) {
    const markdown = fs.readFileSync(filePath, 'utf8');
    const doc = parseDetectMarkdown(markdown, path.relative(repoRoot, filePath));
    if (!doc.scenario_id) continue;

    operations.push({ index: { _index: INDICES.RULES, _id: doc.scenario_id } });
    operations.push(doc);
  }

  if (operations.length === 0) {
    return { indexed: 0, files: detectFiles.length };
  }

  const response = await client.bulk({ refresh: true, operations });
  if (response.errors) {
    const failed = (response.items || []).filter((item) => {
      const action = item.index || item.create || item.update;
      return action && action.error;
    });
    throw new Error(`Bulk index errors: ${JSON.stringify(failed.slice(0, 3))}`);
  }

  return { indexed: operations.length / 2, files: detectFiles.length };
}

async function main() {
  const result = await loadRunbooks();
  process.stdout.write(`Indexed ${result.indexed} runbooks from ${result.files} DETECT.md files into ${INDICES.RULES}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`load-runbooks failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { loadRunbooks, findDetectFiles };
