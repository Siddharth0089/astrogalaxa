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
import Svg, { Path } from "react-native-svg";
import { Button } from "../components/Button";
import { TarotArt } from "../components/TarotArt";
import { Screen, TarotReading } from "../types";
import { C, disclaimer } from "../theme/colors";
import { s } from "../theme/styles";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CARD_BACK_IMAGE = require("../../assets/card_back.png");

type CardItem = TarotReading["cards"][number];

const ROMAN_SLOTS = ["I", "II", "III"];

function SparkleGlyph({ size = 13, color = C.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2L14.3 9.7L22 12L14.3 14.3L12 22L9.7 14.3L2 12L9.7 9.7L12 2Z"
        fill={color}
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
          backgroundColor: "rgba(243, 197, 86, 0.22)",
        }}
      />
      <Text style={{ color: C.gold, fontSize: 11 }}>✦</Text>
      <View
        style={{
          flex: 1,
          height: 1,
          backgroundColor: "rgba(243, 197, 86, 0.22)",
        }}
      />
    </View>
  );
}

function FlipCard({
  card,
  index,
  flipped,
  onFlip,
  isSingle,
  isYesNo,
}: {
  card: CardItem;
  index: number;
  flipped: boolean;
  onFlip: () => void;
  isSingle: boolean;
  isYesNo: boolean;
}) {
  const flipAnim = useRef(new Animated.Value(flipped ? 1 : 0)).current;
  const nativeDriver = Platform.OS !== "web";
  const isReversed = card.orientation === "reversed";

  useEffect(() => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 1 : 0,
      duration: 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start();
  }, [flipped, flipAnim, nativeDriver]);

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
    outputRange: [1, 1.05, 1.05],
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
    outputRange: [1.05, 1.05, 1],
  });

  return (
    <View
      style={{
        width: isSingle ? 190 : "31%",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          flipped
            ? `${card.name} (${card.position}) — tap to inspect card back`
            : `Tap to flip ${card.position} card`
        }
        onPress={onFlip}
        style={{
          width: "100%",
          aspectRatio: 0.56,
          minHeight: isSingle ? 316 : 172,
          position: "relative",
        }}
      >
        {/* Unflipped Sacred Back (card_back.png) */}
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

        {/* Illuminated Gold-Foil Parchment Front Face */}
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
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: C.gold,
            backgroundColor: "#F6EFE0",
            padding: 5,
            shadowColor: C.gold,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          {/* Inner Sacred Filigree Frame */}
          <View
            style={{
              flex: 1,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "rgba(155, 107, 19, 0.36)",
              paddingVertical: 6,
              paddingHorizontal: 5,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Top Corner Stars */}
            <View
              style={{
                width: "100%",
                flexDirection: "row",
                justifyContent: "space-between",
                paddingHorizontal: 2,
              }}
            >
              <Text style={{ color: "#9B6B13", fontSize: 8 }}>✦</Text>
              <Text style={{ color: "#4A3617", fontSize: 10.5, fontWeight: "700" }}>
                {card.numeral}
              </Text>
              <Text style={{ color: "#9B6B13", fontSize: 8 }}>✦</Text>
            </View>

            {/* Sacred Symbol Emblem (Rotated 180deg if Reversed) */}
            <View
              style={{
                flex: 1,
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                transform: isReversed ? [{ rotate: "180deg" }] : undefined,
              }}
            >
              <TarotArt artKey={card.artKey} />
            </View>

            {/* Card Title & Seal */}
            <View style={{ alignItems: "center", gap: 3, width: "100%" }}>
              <Text
                style={{
                  color: "#291E10",
                  fontSize: isSingle ? 14.5 : 10.5,
                  lineHeight: isSingle ? 18 : 13,
                  textAlign: "center",
                  fontFamily: "CormorantGaramond_700Bold",
                }}
                numberOfLines={2}
              >
                {card.name}
              </Text>

              {isYesNo && card.yesNo ? (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor:
                      card.yesNo === "Yes"
                        ? "rgba(46, 125, 50, 0.16)"
                        : card.yesNo === "No"
                          ? "rgba(198, 40, 40, 0.16)"
                          : "rgba(155, 107, 19, 0.18)",
                  }}
                >
                  <Text
                    style={{
                      color: "#31281B",
                      fontSize: 9,
                      fontWeight: "800",
                      letterSpacing: 0.8,
                    }}
                  >
                    {card.yesNo.toUpperCase()}
                  </Text>
                </View>
              ) : card.keywords?.[0] ? (
                <Text
                  style={{
                    color: "#7C5A21",
                    fontSize: 9,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  }}
                  numberOfLines={1}
                >
                  {card.keywords[0]}
                </Text>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </Pressable>

      {/* Pedestal Label */}
      <Text
        style={{
          color: C.gold,
          fontWeight: "700",
          fontSize: 11,
          letterSpacing: 0.9,
          textTransform: "uppercase",
        }}
      >
        {ROMAN_SLOTS[index] || ""} · {card.position}
      </Text>
      {flipped ? (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: isReversed
              ? "rgba(255, 180, 171, 0.1)"
              : "rgba(127, 224, 168, 0.1)",
            borderWidth: 1,
            borderColor: isReversed
              ? "rgba(255, 180, 171, 0.3)"
              : "rgba(127, 224, 168, 0.3)",
          }}
        >
          <Text
            style={{
              color: isReversed ? "#FFB4AB" : "#7FE0A8",
              fontSize: 10.5,
              fontWeight: "700",
            }}
          >
            {isReversed ? "Reversed ↺" : "Upright ↑"}
          </Text>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: "rgba(243, 197, 86, 0.14)",
            borderWidth: 1,
            borderColor: "rgba(243, 197, 86, 0.35)",
            borderRadius: 999,
            paddingHorizontal: 9,
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: "#F6E7B8", fontSize: 10.5, fontWeight: "600" }}>
            Revealing…
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

  useEffect(() => {
    if (!reading) {
      setFlippedMap([]);
      return;
    }
    if (reading.fromJournal) {
      setFlippedMap(reading.cards.map(() => true));
      return;
    }
    setFlippedMap(reading.cards.map(() => false));
    const timers: ReturnType<typeof setTimeout>[] = reading.cards.map((_, idx) =>
      setTimeout(() => {
        setFlippedMap((prev) => {
          const next = [...prev];
          next[idx] = true;
          return next;
        });
      }, 280 + idx * 320),
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [reading]);

  const readingFade = useRef(new Animated.Value(0)).current;
  const nativeDriver = Platform.OS !== "web";

  const flippedCount = flippedMap.filter(Boolean).length;
  const totalCount = reading?.cards.length || 0;
  const allFlipped = totalCount > 0 && flippedCount === totalCount;

  useEffect(() => {
    Animated.timing(readingFade, {
      toValue: allFlipped ? 1 : 0,
      duration: 420,
      useNativeDriver: nativeDriver,
    }).start();
  }, [allFlipped, readingFade, nativeDriver]);

  if (!reading)
    return (
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: 22 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Sacred Reading</Text>
        <Text style={s.sub}>Choose cards from the Tarot Sanctuary to unveil guidance.</Text>
        <Button label="Open Tarot Deck" onPress={onDrawAgain} />
      </ScrollView>
    );

  const isYesNo = reading.mode === "yesNo";
  const primaryVerdict = reading.cards[0]?.yesNo || "Yes";

  const toggleCardAt = (index: number) => {
    setFlippedMap((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const flipAllCards = () => {
    setFlippedMap(reading.cards.map(() => true));
  };

  return (
    <ScrollView
      contentContainerStyle={[s.page, { paddingTop: 22, paddingBottom: 48, gap: 18 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Sacred Editorial Header (No App Bar or Back Button) */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <SparkleGlyph size={12} />
          <Text
            style={{
              color: C.gold,
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 1.6,
            }}
          >
            {reading.mode === "daily"
              ? "Daily Card Draw"
              : isYesNo
                ? "Yes / No Oracle"
                : "3-Card Spread"}{" "}
            • {reading.topic}
          </Text>
        </View>
        <Text style={s.title}>
          {allFlipped ? "Oracle Prophecy" : "Turning Your Cards…"}
        </Text>

        {reading.question ? (
          <View
            style={{
              backgroundColor: "rgba(243, 197, 86, 0.08)",
              borderLeftWidth: 2.5,
              borderLeftColor: C.gold,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 10,
              marginTop: 4,
              gap: 3,
            }}
          >
            <Text
              style={{
                color: C.gold,
                fontSize: 10.5,
                fontWeight: "700",
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              Sankalpa · Your Question
            </Text>
            <Text
              style={{
                color: "#F7F3EA",
                fontStyle: "italic",
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              &ldquo;{reading.question}&rdquo;
            </Text>
          </View>
        ) : (
          <Text style={s.sub}>
            {allFlipped
              ? `Tailored ${reading.topic.toLowerCase()} guidance. Tap any card to view its sacred back.`
              : "Watch your selected cards turn over to reveal their sacred message."}
          </Text>
        )}
      </View>

      {/* Drawn Cards Display (3D Sequential Flip Reveal) */}
      <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
        {reading.cards.map((card, idx) => (
          <FlipCard
            key={card.cardId + card.position}
            card={card}
            index={idx}
            flipped={Boolean(flippedMap[idx])}
            onFlip={() => toggleCardAt(idx)}
            isSingle={reading.cards.length === 1}
            isYesNo={isYesNo}
          />
        ))}
      </View>

      {/* Veiled Prompt OR Illuminated Spiritual Synthesis */}
      {!allFlipped ? (
        <View
          style={{
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "rgba(243, 197, 86, 0.3)",
            backgroundColor: "rgba(18, 16, 28, 0.8)",
            padding: 20,
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <SparkleGlyph size={14} />
            <Text style={{ color: C.gold, fontSize: 13, fontWeight: "700" }}>
              {flippedCount} of {totalCount} Cards Unveiled
            </Text>
          </View>
          <Text
            style={{
              color: C.secondary,
              fontSize: 13,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            Your tailored {reading.topic.toLowerCase()} prophecy unlocks momentarily…
          </Text>
          <Button label="Reveal All Now" onPress={flipAllCards} />
        </View>
      ) : (
        <Animated.View style={{ gap: 16, opacity: readingFade }}>
          {/* Yes / No Verdict Sanctum */}
          {isYesNo && (
            <View
              style={{
                alignItems: "center",
                padding: 18,
                borderRadius: 20,
                backgroundColor: "rgba(18, 16, 28, 0.85)",
                borderWidth: 1,
                borderColor:
                  primaryVerdict === "Yes"
                    ? "rgba(127, 224, 168, 0.45)"
                    : primaryVerdict === "No"
                      ? "rgba(255, 128, 128, 0.45)"
                      : "rgba(243, 197, 86, 0.45)",
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: C.muted,
                  fontSize: 11,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 1.4,
                }}
              >
                ✦ Oracle Verdict
              </Text>
              <Text
                style={{
                  fontSize: 34,
                  fontFamily: "CormorantGaramond_700Bold",
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

          {/* Celestial Oracle Synthesis Card (Matching HomeScreen Cosmic Guidance) */}
          <View
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: "rgba(243, 197, 86, 0.34)",
              backgroundColor: "rgba(18, 16, 28, 0.84)",
              padding: 20,
              gap: 16,
              shadowColor: C.gold,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 5,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <SparkleGlyph size={14} />
                <Text
                  style={{
                    color: C.gold,
                    fontWeight: "700",
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  Cosmic Prophecy & Guidance
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(243, 197, 86, 0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(243, 197, 86, 0.3)",
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: "#F6E7B8", fontSize: 11, fontWeight: "700" }}>
                  {reading.topic}
                </Text>
              </View>
            </View>

            <Text
              style={{
                color: "#F7F3EA",
                fontSize: 15.5,
                lineHeight: 24,
                letterSpacing: 0.2,
              }}
            >
              {reading.interpretation ||
                "Reflect on these sacred symbols with calm awareness and steady purpose."}
            </Text>

            <SacredDivider />

            {/* Individual Card Archetype Breakdown */}
            <View style={{ gap: 12 }}>
              {reading.cards.map((card, i) => (
                <View
                  key={card.cardId + card.position}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(243, 197, 86, 0.18)",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    padding: 14,
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: C.gold,
                          fontSize: 10.5,
                          fontWeight: "700",
                          letterSpacing: 1.1,
                          textTransform: "uppercase",
                        }}
                      >
                        {ROMAN_SLOTS[i] || ""} · {card.position}
                      </Text>
                      <Text
                        style={{
                          color: "#F7F3EA",
                          fontSize: 20,
                          fontFamily: "CormorantGaramond_700Bold",
                        }}
                      >
                        {card.name}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color:
                          card.orientation === "reversed" ? "#FFB4AB" : "#7FE0A8",
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {card.orientation === "reversed" ? "Reversed ↺" : "Upright ↑"}
                    </Text>
                  </View>

                  {card.keywords && card.keywords.length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {card.keywords.map((kw) => (
                        <View
                          key={kw}
                          style={{
                            backgroundColor: "rgba(243, 197, 86, 0.09)",
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: "#E8D7A7",
                              fontSize: 10.5,
                              fontWeight: "600",
                              textTransform: "capitalize",
                            }}
                          >
                            {kw}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={{ color: "#EFEAE0", fontSize: 13.5, lineHeight: 20 }}>
                    {card.topicInsight || card.meaning}
                  </Text>

                  {card.topicInsight &&
                    card.meaning &&
                    card.topicInsight !== card.meaning && (
                      <Text style={{ color: C.secondary, fontSize: 12, lineHeight: 18 }}>
                        Arcana Root: {card.meaning}
                      </Text>
                    )}

                  {card.advice && (
                    <View
                      style={{
                        backgroundColor: "rgba(243, 197, 86, 0.08)",
                        borderLeftWidth: 2.5,
                        borderLeftColor: C.gold,
                        borderRadius: 8,
                        paddingHorizontal: 11,
                        paddingVertical: 8,
                        gap: 2,
                        marginTop: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: C.gold,
                          fontSize: 10,
                          fontWeight: "700",
                          letterSpacing: 1,
                          textTransform: "uppercase",
                        }}
                      >
                        Divine Counsel
                      </Text>
                      <Text style={{ color: "#EAE3D2", fontSize: 12.5, lineHeight: 18 }}>
                        {card.advice}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      )}

      {/* Action Buttons */}
      <View style={{ gap: 10 }}>
        <Button label="Return to Tarot Sanctuary" onPress={onDrawAgain} variant="glass" />
        <Button
          label="Discuss Reading with AI Pandit"
          onPress={() => onNavigate("chat")}
        />
      </View>

      <Text style={s.disclaimer}>{disclaimer}</Text>
    </ScrollView>
  );
}

