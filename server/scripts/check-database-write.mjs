import { randomUUID } from 'node:crypto';
import dns from 'node:dns';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
const config = dotenv.config({ path: envPath, quiet: true });
const uri = config.parsed?.MONGODB_URI;
const name = config.parsed?.MONGODB_DB_NAME || 'astro_galexa';
const resolvers = process.env.MONGODB_DNS_SERVERS ?? config.parsed?.MONGODB_DNS_SERVERS ?? '';
if (config.error || !uri || !/^mongodb(\+srv)?:\/\//.test(uri) || !/^[A-Za-z0-9_-]{1,63}$/.test(name)) {
  console.error('Check MONGODB_URI and MONGODB_DB_NAME in server/.env.');
  process.exit(1);
}
const runId = randomUUID();
let attempted = false;
let verified = false;
let removed = false;
try {
  if (resolvers) {
    const servers = resolvers.split(',').map(value => value.trim());
    if (servers.some(server => !isIP(server))) throw new Error('Invalid DNS server configuration');
    dns.setServers(servers);
  }
  await mongoose.connect(uri, { dbName: name, serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000, appName: 'Astro Galexa database verification' });
  const collection = mongoose.connection.db.collection('__connection_checks');
  attempted = true;
  await collection.insertOne({ _id: runId, purpose: 'temporary-connection-verification', createdAt: new Date() });
  const record = await collection.findOne({ _id: runId, purpose: 'temporary-connection-verification' });
  if (!record) throw new Error('Could not read back the verification record');
  verified = true;
} catch {
  console.error('Database write/read verification failed. Check permissions and connectivity.');
  process.exitCode = 1;
} finally {
  if (attempted && mongoose.connection.readyState === 1) {
    try {
      const result = await mongoose.connection.db.collection('__connection_checks').deleteOne({ _id: runId, purpose: 'temporary-connection-verification' });
      removed = result.deletedCount === 1;
    } catch { /* Report cleanup failure below without exposing connection details. */ }
  }
  if (attempted && !removed) {
    console.error(`The temporary verification record could not be confirmed removed (it may not exist). Record ID: ${runId}; collection: __connection_checks.`);
    process.exitCode = 1;
  }
  if (verified && removed) console.log(`Database ${name}: write and read verified; the temporary record was removed. The __connection_checks collection remains.`);
  await mongoose.disconnect();
}
