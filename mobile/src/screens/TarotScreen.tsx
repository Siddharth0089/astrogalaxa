import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Button } from "../components/Button";
import { Language, Screen, TarotReading } from "../types";
import { apiRequest } from "../../session";
import { C, disclaimer } from "../theme/colors";
import { getCopy } from "../theme/i18n";
import { s } from "../theme/styles";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CARD_BACK_IMAGE = require("../../assets/card_back.png");

type SpreadMode = "threeCard" | "daily" | "yesNo";
type TopicKey = "Career" | "Love" | "Health" | "Money" | "General";

type TarotQuota = {
  maxDailyCards: number;
  usedToday: number;
  remainingToday: number;
  todaysReadingId: string | null;
};

const QUICK_PROMPTS_BY_LANG: Record<Language, Record<TopicKey, string>> = {
  English: {
    Career: "What energy surrounds my career growth?",
    Love: "What should I understand about love right now?",
    Health: "What restores my mind and body balance?",
    Money: "What is shifting in my financial path?",
    General: "What cosmic message do I need today?",
  },
  Hindi: {
    Career: "मेरे करियर विकास के बारे में क्या संकेत हैं?",
    Love: "अभी मेरे प्रेम और रिश्तों के लिए क्या मार्गदर्शन है?",
    Health: "मेरे स्वास्थ्य और मानसिक शांति के लिए क्या आवश्यक है?",
    Money: "मेरी आर्थिक स्थिति में क्या बदलाव आ रहा है?",
    General: "आज मुझे किस ब्रह्मांडीय संदेश पर ध्यान देना चाहिए?",
  },
  Hinglish: {
    Career: "Mere career growth ke baare me kya sanket hai?",
    Love: "Abhi love aur relationship me kya samajhna zaroori hai?",
    Health: "Meri health aur inner balance kaise behtar hoga?",
    Money: "Mere financial path me kya shift aa raha hai?",
    General: "Aaj mujhe kaunsa cosmic message sunna chahiye?",
  },
};

function SparkleIcon({ size = 14, color = C.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2L14.3 9.7L22 12L14.3 14.3L12 22L9.7 14.3L2 12L9.7 9.7L12 2Z"
        fill={color}
      />
    </Svg>
  );
}

function ShuffleIcon({ size = 14, color = "#F6E7B8" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SacredDivider() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          flex: 1,
          height: 1,
          backgroundColor: "rgba(243, 197, 86, 0.2)",
        }}
      />
      <Text style={{ color: C.gold, fontSize: 11 }}>✦</Text>
      <View
        style={{
          flex: 1,
          height: 1,
          backgroundColor: "rgba(243, 197, 86, 0.2)",
        }}
      />
    </View>
  );
}

export function TarotScreen({
  cards,
  setCards,
  topic,
  setTopic,
  language = "English",
  authenticated,
  onReading,
  onNavigate,
}: {
  cards: string[];
  setCards: React.Dispatch<React.SetStateAction<string[]>>;
  topic: string;
  setTopic: (t: string) => void;
  language?: Language;
  authenticated: boolean;
  onReading: (r: TarotReading) => void;
  onNavigate: (s: Screen) => void;
}) {
  const t = getCopy(language).tarot;
  const activePrompts = QUICK_PROMPTS_BY_LANG[language] || QUICK_PROMPTS_BY_LANG.English;
  const activeTopicKey = (
    (["Career", "Love", "Health", "Money", "General"].includes(topic)
      ? topic
      : "General") as TopicKey
  );
  const localizedTopicLabel = t.topics[activeTopicKey] || topic;

  const [deck, setDeck] = useState<{ id: string }[]>([]);
  const [quota, setQuota] = useState<TarotQuota | null>(null);
  const [mode, setMode] = useState<SpreadMode>("threeCard");
  const [question, setQuestion] = useState("");
  const [showAllCards, setShowAllCards] = useState(false);
  const [viewJournal, setViewJournal] = useState(false);
  const [journal, setJournal] = useState<TarotReading[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shuffling, setShuffling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const shuffleProgress = useRef(new Animated.Value(0)).current;
  const mounted = useRef(true);
  const initialLoaded = useRef(false);
  const initialContext = useRef({ topic, question, showAllCards });
  const autoRevealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeDriver = Platform.OS !== "web";

  const targetCount = mode === "threeCard" ? 3 : 1;
  const remainingToday = quota?.remainingToday ?? 3;
  const maxDailyCards = quota?.maxDailyCards ?? 3;
  const quotaExhausted = quota !== null && remainingToday === 0;
  const spreadExceedsQuota = quota !== null && targetCount > remainingToday;
  const isFilteredByContext =
    !showAllCards && (topic !== "General" || question.trim().length > 0);

  const buildDeckEndpoint = (
    activeTopic: string,
    activeQuestion: string,
    forceAll: boolean,
  ) => {
    const params = new URLSearchParams({ all: "true", topic: activeTopic });
    if (activeQuestion.trim()) params.set("q", activeQuestion.trim());
    if (forceAll) params.set("unfiltered", "true");
    return `/tarot/cards?${params.toString()}`;
  };

  const refreshQuota = async () => {
    try {
      const q: TarotQuota = await apiRequest("/tarot/quota", undefined, true);
      if (mounted.current) {
        setQuota(q);
        if (q.remainingToday > 0 && q.remainingToday < 3) {
          setMode((prev) => (prev === "threeCard" ? "daily" : prev));
        }
      }
    } catch {
      // Preserve current deck state if quota endpoint fails silently
    }
  };

  useEffect(() => {
    mounted.current = true;
    setCards([]);
    if (!authenticated) {
      setLoading(false);
      setError("Sign in to draw a reading.");
      return () => {
        mounted.current = false;
      };
    }
    setLoading(true);
    setError("");
    Promise.all([
      apiRequest(
        buildDeckEndpoint(
          initialContext.current.topic,
          initialContext.current.question,
          initialContext.current.showAllCards,
        ),
        undefined,
        true,
      ),
      apiRequest("/tarot/quota", undefined, true).catch(() => null),
    ])
      .then(([deckResult, quotaResult]: [{ id: string }[], TarotQuota | null]) => {
        if (!mounted.current) return;
        initialLoaded.current = true;
        setDeck(Array.isArray(deckResult) ? deckResult : []);
        if (quotaResult) {
          setQuota(quotaResult);
          if (quotaResult.remainingToday > 0 && quotaResult.remainingToday < 3) {
            setMode((prev) => (prev === "threeCard" ? "daily" : prev));
          }
        }
      })
      .catch((e) => {
        if (mounted.current)
          setError(
            e instanceof Error ? e.message : "Could not load the cards.",
          );
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
      if (autoRevealTimer.current) clearTimeout(autoRevealTimer.current);
    };
  }, [authenticated, retry, setCards]);

  useEffect(() => {
    if (!authenticated || !initialLoaded.current) return;
    const handle = setTimeout(() => {
      apiRequest(buildDeckEndpoint(topic, question, showAllCards), undefined, true)
        .then((deckResult: { id: string }[]) => {
          if (mounted.current && Array.isArray(deckResult)) {
            setCards([]);
            setDeck(deckResult);
          }
        })
        .catch(() => {
          // Keep current visible deck if background filter fails
        });
    }, 320);
    return () => clearTimeout(handle);
  }, [authenticated, topic, question, showAllCards, setCards]);

  const loadJournal = async () => {
    setViewJournal(true);
    setJournalLoading(true);
    try {
      const past = await apiRequest("/tarot/readings", undefined, true);
      if (mounted.current) setJournal(Array.isArray(past) ? past : []);
    } catch {
      if (mounted.current) setJournal([]);
    } finally {
      if (mounted.current) setJournalLoading(false);
    }
  };

  const shuffleDeck = () => {
    if (busy || loading || shuffling || deck.length === 0) return;
    setCards([]);
    setShuffling(true);

    Animated.sequence([
      Animated.timing(shuffleProgress, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(shuffleProgress, {
        toValue: -1,
        duration: 260,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: nativeDriver,
      }),
      Animated.spring(shuffleProgress, {
        toValue: 0,
        friction: 5,
        tension: 45,
        useNativeDriver: nativeDriver,
      }),
    ]).start(() => {
      if (mounted.current) {
        setDeck((prev) => {
          const copy = [...prev];
          for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
          }
          return copy;
        });
        setShuffling(false);
      }
    });
  };

  const submitReading = async (chosenIds: string[]) => {
    if (
      chosenIds.length !== targetCount ||
      busy ||
      quotaExhausted ||
      spreadExceedsQuota
    )
      return;
    setBusy(true);
    setError("");
    const orientations = chosenIds.map(() =>
      Math.random() > 0.3 ? "upright" : "reversed",
    );
    try {
      const result: TarotReading = await apiRequest(
        "/tarot/readings",
        {
          topic,
          cardIds: chosenIds,
          mode,
          question: question.trim() || undefined,
          orientations,
        },
        true,
        "POST",
      );
      if (mounted.current) {
        setQuota((prev) =>
          prev
            ? {
                ...prev,
                usedToday: prev.usedToday + chosenIds.length,
                remainingToday: Math.max(0, prev.remainingToday - chosenIds.length),
                todaysReadingId: result._id || prev.todaysReadingId,
              }
            : prev,
        );
        onReading({ ...result, fromJournal: false });
      }
    } catch (e) {
      if (mounted.current) {
        setError(
          e instanceof Error ? e.message : "Could not save your reading.",
        );
        void refreshQuota();
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const choose = (id: string) => {
    if (busy || shuffling || quotaExhausted || spreadExceedsQuota) return;
    if (autoRevealTimer.current) {
      clearTimeout(autoRevealTimer.current);
      autoRevealTimer.current = null;
    }

    if (cards.includes(id)) {
      setCards(cards.filter((x) => x !== id));
      return;
    }
    if (cards.length >= targetCount) return;

    const next = [...cards, id];
    setCards(next);

    if (next.length === targetCount) {
      autoRevealTimer.current = setTimeout(() => {
        void submitReading(next);
      }, 280);
    }
  };

  const slotLabels =
    mode === "threeCard"
      ? [
          { title: t.slots.past },
          { title: t.slots.present },
          { title: t.slots.future },
        ]
      : [
          {
            title: mode === "yesNo" ? t.slots.verdict : t.slots.guidance,
          },
        ];

  return (
    <ScrollView
      contentContainerStyle={[s.page, { paddingTop: 22, paddingBottom: 112, gap: 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Sacred Editorial Header (No App Bar or Back Button) */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <SparkleIcon size={12} />
            <Text
              style={{
                color: C.gold,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1.7,
                textTransform: "uppercase",
              }}
            >
              {t.eyebrow(deck.length || 78, isFilteredByContext, localizedTopicLabel)}
            </Text>
          </View>
          <Text style={s.title}>
            {viewJournal ? t.titleJournal : t.titleDeck}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={viewJournal ? t.sanctuaryBtn : t.journalBtn}
          onPress={viewJournal ? () => setViewJournal(false) : loadJournal}
          style={{
            marginTop: 4,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: viewJournal ? C.gold : "rgba(243, 197, 86, 0.28)",
            backgroundColor: viewJournal
              ? "rgba(243, 197, 86, 0.16)"
              : "rgba(18, 16, 28, 0.85)",
          }}
        >
          <Svg width={13} height={13} viewBox="0 0 24 24">
            <Path
              d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
              fill="none"
              stroke={viewJournal ? C.gold : "#F6E7B8"}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text
            style={{
              color: viewJournal ? C.gold : "#F6E7B8",
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {viewJournal ? t.sanctuaryBtn : t.journalBtn}
          </Text>
        </Pressable>
      </View>

      {/* Daily Cosmic Allowance Strip */}
      {quota && !viewJournal && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: quotaExhausted
              ? "rgba(255, 180, 171, 0.3)"
              : "rgba(243, 197, 86, 0.24)",
            backgroundColor: "rgba(18, 16, 28, 0.82)",
            gap: 10,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: quotaExhausted ? "#FFB4AB" : "#F6E7B8",
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              {quotaExhausted
                ? t.quotaDone(maxDailyCards)
                : t.quotaLeft(remainingToday, maxDailyCards)}
            </Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>
              {t.quotaHint}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {Array.from({ length: maxDailyCards }).map((_, idx) => {
              const available = idx < remainingToday;
              return (
                <View
                  key={idx}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 4.5,
                    backgroundColor: available ? C.gold : "rgba(255,255,255,0.14)",
                    borderWidth: 1,
                    borderColor: available
                      ? "rgba(243, 197, 86, 0.9)"
                      : "rgba(255,255,255,0.18)",
                  }}
                />
              );
            })}
          </View>
        </View>
      )}

      {viewJournal ? (
        /* Illuminated Spiritual Journal History */
        <View style={{ gap: 14 }}>
          <Text style={s.sub}>{t.journalSub}</Text>

          {journalLoading ? (
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.22)",
                backgroundColor: "rgba(18, 16, 28, 0.78)",
                padding: 20,
              }}
            >
              <Text style={s.sub}>{t.journalLoading}</Text>
            </View>
          ) : journal.length === 0 ? (
            <View
              style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.28)",
                backgroundColor: "rgba(18, 16, 28, 0.8)",
                alignItems: "center",
                padding: 26,
                gap: 12,
              }}
            >
              <SparkleIcon size={28} />
              <Text style={[s.sign, { fontSize: 24 }]}>{t.emptyTitle}</Text>
              <Text style={[s.helper, { textAlign: "center" }]}>
                {t.emptyBody}
              </Text>
              <Button label={t.returnDeckBtn} onPress={() => setViewJournal(false)} />
            </View>
          ) : (
            journal.map((item, idx) => (
              <Pressable
                key={item._id || String(idx)}
                onPress={() => onReading({ ...item, fromJournal: true })}
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(243, 197, 86, 0.26)",
                  backgroundColor: "rgba(18, 16, 28, 0.82)",
                  padding: 18,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <SparkleIcon size={11} />
                    <Text
                      style={{
                        color: C.gold,
                        fontWeight: "700",
                        fontSize: 11,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                      }}
                    >
                      {item.mode === "daily"
                        ? t.modes.daily.label
                        : item.mode === "yesNo"
                          ? t.modes.yesNo.label
                          : t.modes.threeCard.label}{" "}
                      · {t.topics[item.topic as TopicKey] || item.topic}
                    </Text>
                  </View>
                  {item.createdAt && (
                    <Text style={{ color: C.muted, fontSize: 11 }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                {item.question ? (
                  <Text
                    style={{
                      color: "#F7F3EA",
                      fontStyle: "italic",
                      fontSize: 14,
                      lineHeight: 20,
                    }}
                  >
                    &ldquo;{item.question}&rdquo;
                  </Text>
                ) : null}

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {item.cards?.map((c) => (
                    <View
                      key={c.name + c.position}
                      style={{
                        backgroundColor: "rgba(243, 197, 86, 0.08)",
                        borderWidth: 1,
                        borderColor: "rgba(243, 197, 86, 0.2)",
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 9,
                      }}
                    >
                      <Text style={{ color: "#F6E7B8", fontSize: 11, fontWeight: "600" }}>
                        {c.name} {c.orientation === "reversed" ? "↺" : "↑"}
                      </Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : (
        /* Sacred Ritual & Card Picking Flow */
        <>
          {quotaExhausted && (
            <View
              style={{
                borderRadius: 22,
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.34)",
                backgroundColor: "rgba(18, 16, 28, 0.85)",
                padding: 18,
                gap: 10,
                shadowColor: C.gold,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <SparkleIcon size={14} />
                <Text
                  style={{
                    color: C.gold,
                    fontSize: 12,
                    fontWeight: "700",
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  {t.exhaustedTitle}
                </Text>
              </View>
              <Text style={[s.sub, { color: "#EAE3D2", lineHeight: 20 }]}>
                {t.exhaustedBody}
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={loadJournal}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 12,
                    backgroundColor: C.gold,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: C.onGold, fontWeight: "700", fontSize: 13 }}>
                    {t.openJournalBtn}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onNavigate("chat")}
                  style={{
                    flex: 1,
                    paddingVertical: 11,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(243, 197, 86, 0.38)",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#F6E7B8", fontWeight: "600", fontSize: 13 }}>
                    {t.askAiBtn}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Modern Cosmic Segmented Spread Selector */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "rgba(18, 16, 28, 0.85)",
              borderWidth: 1,
              borderColor: "rgba(243, 197, 86, 0.22)",
              borderRadius: 16,
              padding: 4,
              gap: 4,
            }}
          >
            {(
              [
                { id: "threeCard" as const, need: 3 },
                { id: "daily" as const, need: 1 },
                { id: "yesNo" as const, need: 1 },
              ] as const
            ).map((m) => {
              const active = mode === m.id;
              const locked = quota !== null && m.need > remainingToday;
              const modeCopy = t.modes[m.id];
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active, disabled: locked }}
                  onPress={() => {
                    if (locked) {
                      setError(
                        remainingToday === 0
                          ? t.exhaustedBody
                          : t.quotaLeft(remainingToday, maxDailyCards),
                      );
                      return;
                    }
                    setError("");
                    setMode(m.id);
                    setCards([]);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    backgroundColor: active ? C.gold : "transparent",
                    opacity: locked ? 0.42 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: active ? C.onGold : C.text,
                      fontWeight: active ? "700" : "600",
                      fontSize: 12,
                    }}
                  >
                    {modeCopy.label}
                  </Text>
                  <Text
                    style={{
                      color: active ? C.onGold : C.muted,
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    {modeCopy.cap}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Sacred Intention Altar Card */}
          <View
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: "rgba(243, 197, 86, 0.30)",
              backgroundColor: "rgba(18, 16, 28, 0.80)",
              padding: 18,
              gap: 14,
              shadowColor: C.gold,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            {/* Question & Prompt */}
            <View style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <SparkleIcon size={12} />
                  <Text
                    style={{
                      color: C.gold,
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 1.4,
                      textTransform: "uppercase",
                    }}
                  >
                    {t.intentionHeading}
                  </Text>
                </View>
                {!question.trim() ? (
                  <Pressable
                    onPress={() => setQuestion(activePrompts[activeTopicKey] || activePrompts.General)}
                  >
                    <Text style={{ color: "#F6E7B8", fontSize: 11, fontWeight: "600" }}>
                      {t.suggestPrompt}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => setQuestion("")}>
                    <Text style={{ color: C.muted, fontSize: 11, fontWeight: "600" }}>
                      {t.clear}
                    </Text>
                  </Pressable>
                )}
              </View>

              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder={activePrompts[activeTopicKey] || activePrompts.General}
                placeholderTextColor="rgba(196, 196, 204, 0.55)"
                editable={!quotaExhausted}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  borderWidth: 1,
                  borderColor: question.trim()
                    ? "rgba(243, 197, 86, 0.45)"
                    : "rgba(255, 255, 255, 0.12)",
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  color: "#F7F3EA",
                  fontSize: 14,
                }}
              />
            </View>

            {/* Life Area / Relevance Filter */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  color: C.muted,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {t.topicHeading}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                {(["Career", "Love", "Health", "Money", "General"] as const).map((x) => {
                  const selected = topic === x;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t.topics[x]}
                      onPress={() => {
                        setShowAllCards(false);
                        setTopic(x);
                      }}
                      key={x}
                      style={{
                        paddingHorizontal: 13,
                        paddingVertical: 7,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: selected ? C.gold : "rgba(255, 255, 255, 0.14)",
                        backgroundColor: selected
                          ? C.gold
                          : "rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? C.onGold : "#E6E2D8",
                          fontSize: 12,
                          fontWeight: selected ? "700" : "600",
                        }}
                      >
                        {t.topics[x]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <SacredDivider />

            {/* Sanctuary Pedestal Slots */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              {slotLabels.map((slot, i) => {
                const filled = cards[i] !== undefined;
                return (
                  <View
                    key={slot.title}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderStyle: filled ? "solid" : "dashed",
                      borderColor: filled
                        ? "rgba(243, 197, 86, 0.7)"
                        : "rgba(243, 197, 86, 0.25)",
                      backgroundColor: filled
                        ? "rgba(243, 197, 86, 0.09)"
                        : "rgba(255, 255, 255, 0.025)",
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Text
                      style={{
                        color: filled ? C.gold : C.muted,
                        fontSize: 10,
                        fontWeight: "700",
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                      }}
                    >
                      {slot.title}
                    </Text>
                    {filled ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <Image
                          source={CARD_BACK_IMAGE}
                          style={{ width: 16, height: 26, borderRadius: 3 }}
                          resizeMode="cover"
                        />
                        <Text style={{ color: "#F6E7B8", fontSize: 12, fontWeight: "700" }}>
                          {t.slots.drawn}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ color: "rgba(196, 196, 204, 0.65)", fontSize: 11.5 }}>
                        {t.slots.selectBelow}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Instant Action / Reveal Banner */}
          {(cards.length === targetCount || busy) && !quotaExhausted && (
            <Button
              label={busy ? t.revealBusy : t.revealCta}
              disabled={busy || cards.length !== targetCount}
              onPress={() => void submitReading(cards)}
            />
          )}

          {/* Deck Status & Sacred Shuffle Control */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 2,
            }}
          >
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 7,
              }}
            >
              <Text style={{ color: C.secondary, fontSize: 12, fontWeight: "600" }}>
                {isFilteredByContext
                  ? t.attunedLabel(deck.length, localizedTopicLabel)
                  : t.allDeckLabel(deck.length)}
              </Text>
              {(topic !== "General" || question.trim().length > 0) && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowAllCards((v) => !v)}
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "rgba(243, 197, 86, 0.34)",
                    backgroundColor: "rgba(18, 16, 28, 0.78)",
                  }}
                >
                  <Text style={{ color: C.gold, fontSize: 10.5, fontWeight: "700" }}>
                    {showAllCards ? t.attuneToggle : t.viewAllToggle}
                  </Text>
                </Pressable>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.shuffle}
              onPress={shuffleDeck}
              disabled={shuffling || loading || deck.length === 0}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 13,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: "rgba(243, 197, 86, 0.14)",
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.42)",
              }}
            >
              <ShuffleIcon size={13} />
              <Text style={{ color: "#F6E7B8", fontSize: 12, fontWeight: "700" }}>
                {shuffling ? t.shuffling : t.shuffle}
              </Text>
            </Pressable>
          </View>

          {!!error && (
            <Text accessibilityRole="alert" style={{ color: "#FFB4AB" }}>
              {error}
            </Text>
          )}

          {/* Face-Down Card Spread */}
          {loading ? (
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.22)",
                backgroundColor: "rgba(18, 16, 28, 0.78)",
                padding: 20,
                alignItems: "center",
                gap: 8,
              }}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Circle
                  cx="12"
                  cy="12"
                  r="9"
                  fill="none"
                  stroke={C.gold}
                  strokeWidth="1.5"
                />
              </Svg>
              <Text style={s.sub}>{t.loadingDeck}</Text>
            </View>
          ) : deck.length === 0 ? (
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.25)",
                backgroundColor: "rgba(18, 16, 28, 0.8)",
                alignItems: "center",
                padding: 20,
                gap: 10,
              }}
            >
              <Text style={[s.sub, { textAlign: "center" }]}>
                {error || "Unable to load the Tarot deck right now."}
              </Text>
              <Button label={t.retryBtn} onPress={() => setRetry((x) => x + 1)} />
            </View>
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                rowGap: 9,
              }}
            >
              {deck.map((card, i) => {
                const selectionOrder = cards.indexOf(card.id);
                const isSelected = selectionOrder !== -1;
                const direction = i % 2 === 0 ? 1 : -1;

                const translateX = shuffleProgress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-10 * direction, 0, 12 * direction],
                });
                const rotateDeg = shuffleProgress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [`${-6 * direction}deg`, "0deg", `${6 * direction}deg`],
                });
                const scaleShuffle = shuffleProgress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [0.94, 1, 0.94],
                });

                return (
                  <Animated.View
                    key={card.id}
                    style={{
                      width: "15.2%",
                      aspectRatio: 0.56,
                      transform: [
                        { translateX },
                        { rotate: rotateDeg },
                        { scale: isSelected ? 1.09 : scaleShuffle },
                        { translateY: isSelected ? -5 : 0 },
                      ],
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Tarot card ${i + 1}`}
                      accessibilityState={{
                        selected: isSelected,
                        disabled: quotaExhausted || spreadExceedsQuota || busy,
                      }}
                      onPress={() => choose(card.id)}
                      style={{
                        flex: 1,
                        borderRadius: 7,
                        overflow: "hidden",
                        backgroundColor: "transparent",
                        borderWidth: isSelected ? 1.5 : 0,
                        borderColor: isSelected ? C.gold : "transparent",
                        opacity: quotaExhausted || spreadExceedsQuota ? 0.55 : 1,
                        shadowColor: isSelected ? C.gold : undefined,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: isSelected ? 0.95 : 0,
                        shadowRadius: isSelected ? 10 : 0,
                        elevation: isSelected ? 8 : 0,
                      }}
                    >
                      <Image
                        source={CARD_BACK_IMAGE}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="contain"
                      />
                      {isSelected && (
                        <View
                          style={{
                            position: "absolute",
                            top: 3,
                            right: 3,
                            width: 17,
                            height: 17,
                            borderRadius: 8.5,
                            backgroundColor: C.gold,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: C.onGold,
                              fontSize: 9.5,
                              fontWeight: "800",
                            }}
                          >
                            {selectionOrder + 1}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </>
      )}

      <Text style={s.disclaimer}>{disclaimer}</Text>
    </ScrollView>
  );
}
