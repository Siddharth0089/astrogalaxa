import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "../components/Button";
import { TarotArt } from "../components/TarotArt";
import { Screen, TarotReading } from "../types";
import { C, disclaimer } from "../theme/colors";
import { s } from "../theme/styles";

export function ReadingScreen({
  reading,
  onDrawAgain,
  onNavigate,
}: {
  reading: TarotReading | null;
  onDrawAgain: () => void;
  onNavigate: (s: Screen) => void;
}) {
  if (!reading)
    return (
      <ScrollView contentContainerStyle={s.page}>
        <Text style={s.title}>Your Reading</Text>
        <Text style={s.sub}>Choose cards to see your personal reading.</Text>
        <Button label="Pick cards" onPress={onDrawAgain} />
      </ScrollView>
    );

  const isYesNo = reading.mode === "yesNo";
  const primaryVerdict = reading.cards[0]?.yesNo || "Yes";

  return (
    <ScrollView contentContainerStyle={[s.page, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
      {/* Title & Mode */}
      <View style={{ gap: 6 }}>
        <Text style={{ color: C.gold, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2 }}>
          {reading.mode === "daily"
            ? "Daily Card Draw"
            : isYesNo
              ? "Yes / No Oracle"
              : "3-Card Spread"}{" "}
          • {reading.topic}
        </Text>
        <Text style={s.title}>Your Oracle Reading</Text>
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
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>Your Question:</Text>
            <Text style={{ color: "#F6E7B8", fontStyle: "italic", fontSize: 14, marginTop: 2 }}>
              "{reading.question}"
            </Text>
          </View>
        ) : (
          <Text style={s.sub}>
            Wisdom for your current path in {reading.topic.toLowerCase()}.
          </Text>
        )}
      </View>

      {/* Yes / No Verdict Banner if in yesNo mode */}
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
          <Text style={{ color: C.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
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

      {/* Drawn Cards Display */}
      <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
        {reading.cards.map((card) => {
          const isReversed = card.orientation === "reversed";
          return (
            <View
              key={card.position + card.name}
              style={{ flex: 1, maxWidth: reading.cards.length === 1 ? 180 : undefined, alignItems: "center", gap: 6 }}
            >
              <View
                style={{
                  width: "100%",
                  aspectRatio: 0.61,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: C.gold,
                  backgroundColor: "#F5F1E7",
                  alignItems: "center",
                  justifyContent: "space-around",
                  padding: 6,
                  transform: isReversed ? [{ rotate: "180deg" }] : undefined,
                }}
              >
                <Text style={{ color: "#31281B", fontSize: 11, fontWeight: "600" }}>
                  {card.numeral}
                </Text>
                <TarotArt artKey={card.artKey} />
                <Text
                  style={{
                    color: "#31281B",
                    fontSize: 10,
                    textAlign: "center",
                    fontWeight: "700",
                  }}
                >
                  {card.name}
                </Text>
              </View>
              <Text style={{ color: C.gold, fontWeight: "700", fontSize: 12 }}>
                {card.position}
              </Text>
              <Text style={{ color: isReversed ? "#FFB4AB" : "#7FE0A8", fontSize: 11 }}>
                {isReversed ? "Reversed ↺" : "Upright ↑"}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Narrative Synthesis & Card Insights */}
      <View style={[s.card, { gap: 12, padding: 18 }]}>
        <Text style={s.tileTitle}>Synthesized Reading</Text>
        <Text style={[s.cardText, { lineHeight: 22, color: "#F0EAD6" }]}>
          {reading.interpretation || "Reflect on these symbols as gentle prompts, not predictions."}
        </Text>

        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 4 }} />

        {/* Detailed Individual Card Insights */}
        {reading.cards.map((card) => (
          <View key={card.name + card.position} style={{ gap: 4 }}>
            <Text style={{ color: C.gold, fontWeight: "700", fontSize: 14 }}>
              {card.position}: {card.name} ({card.orientation || "upright"})
            </Text>
            {card.keywords && card.keywords.length > 0 && (
              <Text style={{ color: C.muted, fontSize: 12, fontStyle: "italic" }}>
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

      {/* Action Buttons */}
      <View style={{ gap: 10 }}>
        <Button label="Draw another spread" onPress={onDrawAgain} variant="glass" />
        <Button label="Ask AI Pandit about this reading" onPress={() => onNavigate("chat")} />
      </View>

      <Text style={s.disclaimer}>{disclaimer}</Text>
    </ScrollView>
  );
}
