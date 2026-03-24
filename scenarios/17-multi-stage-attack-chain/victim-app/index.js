console.log('Starting victim app (Scenario 17)...');

const stage1 = require('stage1-access-lib');
const stage2 = require('stage2-compromised-lib');

async function main() {
  const s1 = await stage1.stage1();
  console.log('Stage1 token:', s1 && s1.token ? s1.token : stage1.getToken());

  const s2 = await stage2.stage2Chain();
  console.log('Stage2/Stage3 result:', s2);

  console.log('Multi-stage chain simulated. Evidence should be in infrastructure/captured-data.json.');
}

main().catch((e) => {
  console.error('Scenario 17 victim failed:', e && e.message ? e.message : e);
  process.exit(1);
});

