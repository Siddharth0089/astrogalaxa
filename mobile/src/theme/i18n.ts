import { Language } from "../types";

export function formatTitleCase(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getCopy(language: Language = "English") {
  if (language === "Hindi") {
    return {
      greeting: (name: string) =>
        `नमस्ते, ${formatTitleCase(name) || "मित्र"}`,
      signTitle: (name: string, vedicName: string) =>
        `${vedicName} · ${name}`,
      sunSignLabel: "जन्म सूर्य राशि:",
      unavailable: "उपलब्ध नहीं",
      ruledBy: (element: string, ruler: string) =>
        `${element} तत्व · स्वामी ${ruler}`,
      horoscopeEyebrow: "दैनिक राशि मार्गदर्शन",
      horoscopeLoading: "आपका राशिफल तैयार हो रहा है…",
      adviceLabel: "दिव्य सलाह",
      luckyColorLabel: "शुभ रंग",
      luckyNumberLabel: "शुभ अंक",
      nav: {
        home: "होम",
        kundli: "कुंडली",
        chat: "चैट",
        tarot: "टैरो",
      },
      chatWelcome: (name?: string) =>
        `नमस्ते${name ? `, ${formatTitleCase(name)}` : ""}! मैं Astro Galaxa AI हूँ। आपकी जन्म कुंडली, ग्रह स्थिति और दशा विवरण तैयार हैं। अपने करियर, विवाह, स्वास्थ्य या जीवन पथ के बारे में कुछ भी पूछें।`,
      chatThinking: "आपकी वैदिक कुंडली और दशा का विश्लेषण हो रहा है…",
      chatChips: ["विवाह योग", "करियर मार्गदर्शन", "स्वास्थ्य और ऊर्जा"],
      chatSubtitle: "व्यक्तिगत वैदिक ज्योतिष ज्ञान",
    };
  }

  if (language === "Hinglish") {
    return {
      greeting: (name: string) =>
        `Namaste, ${formatTitleCase(name) || "Dost"}`,
      signTitle: (name: string, vedicName: string) =>
        `${name} · ${vedicName}`,
      sunSignLabel: "Sun sign (Janm tarikh):",
      unavailable: "Available nahi",
      ruledBy: (element: string, ruler: string) =>
        `${element} sign · Ruler ${ruler}`,
      horoscopeEyebrow: "AAJ KA RASHIFAL",
      horoscopeLoading: "Aapka rashifal load ho raha hai…",
      adviceLabel: "Aaj Ki Salah",
      luckyColorLabel: "Lucky Colour",
      luckyNumberLabel: "Lucky Number",
      nav: {
        home: "Home",
        kundli: "Kundli",
        chat: "Chat",
        tarot: "Tarot",
      },
      chatWelcome: (name?: string) =>
        `Namaste${name ? `, ${formatTitleCase(name)}` : ""}! Main Astro Galaxa AI hoon. Aapki Vedic birth chart, grah sthiti aur Dasha timeline mere paas ready hai. Apne career, shaadi timing, health ya personal path ke baare mein kuch bhi poochhein.`,
      chatThinking: "Aapki kundli aur dasha timeline check ki ja rahi hai…",
      chatChips: ["Shaadi timing", "Career shift", "Health & Energy"],
      chatSubtitle: "Personalized Vedic Intelligence",
    };
  }

  return {
    greeting: (name: string) =>
      `Hello, ${formatTitleCase(name) || "there"}`,
    signTitle: (name: string) => name,
    sunSignLabel: "Sun sign by birth date:",
    unavailable: "Unavailable",
    ruledBy: (element: string, ruler: string) =>
      `${element} sign · Ruled by ${ruler}`,
    horoscopeEyebrow: "DAILY COSMIC GUIDANCE",
    horoscopeLoading: "Aligning your daily horoscope…",
    adviceLabel: "Divine Counsel",
    luckyColorLabel: "Lucky Colour",
    luckyNumberLabel: "Lucky Number",
    nav: {
      home: "Home",
      kundli: "Kundli",
      chat: "Chat",
      tarot: "Tarot",
    },
    chatWelcome: (name?: string) =>
      `Hello${name ? `, ${formatTitleCase(name)}` : ""}! I am Astro Galaxa AI. Your natal birth chart, planetary placements, and life cycle timeline are ready. Ask me anything about your career, relationships, health, or personal path.`,
    chatThinking: "Consulting your natal chart and planetary timeline…",
    chatChips: ["Relationship timing", "Career growth", "Health & Energy"],
    chatSubtitle: "Personalized Astrological Intelligence",
  };
}
