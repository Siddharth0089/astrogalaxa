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

const localizedTranslations: Record<
  string,
  {
    Hindi: [string, string, string];
    Hinglish: [string, string, string];
  }
> = {
  Aries: {
    Hindi: [
      "आज एक नए विचार पर शांत गति से आगे बढ़ना लाभदायक रहेगा।",
      "निर्णय लेने से पहले दूसरों की बात सुनने के लिए समय दें।",
      "लाल",
    ],
    Hinglish: [
      "Aaj ek naya idea aapke liye fruitful ho sakta hai, bas apni pace par aage badhein.",
      "Faisla lene se pehle doosron ki baat dhyaan se sunein.",
      "Red",
    ],
  },
  Taurus: {
    Hindi: [
      "स्थिर और धैर्यपूर्ण दृष्टिकोण आज आपको प्रगति दिलाएगा।",
      "आज किसी एक व्यावहारिक प्राथमिकता पर ध्यान केंद्रित करें।",
      "हरा",
    ],
    Hinglish: [
      "Steady aur patient approach se aaj aapko achhi progress milegi.",
      "Ek zaroori kaam par apna poora focus rakhein.",
      "Green",
    ],
  },
  Gemini: {
    Hindi: [
      "आज की कोई बातचीत आपको एक नया और उपयोगी दृष्टिकोण दे सकती है।",
      "सवाल पूछें और नई बातों के प्रति जिज्ञासु बने रहें।",
      "पीला",
    ],
    Hinglish: [
      "Aaj ki ek meaningful baat-cheet aapko naya nazariya de sakti hai.",
      "Curiosity banaye rakhein aur zaroori sawaal poochhne mein na hichkichayein.",
      "Yellow",
    ],
  },
  Cancer: {
    Hindi: [
      "आज विचार करें कि आपको मानसिक शांति और सहारा कैसे मिल सकता है।",
      "दूसरों की देखभाल के साथ-साथ स्वयं के लिए भी समय निकालें।",
      "सफेद",
    ],
    Hinglish: [
      "Aaj dhyaan dein ki aapko emotional support aur peace kis cheez se milti hai.",
      "Doosron ki care ke saath-saath apne liye bhi thoda waqt zaroor nikaalein.",
      "White",
    ],
  },
  Leo: {
    Hindi: [
      "थोड़े एकांत और शांति से आपकी रचनात्मकता निखर कर आएगी।",
      "अपने विचार साझा करें और सुझावों के प्रति खुले रहें।",
      "सुनहरा",
    ],
    Hinglish: [
      "Thode shaant waqt mein aapki creativity aur bhi nikhar kar aayegi.",
      "Apna idea share karein aur positive feedback ke liye open rahein.",
      "Gold",
    ],
  },
  Virgo: {
    Hindi: [
      "छोटे-छोटे सुधार आज किसी बड़े कार्य को आसान बना सकते हैं।",
      "पूर्णता की चिंता छोड़कर निरंतर प्रगति को चुनें।",
      "हरा",
    ],
    Hinglish: [
      "Chhote-chhote improvements aaj aapke mushkil kaam ko aasaan bana denge.",
      "Perfection ke peeche bhaagne ke bajay steady progress ko chunein.",
      "Green",
    ],
  },
  Libra: {
    Hindi: [
      "संतुलित संवाद आज आपकी प्राथमिकताओं को स्पष्ट कर सकता है।",
      "हर विकल्प को निष्पक्ष और शांत मन से परखें।",
      "गुलाबी",
    ],
    Hinglish: [
      "Ek balanced baat-cheet aaj aapki priorities ko clear kar sakti hai.",
      "Har option ko bina jaldbazi ke fair tareeke se dekhein.",
      "Pink",
    ],
  },
  Scorpio: {
    Hindi: [
      "थोड़ा आत्मचिंतन यह स्पष्ट कर देगा कि किस बात पर ध्यान देना जरूरी है।",
      "अपना निर्णय साझा करने से पहले पर्याप्त समय लें।",
      "मैरून",
    ],
    Hinglish: [
      "Thoda self-reflection aapko batayega ki aaj sabse zaroori kya hai.",
      "Apna decision share karne se pehle thoda soch-samajh lein.",
      "Maroon",
    ],
  },
  Sagittarius: {
    Hindi: [
      "जिज्ञासा आज आपकी दैनिक दिनचर्या में एक नई ऊर्जा ला सकती है।",
      "खुले मन से किसी नए विचार को जानने का प्रयास करें।",
      "बैंगनी",
    ],
    Hinglish: [
      "Aapki curiosity aaj rozana ke routine mein ek fresh spark la sakti hai.",
      "Open mind ke saath kisi naye vichaar ko explore karein.",
      "Purple",
    ],
  },
  Capricorn: {
    Hindi: [
      "निरंतर और धैर्यपूर्ण कदम आपके दीर्घकालिक लक्ष्य को मजबूत करेंगे।",
      "आज के लिए एक व्यावहारिक और स्पष्ट लक्ष्य निर्धारित करें।",
      "भूरा",
    ],
    Hinglish: [
      "Aapke steady steps aaj kisi long-term goal ko strong support denge.",
      "Aaj ke liye ek realistic aur clear target set karein.",
      "Brown",
    ],
  },
  Aquarius: {
    Hindi: [
      "एक अनोखा विचार आज किसी सार्थक संवाद की शुरुआत कर सकता है।",
      "विभिन्न दृष्टिकोणों को धैर्य और खुले मन से सुनें।",
      "नीला",
    ],
    Hinglish: [
      "Ek alag aur naya idea aaj ek kaam ki conversation shuru kar sakta hai.",
      "Alag-alag perspectives ko dhyan se sunein.",
      "Blue",
    ],
  },
  Pisces: {
    Hindi: [
      "शांत वातावरण में बिताया समय आपकी प्राथमिकताओं को फिर से जोड़ सकता है।",
      "आज विश्राम और रचनात्मकता के लिए स्थान बनाएं।",
      "समुद्री हरा",
    ],
    Hinglish: [
      "Shaanti ke kuch pal aapko apni asli priorities se wapas jodenge.",
      "Aaj aaram aur creativity ke liye thoda waqt zaroor rakhein.",
      "Sea green",
    ],
  },
};

export function seedHoroscope(sign: string) {
  const item = content[sign];
  if (!item) return null;
  const [text, advice, luckyColor, luckyNumber] = item;
  return { text, advice, luckyColor, luckyNumber, source: "seed" as const };
}

export function localizeHoroscope<
  T extends {
    sign?: string | null;
    text?: string | null;
    advice?: string | null;
    luckyColor?: string | null;
  },
>(horoscope: T, language?: string | null): T {
  if (!language || language === "English" || !horoscope.sign) {
    return horoscope;
  }
  const t = localizedTranslations[horoscope.sign];
  if (!t) return horoscope;
  if (language === "Hindi") {
    return {
      ...horoscope,
      text: t.Hindi[0],
      advice: t.Hindi[1],
      luckyColor: t.Hindi[2],
    };
  }
  if (language === "Hinglish") {
    return {
      ...horoscope,
      text: t.Hinglish[0],
      advice: t.Hinglish[1],
      luckyColor: t.Hinglish[2],
    };
  }
  return horoscope;
}
