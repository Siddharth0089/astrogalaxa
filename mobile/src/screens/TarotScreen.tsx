import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Button } from "../components/Button";
import { Screen, TarotReading } from "../types";
import { apiRequest } from "../../session";
import { C, disclaimer } from "../theme/colors";
import { s } from "../theme/styles";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const shuffleAnim = useRef(new Animated.Value(0)).current;
  const mounted = useRef(true);

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
    if (busy || loading) return;
    setCards([]);
    Animated.sequence([
      Animated.timing(shuffleAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(shuffleAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
    setRetry((x) => x + 1);
  };

  const choose = (id: string) => {
    if (busy) return;
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
    // Randomize upright / reversed orientations for each drawn card
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
      if (mounted.current) onReading(result);
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
    <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
      {/* App Bar */}
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => onNavigate("home")}
          style={s.back}
        >
          <Text style={s.backText}>‹</Text>
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
          <Text style={{ color: viewJournal ? C.gold : C.text, fontSize: 12, fontWeight: "600" }}>
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
                onPress={() => onReading(item)}
                style={[s.card, { gap: 8, padding: 16 }]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
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
                    "{item.question}"
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
                ? "Focus your energy and select 1 card to guide your day."
                : mode === "yesNo"
                  ? "Hold a direct question in your mind and pull 1 card for clarity."
                  : "Think of your situation, breathe deeply, and choose the 3 cards that call to you."}
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
                  {cards[i] === undefined ? "Pick a card" : "✓ Selected"}
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
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
                backgroundColor: "rgba(243, 197, 86, 0.12)",
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.3)",
              }}
            >
              <Text style={{ fontSize: 13 }}>🔀</Text>
              <Text style={{ color: "#F6E7B8", fontSize: 12, fontWeight: "600" }}>
                Shuffle Deck
              </Text>
            </Pressable>
          </View>

          {/* Cards Grid with shuffle transform animation */}
          {loading ? (
            <Text style={s.sub}>Preparing the 78-card deck…</Text>
          ) : (
            <Animated.View
              style={[
                s.cardGrid,
                {
                  transform: [
                    {
                      scale: shuffleAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [1, 0.95, 1],
                      }),
                    },
                    {
                      rotate: shuffleAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: ["0deg", "3deg", "0deg"],
                      }),
                    },
                  ],
                },
              ]}
            >
              {deck.map((card, i) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Tarot card ${i + 1}`}
                  accessibilityState={{ selected: cards.includes(card.id) }}
                  onPress={() => choose(card.id)}
                  key={card.id}
                  style={[s.tarotBack, cards.includes(card.id) && s.selectedCard]}
                >
                  <Svg viewBox="0 0 50 70" width="80%" height="80%">
                    <Rect
                      x="3"
                      y="3"
                      width="44"
                      height="64"
                      rx="3"
                      fill="none"
                      stroke={cards.includes(card.id) ? C.onGold : C.gold}
                    />
                    <Circle
                      cx="25"
                      cy="31"
                      r="9"
                      fill="none"
                      stroke={cards.includes(card.id) ? C.onGold : C.gold}
                    />
                    <Path
                      d="M25 16v-5 M25 46v5 M10 31H5 M40 31h5 M14 20l-3-3 M36 42l3 3 M36 20l3-3 M14 42l-3 3"
                      stroke={cards.includes(card.id) ? C.onGold : C.gold}
                      strokeWidth="1.5"
                    />
                  </Svg>
                </Pressable>
              ))}
            </Animated.View>
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
                ? "Interpreting cards…"
                : cards.length === targetCount
                  ? "Reveal my reading"
                  : `Pick ${targetCount - cards.length} card${targetCount - cards.length === 1 ? "" : "s"}`
            }
            disabled={cards.length !== targetCount || busy || loading}
            onPress={reveal}
          />
        </>
      )}

      <Text style={s.disclaimer}>{disclaimer}</Text>
    </ScrollView>
  );
}
