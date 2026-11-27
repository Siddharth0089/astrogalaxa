import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "../common/config.js";
import { TarotCard } from "../models.js";
import { tarotContent } from "./tarot-content.js";

try {
  if (env.MONGODB_DNS_SERVERS)
    dns.setServers(
      env.MONGODB_DNS_SERVERS.split(",").map((server) => server.trim()),
    );
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 8000,
  });
  const result = await TarotCard.bulkWrite(
    tarotContent.map((card) => ({
      updateOne: {
        filter: { number: card.number },
        update: { $setOnInsert: card },
        upsert: true,
      },
    })),
  );
  console.log(
    `Tarot seed complete. Added ${result.upsertedCount} cards; existing entries were preserved.`,
  );
} catch {
  console.error(
    "Tarot seed failed. Check database access, indexes and connectivity.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
