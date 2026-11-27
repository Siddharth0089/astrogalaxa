import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Button } from "../components/Button";
import { Screen, TarotReading } from "../types";
import { apiRequest } from "../../session";
import { C, disclaimer } from "../theme/colors";
import { s } from "../theme/styles";

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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const mounted = useRef(true);

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

  const choose = (id: string) => {
    if (busy) return;
    setCards(
      cards.includes(id)
        ? cards.filter((x) => x !== id)
        : cards.length < 3
          ? [...cards, id]
          : cards,
    );
  };

  const reveal = async () => {
    if (cards.length !== 3 || busy) return;
    setBusy(true);
    setError("");
    try {
      const result: TarotReading = await apiRequest(
        "/tarot/readings",
        { topic, cardIds: cards },
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
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => onNavigate("home")}
          style={s.back}
        >
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>Tarot</Text>
        <View style={{ width: 44 }} />
      </View>
      <Text style={s.title}>Pick 3 cards</Text>
      <Text style={s.sub}>
        Think of one question, take a breath, then choose the cards that call to you.
      </Text>
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
      <View style={s.slots}>
        {["Past", "Present", "Future"].map((x, i) => (
          <View style={s.slot} key={x}>
            <Text style={s.sub}>{x}</Text>
            <Text style={s.cardText}>
              {cards[i] === undefined ? "Pick a card" : "Selected"}
            </Text>
          </View>
        ))}
      </View>
      {loading ? (
        <Text style={s.sub}>Preparing your cards…</Text>
      ) : (
        <View style={s.cardGrid}>
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
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: "#FFB4AB" }}>
          {error}
        </Text>
      )}
      {!!error && authenticated && deck.length === 0 && (
        <Button
          label="Try again"
          onPress={() => setRetry((x) => x + 1)}
          variant="glass"
        />
      )}
      <Button
        label={
          busy
            ? "Preparing reading…"
            : cards.length === 3
              ? "Reveal my reading"
              : `Pick ${3 - cards.length} more card${3 - cards.length === 1 ? "" : "s"}`
        }
        disabled={cards.length !== 3 || busy || loading}
        onPress={reveal}
      />
      <Text style={s.disclaimer}>{disclaimer}</Text>
    </ScrollView>
  );
}
