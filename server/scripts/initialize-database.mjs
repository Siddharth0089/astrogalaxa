import { fileURLToPath } from 'node:url';
import dns from 'node:dns';
import { isIP } from 'node:net';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const config = dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
const uri = config.parsed?.MONGODB_URI;
const name = config.parsed?.MONGODB_DB_NAME || 'astro_galexa';
const resolvers = process.env.MONGODB_DNS_SERVERS ?? config.parsed?.MONGODB_DNS_SERVERS ?? '';
if (config.error || !uri || !/^mongodb(\+srv)?:\/\//.test(uri) || !/^[A-Za-z0-9_-]{1,63}$/.test(name)) {
  console.error('Check MONGODB_URI and MONGODB_DB_NAME in server/.env.');
  process.exit(1);
}

try {
  if (resolvers) {
    const servers = resolvers.split(',').map(value => value.trim());
    if (servers.some(server => !isIP(server))) throw new Error('Invalid DNS server configuration');
    dns.setServers(servers);
  }
  // Do not let importing model definitions build indexes implicitly.
  mongoose.set('autoIndex', false);
  mongoose.set('autoCreate', false);
  await mongoose.connect(uri, { dbName: name, serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000, appName: 'Astro Galexa database initialization' });
  await import('../dist/models.js');
  const existing = new Set((await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).map(collection => collection.name));
  for (const modelName of mongoose.modelNames()) {
    const model = mongoose.model(modelName);
    const collection = model.collection.collectionName;
    if (!existing.has(collection)) {
      try { await model.createCollection(); }
      catch (error) { if (error?.code !== 48) throw error; }
      existing.add(collection);
      console.log(`Created collection: ${collection}`);
    } else {
      console.log(`Existing collection preserved: ${collection}`);
    }
    await model.createIndexes();
    console.log(`Declared indexes checked: ${collection}`);
  }
  console.log(`Database ${name} initialized without inserting sample records or dropping collections/indexes.`);
} catch (error) {
  const code = error && typeof error === 'object' ? error.code : undefined;
  console.error('Database initialization did not complete; existing data and indexes were not intentionally removed. Check connectivity, permissions, duplicate values and index conflicts.');
  if (typeof code === 'number' || (typeof code === 'string' && /^[A-Z0-9_]{1,30}$/.test(code))) console.error(`Diagnostic code: ${code}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
