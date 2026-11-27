export const PLANET_MEANINGS: Record<string, { role: string; symbol: string }> = {
  Sun: {
    symbol: "Su",
    role: "Represents your soul, ego, vitality, willpower, father, and career authority.",
  },
  Moon: {
    symbol: "Mo",
    role: "Represents your mind, emotions, intuition, inner peace, mother, and daily comfort.",
  },
  Mars: {
    symbol: "Ma",
    role: "Represents courage, physical energy, drive, ambition, siblings, and real estate.",
  },
  Mercury: {
    symbol: "Me",
    role: "Represents intellect, speech, logic, business acumen, learning, and adaptability.",
  },
  Jupiter: {
    symbol: "Ju",
    role: "Represents wisdom, expansion, higher knowledge, spirituality, children, and fortune.",
  },
  Venus: {
    symbol: "Ve",
    role: "Represents love, marriage, beauty, creativity, luxury, relationships, and harmony.",
  },
  Saturn: {
    symbol: "Sa",
    role: "Represents discipline, karma, longevity, perseverance, service, and lasting success.",
  },
  Rahu: {
    symbol: "Ra",
    role: "North lunar node — represents intense worldly desires, innovation, foreign links, and breakthroughs.",
  },
  Ketu: {
    symbol: "Ke",
    role: "South lunar node — represents past-life mastery, detachment, intuition, and spiritual liberation.",
  },
};

export const HOUSE_MEANINGS: Record<number, { title: string; meaning: string }> = {
  1: { title: "1st House (Tanu · Self)", meaning: "Personality, physical appearance, health, and overall life direction." },
  2: { title: "2nd House (Dhana · Wealth)", meaning: "Accumulated wealth, family upbringing, speech, values, and food." },
  3: { title: "3rd House (Sahaja · Effort)", meaning: "Courage, communication, younger siblings, skills, and short journeys." },
  4: { title: "4th House (Sukha · Home)", meaning: "Inner happiness, mother, ancestral roots, property, vehicles, and peace." },
  5: { title: "5th House (Putra · Creativity)", meaning: "Intelligence, romance, creativity, education, children, and past merits." },
  6: { title: "6th House (Ari · Service)", meaning: "Daily work, health routines, overcoming obstacles, debts, and competition." },
  7: { title: "7th House (Yuvati · Partnership)", meaning: "Marriage, committed life partner, business alliances, and public dealings." },
  8: { title: "8th House (Randhra · Transformation)", meaning: "Sudden changes, longevity, hidden research, shared assets, and rebirth." },
  9: { title: "9th House (Bhagya · Fortune)", meaning: "Dharma, higher wisdom, mentors, long travel, beliefs, and grace." },
  10: { title: "10th House (Karma · Career)", meaning: "Profession, public reputation, social status, achievements, and duty." },
  11: { title: "11th House (Labha · Gains)", meaning: "Income, fulfilling desires, elder siblings, friendships, and networks." },
  12: { title: "12th House (Vyaya · Release)", meaning: "Spirituality, subconscious mind, foreign lands, solitude, charity, and rest." },
};

export const CHART_GUIDES: Record<string, { title: string; summary: string }> = {
  lagna: {
    title: "Janma Kundli (D1 Lagna Chart)",
    summary:
      "Your primary birth blueprint calculated from your Ascendant sign. House 1 sits at the top center diamond (North Indian) or marked 'Asc' (South Indian), showing where planets influence key areas of life.",
  },
  chandra: {
    title: "Chandra Kundli (Moon Chart)",
    summary:
      "Places your natal Moon Sign in the 1st House. Essential for understanding emotional patterns, mental resilience, daily transits (Gochar), and Sade Sati.",
  },
  d9: {
    title: "Navamsa Chart (D9)",
    summary:
      "The 9th harmonic divisional chart—vital in Vedic astrology for evaluating marriage compatibility, inner planetary maturity, dharma, and true strength in the second half of life.",
  },
  d10: {
    title: "Dasamsa Chart (D10)",
    summary:
      "The 10th harmonic divisional chart dedicated strictly to career trajectory, professional achievements, leadership authority, and public reputation.",
  },
};

export const AVAKHADA_GUIDE: Record<string, string> = {
  Varna: "Reflects spiritual temperament and intellectual alignment (Brahmin, Kshatriya, Vaishya, Shudra).",
  Vashya: "Indicates magnetic attraction and natural adaptability between individuals.",
  Yoni: "Symbolic animal instinct showing emotional intimacy and physical compatibility.",
  Gana: "Core nature archetype: Deva (gentle/refined), Manushya (balanced/practical), or Rakshasa (intense/independent).",
  Nadi: "Vitality and biological temperament (Adi, Madhya, Antya) — carries highest weight (8/36) in Gun Milan.",
  Tatva: "Elemental nature of your Moon sign (Fire, Earth, Air, or Water) shaping reactions and feelings.",
  Payaa: "Symbolizes the Moon's natal house placement (Gold, Silver, Copper, or Iron foot).",
  Manglik: "Checks whether Mars sits in Houses 1, 2, 4, 7, 8, or 12, reflecting high relationship drive & vitality.",
};

export const PANCHANG_GUIDE: { label: string; desc: string }[] = [
  {
    label: "Tithi & Paksha",
    desc: "The lunar phase day (1–15) in the waxing (Shukla) or waning (Krishna) fortnight; governs emotional flow and timing.",
  },
  {
    label: "Vara",
    desc: "The Vedic weekday ruled by a specific planet (e.g., Friday ruled by Venus for harmony & creativity).",
  },
  {
    label: "Nakshatra",
    desc: "The Moon's current lunar constellation (1 of 27 stars) shaping today's subtle mood and inspiration.",
  },
  {
    label: "Yoga & Karana",
    desc: "Combined Sun–Moon angular alignment measuring general auspiciousness and task completion energy.",
  },
  {
    label: "Abhijit Muhurat",
    desc: "Midday ~48-minute auspicious solar window considered supportive for starting important endeavors.",
  },
  {
    label: "Rahu Kaal",
    desc: "A ~90-minute daily shadow window traditionally avoided for launching major new ventures or ceremonies.",
  },
];

export const DIGNITY_GUIDE: Record<string, string> = {
  Exalted: "At maximum cosmic strength and clarity—delivering constructive, uplifting results effortlessly.",
  "Own Sign": "Comfortable in its own home sign—confident, natural, and dependable energy.",
  Debilitated: "Needs conscious effort and mindful focus to unlock hidden potential and lessons.",
  Vargottama: "Occupies the same sign in both Birth (D1) and Navamsa (D9)—magnifying long-term stability.",
  Retrograde: "Appears moving backward from Earth (*); turns the planet's energy inward for deep reflection.",
  Combust: "Very close to the Sun—the planet's outward expression is absorbed by the Sun's bright focus.",
};
