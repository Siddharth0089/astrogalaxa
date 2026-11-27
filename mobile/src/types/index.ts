export type Screen =
  | "login"
  | "otp"
  | "birth"
  | "result"
  | "home"
  | "kundli"
  | "chat"
  | "live"
  | "tarot"
  | "reading"
  | "profile";

export type Place = {
  name: string;
  lat: number;
  lng: number;
  timezone: string;
};

export type NameSign = {
  name: string;
  vedicName: string;
  element: string;
  ruler: string;
  syllables: string[];
};

export const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

export function getZodiacSymbol(signName?: string | null): string {
  if (!signName) return "✨";
  return ZODIAC_SYMBOLS[signName] || "✨";
}

export type Gender = "male" | "female" | "other";
export type Language = "English" | "Hindi" | "Hinglish";

export type UserProfile = {
  name?: string;
  email?: string;
  gender?: Gender | null;
  language?: Language;
  nameSign?: NameSign | null;
  sunSign?: string | null;
  birth?: {
    dob: string;
    time?: string | null;
    placeName: string;
    lat: number;
    lng: number;
    timezone: string;
  };
  prefs?: {
    language?: Language;
    dailyHoroscope?: boolean;
    astrologerOnline?: boolean;
    chat?: boolean;
    notifyTime?: string;
    timezone?: string;
  };
};

export type Planet = {
  id: string;
  sign: string;
  degree?: number;
  house: number | null;
  nakshatra?: string;
  pada?: number;
  retrograde?: boolean;
  dignity?: "Exalted" | "Debilitated" | "Own Sign" | "Neutral";
  combust?: boolean;
  vargottama?: boolean;
  d9Sign?: string;
  d9House?: number | null;
  d10Sign?: string;
  d10House?: number | null;
};

export type TarotReading = {
  _id?: string;
  mode?: "daily" | "threeCard" | "yesNo";
  topic: string;
  question?: string | null;
  cards: {
    cardId: string;
    position: string;
    name: string;
    numeral: string;
    suit?: string;
    artKey: string;
    orientation?: "upright" | "reversed";
    keywords?: string[];
    meaning: string;
    love?: string;
    career?: string;
    advice?: string;
    yesNo?: string;
  }[];
  interpretation?: string;
  createdAt?: string;
  fromJournal?: boolean;
};

export type Horoscope = {
  sign: string;
  text: string;
  advice: string;
  luckyColor: string;
  luckyNumber: number;
};

export type KundliData = {
  accuracy: string;
  ayanamsa?: string;
  ascendant: { sign: string; degree?: number } | null;
  moonSign: string;
  nakshatra: { name: string; index?: number; pada?: number; lord?: string };
  planets: Planet[];
  avakhada?: {
    varna: string;
    vashya: string;
    tatva: string;
    rashiSwami: string;
    nakshatraLord: string;
    nadi: string;
    gana: string;
    yoni: string;
    payaa: string;
  };
  yogas?: { name: string; description: string }[];
  d9?: {
    ascendant: { sign: string } | null;
    planets: { id: string; sign: string; house: number | null; retrograde?: boolean }[];
  };
  d10?: {
    ascendant: { sign: string } | null;
    planets: { id: string; sign: string; house: number | null; retrograde?: boolean }[];
  };
  transits?: {
    computedAt: string;
    sadeSati: { status: string; active: boolean; summary: string };
    planets: {
      id: string;
      sign: string;
      degree: number;
      houseFromMoon: number;
      retrograde: boolean;
    }[];
  };
  dasha: {
    approximate: boolean;
    current: {
      planet: string;
      start: string;
      end: string;
      percentElapsed: number;
      interpretation: string;
      subperiod: { planet: string; start: string; end: string } | null;
    } | null;
    timeline: { planet: string; start: string; end: string; tag: string }[];
  };
};

export type PanchangData = {
  date: string;
  timezone: string;
  vara: string;
  tithi: string;
  paksha: string;
  nakshatra: { name: string; index: number; pada: number; lord: string };
  yoga: string;
  karana: string;
  sunSign: string;
  moonSign: string;
  rahuKaal: string;
  abhijitMuhurat: string;
};

export type GunMilanResult = {
  partnerName: string;
  totalScore: number;
  maxScore: number;
  verdict: string;
  kootas: { name: string; score: number; max: number; meaning: string }[];
  manglik: {
    user: boolean | null;
    partner: boolean | null;
    verdict: string;
  };
  userSummary: { moonSign: string; nakshatra: string; pada: number };
  partnerSummary: { moonSign: string; nakshatra: string; pada: number };
};

export type Astrologer = {
  _id: string;
  name: string;
  specialties: string[];
  languages: string[];
  experienceYears?: number;
  ratingAvg?: number;
  ratingCount?: number;
  pricePerMinute?: number;
  status?: string;
};
