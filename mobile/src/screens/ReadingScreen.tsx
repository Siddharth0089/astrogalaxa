import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button } from "../components/Button";
import { TarotArt } from "../components/TarotArt";
import { Screen, TarotReading } from "../types";
import { C, disclaimer } from "../theme/colors";
import { s } from "../theme/styles";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CARD_BACK_IMAGE = require("../../assets/card_back.png");

type CardItem = TarotReading["cards"][number];

function FlipCard({
  card,
  flipped,
  onFlip,
  isSingle,
}: {
  card: CardItem;
  flipped: boolean;
  onFlip: () => void;
  isSingle: boolean;
}) {
  const flipAnim = useRef(new Animated.Value(flipped ? 1 : 0)).current;
  const nativeDriver = Platform.OS !== "web";
  const isReversed = card.orientation === "reversed";

  useEffect(() => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 1 : 0,
      duration: 580,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start();
  }, [flipped, flipAnim, nativeDriver]);

  // Smooth 3D cross-rotate flip: 0 -> 90deg back fades out, -90deg -> 0 front fades in
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["0deg", "90deg", "90deg"],
  });
  const backScale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.07, 1.07],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });
  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-90deg", "-90deg", "0deg"],
  });
  const frontScale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.07, 1.07, 1],
  });

  return (
    <View
      style={{
        flex: 1,
        maxWidth: isSingle ? 200 : undefined,
        alignItems: "center",
        gap: 8,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          flipped
            ? `${card.name} (${card.position})`
            : `Tap to flip ${card.position} card`
        }
        onPress={onFlip}
        style={{
          width: "100%",
          aspectRatio: 0.56,
          position: "relative",
        }}
      >
        {/* Unflipped Back Face (card_back.png) */}
        <Animated.View
          pointerEvents={flipped ? "none" : "auto"}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: backOpacity,
            transform: [
              { perspective: 1000 },
              { rotateY: backRotate },
              { scale: backScale },
            ],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            source={CARD_BACK_IMAGE}
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Flipped Front Face */}
        <Animated.View
          pointerEvents={flipped ? "auto" : "none"}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: frontOpacity,
            transform: [
              { perspective: 1000 },
              { rotateY: frontRotate },
              { scale: frontScale },
            ],
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: C.gold,
            backgroundColor: "#F5F1E7",
            alignItems: "center",
            justifyContent: "space-around",
            padding: 6,
          }}
        >
          <View
            style={{
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "space-around",
              transform: isReversed ? [{ rotate: "180deg" }] : undefined,
            }}
          >
            <Text style={{ color: "#31281B", fontSize: 11, fontWeight: "700" }}>
              {card.numeral}
            </Text>
            <TarotArt artKey={card.artKey} />
            <Text
              style={{
                color: "#31281B",
                fontSize: 10.5,
                textAlign: "center",
                fontWeight: "700",
                paddingHorizontal: 2,
              }}
            >
              {card.name}
            </Text>
          </View>
        </Animated.View>
      </Pressable>

      {/* Card Label Below */}
      <Text style={{ color: C.gold, fontWeight: "700", fontSize: 12 }}>
        {card.position}
      </Text>
      {flipped ? (
        <Text
          style={{
            color: isReversed ? "#FFB4AB" : "#7FE0A8",
            fontSize: 11,
            fontWeight: "600",
          }}
        >
          {isReversed ? "Reversed ↺" : "Upright ↑"}
        </Text>
      ) : (
        <View
          style={{
            backgroundColor: "rgba(243, 197, 86, 0.14)",
            borderWidth: 1,
            borderColor: "rgba(243, 197, 86, 0.4)",
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: "#F6E7B8", fontSize: 10.5, fontWeight: "600" }}>
            Tap to Flip
          </Text>
        </View>
      )}
    </View>
  );
}

export function ReadingScreen({
  reading,
  onDrawAgain,
  onNavigate,
}: {
  reading: TarotReading | null;
  onDrawAgain: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const [flippedMap, setFlippedMap] = useState<boolean[]>(() =>
    reading ? reading.cards.map(() => Boolean(reading.fromJournal)) : [],
  );

  // Sync flipped array whenever a new reading is loaded
  useEffect(() => {
    if (reading) {
      setFlippedMap(reading.cards.map(() => Boolean(reading.fromJournal)));
    } else {
      setFlippedMap([]);
    }
  }, [reading]);

  const readingFade = useRef(new Animated.Value(0)).current;
  const nativeDriver = Platform.OS !== "web";

  const flippedCount = flippedMap.filter(Boolean).length;
  const totalCount = reading?.cards.length || 0;
  const allFlipped = totalCount > 0 && flippedCount === totalCount;

  useEffect(() => {
    Animated.timing(readingFade, {
      toValue: allFlipped ? 1 : 0,
      duration: 500,
      useNativeDriver: nativeDriver,
    }).start();
  }, [allFlipped, readingFade, nativeDriver]);

  if (!reading)
    return (
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Your Reading</Text>
        <Text style={s.sub}>Choose cards to see your personal reading.</Text>
        <Button label="Pick cards" onPress={onDrawAgain} />
      </ScrollView>
    );

  const isYesNo = reading.mode === "yesNo";
  const primaryVerdict = reading.cards[0]?.yesNo || "Yes";

  const flipCardAt = (index: number) => {
    setFlippedMap((prev) => {
      if (prev[index]) return prev;
      const next = [...prev];
      next[index] = true;
      return next;
    });
  };

  const flipAllCards = () => {
    setFlippedMap(reading.cards.map(() => true));
  };

  return (
    <ScrollView
      contentContainerStyle={[s.page, { paddingBottom: 40, gap: 18 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Title & Mode */}
      <View style={{ gap: 6 }}>
        <Text
          style={{
            color: C.gold,
            fontSize: 12,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 1.4,
          }}
        >
          ✦{" "}
          {reading.mode === "daily"
            ? "Daily Card Draw"
            : isYesNo
              ? "Yes / No Oracle"
              : "3-Card Spread"}{" "}
          • {reading.topic}
        </Text>
        <Text style={s.title}>
          {allFlipped ? "Your Oracle Reading" : "Tap to Reveal Your Cards"}
        </Text>
        {reading.question ? (
          <View
            style={{
              backgroundColor: "rgba(243, 197, 86, 0.1)",
              borderLeftWidth: 3,
              borderLeftColor: C.gold,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 6,
              marginTop: 4,
            }}
          >
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>
              Your Question:
            </Text>
            <Text
              style={{
                color: "#F6E7B8",
                fontStyle: "italic",
                fontSize: 14,
                marginTop: 2,
              }}
            >
              &ldquo;{reading.question}&rdquo;
            </Text>
          </View>
        ) : (
          <Text style={s.sub}>
            {allFlipped
              ? `Wisdom for your current path in ${reading.topic.toLowerCase()}.`
              : "Tap each face-down card to flip it and unveil its sacred message."}
          </Text>
        )}
      </View>

      {/* Drawn Cards Display (with 3D Flip Animation & Custom Back Design) */}
      <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
        {reading.cards.map((card, idx) => (
          <FlipCard
            key={card.position + card.name}
            card={card}
            flipped={Boolean(flippedMap[idx])}
            onFlip={() => flipCardAt(idx)}
            isSingle={reading.cards.length === 1}
          />
        ))}
      </View>

      {/* Veiled Prompt OR Full Revealed Reading */}
      {!allFlipped ? (
        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(243, 197, 86, 0.3)",
            backgroundColor: "rgba(18, 16, 28, 0.78)",
            padding: 20,
            alignItems: "center",
            gap: 12,
          }}
        >
          <Text style={{ color: C.gold, fontSize: 13, fontWeight: "700" }}>
            ✨ {flippedCount} of {totalCount} Cards Revealed
          </Text>
          <Text
            style={{
              color: C.secondary,
              fontSize: 13,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Your personalized Tarot synthesis and card meanings will unlock once all drawn cards are flipped face-up.
          </Text>
          <Button label="Flip All Cards" onPress={flipAllCards} />
        </View>
      ) : (
        <Animated.View style={{ gap: 16, opacity: readingFade }}>
          {/* Yes / No Verdict Banner */}
          {isYesNo && (
            <View
              style={{
                alignItems: "center",
                padding: 16,
                borderRadius: 16,
                backgroundColor:
                  primaryVerdict === "Yes"
                    ? "rgba(127, 224, 168, 0.15)"
                    : primaryVerdict === "No"
                      ? "rgba(255, 128, 128, 0.15)"
                      : "rgba(243, 197, 86, 0.15)",
                borderWidth: 1,
                borderColor:
                  primaryVerdict === "Yes"
                    ? "#7FE0A8"
                    : primaryVerdict === "No"
                      ? "#FF8080"
                      : C.gold,
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: C.muted,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Oracle Verdict
              </Text>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color:
                    primaryVerdict === "Yes"
                      ? "#7FE0A8"
                      : primaryVerdict === "No"
                        ? "#FF8080"
                        : C.gold,
                }}
              >
                {primaryVerdict}
              </Text>
            </View>
          )}

          {/* Narrative Synthesis & Individual Card Insights */}
          <View style={[s.card, { gap: 14, padding: 18 }]}>
            <Text style={s.tileTitle}>Synthesized Reading</Text>
            <Text style={[s.cardText, { lineHeight: 22, color: "#F0EAD6" }]}>
              {reading.interpretation ||
                "Reflect on these symbols as gentle prompts, not predictions."}
            </Text>

            <View
              style={{
                height: 1,
                backgroundColor: "rgba(255,255,255,0.08)",
                marginVertical: 4,
              }}
            />

            {reading.cards.map((card) => (
              <View key={card.name + card.position} style={{ gap: 4 }}>
                <Text style={{ color: C.gold, fontWeight: "700", fontSize: 14 }}>
                  {card.position}: {card.name} ({card.orientation || "upright"})
                </Text>
                {card.keywords && card.keywords.length > 0 && (
                  <Text
                    style={{
                      color: C.muted,
                      fontSize: 12,
                      fontStyle: "italic",
                    }}
                  >
                    Keywords: {card.keywords.join(" • ")}
                  </Text>
                )}
                <Text style={[s.cardText, { color: C.text, fontSize: 13 }]}>
                  {card.meaning}
                </Text>
                {card.advice && (
                  <Text style={{ color: "#B8E2F2", fontSize: 12, marginTop: 2 }}>
                    💡 Advice: {card.advice}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Action Buttons */}
      <View style={{ gap: 10 }}>
        <Button label="Draw another spread" onPress={onDrawAgain} variant="glass" />
        <Button
          label="Ask AI Pandit about this reading"
          onPress={() => onNavigate("chat")}
        />
      </View>

      <Text style={s.disclaimer}>{disclaimer}</Text>
    </ScrollView>
  );
}
