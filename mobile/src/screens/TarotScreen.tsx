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
    apiRequest("/tarot/cards", undefined, true)
      .then((result: { id: string }[]) => {
        if (mounted.current) setDeck(result);
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
    if (busy || loading || shuffling) return;
    setCards([]);
    setShuffling(true);

    // Smooth riffle & fan animation
    Animated.sequence([
      Animated.timing(shuffleProgress, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(shuffleProgress, {
        toValue: -1,
        duration: 280,
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
        setShuffling(false);
        // Locally shuffle visible cards cleanly without losing responsiveness, then sync server deck
        setDeck((prev) => {
          const copy = [...prev];
          for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
          }
          return copy;
        });
        setRetry((x) => x + 1);
      }
    });
  };

  const choose = (id: string) => {
    if (busy || shuffling) return;
    if (cards.includes(id)) {
      setCards(cards.filter((x) => x !== id));
    } else if (cards.length < targetCount) {
      setCards([...cards, id]);
    }
  };

  const reveal = async () => {
    if (cards.length !== targetCount || busy) return;
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
      if (mounted.current) onReading({ ...result, fromJournal: false });
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : "Could not save your reading.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[s.page, { paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => onNavigate("home")}
          style={{
            width: 40,
            height: 40,
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <Text style={[s.backText, { fontSize: 32, lineHeight: 34 }]}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>Tarot Oracle</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Journal"
          onPress={viewJournal ? () => setViewJournal(false) : loadJournal}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: viewJournal ? C.gold : C.border,
            backgroundColor: viewJournal ? "rgba(243, 197, 86, 0.15)" : C.glass,
          }}
        >
          <Text
            style={{
              color: viewJournal ? C.gold : C.text,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {viewJournal ? "Draw Cards" : "Journal"}
          </Text>
        </Pressable>
      </View>

      {viewJournal ? (
        /* Reading Journal History */
        <View style={{ gap: 14 }}>
          <Text style={s.title}>Your Reading Journal</Text>
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
          {/* Spread Mode Selector */}
          <View style={{ gap: 8 }}>
            <Text style={s.label}>Spread Mode</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(
                [
                  { id: "threeCard" as const, label: "3-Card Spread", icon: "✨" },
                  { id: "daily" as const, label: "Daily Draw", icon: "☀️" },
                  { id: "yesNo" as const, label: "Yes / No", icon: "⚖️" },
                ] as const
              ).map((m) => {
                const isSelected = mode === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
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
            <Text style={s.title}>
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
              {cards.length} of {targetCount} selected • 78-card deck
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Shuffle deck"
              onPress={shuffleDeck}
              disabled={shuffling}
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

          {/* Face-Down Card Grid featuring custom cosmic card_back.png artwork & riffle shuffle animation */}
          {loading ? (
            <Text style={s.sub}>Preparing the 78-card deck…</Text>
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                rowGap: 14,
              }}
            >
              {deck.map((card, i) => {
                const isSelected = cards.includes(card.id);
                const direction = i % 2 === 0 ? 1 : -1;

                const translateX = shuffleProgress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-12 * direction, 0, 14 * direction],
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
                      width: "23%",
                      aspectRatio: 0.56,
                      transform: [
                        { translateX },
                        { rotate: rotateDeg },
                        { scale: isSelected ? 1.06 : scaleShuffle },
                        { translateY: isSelected ? -5 : 0 },
                      ],
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Tarot card ${i + 1}`}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => choose(card.id)}
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        overflow: "hidden",
                        backgroundColor: "transparent",
                        shadowColor: isSelected ? C.gold : undefined,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: isSelected ? 0.9 : 0,
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
                            top: 5,
                            right: 5,
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: C.gold,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: C.onGold,
                              fontSize: 11,
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
              busy
                ? "Drawing your cards…"
                : cards.length === targetCount
                  ? "Continue to Flip Cards"
                  : `Pick ${targetCount - cards.length} card${targetCount - cards.length === 1 ? "" : "s"}`
            }
            disabled={cards.length !== targetCount || busy || loading || shuffling}
            onPress={reveal}
          />
        </>
      )}

      <Text style={s.disclaimer}>{disclaimer}</Text>
    </ScrollView>
  );
}
