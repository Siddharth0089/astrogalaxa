import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { getZodiacSymbol, Horoscope, NameSign, Screen } from "../types";
import { disclaimer } from "../theme/colors";
import { s } from "../theme/styles";

export function HomeScreen({
  name,
  nameSign,
  sunSign,
  horoscope,
  horoscopeLoading,
  horoscopeError,
  token,
  onRetryHoroscope,
  onNavigate,
}: {
  name: string;
  nameSign: NameSign | null;
  sunSign: string | null;
  horoscope: Horoscope | null;
  horoscopeLoading: boolean;
  horoscopeError: string;
  token?: string;
  onRetryHoroscope: () => void;
  onNavigate: (s: Screen) => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.homeTop}>
        <View>
          <Text style={s.date}>
            {new Intl.DateTimeFormat(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </Text>
          <Text style={s.title}>Namaste, {name || "there"}</Text>
        </View>
        <Pressable
          accessibilityLabel="Profile"
          onPress={() => onNavigate("profile")}
          style={s.avatar}
        >
          <Text style={s.avatarText}>{(name || "N")[0]}</Text>
        </Pressable>
      </View>
      <View style={s.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 36 }}>
            {getZodiacSymbol(nameSign?.name || sunSign)}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={s.sign}>
              {nameSign
                ? `${nameSign.name} · ${nameSign.vedicName}`
                : "Your name sign"}
            </Text>
            <Text style={s.sub}>
              {nameSign
                ? `${nameSign.element} sign · Ruled by ${nameSign.ruler}`
                : "Add your birth details to see your sign."}
            </Text>
          </View>
        </View>
        <Text style={[s.sub, { marginTop: 8 }]}>
          Sun sign by birth date: {getZodiacSymbol(sunSign)} {sunSign ?? "Unavailable"}
        </Text>
      </View>
      <View style={[s.card, { backgroundColor: "#F5F5F7", gap: 12 }]}>
        <Text style={{ color: "#202127", fontWeight: "700", fontSize: 14 }}>
          Today's horoscope{horoscope ? ` · ${horoscope.sign}` : ""}
        </Text>
        {horoscopeLoading ? (
          <Text style={{ color: "#45454c" }}>Loading your horoscope…</Text>
        ) : horoscope ? (
          <>
            <Text style={{ color: "#202127", fontSize: 15, lineHeight: 22 }}>
              {horoscope.text}
            </Text>
            <Text style={{ color: "#202127", fontSize: 14, lineHeight: 21 }}>
              Advice: {horoscope.advice}
            </Text>
            <Text style={{ color: "#45454c", fontSize: 12 }}>
              Lucky colour: {horoscope.luckyColor} · Lucky number:{" "}
              {horoscope.luckyNumber}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ color: "#45454c" }}>
              {horoscopeError ||
                "Sign in and complete your profile to see your horoscope."}
            </Text>
            {!!token && (
              <Pressable accessibilityRole="button" onPress={onRetryHoroscope}>
                <Text style={{ color: "#765000", fontWeight: "700" }}>
                  Try again
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>
      <Text style={s.disclaimer}>{disclaimer}</Text>
      <View style={s.grid}>
        {[
          ["My Kundli", "Birth chart", "kundli"],
          ["Ask AI", "Your future doubts", "chat"],
          ["Live astrologer", "Chat with an expert", "live"],
          ["Tarot reading", "Pick your cards", "tarot"],
        ].map(([a, b, c]) => (
          <Pressable
            key={a}
            accessibilityRole="button"
            onPress={() => onNavigate(c as Screen)}
            style={s.tile}
          >
            <Text style={s.tileTitle}>{a}</Text>
            <Text style={s.sub}>{b}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
