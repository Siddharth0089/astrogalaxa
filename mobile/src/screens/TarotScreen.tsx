import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
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

type ModeQuota = {
  maxDailyCards: number;
  usedToday: number;
  remainingToday: number;
};

type TarotQuota = {
  maxDailyCards: number;
  usedToday: number;
  remainingToday: number;
  byMode?: Record<SpreadMode, ModeQuota>;
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
    ["Career", "Love", "Health", "Money", "General"].includes(topic)
      ? topic
      : "General"
  ) as TopicKey;
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
  const fanScrollRef = useRef<ScrollView>(null);
  const mounted = useRef(true);
  const initialLoaded = useRef(false);
  const initialContext = useRef({ topic, question, showAllCards });
  const autoRevealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeDriver = Platform.OS !== "web";

  const targetCount = mode === "threeCard" ? 3 : 1;

  const getModeQuota = (m: SpreadMode): ModeQuota => {
    if (quota?.byMode?.[m]) return quota.byMode[m];
    return {
      maxDailyCards: 3,
      usedToday: 0,
      remainingToday: 3,
    };
  };

  const activeQuota = getModeQuota(mode);
  const modeRemaining = activeQuota.remainingToday;
  const modeMax = activeQuota.maxDailyCards;
  const modeExhausted = quota !== null && modeRemaining < targetCount;
  const allModesExhausted =
    quota !== null &&
    getModeQuota("threeCard").remainingToday < 3 &&
    getModeQuota("daily").remainingToday < 1 &&
    getModeQuota("yesNo").remainingToday < 1;

  const otherAvailableModes = (["threeCard", "daily", "yesNo"] as const).filter(
    (m) => {
      if (m === mode) return false;
      const need = m === "threeCard" ? 3 : 1;
      return getModeQuota(m).remainingToday >= need;
    },
  );

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
      if (mounted.current) setQuota(q);
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
        if (quotaResult) setQuota(quotaResult);
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
            fanScrollRef.current?.scrollTo({ x: 0, animated: true });
          }
        })
        .catch(() => {
          // Keep current visible deck if background filter fails
        });
    }, 320);
    return () => clearTimeout(handle);
  }, [authenticated, topic, question, showAllCards, setCards]);

  useEffect(() => {
    if (!viewJournal || Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setViewJournal(false);
      return true;
    });
    return () => sub.remove();
  }, [viewJournal]);

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
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(shuffleProgress, {
        toValue: -1,
        duration: 240,
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
        fanScrollRef.current?.scrollTo({ x: 0, animated: true });
        setShuffling(false);
      }
    });
  };

  const submitReading = async (chosenIds: string[]) => {
    if (chosenIds.length !== targetCount || busy || modeExhausted) return;
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
        setQuota((prev) => {
          if (!prev?.byMode) return prev;
          const prevMode = prev.byMode[mode];
          const nextUsed = prevMode.usedToday + chosenIds.length;
          return {
            ...prev,
            usedToday: prev.usedToday + chosenIds.length,
            remainingToday: Math.max(0, prev.remainingToday - chosenIds.length),
            todaysReadingId: result._id || prev.todaysReadingId,
            byMode: {
              ...prev.byMode,
              [mode]: {
                ...prevMode,
                usedToday: nextUsed,
                remainingToday: Math.max(0, prevMode.maxDailyCards - nextUsed),
              },
            },
          };
        });
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
    if (busy || shuffling || modeExhausted) return;
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

      {/* Active Mode Daily Allowance Strip */}
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
            borderColor: modeExhausted
              ? "rgba(255, 180, 171, 0.3)"
              : "rgba(243, 197, 86, 0.24)",
            backgroundColor: "rgba(18, 16, 28, 0.82)",
            gap: 10,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                color: modeExhausted ? "#FFB4AB" : "#F6E7B8",
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              {mode === "threeCard"
                ? t.modeQuotaLeft(modeRemaining >= 3 ? 1 : 0, 1, t.modes.threeCard.label)
                : t.modeQuotaLeft(modeRemaining, modeMax, t.modes[mode].label)}
            </Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>
              {t.quotaHint}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {(["threeCard", "daily", "yesNo"] as const).map((m) => {
              const need = m === "threeCard" ? 3 : 1;
              const open = getModeQuota(m).remainingToday >= need;
              return (
                <View
                  key={m}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 4.5,
                    backgroundColor: open ? C.gold : "rgba(255,255,255,0.14)",
                    borderWidth: 1,
                    borderColor:
                      m === mode
                        ? "#FFF"
                        : open
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
        /* Sacred Ritual & Interactive Horizontal Fan Ribbon */
        <>
          {/* Modern Cosmic Segmented Spread Selector (All 3 Sections Independently Available) */}
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
              const qm = getModeQuota(m.id);
              const doneForMode = quota !== null && qm.remainingToday < m.need;
              const modeCopy = t.modes[m.id];
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
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
                  }}
                >
                  <Text
                    style={{
                      color: active ? C.onGold : doneForMode ? C.muted : C.text,
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
                    {doneForMode
                      ? "✓"
                      : m.id === "threeCard"
                        ? modeCopy.cap
                        : `${qm.remainingToday}/${qm.maxDailyCards}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {modeExhausted && (
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
                  {allModesExhausted
                    ? t.exhaustedTitle
                    : t.modeDoneTitle(t.modes[mode].label)}
                </Text>
              </View>
              <Text style={[s.sub, { color: "#EAE3D2", lineHeight: 20 }]}>
                {allModesExhausted ? t.exhaustedBody : t.modeDoneBody}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
                {otherAvailableModes.map((alt) => (
                  <Pressable
                    key={alt}
                    accessibilityRole="button"
                    onPress={() => {
                      setMode(alt);
                      setCards([]);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: C.gold,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: C.onGold, fontWeight: "700", fontSize: 12.5 }}>
                      {t.modes[alt].label} ({getModeQuota(alt).remainingToday})
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={loadJournal}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(243, 197, 86, 0.38)",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#F6E7B8", fontWeight: "600", fontSize: 12.5 }}>
                    {t.openJournalBtn}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onNavigate("chat")}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.16)",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: C.text, fontWeight: "600", fontSize: 12.5 }}>
                    {t.askAiBtn}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

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
                editable={!modeExhausted}
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
                const isNextSlot = !filled && i === cards.length && !modeExhausted;
                return (
                  <View
                    key={slot.title}
                    style={{
                      flex: 1,
                      borderRadius: 14,
                      borderWidth: isNextSlot ? 1.5 : 1,
                      borderStyle: filled || isNextSlot ? "solid" : "dashed",
                      borderColor: filled
                        ? "rgba(243, 197, 86, 0.78)"
                        : isNextSlot
                          ? "rgba(243, 197, 86, 0.52)"
                          : "rgba(243, 197, 86, 0.22)",
                      backgroundColor: filled
                        ? "rgba(243, 197, 86, 0.12)"
                        : isNextSlot
                          ? "rgba(243, 197, 86, 0.05)"
                          : "rgba(255, 255, 255, 0.025)",
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Text
                      style={{
                        color: filled || isNextSlot ? C.gold : C.muted,
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
                      <Text
                        style={{
                          color: isNextSlot ? "#F6E7B8" : "rgba(196, 196, 204, 0.65)",
                          fontSize: 11.5,
                          fontWeight: isNextSlot ? "600" : "400",
                        }}
                      >
                        {t.slots.selectBelow}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Clear Progress / Instant Reveal Banner (Always visible above the deck!) */}
          {!modeExhausted && (
            cards.length === targetCount || busy ? (
              <Button
                label={busy ? t.revealBusy : t.revealCta}
                disabled={busy || cards.length !== targetCount}
                onPress={() => void submitReading(cards)}
              />
            ) : (
              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: cards.length > 0 ? "rgba(243, 197, 86, 0.36)" : "rgba(243, 197, 86, 0.18)",
                  backgroundColor: cards.length > 0 ? "rgba(243, 197, 86, 0.08)" : "rgba(18, 16, 28, 0.72)",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: cards.length > 0 ? "#F6E7B8" : C.secondary,
                    fontSize: 12.5,
                    fontWeight: cards.length > 0 ? "700" : "500",
                  }}
                >
                  {cards.length > 0 ? `${cards.length}/${targetCount} · ` : ""}
                  {t.swipeHint(Math.max(1, targetCount - cards.length))}
                </Text>
                {cards.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setCards([])}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(243, 197, 86, 0.3)",
                    }}
                  >
                    <Text style={{ color: C.gold, fontSize: 11, fontWeight: "700" }}>
                      {t.clear}
                    </Text>
                  </Pressable>
                )}
              </View>
            )
          )}

          {!!error && (
            <Text accessibilityRole="alert" style={{ color: "#FFB4AB" }}>
              {error}
            </Text>
          )}

          {/* Midnight Velvet Horizontal Card Fan Ribbon Stage */}
          {loading ? (
            <View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.24)",
                backgroundColor: "rgba(14, 12, 24, 0.78)",
                padding: 24,
                alignItems: "center",
                gap: 10,
              }}
            >
              <Svg width={26} height={26} viewBox="0 0 24 24">
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
                borderRadius: 22,
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
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.26)",
                backgroundColor: "rgba(14, 12, 24, 0.78)",
                paddingTop: 14,
                paddingBottom: 14,
                gap: 8,
                overflow: "hidden",
              }}
            >
              {/* Top Filter & Shuffle Strip inside the Velvet Stage */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  <Text style={{ color: C.secondary, fontSize: 11.5, fontWeight: "600" }}>
                    {isFilteredByContext
                      ? t.attunedLabel(deck.length, localizedTopicLabel)
                      : t.allDeckLabel(deck.length)}
                  </Text>
                  {(topic !== "General" || question.trim().length > 0) && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setShowAllCards((v) => !v)}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: "rgba(243, 197, 86, 0.34)",
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
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
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 11,
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

              {/* Smooth Horizontally Swipeable Overlapping Curved Card Ribbon */}
              <ScrollView
                ref={fanScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 22,
                  paddingTop: 26,
                  paddingBottom: 22,
                  alignItems: "center",
                }}
              >
                {deck.map((card, i) => {
                  const selectionOrder = cards.indexOf(card.id);
                  const isSelected = selectionOrder !== -1;
                  const direction = i % 2 === 0 ? 1 : -1;

                  const wavePhase = (i % 7) - 3;
                  const idleTiltDeg = isSelected ? 0 : wavePhase * 2.1;
                  const idleArcY = isSelected ? -18 : Math.abs(wavePhase) * 3.5;

                  const shuffleTranslateX = shuffleProgress.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [-16 * direction, 0, 18 * direction],
                  });
                  const shuffleScale = shuffleProgress.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [0.92, 1, 0.92],
                  });

                  return (
                    <Animated.View
                      key={card.id}
                      style={{
                        width: 94,
                        aspectRatio: 0.56,
                        marginLeft: i === 0 ? 0 : -34,
                        zIndex: isSelected ? 200 + selectionOrder : i + 1,
                        transform: [
                          { translateX: shuffleTranslateX },
                          { translateY: idleArcY },
                          { rotate: `${idleTiltDeg}deg` },
                          { scale: isSelected ? 1.09 : shuffleScale },
                        ],
                      }}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Tarot card ${i + 1}`}
                        accessibilityState={{
                          selected: isSelected,
                          disabled: modeExhausted || busy,
                        }}
                        onPress={() => choose(card.id)}
                        style={{
                          flex: 1,
                          borderRadius: 11,
                          overflow: "hidden",
                          backgroundColor: "#0B0A14",
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected
                            ? C.gold
                            : "rgba(243, 197, 86, 0.25)",
                          opacity: modeExhausted ? 0.5 : 1,
                          shadowColor: isSelected ? C.gold : "#000",
                          shadowOffset: { width: -2, height: isSelected ? 6 : 4 },
                          shadowOpacity: isSelected ? 0.95 : 0.55,
                          shadowRadius: isSelected ? 12 : 6,
                          elevation: isSelected ? 12 : 4,
                        }}
                      >
                        <Image
                          source={CARD_BACK_IMAGE}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                        {isSelected && (
                          <View
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              backgroundColor: C.gold,
                              alignItems: "center",
                              justifyContent: "center",
                              shadowColor: "#000",
                              shadowOpacity: 0.4,
                              shadowRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                color: C.onGold,
                                fontSize: 11,
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
              </ScrollView>

              {/* Swipe Guidance Hint */}
              <Text
                style={{
                  color: C.muted,
                  fontSize: 11,
                  textAlign: "center",
                  paddingHorizontal: 16,
                }}
              >
                {t.swipeHint(Math.max(1, targetCount - cards.length))}
              </Text>
            </View>
          )}
        </>
      )}

      <Text style={s.disclaimer}>{disclaimer}</Text>
    </ScrollView>
  );
}
