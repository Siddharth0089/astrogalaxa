import React, { useEffect, useRef } from "react";
import { Animated, Platform, ScrollView, Text, View } from "react-native";
import { Button } from "../components/Button";
import { ZodiacBadge, ZodiacIcon } from "../components/ZodiacBadge";
import { NameSign } from "../types";
import { C } from "../theme/colors";
import { s } from "../theme/styles";

function formatDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Seeker";
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ResultScreen({
  name,
  birthDob,
  nameSign,
  sunSign,
  onContinue,
}: {
  name: string;
  birthDob: string;
  nameSign: NameSign | null;
  sunSign: string | null;
  onContinue: () => void;
  onBack?: () => void;
}) {
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(22)).current;
  const nativeDriver = Platform.OS !== "web";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 650,
        delay: 180,
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(contentSlide, {
        toValue: 0,
        duration: 650,
        delay: 180,
        useNativeDriver: nativeDriver,
      }),
    ]).start();
  }, [contentFade, contentSlide, nativeDriver]);

  const activeSign = nameSign?.name || sunSign;
  const formattedName = formatDisplayName(name);
  const initialLetter = formattedName.charAt(0).toUpperCase();

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 36,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 420,
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* Celestial Zodiac Medallion */}
        <ZodiacBadge sign={activeSign} size={112} reveal={true} pulse={true} />

        {/* Centered Editorial Headings & Details */}
        <Animated.View
          style={{
            width: "100%",
            alignItems: "center",
            gap: 22,
            opacity: contentFade,
            transform: [{ translateY: contentSlide }],
          }}
        >
          {/* Professional Heading Block */}
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text
              style={{
                color: C.gold,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 2,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              Vedic Rashi Revealed
            </Text>
            <Text
              style={[
                s.title,
                {
                  fontSize: 34,
                  lineHeight: 38,
                  textAlign: "center",
                },
              ]}
            >
              Your Cosmic Identity
            </Text>
            <Text
              style={[
                s.sign,
                {
                  fontSize: 27,
                  textAlign: "center",
                  marginTop: 2,
                },
              ]}
            >
              {nameSign
                ? `${nameSign.name} · ${nameSign.vedicName}`
                : sunSign || "Sign Unavailable"}
            </Text>
            <Text
              style={[
                s.sub,
                {
                  textAlign: "center",
                  paddingHorizontal: 12,
                },
              ]}
            >
              {nameSign
                ? `Derived from the Vedic lunar syllable of "${formattedName}" (${initialLetter})`
                : "Your celestial coordinates have been aligned."}
            </Text>
          </View>

          {/* Structured Profile Summary Card */}
          <View
            style={[
              s.card,
              {
                width: "100%",
                padding: 20,
                gap: 14,
                borderColor: "rgba(243, 197, 86, 0.24)",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <Text style={{ color: C.secondary, fontSize: 13 }}>Full Name</Text>
              <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }}>
                {formattedName}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <Text style={{ color: C.secondary, fontSize: 13 }}>
                Date of Birth
              </Text>
              <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }}>
                {birthDob || "—"}
              </Text>
            </View>

            {nameSign && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255, 255, 255, 0.08)",
                }}
              >
                <Text style={{ color: C.secondary, fontSize: 13 }}>
                  Element & Ruler
                </Text>
                <Text
                  style={{ color: "#F6E7B8", fontSize: 14, fontWeight: "600" }}
                >
                  {nameSign.element} · {nameSign.ruler}
                </Text>
              </View>
            )}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: C.secondary, fontSize: 13 }}>
                Birth Sun Sign
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <ZodiacIcon sign={sunSign} size={16} color={C.gold} />
                <Text
                  style={{ color: C.text, fontSize: 14, fontWeight: "600" }}
                >
                  {sunSign ?? "Unavailable"}
                </Text>
              </View>
            </View>
          </View>

          {/* Auspicious Syllables (Namakshara) */}
          {(nameSign?.syllables?.length ?? 0) > 0 && (
            <View
              style={{
                width: "100%",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Text
                style={{
                  color: C.secondary,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              >
                Lucky Syllables · Namakshara
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                {(nameSign?.syllables ?? []).map((syllable) => (
                  <View
                    key={syllable}
                    style={{
                      minWidth: 48,
                      height: 40,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: "rgba(243, 197, 86, 0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(243, 197, 86, 0.35)",
                    }}
                  >
                    <Text
                      style={{
                        color: "#F6E7B8",
                        fontSize: 15,
                        fontWeight: "700",
                        letterSpacing: 0.4,
                      }}
                    >
                      {syllable}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Primary CTA */}
          <View style={{ width: "100%", marginTop: 6 }}>
            <Button label="Continue to my Kundli" onPress={onContinue} />
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
