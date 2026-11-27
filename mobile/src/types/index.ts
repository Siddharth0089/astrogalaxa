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

export type UserProfile = {
  name?: string;
  email?: string;
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
  house: number | null;
};

export type TarotReading = {
  topic: string;
  cards: {
    cardId: string;
    position: string;
    name: string;
    numeral: string;
    artKey: string;
    meaning: string;
  }[];
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
  ascendant: { sign: string } | null;
  moonSign: string;
  nakshatra: { name: string };
  planets: Planet[];
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
