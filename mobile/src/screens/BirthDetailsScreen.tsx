import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Gender, Language, Place } from "../types";
import { C } from "../theme/colors";
import { s } from "../theme/styles";

export function BirthDetailsScreen({
  name,
  setName,
  gender,
  setGender,
  language,
  setLanguage,
  birth,
  setBirth,
  selectedPlace,
  setSelectedPlace,
  places,
  setPlaces,
  placesError,
  setPlacesError,
  onSave,
}: {
  name: string;
  setName: (n: string) => void;
  gender: Gender;
  setGender: (g: Gender) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  birth: { dob: string; time: string; place: string };
  setBirth: React.Dispatch<
    React.SetStateAction<{ dob: string; time: string; place: string }>
  >;
  selectedPlace: Place | null;
  setSelectedPlace: (p: Place | null) => void;
  places: Place[];
  setPlaces: (p: Place[]) => void;
  placesError: string;
  setPlacesError: (e: string) => void;
  searchingPlaces?: boolean;
  onSave: () => void;
  onBack?: () => void;
}) {
  // Parse initial time if exists (e.g. "06:40 AM" or "14:30")
  const parsedTime = useMemo(() => {
    if (!birth.time) return { h: "", m: "", p: "AM" as "AM" | "PM" };
    const m12 = /^(0?[1-9]|1[0-2])\s*:\s*([0-5]\d)\s*(AM|PM)$/i.exec(
      birth.time.trim(),
    );
    if (m12) {
      return {
        h: m12[1].padStart(2, "0"),
        m: m12[2],
        p: m12[3].toUpperCase() as "AM" | "PM",
      };
    }
    const m24 = /^(\d{2}):(\d{2})$/.exec(birth.time.trim());
    if (m24) {
      const hourNum = Number(m24[1]);
      return {
        h: String(hourNum % 12 || 12).padStart(2, "0"),
        m: m24[2],
        p: hourNum >= 12 ? ("PM" as const) : ("AM" as const),
      };
    }
    return { h: "", m: "", p: "AM" as "AM" | "PM" };
  }, [birth.time]);

  const [hour, setHour] = useState(parsedTime.h);
  const [minute, setMinute] = useState(parsedTime.m);
  const [period, setPeriod] = useState<"AM" | "PM">(parsedTime.p);
  const [focusedInput, setFocusedInput] = useState<"hour" | "minute" | null>(null);

  const updateTime = (newH: string, newM: string, newP: "AM" | "PM") => {
    if (newH.trim() && newM.trim()) {
      setBirth((prev) => ({
        ...prev,
        time: `${newH.padStart(2, "0")}:${newM.padStart(2, "0")} ${newP}`,
      }));
    } else if (!newH.trim() && !newM.trim()) {
      setBirth((prev) => ({ ...prev, time: "" }));
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[s.page, { paddingTop: 28, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Professional Heading */}
      <View style={{ gap: 6, marginBottom: 8 }}>
        <Text style={s.title}>Tell Us About Yourself</Text>
        <Text style={s.sub}>
          Enter your birth details to generate your authentic Vedic Kundli and
          personal astrological chart.
        </Text>
      </View>

      {/* Full Name */}
      <Field
        label="Full name"
        value={name}
        onChange={setName}
        placeholder="Your full name"
      />

      {/* Gender Selection */}
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Gender</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(
            [
              { id: "male", label: "Male", icon: "👨" },
              { id: "female", label: "Female", icon: "👩" },
              { id: "other", label: "Other", icon: "✨" },
            ] as const
          ).map((item) => {
            const isSelected = gender === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Select gender ${item.label}`}
                onPress={() => setGender(item.id)}
                style={{
                  flex: 1,
                  height: 48,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isSelected ? C.gold : C.border,
                  backgroundColor: isSelected ? C.gold : C.glass,
                }}
              >
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                <Text
                  style={{
                    color: isSelected ? C.onGold : C.text,
                    fontWeight: isSelected ? "700" : "500",
                    fontSize: 14,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={s.helper}>
          Useful for personalized wording and Kundli Matching (Gun Milan).
        </Text>
      </View>

      {/* Preferred Language Selection */}
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Preferred Language</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(
            [
              { id: "English", label: "English" },
              { id: "Hindi", label: "हिन्दी" },
              { id: "Hinglish", label: "Hinglish" },
            ] as const
          ).map((item) => {
            const isSelected = language === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Select preferred language ${item.label}`}
                onPress={() => setLanguage(item.id)}
                style={{
                  flex: 1,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isSelected ? C.gold : C.border,
                  backgroundColor: isSelected ? C.gold : C.glass,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? C.onGold : C.text,
                    fontWeight: isSelected ? "700" : "600",
                    fontSize: 14,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={s.helper}>
          Your AI Pandit replies in your chosen language comfort zone.
        </Text>
      </View>

      {/* Date of Birth */}
      <View style={{ gap: 4 }}>
        <Field
          label="Date of birth"
          value={birth.dob}
          onChange={(x) => setBirth({ ...birth, dob: x })}
          placeholder="DD / MM / YYYY or YYYY-MM-DD"
        />
        <Text style={s.helper}>
          Sets the baseline positions of the Sun, Moon, and planets for that day.
        </Text>
      </View>

      {/* Modern Time of Birth with Hour, Minute, and AM/PM Toggle */}
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Time of birth (optional)</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* Dedicated Hour Box */}
          <View
            style={{
              flex: 1,
              minWidth: 0,
              height: 52,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: focusedInput === "hour" ? C.gold : C.border,
              backgroundColor: C.glass,
              overflow: "hidden",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TextInput
              accessibilityLabel="Birth hour"
              value={hour}
              onFocus={() => setFocusedInput("hour")}
              onBlur={() => setFocusedInput(null)}
              onChangeText={(val) => {
                const clean = val.replace(/\D/g, "").slice(0, 2);
                if (clean === "" || (Number(clean) >= 0 && Number(clean) <= 12)) {
                  setHour(clean);
                  updateTime(clean, minute, period);
                }
              }}
              placeholder="HH"
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
              maxLength={2}
              style={{
                width: "100%",
                height: "100%",
                color: C.text,
                fontSize: 16,
                textAlign: "center",
                fontWeight: "600",
                paddingHorizontal: 0,
                ...({ outlineStyle: "none" } as object),
              }}
            />
          </View>

          {/* Colon Separator */}
          <Text
            style={{
              color: C.muted,
              fontSize: 20,
              fontWeight: "700",
              paddingHorizontal: 2,
            }}
          >
            :
          </Text>

          {/* Dedicated Minute Box */}
          <View
            style={{
              flex: 1,
              minWidth: 0,
              height: 52,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: focusedInput === "minute" ? C.gold : C.border,
              backgroundColor: C.glass,
              overflow: "hidden",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TextInput
              accessibilityLabel="Birth minute"
              value={minute}
              onFocus={() => setFocusedInput("minute")}
              onBlur={() => setFocusedInput(null)}
              onChangeText={(val) => {
                const clean = val.replace(/\D/g, "").slice(0, 2);
                if (clean === "" || (Number(clean) >= 0 && Number(clean) <= 59)) {
                  setMinute(clean);
                  updateTime(hour, clean, period);
                }
              }}
              placeholder="MM"
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
              maxLength={2}
              style={{
                width: "100%",
                height: "100%",
                color: C.text,
                fontSize: 16,
                textAlign: "center",
                fontWeight: "600",
                paddingHorizontal: 0,
                ...({ outlineStyle: "none" } as object),
              }}
            />
          </View>

          {/* AM / PM Segmented Toggle Buttons */}
          <View
            style={{
              flexDirection: "row",
              height: 52,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: C.glass,
              overflow: "hidden",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select AM"
              onPress={() => {
                setPeriod("AM");
                updateTime(hour, minute, "AM");
              }}
              style={{
                paddingHorizontal: 16,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: period === "AM" ? C.gold : "transparent",
              }}
            >
              <Text
                style={{
                  color: period === "AM" ? C.onGold : C.text,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                AM
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select PM"
              onPress={() => {
                setPeriod("PM");
                updateTime(hour, minute, "PM");
              }}
              style={{
                paddingHorizontal: 16,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: period === "PM" ? C.gold : "transparent",
              }}
            >
              <Text
                style={{
                  color: period === "PM" ? C.onGold : C.text,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                PM
              </Text>
            </Pressable>
          </View>
        </View>
        <Text style={s.helper}>
          Determines the Lagna, house placements, Moon Nakshatra, and divisional
          charts (Navamsa). The Lagna shifts roughly every 2 hours.
        </Text>
      </View>

      {/* Place of Birth with sleek inline quick suggestions */}
      <View style={{ gap: 8 }}>
        <Field
          label="Place of birth"
          value={birth.place}
          onChange={(x) => {
            setSelectedPlace(null);
            setPlacesError("");
            setBirth({ ...birth, place: x });
          }}
          placeholder="City / Town, State, and Country"
        />

        {/* Compact Quick Suggestion Pills (max 3) */}
        {places.length > 0 && !selectedPlace && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 2,
            }}
          >
            {places.slice(0, 3).map((place) => (
              <Pressable
                key={`${place.lat}:${place.lng}`}
                accessibilityRole="button"
                accessibilityLabel={`Select ${place.name}`}
                onPress={() => {
                  setSelectedPlace(place);
                  setBirth({ ...birth, place: place.name });
                  setPlaces([]);
                  setPlacesError("");
                }}
                style={{
                  backgroundColor: "rgba(243, 197, 86, 0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(243, 197, 86, 0.35)",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: "#F6E7B8", fontSize: 12 }}>
                  📍 {place.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {selectedPlace && (
          <Text style={{ color: "#7FE0A8", fontSize: 12 }}>
            ✓ Location set: {selectedPlace.name}
          </Text>
        )}
        {!!placesError && !selectedPlace && (
          <Text style={s.helper}>{placesError}</Text>
        )}
        <Text style={s.helper}>
          Determines the exact local horizon and historical timezone offset at
          birth. Enter your actual birthplace, not where you live today.
        </Text>
      </View>

      <Text style={s.helper}>
        Decimal coordinates & historical timezone offset are resolved
        automatically. Calculated with Lahiri (Chitrapaksha) Ayanamsa standard.
      </Text>

      {/* Primary Action Button */}
      <Button label="Create my Kundli" onPress={onSave} />
    </ScrollView>
  );
}
