import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "node:dns";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
if (process.env.MONGODB_DNS_SERVERS) {
  dns.setServers(process.env.MONGODB_DNS_SERVERS.split(",").map((s) => s.trim()));
}
await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB_NAME || "astro_galexa",
});

const users = await mongoose.connection.db
  .collection("users")
  .find({}, { projection: { email: 1, name: 1, role: 1, onboardingComplete: 1 } })
  .toArray();
const astrologers = await mongoose.connection.db
  .collection("astrologers")
  .find({})
  .toArray();

console.log("=== USERS IN DATABASE ===");
console.log(JSON.stringify(users, null, 2));

console.log("\n=== ASTROLOGERS IN DATABASE ===");
console.log(JSON.stringify(astrologers, null, 2));

await mongoose.disconnect();
