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
  const nativeDriver = Platform.OS !== "web";

  const targetCount = mode === "threeCard" ? 3 : 1;
  const remainingToday = quota?.remainingToday ?? 3;
  const maxDailyCards = quota?.maxDailyCards ?? 3;
  const quotaExhausted = quota !== null && remainingToday === 0;
  const spreadExceedsQuota = quota !== null && targetCount > remainingToday;

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
      apiRequest("/tarot/cards?all=true", undefined, true),
      apiRequest("/tarot/quota", undefined, true).catch(() => null),
    ])
      .then(([deckResult, quotaResult]: [{ id: string }[], TarotQuota | null]) => {
        if (!mounted.current) return;
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
    };
  }, [authenticated, retry, setCards]);

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

    // Smooth riffle & fan animation with in-place 78-card Fisher-Yates shuffle (no full-screen reload)
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

  const choose = (id: string) => {
    if (busy || shuffling || quotaExhausted || spreadExceedsQuota) return;
    if (cards.includes(id)) {
      setCards(cards.filter((x) => x !== id));
    } else if (cards.length < targetCount) {
      setCards([...cards, id]);
    }
  };

  const reveal = async () => {
    if (
      cards.length !== targetCount ||
      busy ||
      quotaExhausted ||
      spreadExceedsQuota
    )
      return;
    setBusy(true);
    setError("");
    const orientations = cards.map(() =>
      Math.random() > 0.3 ? "upright" : "reversed",
    );
    try {
      const result: TarotReading = await apiRequest(
        "/tarot/readings",
        {
          topic,
          cardIds: cards,
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
                usedToday: prev.usedToday + cards.length,
                remainingToday: Math.max(0, prev.remainingToday - cards.length),
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

  return (
    <ScrollView
      contentContainerStyle={[s.page, { paddingTop: 22, paddingBottom: 100, gap: 16 }]}
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
            ✦ Sacred Tarot · {deck.length || 78}-Card Arcana
          </Text>
          <Text style={s.title}>
            {viewJournal ? "Reading Journal" : "Tarot Sanctuary"}
          </Text>
          {quota && !viewJournal && (
            <View
              style={{
                alignSelf: "flex-start",
                marginTop: 4,
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
                  ? `0 of ${maxDailyCards} daily cards remaining today`
                  : `${remainingToday} of ${maxDailyCards} daily cards left today`}
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
                You have drawn all 3 daily cards for today to keep your guidance centered and clear. Fresh draws unlock at midnight.
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
                  { id: "threeCard" as const, label: "3-Card Spread", icon: "✨", need: 3 },
                  { id: "daily" as const, label: "Daily Draw", icon: "☀️", need: 1 },
                  { id: "yesNo" as const, label: "Yes / No", icon: "⚖️", need: 1 },
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
                      height: 44,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isSelected ? C.gold : C.border,
                      backgroundColor: isSelected ? C.gold : C.glass,
                      opacity: locked ? 0.45 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{m.icon}</Text>
                    <Text
                      style={{
                        color: isSelected ? C.onGold : C.text,
                        fontWeight: isSelected ? "700" : "500",
                        fontSize: 12,
                      }}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Heading */}
          <View style={{ gap: 4 }}>
            <Text style={s.cardTitle}>
              {mode === "daily"
                ? "Daily Card Draw"
                : mode === "yesNo"
                  ? "Yes / No Oracle"
                  : "Pick 3 Cards"}
            </Text>
            <Text style={s.sub}>
              {mode === "daily"
                ? "Focus your energy and select 1 face-down card to reveal your day's guidance."
                : mode === "yesNo"
                  ? "Hold a direct question in your mind and select 1 card to flip."
                  : "Think of your situation, breathe deeply, and select the 3 cards that call to you."}
            </Text>
          </View>

          {/* Optional Question Input */}
          <View style={{ gap: 6 }}>
            <Text style={s.label}>Your Question (optional)</Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="e.g. What energy is surrounding my career transition?"
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
            <Text style={s.label}>Life Area</Text>
            <View style={s.chips}>
              {["Career", "Love", "Health", "Money", "General"].map((x) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: topic === x }}
                  accessibilityLabel={x}
                  onPress={() => setTopic(x)}
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

          {/* Shuffle Deck Action */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <Text style={[s.helper, { marginVertical: 0 }]}>
              {cards.length} of {targetCount} selected • {deck.length}-card deck
            </Text>
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
                {shuffling ? "Shuffling…" : "Shuffle Deck"}
              </Text>
            </Pressable>
          </View>

          {/* All 78 Face-Down Cards featuring custom cosmic card_back.png artwork & in-place riffle animation */}
          {loading ? (
            <Text style={s.sub}>Preparing the 78-card deck…</Text>
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
                        disabled: quotaExhausted || spreadExceedsQuota,
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

          {!!error && (
            <Text accessibilityRole="alert" style={{ color: "#FFB4AB" }}>
              {error}
            </Text>
          )}

          {/* Primary Action Button */}
          <Button
            label={
              quotaExhausted
                ? "Daily Limit Reached (3 / 3 Today)"
                : busy
                  ? "Drawing your cards…"
                  : cards.length === targetCount
                    ? "Continue to Flip Cards"
                    : `Pick ${targetCount - cards.length} card${targetCount - cards.length === 1 ? "" : "s"}`
            }
            disabled={
              quotaExhausted ||
              spreadExceedsQuota ||
              cards.length !== targetCount ||
              busy ||
              loading ||
              shuffling
            }
            onPress={reveal}
          />
        </>
      )}

      <Text style={s.disclaimer}>{disclaimer}</Text>
    </ScrollView>
  );
}
