import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../components/Button";
import { getZodiacSymbol, NameSign } from "../types";
import { s } from "../theme/styles";

export function ResultScreen({
  name,
  birthDob,
  nameSign,
  sunSign,
  onContinue,
  onBack,
}: {
  name: string;
  birthDob: string;
  nameSign: NameSign | null;
  sunSign: string | null;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.header}>
        <Pressable accessibilityLabel="Go back" onPress={onBack} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>Name Sign</Text>
        <View style={s.back} />
      </View>
      <View style={{ alignItems: "center", marginVertical: 14 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(234, 179, 8, 0.15)",
            borderWidth: 1,
            borderColor: "rgba(234, 179, 8, 0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 44 }}>
            {getZodiacSymbol(nameSign?.name || sunSign)}
          </Text>
        </View>
      </View>
      <Text style={s.title}>Your name sign is ready</Text>
      <Text style={s.sign}>
        {nameSign
          ? `${nameSign.name} · ${nameSign.vedicName}`
          : "Name sign unavailable"}
      </Text>
      <Text style={s.sub}>
        {nameSign
          ? `Your name starts with ${name.trim().charAt(0).toUpperCase()}.`
          : "Complete birth details to see your sign."}
      </Text>
      <View style={s.card}>
        <Text style={s.cardText}>Name {name}</Text>
        <Text style={s.cardText}>Date of birth {birthDob}</Text>
        <Text style={s.cardText}>
          Sun sign by birth date: {sunSign ?? "Unavailable"}
        </Text>
      </View>
      <Text style={s.label}>Lucky syllables</Text>
      <View style={s.chips}>
        {(nameSign?.syllables ?? []).map((x) => (
          <Text key={x} style={s.chip}>
            {x}
          </Text>
        ))}
      </View>
      <Button label="Continue to my Kundli" onPress={onContinue} />
    </ScrollView>
  );
}
