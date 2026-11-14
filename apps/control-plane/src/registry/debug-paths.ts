import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log('__dirname:', __dirname);
const CAMPAIGNS_DIR = join(__dirname, '../../../../campaigns');
console.log('CAMPAIGNS_DIR:', CAMPAIGNS_DIR);
