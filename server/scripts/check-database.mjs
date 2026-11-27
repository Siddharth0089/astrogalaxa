import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';
import { isIP } from 'node:net';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
const result = dotenv.config({ path: envPath, quiet: true });
if (result.error) {
  console.error('Cannot read server/.env. Create it from server/.env.example first.');
  process.exit(1);
}
const uri = result.parsed?.MONGODB_URI;
const name = result.parsed?.MONGODB_DB_NAME || 'astro_galexa';
const dnsServers = process.env.MONGODB_DNS_SERVERS ?? result.parsed?.MONGODB_DNS_SERVERS ?? '';
if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri)) {
  console.error('MONGODB_URI is missing or does not begin with mongodb:// or mongodb+srv://.');
  process.exit(1);
}
if (!/^[A-Za-z0-9_-]{1,63}$/.test(name)) {
  console.error('MONGODB_DB_NAME must contain only letters, numbers, underscores or hyphens.');
  process.exit(1);
}
try {
  if (dnsServers) {
    const servers = dnsServers.split(',').map(server => server.trim());
    if (servers.some(server => !isIP(server))) throw Object.assign(new Error('Invalid DNS configuration'), { code: 'INVALID_DNS_SERVERS' });
    dns.setServers(servers);
  }
  await mongoose.connect(uri, { dbName: name, serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000, appName: 'Astro Galexa database check' });
  await mongoose.connection.db.admin().ping();
  await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
  console.log(`Connected to MongoDB; database selected: ${name}. Read access to collection names verified.`);
  console.log('This check does not insert records or verify write permissions.');
} catch (error) {
  const code = error && typeof error === 'object' ? error.code : undefined;
  const reason = code === 18 || code === 8000 ? 'MongoDB rejected the database credentials.' : code === 13 ? 'The database user lacks permission to list collections.' : code === 'ENOTFOUND' || code === 'ENODATA' ? 'The MongoDB DNS name could not be resolved.' : code === 'ETIMEOUT' || code === 'ESERVFAIL' ? 'The MongoDB DNS lookup timed out or failed.' : 'MongoDB connection failed. Check the URI, network access, DNS and cluster IP access list.';
  console.error(reason);
  if (typeof code === 'number' || (typeof code === 'string' && /^[A-Z0-9_]{1,30}$/.test(code))) console.error(`Diagnostic code: ${code}`);
  const syscall = error && typeof error === 'object' ? error.syscall : undefined;
  if (syscall === 'querySrv' || syscall === 'queryTxt') console.error('The failure happened during the DNS lookup for the cluster.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
