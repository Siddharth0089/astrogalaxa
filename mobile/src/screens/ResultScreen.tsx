import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button } from "../components/Button";
import { ZodiacBadge } from "../components/ZodiacBadge";
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
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(24)).current;
  const nativeDriver = Platform.OS !== "web";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 650,
        delay: 200,
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(contentSlide, {
        toValue: 0,
        duration: 650,
        delay: 200,
        useNativeDriver: nativeDriver,
      }),
    ]).start();
  }, [contentFade, contentSlide, nativeDriver]);

  const activeSign = nameSign?.name || sunSign;
  const symbol = getZodiacSymbol(activeSign);

  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.header}>
        <Pressable accessibilityLabel="Go back" onPress={onBack} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>Name Sign</Text>
        <View style={s.back} />
      </View>

      <View style={{ alignItems: "center", marginVertical: 18 }}>
        <ZodiacBadge symbol={symbol} size={96} reveal={true} pulse={true} />
      </View>

      <Animated.View
        style={{
          opacity: contentFade,
          transform: [{ translateY: contentSlide }],
        }}
      >
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
          <Text style={s.cardText}>Name: {name}</Text>
          <Text style={s.cardText}>Date of birth: {birthDob}</Text>
          <Text style={s.cardText}>
            Sun sign by birth date: {getZodiacSymbol(sunSign)}{" "}
            {sunSign ?? "Unavailable"}
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
      </Animated.View>
    </ScrollView>
  );
}
