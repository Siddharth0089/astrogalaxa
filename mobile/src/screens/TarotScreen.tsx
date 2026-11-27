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
import { Button } from "../components/Button";
import { Screen, TarotReading } from "../types";
import { apiRequest } from "../../session";
import { C, disclaimer } from "../theme/colors";
import { s } from "../theme/styles";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CARD_BACK_IMAGE = require("../../assets/card_back.png");

type SpreadMode = "daily" | "threeCard" | "yesNo";

type TarotQuota = {
  maxDailyCards: number;
  usedToday: number;
  remainingToday: number;
  todaysReadingId: string | null;
};

export function TarotScreen({
  cards,
  setCards,
  topic,
  setTopic,
  authenticated,
  onReading,
  onNavigate,
}: {
  cards: string[];
  setCards: React.Dispatch<React.SetStateAction<string[]>>;
  topic: string;
  setTopic: (t: string) => void;
  authenticated: boolean;
  onReading: (r: TarotReading) => void;
  onNavigate: (s: Screen) => void;
}) {
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

  // Initial deck + quota load
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

  // Live filter deck in-place when Life Area or Question changes (no full-screen reload)
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

    let next: string[];
    if (cards.includes(id)) {
      next = cards.filter((x) => x !== id);
      setCards(next);
      return;
    }
    if (cards.length >= targetCount) return;

    next = [...cards, id];
    setCards(next);

    // Automatically open flip reveal & prediction as soon as the final needed card is picked
    if (next.length === targetCount) {
      autoRevealTimer.current = setTimeout(() => {
        void submitReading(next);
      }, 280);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[s.page, { paddingTop: 22, paddingBottom: 110, gap: 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Spiritual Editorial Header (No App Bar or Back Button) */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: C.gold,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.8,
              textTransform: "uppercase",
            }}
          >
            ✦ Sacred Tarot · {isFilteredByContext ? `${deck.length} Attuned` : `${deck.length || 78}-Card Arcana`}
          </Text>
          <Text style={s.title}>
            {viewJournal ? "Reading Journal" : "Tarot Sanctuary"}
          </Text>
          {quota && !viewJournal && (
            <View style={{ gap: 4, marginTop: 4 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: quotaExhausted
                    ? "rgba(255, 180, 171, 0.35)"
                    : "rgba(243, 197, 86, 0.35)",
                  backgroundColor: quotaExhausted
                    ? "rgba(255, 180, 171, 0.1)"
                    : "rgba(243, 197, 86, 0.1)",
                }}
              >
                <Text
                  style={{
                    color: quotaExhausted ? "#FFB4AB" : "#F6E7B8",
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  {quotaExhausted
                    ? `0 of ${maxDailyCards} daily cards left today`
                    : `${remainingToday} of ${maxDailyCards} daily cards left today`}
                </Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 11 }}>
                Shared daily allowance: 3-Card (3) · Daily Draw (1 each) · Yes/No (1 each)
              </Text>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={viewJournal ? "Back to deck" : "View Journal"}
          onPress={viewJournal ? () => setViewJournal(false) : loadJournal}
          style={{
            marginTop: 4,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: viewJournal ? C.gold : C.border,
            backgroundColor: viewJournal ? "rgba(243, 197, 86, 0.16)" : C.glass,
          }}
        >
          <Text
            style={{
              color: viewJournal ? C.gold : C.text,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {viewJournal ? "Draw Cards" : "Journal"}
          </Text>
        </Pressable>
      </View>

      {viewJournal ? (
        /* Reading Journal History */
        <View style={{ gap: 14 }}>
          <Text style={s.sub}>
            Revisit your previous tarot draws, cards, and personalized insights over time.
          </Text>

          {journalLoading ? (
            <Text style={s.sub}>Loading your journal…</Text>
          ) : journal.length === 0 ? (
            <View style={[s.card, { alignItems: "center", padding: 24, gap: 10 }]}>
              <Text style={{ fontSize: 32 }}>🔮</Text>
              <Text style={s.cardTitle}>No Past Readings Yet</Text>
              <Text style={[s.helper, { textAlign: "center" }]}>
                Draw your first card to record guidance in your personal spiritual journal.
              </Text>
              <Button label="Draw Cards Now" onPress={() => setViewJournal(false)} />
            </View>
          ) : (
            journal.map((item, idx) => (
              <Pressable
                key={item._id || String(idx)}
                onPress={() => onReading({ ...item, fromJournal: true })}
                style={[s.card, { gap: 8, padding: 16 }]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: C.gold, fontWeight: "700", fontSize: 14 }}>
                    {item.mode === "daily"
                      ? "Daily Draw"
                      : item.mode === "yesNo"
                        ? "Yes / No Pull"
                        : "3-Card Spread"}{" "}
                    • {item.topic}
                  </Text>
                  {item.createdAt && (
                    <Text style={{ color: C.muted, fontSize: 11 }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                {item.question && (
                  <Text style={{ color: "#E0D7C6", fontStyle: "italic", fontSize: 13 }}>
                    &ldquo;{item.question}&rdquo;
                  </Text>
                )}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {item.cards?.map((c) => (
                    <View
                      key={c.name + c.position}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.06)",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: C.text, fontSize: 11 }}>
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
        /* Card Drawing Experience */
        <>
          {quotaExhausted && (
            <View
              style={[
                s.card,
                {
                  padding: 18,
                  gap: 10,
                  borderColor: "rgba(243, 197, 86, 0.35)",
                  backgroundColor: "rgba(243, 197, 86, 0.06)",
                },
              ]}
            >
              <Text style={{ color: C.gold, fontSize: 15, fontWeight: "700" }}>
                ✨ Daily 3-Card Sanctuary Complete
              </Text>
              <Text style={[s.sub, { lineHeight: 20 }]}>
                You have used all 3 daily cards across 3-Card, Daily Draw, and Yes/No spreads today. Fresh draws unlock at midnight.
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
                    Open Today&apos;s Journal
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
                    borderColor: "rgba(243, 197, 86, 0.4)",
                    backgroundColor: C.glass,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: C.text, fontWeight: "600", fontSize: 13 }}>
                    Ask AI Pandit
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Spread Mode Selector */}
          <View style={{ gap: 8 }}>
            <Text style={s.label}>Spread Mode</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(
                [
                  { id: "threeCard" as const, label: "3-Card", cap: "3 cards", icon: "✨", need: 3 },
                  { id: "daily" as const, label: "Daily Draw", cap: "1 card", icon: "☀️", need: 1 },
                  { id: "yesNo" as const, label: "Yes / No", cap: "1 card", icon: "⚖️", need: 1 },
                ] as const
              ).map((m) => {
                const isSelected = mode === m.id;
                const locked = quota !== null && m.need > remainingToday;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      if (locked) {
                        setError(
                          remainingToday === 0
                            ? "Daily 3-card limit reached for today. Visit your Journal or ask AI Pandit."
                            : `Only ${remainingToday} daily card${remainingToday === 1 ? "" : "s"} left today — choose Daily Draw or Yes / No.`,
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
                      paddingHorizontal: 6,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isSelected ? C.gold : C.border,
                      backgroundColor: isSelected ? C.gold : C.glass,
                      opacity: locked ? 0.45 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? C.onGold : C.text,
                        fontWeight: isSelected ? "700" : "600",
                        fontSize: 12,
                      }}
                    >
                      {m.icon} {m.label}
                    </Text>
                    <Text
                      style={{
                        color: isSelected ? C.onGold : C.muted,
                        fontSize: 10,
                        fontWeight: "600",
                      }}
                    >
                      {m.cap}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Optional Question Input */}
          <View style={{ gap: 6 }}>
            <Text style={s.label}>Your Question (optional)</Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="e.g. Will I get my promotion or new love soon?"
              placeholderTextColor={C.muted}
              editable={!quotaExhausted}
              style={{
                backgroundColor: C.glass,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: C.text,
                fontSize: 14,
              }}
            />
          </View>

          {/* Life Area / Topic Chips */}
          <View style={{ gap: 6 }}>
            <Text style={s.label}>Life Area (filters relevant cards)</Text>
            <View style={s.chips}>
              {["Career", "Love", "Health", "Money", "General"].map((x) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: topic === x }}
                  accessibilityLabel={x}
                  onPress={() => {
                    setShowAllCards(false);
                    setTopic(x);
                  }}
                  key={x}
                >
                  <Text style={[s.chip, topic === x && s.chipActive]}>{x}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Selection Slots */}
          <View style={s.slots}>
            {(mode === "threeCard"
              ? ["Past", "Present", "Future"]
              : [mode === "yesNo" ? "Verdict" : "Daily Guidance"]
            ).map((x, i) => (
              <View style={s.slot} key={x}>
                <Text style={s.sub}>{x}</Text>
                <Text
                  style={[
                    s.cardText,
                    {
                      color: cards[i] !== undefined ? C.gold : C.muted,
                      fontWeight: cards[i] !== undefined ? "700" : "400",
                    },
                  ]}
                >
                  {cards[i] === undefined ? "Pick a card" : "✓ Ready to flip"}
                </Text>
              </View>
            ))}
          </View>

          {/* Instant Action / Reveal Banner (Right above the deck so user never needs to scroll past cards) */}
          {(cards.length === targetCount || busy) && !quotaExhausted && (
            <Button
              label={busy ? "Flipping & Reading Your Cards…" : "✨ Flip & Reveal Prediction"}
              disabled={busy || cards.length !== targetCount}
              onPress={() => void submitReading(cards)}
            />
          )}

          {/* Filter indicator + Shuffle Deck Action */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginTop: 2,
            }}
          >
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <Text style={[s.helper, { marginVertical: 0 }]}>
                {cards.length}/{targetCount} picked •{" "}
                {isFilteredByContext
                  ? `${deck.length} ${topic}-aligned`
                  : `${deck.length}-card deck`}
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
                    borderColor: "rgba(243, 197, 86, 0.3)",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <Text style={{ color: C.gold, fontSize: 10.5, fontWeight: "700" }}>
                    {showAllCards ? "Filter Relevant" : "Show All 78"}
                  </Text>
                </Pressable>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Shuffle deck"
              onPress={shuffleDeck}
              disabled={shuffling || loading || deck.length === 0}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: "rgba(243, 197, 86, 0.14)",
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.38)",
              }}
            >
              <Text style={{ fontSize: 13 }}>🔀</Text>
              <Text style={{ color: "#F6E7B8", fontSize: 12, fontWeight: "700" }}>
                {shuffling ? "Shuffling…" : "Shuffle"}
              </Text>
            </Pressable>
          </View>

          {!!error && (
            <Text accessibilityRole="alert" style={{ color: "#FFB4AB" }}>
              {error}
            </Text>
          )}

          {/* Face-Down Card Grid featuring custom cosmic card_back.png artwork & in-place riffle animation */}
          {loading ? (
            <Text style={s.sub}>Preparing your deck…</Text>
          ) : deck.length === 0 ? (
            <View style={[s.card, { alignItems: "center", padding: 18, gap: 10 }]}>
              <Text style={[s.sub, { textAlign: "center" }]}>
                {error || "Unable to load the Tarot deck right now."}
              </Text>
              <Button label="Retry" onPress={() => setRetry((x) => x + 1)} />
            </View>
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                rowGap: 8,
              }}
            >
              {deck.map((card, i) => {
                const isSelected = cards.includes(card.id);
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
                        { scale: isSelected ? 1.08 : scaleShuffle },
                        { translateY: isSelected ? -4 : 0 },
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
                        opacity: quotaExhausted || spreadExceedsQuota ? 0.55 : 1,
                        shadowColor: isSelected ? C.gold : undefined,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: isSelected ? 0.9 : 0,
                        shadowRadius: isSelected ? 8 : 0,
                        elevation: isSelected ? 6 : 0,
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
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: C.gold,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: C.onGold,
                              fontSize: 9,
                              fontWeight: "800",
                            }}
                          >
                            ✓
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
