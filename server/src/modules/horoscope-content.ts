const content: Record<string, [string, string, string, number]> = {
  Aries: [
    "A fresh idea may be worth exploring at your own pace.",
    "Make room to listen before deciding.",
    "Red",
    5,
  ],
  Taurus: [
    "A steady approach can help you make progress today.",
    "Give your attention to one practical priority.",
    "Green",
    6,
  ],
  Gemini: [
    "A conversation may offer a different perspective.",
    "Ask questions and leave room for curiosity.",
    "Yellow",
    3,
  ],
  Cancer: [
    "Consider what would help you feel supported today.",
    "Balance care for others with time for yourself.",
    "White",
    2,
  ],
  Leo: [
    "Your creativity may benefit from a little quiet space.",
    "Share an idea while staying open to feedback.",
    "Gold",
    1,
  ],
  Virgo: [
    "Small improvements can make a task feel more manageable.",
    "Choose progress over perfection.",
    "Green",
    5,
  ],
  Libra: [
    "A balanced conversation could clarify your priorities.",
    "Give each option a fair look.",
    "Pink",
    6,
  ],
  Scorpio: [
    "A little reflection may reveal what deserves your attention.",
    "Take your time before sharing a decision.",
    "Maroon",
    9,
  ],
  Sagittarius: [
    "Curiosity can bring a fresh outlook to a familiar routine.",
    "Explore one idea with an open mind.",
    "Purple",
    3,
  ],
  Capricorn: [
    "Steady steps can support a longer-term intention.",
    "Set a realistic goal for today.",
    "Brown",
    8,
  ],
  Aquarius: [
    "An unusual idea may invite a useful conversation.",
    "Listen to different perspectives.",
    "Blue",
    4,
  ],
  Pisces: [
    "A quiet moment may help you reconnect with your priorities.",
    "Make space for rest and creativity.",
    "Sea green",
    7,
  ],
};
export function seedHoroscope(sign: string) {
  const item = content[sign];
  if (!item) return null;
  const [text, advice, luckyColor, luckyNumber] = item;
  return { text, advice, luckyColor, luckyNumber, source: "seed" as const };
}
