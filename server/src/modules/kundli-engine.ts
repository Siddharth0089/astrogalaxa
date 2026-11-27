import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import sweph from "sweph";
import { rashis } from "../common/signs.js";
import { AppError } from "../common/http.js";

export const ENGINE_VERSION = "swiss-lahiri-moshier-2";
type Birth = {
  dob?: Date | null;
  time?: string | null;
  lat?: number | null;
  lng?: number | null;
  timezone?: string | null;
  placeName?: string | null;
};

const stars = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

const periods = [
  { planet: "Ketu", years: 7 },
  { planet: "Venus", years: 20 },
  { planet: "Sun", years: 6 },
  { planet: "Moon", years: 10 },
  { planet: "Mars", years: 7 },
  { planet: "Rahu", years: 18 },
  { planet: "Jupiter", years: 16 },
  { planet: "Saturn", years: 19 },
  { planet: "Mercury", years: 17 },
];

const interpretations: Record<string, string> = {
  Ketu: "A time for reflection, spiritual insight, and graceful release.",
  Venus: "A time to cultivate relationships, creativity, and harmonious abundance.",
  Sun: "A time to step into authentic purpose, leadership, and vitality.",
  Moon: "A time to nurture emotional clarity, intuition, and family harmony.",
  Mars: "A time to direct ambition, courage, and decisive energy thoughtfully.",
  Rahu: "A time to embrace innovation, transformative growth, and bold horizons.",
  Jupiter: "A time for wisdom, expansion, mentorship, and auspicious fortune.",
  Saturn: "A time to build enduring discipline, patience, and lasting foundations.",
  Mercury: "A time for learning, communication, intellect, and skillful commerce.",
};

const SIGN_LORDS = [
  "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
  "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
];

const DIGNITY_RULES: Record<
  string,
  { exalted: number; debilitated: number; own: number[] }
> = {
  Sun: { exalted: 0, debilitated: 6, own: [4] },
  Moon: { exalted: 1, debilitated: 7, own: [3] },
  Mars: { exalted: 9, debilitated: 3, own: [0, 7] },
  Mercury: { exalted: 5, debilitated: 11, own: [2, 5] },
  Jupiter: { exalted: 3, debilitated: 9, own: [8, 11] },
  Venus: { exalted: 11, debilitated: 5, own: [1, 6] },
  Saturn: { exalted: 6, debilitated: 0, own: [9, 10] },
  Rahu: { exalted: 1, debilitated: 7, own: [10] },
  Ketu: { exalted: 7, debilitated: 1, own: [7] },
};

const VARNA_BY_RASHI = [
  "Kshatriya", "Vaishya", "Shudra", "Brahmin",
  "Kshatriya", "Vaishya", "Shudra", "Brahmin",
  "Kshatriya", "Vaishya", "Shudra", "Brahmin",
];

const VASHYA_BY_RASHI = [
  "Chatushpada", "Chatushpada", "Manav", "Jalachara",
  "Vanachara", "Manav", "Manav", "Keeta",
  "Manav / Chatushpada", "Chatushpada / Jalachara", "Manav", "Jalachara",
];

const TATVA_BY_RASHI = [
  "Fire (Agni)", "Earth (Prithvi)", "Air (Vayu)", "Water (Jala)",
];

const NADI_BY_STAR = [
  "Adi", "Madhya", "Antya", "Antya", "Madhya", "Adi", "Adi", "Madhya", "Antya",
  "Adi", "Madhya", "Antya", "Antya", "Madhya", "Adi", "Adi", "Madhya", "Antya",
  "Adi", "Madhya", "Antya", "Antya", "Madhya", "Adi", "Adi", "Madhya", "Antya",
];

const GANA_BY_STAR = [
  "Deva", "Manushya", "Rakshasa", "Manushya", "Deva", "Manushya", "Deva", "Deva", "Rakshasa",
  "Rakshasa", "Manushya", "Manushya", "Deva", "Rakshasa", "Deva", "Rakshasa", "Deva", "Rakshasa",
  "Rakshasa", "Manushya", "Manushya", "Deva", "Rakshasa", "Rakshasa", "Manushya", "Manushya", "Deva",
];

const YONI_BY_STAR = [
  "Ashwa (Horse)", "Gaja (Elephant)", "Mesha (Sheep)", "Sarpa (Serpent)",
  "Sarpa (Serpent)", "Shwana (Dog)", "Marjara (Cat)", "Mesha (Sheep)",
  "Marjara (Cat)", "Mushaka (Rat)", "Mushaka (Rat)", "Gau (Cow)",
  "Mahisha (Buffalo)", "Vyaghra (Tiger)", "Mahisha (Buffalo)", "Vyaghra (Tiger)",
  "Mriga (Deer)", "Mriga (Deer)", "Shwana (Dog)", "Vanara (Monkey)",
  "Nakula (Mongoose)", "Vanara (Monkey)", "Simha (Lion)", "Ashwa (Horse)",
  "Simha (Lion)", "Gau (Cow)", "Gaja (Elephant)",
];

const yearMs = 365.2425 * 86400000;
const normalized = (x: number) => ((x % 360) + 360) % 360;

const nakshatra = (longitude: number) => {
  const division = 360 / 27;
  const index = Math.floor(normalized(longitude) / division);
  return {
    name: stars[index],
    index,
    pada: Math.floor((normalized(longitude) % division) / (division / 4)) + 1,
    lord: periods[index % 9].planet,
  };
};

function navamsaSignIndex(longitude: number): number {
  return Math.floor(normalized(longitude) / (30 / 9)) % 12;
}

function dasamsaSignIndex(longitude: number): number {
  const norm = normalized(longitude);
  const signIdx = Math.floor(norm / 30);
  const partIdx = Math.floor((norm % 30) / 3);
  return signIdx % 2 === 0
    ? (signIdx + partIdx) % 12
    : (signIdx + 8 + partIdx) % 12;
}

function getDignity(
  planetId: string,
  signIdx: number,
): "Exalted" | "Debilitated" | "Own Sign" | "Neutral" {
  const rule = DIGNITY_RULES[planetId];
  if (!rule) return "Neutral";
  if (signIdx === rule.exalted) return "Exalted";
  if (signIdx === rule.debilitated) return "Debilitated";
  if (rule.own.includes(signIdx)) return "Own Sign";
  return "Neutral";
}

function isCombust(
  planetId: string,
  planetLon: number,
  sunLon: number,
  retrograde: boolean,
): boolean {
  const thresholds: Record<string, number> = {
    Moon: 12,
    Mars: 17,
    Mercury: retrograde ? 12 : 14,
    Jupiter: 11,
    Venus: retrograde ? 8 : 10,
    Saturn: 15,
  };
  const limit = thresholds[planetId];
  if (!limit) return false;
  const diff = Math.abs(normalized(planetLon - sunLon));
  return Math.min(diff, 360 - diff) < limit;
}

export function calculateDasha(
  moonLongitude: number,
  birth: Date,
  now = new Date(),
  approximate = false,
) {
  const position = normalized(moonLongitude) / (360 / 27);
  const initial = Math.floor(position) % 9;
  const elapsedFraction = position - Math.floor(position);
  let start = birth.getTime() - elapsedFraction * periods[initial].years * yearMs;
  const timeline = Array.from({ length: 18 }, (_, i) => {
    const period = periods[(initial + i) % 9];
    const end = start + period.years * yearMs;
    const result = {
      planet: period.planet,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      startMs: start,
      endMs: end,
      years: period.years,
    };
    start = end;
    return result;
  });
  const nowMs = now.getTime();
  const currentIndex = timeline.findIndex(
    (x) => x.startMs <= nowMs && nowMs < x.endMs,
  );
  const current = currentIndex < 0 ? null : timeline[currentIndex];
  let subperiod: { planet: string; start: string; end: string } | null = null;
  if (current) {
    const lordIndex = periods.findIndex((x) => x.planet === current.planet);
    let subStart = current.startMs;
    for (let i = 0; i < 9; i++) {
      const p = periods[(lordIndex + i) % 9];
      const subEnd =
        subStart + ((current.endMs - current.startMs) * p.years) / 120;
      if (nowMs >= subStart && nowMs < subEnd) {
        subperiod = {
          planet: p.planet,
          start: new Date(subStart).toISOString(),
          end: new Date(subEnd).toISOString(),
        };
        break;
      }
      subStart = subEnd;
    }
  }
  return {
    approximate,
    current: current
      ? {
          planet: current.planet,
          start: current.start,
          end: current.end,
          percentElapsed: Math.max(
            0,
            Math.min(
              100,
              ((nowMs - current.startMs) / (current.endMs - current.startMs)) *
                100,
            ),
          ),
          subperiod,
          interpretation: interpretations[current.planet],
        }
      : null,
    timeline: timeline.map((p, i) => ({
      planet: p.planet,
      start: p.start,
      end: p.end,
      tag:
        i === currentIndex
          ? "Now"
          : p.endMs <= nowMs
            ? "Past"
            : i === currentIndex + 1 ||
                (currentIndex < 0 && p.startMs > nowMs && i === 0)
              ? "Next"
              : "Later",
    })),
  };
}

export function computeTransits(moonSignName: string, now = new Date()) {
  const moonIdx = Math.max(
    0,
    rashis.findIndex((r) => r.name === moonSignName),
  );
  const dt = DateTime.fromJSDate(now, { zone: "utc" });
  const julian = sweph.julday(
    dt.year,
    dt.month,
    dt.day,
    dt.hour + dt.minute / 60 + dt.second / 3600,
    sweph.constants.SE_GREG_CAL,
  );
  sweph.set_sid_mode(sweph.constants.SE_SIDM_LAHIRI, 0, 0);
  const flags =
    sweph.constants.SEFLG_MOSEPH |
    sweph.constants.SEFLG_SIDEREAL |
    sweph.constants.SEFLG_SPEED;

  const transitBodies = [
    ["Saturn", sweph.constants.SE_SATURN],
    ["Jupiter", sweph.constants.SE_JUPITER],
    ["Rahu", sweph.constants.SE_MEAN_NODE],
    ["Sun", sweph.constants.SE_SUN],
    ["Mars", sweph.constants.SE_MARS],
  ] as const;

  const list = transitBodies.map(([id, body]) => {
    const res = sweph.calc_ut(julian, body, flags);
    const lon = normalized(res.data[0]);
    const signIdx = Math.floor(lon / 30);
    return {
      id,
      sign: rashis[signIdx].name,
      degree: lon % 30,
      houseFromMoon: ((signIdx - moonIdx + 12) % 12) + 1,
      retrograde: res.data[3] < 0,
    };
  });

  const rahu = list.find((p) => p.id === "Rahu");
  if (rahu) {
    const ketuSignIdx = (rashis.findIndex((r) => r.name === rahu.sign) + 6) % 12;
    list.push({
      id: "Ketu" as typeof rahu.id,
      sign: rashis[ketuSignIdx].name,
      degree: rahu.degree,
      houseFromMoon: ((ketuSignIdx - moonIdx + 12) % 12) + 1,
      retrograde: true,
    });
  }

  const saturnHouse = list.find((p) => p.id === "Saturn")?.houseFromMoon;
  let sadeSati: { status: string; active: boolean; summary: string };
  if (saturnHouse === 12) {
    sadeSati = {
      status: "1st Phase (Rising)",
      active: true,
      summary:
        "Saturn transits the 12th house from your natal Moon, encouraging patience, spiritual discipline, and mindful planning.",
    };
  } else if (saturnHouse === 1) {
    sadeSati = {
      status: "2nd Phase (Peak)",
      active: true,
      summary:
        "Saturn transits directly over your Moon Sign, cultivating deep resilience, maturity, and enduring focus.",
    };
  } else if (saturnHouse === 2) {
    sadeSati = {
      status: "3rd Phase (Setting)",
      active: true,
      summary:
        "Saturn transits your 2nd house from Moon, consolidating hard-earned wisdom and family/financial stability.",
    };
  } else if (saturnHouse === 4 || saturnHouse === 8) {
    sadeSati = {
      status: "Dhaiya (Kantak Shani)",
      active: true,
      summary:
        "Saturn occupies the 4th/8th house from your Moon, rewarding steady persistence and calm emotional grounding.",
    };
  } else {
    sadeSati = {
      status: "Clear (No Sade Sati)",
      active: false,
      summary:
        "Saturn currently transits a neutral/supportive house from your natal Moon with no Sade Sati active.",
    };
  }

  return {
    computedAt: now.toISOString(),
    sadeSati,
    planets: list,
  };
}

export function computeKundli(userId: string, birth: Birth, now = new Date()) {
  if (!birth.dob || !birth.timezone || birth.lat == null || birth.lng == null)
    throw new AppError(
      400,
      "BIRTH_DETAILS_INVALID",
      "Birth date, place and timezone are required",
    );
  const date = new Date(birth.dob);
  const parts = /^(\d{2}):(\d{2})$/.exec(birth.time ?? "12:00");
  if (
    !Number.isFinite(date.getTime()) ||
    !parts ||
    Number(parts[1]) > 23 ||
    Number(parts[2]) > 59
  )
    throw new AppError(
      400,
      "BIRTH_DETAILS_INVALID",
      "Birth date or time is invalid",
    );
  const local = DateTime.fromObject(
    {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: Number(parts[1]),
      minute: Number(parts[2]),
    },
    { zone: birth.timezone },
  );
  if (
    !local.isValid ||
    local.hour !== Number(parts[1]) ||
    local.minute !== Number(parts[2])
  )
    throw new AppError(
      400,
      "BIRTH_TIME_INVALID",
      "This local time does not exist in the selected timezone",
    );
  if (birth.time && local.getPossibleOffsets().length > 1)
    throw new AppError(
      400,
      "BIRTH_TIME_AMBIGUOUS",
      "This birth time occurs twice due to a clock change; contact support to clarify the offset",
    );

  const utc = local.toUTC();
  const julian = sweph.julday(
    utc.year,
    utc.month,
    utc.day,
    utc.hour + utc.minute / 60 + utc.second / 3600,
    sweph.constants.SE_GREG_CAL,
  );
  sweph.set_sid_mode(sweph.constants.SE_SIDM_LAHIRI, 0, 0);
  const flags =
    sweph.constants.SEFLG_MOSEPH |
    sweph.constants.SEFLG_SIDEREAL |
    sweph.constants.SEFLG_SPEED;
  const ascResult = birth.time
    ? sweph.houses_ex(
        julian,
        sweph.constants.SEFLG_SIDEREAL,
        birth.lat,
        birth.lng,
        "W",
      )
    : null;
  if (ascResult && ascResult.flag < 0)
    throw new AppError(
      422,
      "ASCENDANT_UNAVAILABLE",
      "Could not calculate the ascendant for this location",
    );
  const ascLongitude = ascResult ? normalized(ascResult.data.points[0]) : null;
  const ascIndex = ascLongitude === null ? null : Math.floor(ascLongitude / 30);

  const ids = [
    ["Sun", sweph.constants.SE_SUN],
    ["Moon", sweph.constants.SE_MOON],
    ["Mars", sweph.constants.SE_MARS],
    ["Mercury", sweph.constants.SE_MERCURY],
    ["Jupiter", sweph.constants.SE_JUPITER],
    ["Venus", sweph.constants.SE_VENUS],
    ["Saturn", sweph.constants.SE_SATURN],
    ["Rahu", sweph.constants.SE_MEAN_NODE],
  ] as const;

  const calculated = ids.map(([id, body]) => {
    const result = sweph.calc_ut(julian, body, flags);
    if (result.flag < 0 || !Number.isFinite(result.data[0]))
      throw new AppError(
        503,
        "EPHEMERIS_UNAVAILABLE",
        "Planetary calculations are unavailable",
      );
    return {
      id,
      longitude: normalized(result.data[0]),
      retrograde: result.data[3] < 0,
    };
  });

  const node = calculated[calculated.length - 1];
  calculated.push({
    id: "Ketu" as typeof node.id,
    longitude: normalized(node.longitude + 180),
    retrograde: node.retrograde,
  });

  const sunLon = calculated[0].longitude;
  const d9AscIdx = ascLongitude === null ? null : navamsaSignIndex(ascLongitude);
  const d10AscIdx = ascLongitude === null ? null : dasamsaSignIndex(ascLongitude);

  const planets = calculated.map((p) => {
    const index = Math.floor(p.longitude / 30);
    const star = nakshatra(p.longitude);
    const d9Idx = navamsaSignIndex(p.longitude);
    const d10Idx = dasamsaSignIndex(p.longitude);
    const dignity = getDignity(p.id, index);
    const combust = isCombust(p.id, p.longitude, sunLon, p.retrograde);
    const vargottama = d9Idx === index;
    return {
      id: p.id,
      sign: rashis[index].name,
      signIndex: index,
      degree: p.longitude % 30,
      house: ascIndex === null ? null : ((index - ascIndex + 12) % 12) + 1,
      nakshatra: star.name,
      pada: star.pada,
      retrograde: p.retrograde,
      dignity,
      combust,
      vargottama,
      d9Sign: rashis[d9Idx].name,
      d9House: d9AscIdx === null ? null : ((d9Idx - d9AscIdx + 12) % 12) + 1,
      d10Sign: rashis[d10Idx].name,
      d10House: d10AscIdx === null ? null : ((d10Idx - d10AscIdx + 12) % 12) + 1,
    };
  });

  const moon = calculated[1];
  const moonIndex = Math.floor(moon.longitude / 30);
  const moonStar = nakshatra(moon.longitude);

  // Authentic Vedic Yogas detection
  const yogas: { name: string; description: string }[] = [];
  const sunP = planets.find((p) => p.id === "Sun")!;
  const moonP = planets.find((p) => p.id === "Moon")!;
  const marsP = planets.find((p) => p.id === "Mars")!;
  const mercP = planets.find((p) => p.id === "Mercury")!;
  const jupP = planets.find((p) => p.id === "Jupiter")!;

  const jupFromMoon = ((jupP.signIndex - moonP.signIndex + 12) % 12) + 1;
  if ([1, 4, 7, 10].includes(jupFromMoon)) {
    yogas.push({
      name: "Gajakesari Yoga",
      description:
        "Jupiter sits in an angular kendra from the Moon, bestowing wisdom, generosity, and respected standing.",
    });
  }
  if (sunP.signIndex === mercP.signIndex) {
    yogas.push({
      name: "Budhaditya Yoga",
      description:
        "Sun and Mercury unite in the same sign, blessing intellect, eloquence, and analytical brilliance.",
    });
  }
  const marsFromMoon = ((marsP.signIndex - moonP.signIndex + 12) % 12) + 1;
  if (marsFromMoon === 1 || marsFromMoon === 7) {
    yogas.push({
      name: "Chandra-Mangala Yoga",
      description:
        "Moon and Mars link across the axis, conferring strong emotional drive, enterprise, and vitality.",
    });
  }

  if (ascIndex !== null) {
    const mahapurusha = [
      { id: "Mars", yoga: "Ruchaka Yoga", desc: "Bold courage, decisive leadership, and stamina." },
      { id: "Mercury", yoga: "Bhadra Yoga", desc: "Articulate mastery, keen intellect, and diplomacy." },
      { id: "Jupiter", yoga: "Hamsa Yoga", desc: "Spiritual wisdom, noble ethics, and auspicious fortune." },
      { id: "Venus", yoga: "Malavya Yoga", desc: "Artistic grace, refined harmony, and material comfort." },
      { id: "Saturn", yoga: "Shasha Yoga", desc: "Steadfast discipline, endurance, and executive authority." },
    ];
    mahapurusha.forEach((entry) => {
      const p = planets.find((x) => x.id === entry.id);
      if (
        p &&
        p.house !== null &&
        [1, 4, 7, 10].includes(p.house) &&
        (p.dignity === "Exalted" || p.dignity === "Own Sign")
      ) {
        yogas.push({
          name: `${entry.yoga} (Mahapurusha)`,
          description: entry.desc,
        });
      }
    });
  }

  const vargottamaNames = planets.filter((p) => p.vargottama).map((p) => p.id);
  if (vargottamaNames.length > 0) {
    yogas.push({
      name: "Vargottama Strength",
      description: `${vargottamaNames.join(", ")} occupy the same sign in both Birth (D1) and Navamsa (D9) charts, amplifying their steady results.`,
    });
  }

  // Avakhada Chakra Attributes
  const moonHouse = moonP.house;
  let payaa = "Silver (Rajat)";
  if (moonHouse !== null) {
    if ([1, 6, 11].includes(moonHouse)) payaa = "Gold (Swarna)";
    else if ([2, 5, 9].includes(moonHouse)) payaa = "Silver (Rajat)";
    else if ([3, 7, 10].includes(moonHouse)) payaa = "Copper (Tamra)";
    else payaa = "Iron (Loha)";
  }

  const avakhada = {
    varna: VARNA_BY_RASHI[moonIndex],
    vashya: VASHYA_BY_RASHI[moonIndex],
    tatva: TATVA_BY_RASHI[moonIndex % 4],
    rashiSwami: SIGN_LORDS[moonIndex],
    nakshatraLord: moonStar.lord,
    nadi: NADI_BY_STAR[moonStar.index],
    gana: GANA_BY_STAR[moonStar.index],
    yoni: YONI_BY_STAR[moonStar.index],
    payaa,
  };

  const d9 = {
    ascendant: d9AscIdx === null ? null : { sign: rashis[d9AscIdx].name },
    planets: planets.map((p) => ({
      id: p.id,
      sign: p.d9Sign,
      house: p.d9House,
      retrograde: p.retrograde,
    })),
  };

  const d10 = {
    ascendant: d10AscIdx === null ? null : { sign: rashis[d10AscIdx].name },
    planets: planets.map((p) => ({
      id: p.id,
      sign: p.d10Sign,
      house: p.d10House,
      retrograde: p.retrograde,
    })),
  };

  const birthHash = createHash("sha256")
    .update(
      JSON.stringify({
        dob: date.toISOString(),
        time: birth.time ?? null,
        lat: birth.lat,
        lng: birth.lng,
        timezone: birth.timezone,
      }),
    )
    .digest("hex");

  return {
    userId,
    birthHash,
    engineVersion: ENGINE_VERSION,
    ayanamsa: "lahiri",
    accuracy: birth.time ? "full" : "approximate",
    ascendant:
      ascIndex === null
        ? null
        : { sign: rashis[ascIndex].name, degree: ascLongitude! % 30 },
    planets,
    moonSign: rashis[moonIndex].name,
    nakshatra: moonStar,
    avakhada,
    yogas,
    d9,
    d10,
    dasha: calculateDasha(moon.longitude, utc.toJSDate(), now, !birth.time),
    computedAt: now,
  };
}

const TITHI_NAMES = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima",
];

const VEDIC_YOGAS = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana",
  "Atiganda", "Sukarma", "Dhriti", "Shoola", "Ganda",
  "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
  "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
  "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma",
  "Indra", "Vaidhriti",
];

const MOVABLE_KARANAS = [
  "Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti (Bhadra)",
];

const VARA_NAMES = [
  "Sunday · Ravivara",
  "Monday · Somavara",
  "Tuesday · Mangalavara",
  "Wednesday · Budhavara",
  "Thursday · Guruvara",
  "Friday · Shukravara",
  "Saturday · Shanivara",
];

const RAHU_KAAL_BY_DAY = [
  "04:30 PM – 06:00 PM",
  "07:30 AM – 09:00 AM",
  "03:00 PM – 04:30 PM",
  "12:00 PM – 01:30 PM",
  "01:30 PM – 03:00 PM",
  "10:30 AM – 12:00 PM",
  "09:00 AM – 10:30 AM",
];

export function computePanchang(timezone = "Asia/Kolkata", now = new Date()) {
  let local = DateTime.fromJSDate(now, { zone: timezone });
  if (!local.isValid) local = DateTime.fromJSDate(now, { zone: "UTC" });
  const utc = local.toUTC();
  const julian = sweph.julday(
    utc.year,
    utc.month,
    utc.day,
    utc.hour + utc.minute / 60 + utc.second / 3600,
    sweph.constants.SE_GREG_CAL,
  );
  sweph.set_sid_mode(sweph.constants.SE_SIDM_LAHIRI, 0, 0);
  const flags =
    sweph.constants.SEFLG_MOSEPH |
    sweph.constants.SEFLG_SIDEREAL |
    sweph.constants.SEFLG_SPEED;

  const sunLon = normalized(sweph.calc_ut(julian, sweph.constants.SE_SUN, flags).data[0]);
  const moonLon = normalized(sweph.calc_ut(julian, sweph.constants.SE_MOON, flags).data[0]);

  const diff = normalized(moonLon - sunLon);
  const tithiIdx = Math.floor(diff / 12); // 0..29
  const paksha = tithiIdx < 15 ? "Shukla Paksha" : "Krishna Paksha";
  const tithi =
    tithiIdx === 29
      ? "Amavasya"
      : tithiIdx === 14
        ? "Purnima"
        : TITHI_NAMES[tithiIdx % 15];

  const moonStar = nakshatra(moonLon);
  const yogaIdx = Math.floor(normalized(sunLon + moonLon) / (360 / 27));
  const yoga = VEDIC_YOGAS[yogaIdx % 27];

  const karanaStep = Math.floor(diff / 6); // 0..59
  const karana =
    karanaStep === 0
      ? "Kimstughna"
      : karanaStep === 57
        ? "Shakuni"
        : karanaStep === 58
          ? "Chatushpada"
          : karanaStep === 59
            ? "Naga"
            : MOVABLE_KARANAS[(karanaStep - 1) % 7];

  const dayIdx = local.weekday % 7; // 0 = Sun .. 6 = Sat
  return {
    date: local.toISODate(),
    timezone: local.zoneName,
    vara: VARA_NAMES[dayIdx],
    tithi,
    paksha,
    nakshatra: moonStar,
    yoga,
    karana,
    sunSign: rashis[Math.floor(sunLon / 30)].name,
    moonSign: rashis[Math.floor(moonLon / 30)].name,
    rahuKaal: RAHU_KAAL_BY_DAY[dayIdx],
    abhijitMuhurat: dayIdx === 3 ? "Neutral on Wednesday" : "11:45 AM – 12:33 PM",
  };
}

// Gun Milan (Ashtakoota 36-point Compatibility Tables)
const VARNA_RANK = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4]; // 4=Brahmin, 3=Kshatriya, 2=Vaishya, 1=Shudra
// Vashya groups: 0=Chatushpada, 1=Manav, 2=Jalachara, 3=Vanachara, 4=Keeta
const VASHYA_GROUP = [0, 0, 1, 2, 3, 1, 1, 4, 0, 2, 1, 2];
// 0..13 Animal IDs for 27 Nakshatras
const YONI_ID = [
  0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9,
  8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1,
];
const YONI_ENEMIES: Record<number, number> = {
  0: 8, 8: 0, 1: 13, 13: 1, 2: 11, 11: 2,
  3: 12, 12: 3, 4: 10, 10: 4, 5: 6, 6: 5, 7: 9, 9: 7,
};
// Classical natural friendship: 2=Friend, 1=Neutral, 0=Enemy
const PLANET_FRIENDS: Record<string, Record<string, number>> = {
  Sun:     { Sun: 2, Moon: 2, Mars: 2, Mercury: 1, Jupiter: 2, Venus: 0, Saturn: 0 },
  Moon:    { Sun: 2, Moon: 2, Mars: 1, Mercury: 2, Jupiter: 1, Venus: 1, Saturn: 1 },
  Mars:    { Sun: 2, Moon: 2, Mars: 2, Mercury: 0, Jupiter: 2, Venus: 1, Saturn: 1 },
  Mercury: { Sun: 2, Moon: 0, Mars: 1, Mercury: 2, Jupiter: 1, Venus: 2, Saturn: 1 },
  Jupiter: { Sun: 2, Moon: 2, Mars: 2, Mercury: 0, Jupiter: 2, Venus: 0, Saturn: 1 },
  Venus:   { Sun: 0, Moon: 0, Mars: 1, Mercury: 2, Jupiter: 1, Venus: 2, Saturn: 2 },
  Saturn:  { Sun: 0, Moon: 0, Mars: 0, Mercury: 2, Jupiter: 1, Venus: 2, Saturn: 2 },
};

export function computeMatch(
  userBirth: Birth,
  partnerBirth: Birth,
  userGender?: string | null,
) {
  const chartA = computeKundli("match-a", userBirth);
  const chartB = computeKundli("match-b", partnerBirth);

  const mA = rashis.findIndex((r) => r.name === chartA.moonSign);
  const mB = rashis.findIndex((r) => r.name === chartB.moonSign);
  const sA = chartA.nakshatra.index;
  const sB = chartB.nakshatra.index;

  const isUserFemale = userGender === "female";
  const groom = isUserFemale ? { m: mB, s: sB } : { m: mA, s: sA };
  const bride = isUserFemale ? { m: mA, s: sA } : { m: mB, s: sB };

  // 1. Varna (1 pt)
  const varna = VARNA_RANK[groom.m] >= VARNA_RANK[bride.m] ? 1 : 0;

  // 2. Vashya (2 pts)
  const vg = VASHYA_GROUP[groom.m];
  const vb = VASHYA_GROUP[bride.m];
  const vashya = vg === vb ? 2 : (vg === 1 && (vb === 0 || vb === 2)) || (vb === 1 && (vg === 0 || vg === 2)) ? 1 : 0.5;

  // 3. Tara (3 pts)
  const t1 = (((groom.s - bride.s + 27) % 27) + 1) % 9;
  const t2 = (((bride.s - groom.s + 27) % 27) + 1) % 9;
  const badTara = (t: number) => t === 3 || t === 5 || t === 7;
  const tara = !badTara(t1) && !badTara(t2) ? 3 : !badTara(t1) || !badTara(t2) ? 1.5 : 0;

  // 4. Yoni (4 pts)
  const y1 = YONI_ID[groom.s];
  const y2 = YONI_ID[bride.s];
  const yoni = y1 === y2 ? 4 : YONI_ENEMIES[y1] === y2 ? 0 : 2;

  // 5. Graha Maitri (5 pts)
  const lG = SIGN_LORDS[groom.m];
  const lB = SIGN_LORDS[bride.m];
  const f1 = PLANET_FRIENDS[lG]?.[lB] ?? 1;
  const f2 = PLANET_FRIENDS[lB]?.[lG] ?? 1;
  const maitri =
    lG === lB || (f1 === 2 && f2 === 2)
      ? 5
      : (f1 === 2 && f2 === 1) || (f1 === 1 && f2 === 2)
        ? 4
        : f1 === 1 && f2 === 1
          ? 3
          : (f1 === 2 && f2 === 0) || (f1 === 0 && f2 === 2)
            ? 1
            : (f1 === 1 && f2 === 0) || (f1 === 0 && f2 === 1)
              ? 0.5
              : 0;

  // 6. Gana (6 pts)
  const ganaG = GANA_BY_STAR[groom.s];
  const ganaB = GANA_BY_STAR[bride.s];
  const gana =
    ganaG === ganaB
      ? 6
      : (ganaG === "Deva" && ganaB === "Manushya") || (ganaG === "Manushya" && ganaB === "Deva")
        ? 5.5
        : ganaG === "Rakshasa" && ganaB === "Deva"
          ? 1
          : 0;

  // 7. Bhakoot (7 pts)
  const bhakootDist = ((bride.m - groom.m + 12) % 12) + 1;
  const badBhakoot = [2, 12, 5, 9, 6, 8].includes(bhakootDist);
  const bhakoot = !badBhakoot || lG === lB || (f1 === 2 && f2 === 2) ? 7 : 0;

  // 8. Nadi (8 pts)
  const nadi = NADI_BY_STAR[groom.s] !== NADI_BY_STAR[bride.s] ? 8 : 0;

  const kootas = [
    { name: "Varna", score: varna, max: 1, meaning: "Spiritual & ego alignment" },
    { name: "Vashya", score: vashya, max: 2, meaning: "Mutual devotion & attraction" },
    { name: "Tara", score: tara, max: 3, meaning: "Destiny, luck & well-being" },
    { name: "Yoni", score: yoni, max: 4, meaning: "Emotional & physical harmony" },
    { name: "Graha Maitri", score: maitri, max: 5, meaning: "Intellectual friendship" },
    { name: "Gana", score: gana, max: 6, meaning: "Temperament compatibility" },
    { name: "Bhakoot", score: bhakoot, max: 7, meaning: "Family prosperity & growth" },
    { name: "Nadi", score: nadi, max: 8, meaning: "Vitality, health & progeny" },
  ];

  const totalScore = kootas.reduce((acc, k) => acc + k.score, 0);

  let verdict = "Low Compatibility — Consult Remedies";
  if (totalScore >= 32) verdict = "Ati Uttama — Auspicious Divine Match";
  else if (totalScore >= 25) verdict = "Uttama — Very Good Match";
  else if (totalScore >= 18) verdict = "Madhyama — Acceptable Match";

  const manglikHouses = new Set([1, 2, 4, 7, 8, 12]);
  const marsA = chartA.planets.find((p) => p.id === "Mars")?.house;
  const marsB = chartB.planets.find((p) => p.id === "Mars")?.house;
  const isManglikA = marsA != null ? manglikHouses.has(marsA) : null;
  const isManglikB = marsB != null ? manglikHouses.has(marsB) : null;

  let manglikVerdict = "Exact birth times needed for both partners for Manglik check";
  if (isManglikA !== null && isManglikB !== null) {
    if (isManglikA === isManglikB) {
      manglikVerdict = isManglikA
        ? "Balanced (Both partners have Manglik Yoga — Dosha cancels)"
        : "Compatible (Neither partner has Manglik Dosha)";
    } else {
      manglikVerdict = "One partner has Manglik placement — traditional remedy advised";
    }
  }

  return {
    totalScore,
    maxScore: 36,
    verdict,
    kootas,
    manglik: {
      user: isManglikA,
      partner: isManglikB,
      verdict: manglikVerdict,
    },
    userSummary: {
      moonSign: chartA.moonSign,
      nakshatra: chartA.nakshatra.name,
      pada: chartA.nakshatra.pada,
    },
    partnerSummary: {
      moonSign: chartB.moonSign,
      nakshatra: chartB.nakshatra.name,
      pada: chartB.nakshatra.pada,
    },
  };
}
