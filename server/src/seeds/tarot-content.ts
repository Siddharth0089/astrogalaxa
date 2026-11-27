// Comprehensive 78-Card Tarot Deck (22 Major Arcana + 56 Minor Arcana)
// Interpretations include upright, reversed, keywords, love, career, advice, and Yes/No indicators.

export interface TarotCardDef {
  number: number;
  numeral: string;
  name: string;
  suit: "Major" | "Wands" | "Cups" | "Swords" | "Pentacles";
  keywords: [string, string, string];
  artKey: string;
  meanings: {
    upright: string;
    reversed: string;
    love: string;
    career: string;
    advice: string;
    yesNo: "Yes" | "No" | "Maybe";
    past: string;
    present: string;
    future: string;
  };
}

const majorRaw: [string, string, string, string, string, string, "Yes" | "No" | "Maybe"][] = [
  ["The Fool", "beginnings", "curiosity", "openness", "Take a courageous leap into new beginnings with childlike wonder.", "Hesitation, recklessness, or fear of stepping into the unknown.", "Yes"],
  ["The Magician", "initiative", "skill", "resourcefulness", "You have all tools and creative power needed to manifest your goal.", "Untapped potential, trickery, or scattered willpower.", "Yes"],
  ["The High Priestess", "intuition", "stillness", "inner knowledge", "Listen to subtle inner wisdom, dreams, and unspoken truths.", "Ignoring your intuition, surface distractions, or keeping secrets.", "Yes"],
  ["The Empress", "nurture", "creativity", "growth", "A fertile period of sensory abundance, mothering love, and artistic birth.", "Creative blockage, smothering tendencies, or self-neglect.", "Yes"],
  ["The Emperor", "structure", "stability", "responsibility", "Establish clear boundaries, disciplined strategy, and sovereign order.", "Rigidity, tyranny, or loss of practical control.", "Yes"],
  ["The Hierophant", "tradition", "learning", "guidance", "Seek trusted mentorship, spiritual principles, and proven traditions.", "Challenging outdated dogma, blind conformity, or personal ethos.", "Maybe"],
  ["The Lovers", "connection", "values", "choice", "Sacred union, alignment of heartfelt desires, and core values choice.", "Disharmony, conflict in priorities, or fear of commitment.", "Yes"],
  ["The Chariot", "direction", "determination", "movement", "Triumph achieved through focused willpower and disciplined drive.", "Loss of control, obstacles, or aimless aggression.", "Yes"],
  ["Strength", "courage", "patience", "compassion", "True power lies in gentle patience, inner resilience, and self-acceptance.", "Self-doubt, raw vulnerability, or giving in to impulse.", "Yes"],
  ["The Hermit", "reflection", "solitude", "insight", "Step back into peaceful stillness to illuminate your authentic path.", "Loneliness, anti-social withdrawal, or ignoring inner light.", "Maybe"],
  ["Wheel of Fortune", "cycles", "change", "adaptability", "Karmic turning points, destiny shifts, and auspicious new chapters.", "Temporary bad luck, resistance to change, or breaking negative cycles.", "Yes"],
  ["Justice", "fairness", "accountability", "balance", "Truth reveals itself; cause and effect resolve in cosmic equilibrium.", "Dishonesty, unfair treatment, or refusing accountability.", "Maybe"],
  ["The Hanged Man", "perspective", "pause", "letting go", "Surrender control to see the world from an enlightened new vantage.", "Futile resistance, needless sacrifice, or chronic indecision.", "Maybe"],
  ["Death", "transition", "endings", "renewal", "A major chapter closes so vibrant new rebirth can take root.", "Clinging to what has died, fear of letting go, or stagnant delay.", "Yes"],
  ["Temperance", "moderation", "balance", "integration", "Harmonious blending of opposites, patient healing, and inner peace.", "Excess, imbalance, discord, or rushing natural processes.", "Yes"],
  ["The Devil", "attachment", "awareness", "choice", "Unmasking shadow habits, codependency, and material entrapments.", "Breaking free from limiting bonds, reclaiming autonomy.", "No"],
  ["The Tower", "disruption", "clarity", "rebuilding", "Sudden breakthrough sweeps away fragile illusions to reveal bedrock truth.", "Disaster averted, delaying inevitable upheaval, fear of change.", "No"],
  ["The Star", "hope", "healing", "renewal", "Renewed faith, divine inspiration, and serene emotional tranquility.", "Despair, discouragement, or temporary loss of spiritual hope.", "Yes"],
  ["The Moon", "uncertainty", "intuition", "reflection", "Navigating mysteries, illusion, and subconscious emotional currents.", "Clearing confusion, overcoming fear, or deceptive secrets unmasked.", "Maybe"],
  ["The Sun", "clarity", "vitality", "joy", "Radiant joy, breakthrough clarity, celebration, and abundant success.", "Temporary gloom, dimmed vitality, or delayed fulfillment.", "Yes"],
  ["Judgement", "reflection", "renewal", "accountability", "A cosmic wake-up call to rise into your authentic higher calling.", "Self-judgment, regret, or refusing to heed the call.", "Yes"],
  ["The World", "completion", "integration", "wholeness", "Triumphant culmination of a great journey, fulfillment, and unity.", "Unfinished business, delayed closure, or seeking empty perfection.", "Yes"],
];

const roman = [
  "0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI",
];

const suits = [
  {
    name: "Wands" as const,
    element: "Fire",
    domain: "passion, inspiration, ambition, and dynamic action",
    ranks: [
      ["Ace of Wands", "spark", "inspiration", "momentum", "Creative spark and passionate new enterprise.", "Delayed ignition or hesitation.", "Yes"],
      ["Two of Wands", "planning", "vision", "foresight", "Bold vision and charting future expansions.", "Fear of the unknown or playing too small.", "Yes"],
      ["Three of Wands", "expansion", "progress", "confidence", "Ships returning with fruitful horizons and overseas gains.", "Delays, frustrated plans, or missed overseas ventures.", "Yes"],
      ["Four of Wands", "celebration", "harmony", "homecoming", "Joyful celebration, wedding, homecoming, and stability.", "Family tension, postponed party, or unstable home.", "Yes"],
      ["Five of Wands", "competition", "rivalry", "tension", "Creative friction, competitive debates, and brainstorming clash.", "Avoiding conflict or resolving longstanding rivalries.", "No"],
      ["Six of Wands", "victory", "acclaim", "recognition", "Public triumph, pride, recognition, and well-earned victory.", "Fallen pride, delayed laurels, or private imposter syndrome.", "Yes"],
      ["Seven of Wands", "resilience", "defense", "courage", "Standing your ground firmly against competitive pressure.", "Overwhelmed, yielding ground, or defensiveness.", "Yes"],
      ["Eight of Wands", "speed", "communication", "swiftness", "Rapid alignment, incoming news, and swift forward acceleration.", "Delays, misunderstandings, or reckless haste.", "Yes"],
      ["Nine of Wands", "perseverance", "stamina", "vigilance", "The final stretch of resilience; guard your victory.", "Exhaustion, giving up near the finish line, or paranoia.", "Maybe"],
      ["Ten of Wands", "burden", "responsibility", "strain", "Carrying heavy workloads; delegate before collapse.", "Dropping unnecessary burdens and lightening your load.", "No"],
      ["Page of Wands", "enthusiasm", "discovery", "potential", "Eager messenger bringing creative ideas and playful curiosity.", "Fickle interest, procrastination, or disappointing news.", "Yes"],
      ["Knight of Wands", "adventure", "passion", "boldness", "Daring courage and swift, charismatic action.", "Impatience, reckless temperament, or scattered fury.", "Yes"],
      ["Queen of Wands", "charisma", "vitality", "confidence", "Radiant independence, creative warmth, and magnetism.", "Jealousy, demanding nature, or burnt-out flame.", "Yes"],
      ["King of Wands", "leadership", "visionary", "influence", "Visionary leader inspiring wholehearted collective triumph.", "Impulsive ruler, domineering will, or ruthless pride.", "Yes"],
    ] as [string, string, string, string, string, string, "Yes" | "No" | "Maybe"][],
  },
  {
    name: "Cups" as const,
    element: "Water",
    domain: "emotions, relationships, intuition, and heartfelt healing",
    ranks: [
      ["Ace of Cups", "love", "overflow", "intuition", "Overflowing love, heart awakening, and emotional blessings.", "Blocked emotions, heartbreak, or feeling drained.", "Yes"],
      ["Two of Cups", "partnership", "affinity", "bond", "Reciprocal romantic attraction, soul kinship, and mutual respect.", "Imbalance in love, broken trust, or disconnection.", "Yes"],
      ["Three of Cups", "friendship", "gathering", "joy", "Joyous sisterhood, celebratory gathering, and shared laughter.", "Gossip, overindulgence, or feeling left out of the group.", "Yes"],
      ["Four of Cups", "apathy", "contemplation", "re-evaluation", "Apathy or feeling uninspired; an offer is waiting unnoticed.", "Sudden awakening, noticing new opportunities, and gratitude.", "No"],
      ["Five of Cups", "grief", "regret", "forgiveness", "Mourning spilt cups, yet two full cups remain behind you.", "Accepting loss, turning around, and emotional healing.", "No"],
      ["Six of Cups", "nostalgia", "innocence", "reunion", "Sweet childhood memories, kind gestures, and soul reunions.", "Living in the past, outgrown patterns, or idealizing youth.", "Yes"],
      ["Seven of Cups", "options", "illusion", "imagination", "Vivid imagination, wishful thinking, and multiple choices.", "Cutting through illusions and making decisive commitments.", "Maybe"],
      ["Eight of Cups", "departure", "transition", "seeking", "Walking away from what no longer feeds your soul.", "Fear of moving on, clinging to stale comforts, or stagnation.", "Yes"],
      ["Nine of Cups", "contentment", "wish", "gratitude", "The Wish Card: emotional fulfillment, joy, and deep satisfaction.", "Smugness, superficial pleasure, or unfulfilled desires.", "Yes"],
      ["Ten of Cups", "bliss", "family", "harmony", "Lasting emotional harmony, supportive family, and blessed joy.", "Domestic discord, strained relationships, or shattered peace.", "Yes"],
      ["Page of Cups", "sensitivity", "wonder", "message", "A sweet heartfelt message, artistic inspiration, and tender heart.", "Emotional immaturity, drama, or overlooked intuitive nudges.", "Yes"],
      ["Knight of Cups", "romance", "idealism", "charm", "Poetic lover offering sincere gifts, devotion, and romantic quest.", "Moodiness, unrealistic fantasies, or emotional flattery.", "Yes"],
      ["Queen of Cups", "compassion", "empathy", "intuition", "Deep emotional wisdom, psychic warmth, and loving embrace.", "Emotional overwhelm, martyrdom, or codependency.", "Yes"],
      ["King of Cups", "mastery", "balance", "calm", "Emotional equilibrium, diplomatic grace, and calm wisdom.", "Suppressed feelings, emotional manipulation, or inner turmoil.", "Yes"],
    ] as [string, string, string, string, string, string, "Yes" | "No" | "Maybe"][],
  },
  {
    name: "Swords" as const,
    element: "Air",
    domain: "intellect, truth, clarity, challenges, and mental discernment",
    ranks: [
      ["Ace of Swords", "clarity", "truth", "breakthrough", "Razor-sharp mental clarity, cutting through confusion to truth.", "Muddled thinking, cutting words, or misunderstood intentions.", "Yes"],
      ["Two of Swords", "stalemate", "decision", "balance", "A crossroads requiring careful balance; remove the blindfold.", "Indecision, information overload, or forced choice.", "Maybe"],
      ["Three of Swords", "heartbreak", "release", "truth", "Painful emotional release, grief, and truth that hurts then heals.", "Healing from heartbreak, forgiving the past, and optimism.", "No"],
      ["Four of Swords", "rest", "recovery", "peace", "Necessary retreat, mental restoration, and meditation pause.", "Restlessness, burnout from not pausing, or waking up refreshed.", "Maybe"],
      ["Five of Swords", "conflict", "defeat", "compromise", "Hollow victory; win at all costs leaves bitter regrets.", "Desire to resolve conflict, making amends, and moving on.", "No"],
      ["Six of Swords", "passage", "healing", "calm", "Transition to smoother waters; leaving turbulence behind.", "Unresolved baggage, rough crossings, or emotional delay.", "Yes"],
      ["Seven of Swords", "strategy", "stealth", "caution", "Strategic discretion, working independently, or tactful planning.", "Deception uncovered, confession, or rethinking bad tactics.", "No"],
      ["Eight of Swords", "entrapment", "beliefs", "release", "Feeling trapped by limiting mental narratives; step out of bonds.", "Realizing freedom, shedding limiting beliefs, and courage.", "No"],
      ["Nine of Swords", "anxiety", "worry", "healing", "Midnight anxiety, overthinking, and catastrophizing worst fears.", "Reaching out for help, shadows dispersing at sunrise.", "No"],
      ["Ten of Swords", "culmination", "release", "dawn", "The absolute end of a painful cycle; dawn breaks on the horizon.", "Surviving the worst, beginning of recovery, and resurrection.", "No"],
      ["Page of Swords", "curiosity", "vigilance", "mental spark", "Inquisitive mind, defending principles, and thirst for knowledge.", "Gossip, cynical sharpness, or talking without listening.", "Yes"],
      ["Knight of Swords", "haste", "conviction", "directness", "Fearless intellectual charge, sharp intellect, and bold pursuit.", "Reckless speech, arrogance, or bulldozing others' feelings.", "Yes"],
      ["Queen of Swords", "discernment", "honesty", "independence", "Uncompromising honesty, fair judgment, and intellectual sovereignty.", "Cold bitterness, critical aloofness, or emotional isolation.", "Yes"],
      ["King of Swords", "authority", "truth", "logic", "Wise intellectual leadership, impartial judgment, and ethical power.", "Dictatorial logic, emotional coldness, or harsh judgment.", "Yes"],
    ] as [string, string, string, string, string, string, "Yes" | "No" | "Maybe"][],
  },
  {
    name: "Pentacles" as const,
    element: "Earth",
    domain: "material wealth, career, physical wellness, and tangible mastery",
    ranks: [
      ["Ace of Pentacles", "opportunity", "prosperity", "grounding", "Tangible seed of wealth, career promotion, and physical vitality.", "Lost financial chance, greed, or ungrounded venture.", "Yes"],
      ["Two of Pentacles", "balance", "adaptability", "juggling", "Skillful balancing of priorities, flexibility, and financial agility.", "Overwhelmed juggle, financial overextension, or dropped balls.", "Maybe"],
      ["Three of Pentacles", "collaboration", "mastery", "craft", "Synergistic teamwork, craftsmanship praise, and shared success.", "Lack of team cooperation, poor quality, or unappreciated work.", "Yes"],
      ["Four of Pentacles", "security", "conservation", "frugality", "Financial conservation, building security, and protective bounds.", "Greed, miserly hoarding, or fear of scarcity blocking flow.", "Maybe"],
      ["Five of Pentacles", "hardship", "isolation", "shelter", "Temporary financial chill or isolation; seek warm sanctuary near.", "Financial recovery, discovering assistance, and overcoming lack.", "No"],
      ["Six of Pentacles", "generosity", "sharing", "charity", "Fair exchange of gifts, generosity received and shared gladly.", "Strings-attached charity, financial imbalance, or debt stress.", "Yes"],
      ["Seven of Pentacles", "patience", "investment", "harvest", "Patient nurturing of long-term investments; harvest approaches.", "Impatience, poor returns, or reconsidering where you invest.", "Maybe"],
      ["Eight of Pentacles", "craftsmanship", "dedication", "diligence", "Devoted craftsmanship, mastery of skills, and focused labor.", "Boring repetition, perfectionism, or shortcutting standards.", "Yes"],
      ["Nine of Pentacles", "abundance", "luxury", "independence", "Elegant self-reliance, financial comfort, and solitary pleasure.", "Superficial luxury, overspending, or lonely accomplishment.", "Yes"],
      ["Ten of Pentacles", "legacy", "wealth", "family", "Generational abundance, permanent security, and enduring legacy.", "Inheritance disputes, financial loss, or family division.", "Yes"],
      ["Page of Pentacles", "study", "ambition", "groundwork", "Conscientious student laying practical groundwork for goals.", "Procrastination, lack of follow-through, or lazy neglect.", "Yes"],
      ["Knight of Pentacles", "reliability", "perseverance", "routine", "Unshakeable work ethic, loyal perseverance, and methodical gain.", "Stubborn slowness, workaholic burnout, or boring monotony.", "Yes"],
      ["Queen of Pentacles", "nurture", "practicality", "resourcefulness", "Warm grounded hospitality, financial acumen, and earth wisdom.", "Smothering materialism, work-life disarray, or self-doubt.", "Yes"],
      ["King of Pentacles", "prosperity", "security", "mastery", "Master of worldly success, financial abundance, and stability.", "Greedy empire, stubborn conservatism, or financial ruin.", "Yes"],
    ] as [string, string, string, string, string, string, "Yes" | "No" | "Maybe"][],
  },
];

const rankNumerals = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Page", "Knight", "Queen", "King"];

export const tarotContent: TarotCardDef[] = [];

// Populate 22 Major Arcana (numbers 0 to 21)
majorRaw.forEach(([name, first, second, third, upright, reversed, yesNo], index) => {
  tarotContent.push({
    number: index,
    numeral: roman[index],
    name,
    suit: "Major",
    keywords: [first, second, third],
    artKey: `major-${index}`,
    meanings: {
      upright,
      reversed,
      love: `In love, cultivate ${first} and ${second} to deepen intimacy.`,
      career: `In your career, apply ${second} and ${third} to achieve success.`,
      advice: `Honor ${first} as you navigate this chapter.`,
      yesNo,
      past: `Consider how ${first} or ${second} has shaped your path so far.`,
      present: `Notice where ${first} and ${second} might be useful in your situation today.`,
      future: `As you move forward, consider how ${third} could inform your choices.`,
    },
  });
});

// Populate 56 Minor Arcana (numbers 22 to 77)
let counter = 22;
suits.forEach((suitObj) => {
  suitObj.ranks.forEach(([name, first, second, third, upright, reversed, yesNo], rIndex) => {
    tarotContent.push({
      number: counter,
      numeral: rankNumerals[rIndex],
      name,
      suit: suitObj.name,
      keywords: [first, second, third],
      artKey: `${suitObj.name.toLowerCase()}-${rIndex + 1}`,
      meanings: {
        upright,
        reversed,
        love: `Focus on ${first} and emotional harmony in relationships.`,
        career: `Channel ${second} and ${third} into your professional pursuits.`,
        advice: `Ground yourself in ${first} and move forward with clarity.`,
        yesNo,
        past: `Reflect on how ${first} in your past set the groundwork for today.`,
        present: `Harness ${second} right now to align with your highest good.`,
        future: `Look forward to ${third} opening rewarding horizons ahead.`,
      },
    });
    counter++;
  });
});
