import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from server root directory before any other module runs
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

export default process.env;
