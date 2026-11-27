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

const astrologersData = [
  {
    name: "Pandit Rajesh Shastri",
    specialties: ["Career", "Love", "Health"],
    languages: ["Hindi", "English", "Sanskrit"],
    experienceYears: 18,
    ratingAvg: 4.9,
    ratingCount: 1240,
    pricePerMinute: 25,
    status: "online",
    verified: true,
  },
  {
    name: "Acharya Meenakshi Devi",
    specialties: ["Love", "Career"],
    languages: ["English", "Hindi", "Tamil"],
    experienceYears: 14,
    ratingAvg: 4.8,
    ratingCount: 890,
    pricePerMinute: 20,
    status: "online",
    verified: true,
  },
  {
    name: "Dr. Arvind Joshi",
    specialties: ["Career", "Health"],
    languages: ["English", "Gujarati", "Hindi"],
    experienceYears: 22,
    ratingAvg: 4.95,
    ratingCount: 2150,
    pricePerMinute: 35,
    status: "busy",
    verified: true,
  },
  {
    name: "Vidya Sharma",
    specialties: ["Health", "Love"],
    languages: ["Hindi", "English"],
    experienceYears: 9,
    ratingAvg: 4.7,
    ratingCount: 420,
    pricePerMinute: 15,
    status: "offline",
    verified: true,
  },
];

const collection = mongoose.connection.db.collection("astrologers");
for (const item of astrologersData) {
  await collection.updateOne(
    { name: item.name },
    { $set: item },
    { upsert: true }
  );
}

console.log(`Seeded ${astrologersData.length} verified sample astrologers into database!`);
await mongoose.disconnect();
