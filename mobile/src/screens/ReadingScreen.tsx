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
        <Text style={s.title}>Your reading</Text>
        <Text style={s.sub}>Choose three cards to see your reading.</Text>
        <Button label="Pick cards" onPress={onDrawAgain} />
      </ScrollView>
    );

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>Your reading</Text>
      <Text style={s.sub}>
        Three cards for your question about {reading.topic.toLowerCase()}.
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {reading.cards.map((card) => (
          <View
            key={card.position}
            style={{ flex: 1, alignItems: "center", gap: 6 }}
          >
            <View
              style={{
                width: "100%",
                aspectRatio: 0.61,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: C.gold,
                backgroundColor: "#F5F1E7",
                alignItems: "center",
                justifyContent: "space-around",
                padding: 4,
              }}
            >
              <Text style={{ color: "#31281B", fontSize: 12 }}>
                {card.numeral}
              </Text>
              <TarotArt artKey={card.artKey} />
              <Text
                style={{
                  color: "#31281B",
                  fontSize: 11,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                {card.name}
              </Text>
            </View>
            <Text style={s.sub}>{card.position}</Text>
          </View>
        ))}
      </View>
      <View style={s.card}>
        {reading.cards.map((card) => (
          <Text key={card.position} style={s.cardText}>
            <Text style={{ color: C.gold, fontWeight: "700" }}>
              {card.position}:{" "}
            </Text>
            {card.meaning || "Interpretation unavailable."}
          </Text>
        ))}
      </View>
      <Button label="Draw again" onPress={onDrawAgain} variant="glass" />
      <Button label="Ask astrologer" onPress={() => onNavigate("live")} />
      <Text style={s.disclaimer}>{disclaimer}</Text>
    </ScrollView>
  );
}
