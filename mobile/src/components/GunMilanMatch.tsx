import React, { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { apiRequest } from "../../session";
import { GunMilanResult, Place } from "../types";
import { Button } from "./Button";
import { Field } from "./Field";
import { C } from "../theme/colors";
import { s } from "../theme/styles";

export function GunMilanMatch() {
  const [partnerName, setPartnerName] = useState("");
  const [dob, setDob] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [focusedTime, setFocusedTime] = useState<"hour" | "minute" | null>(null);
  const [placeText, setPlaceText] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GunMilanResult | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (selectedPlace || placeText.trim().length < 2) {
      setPlaces([]);
      return;
    }
    let active = true;
    const t = setTimeout(() => {
      apiRequest(`/places/search?q=${encodeURIComponent(placeText.trim())}`)
        .then((res: Place[]) => {
          if (active) setPlaces(Array.isArray(res) ? res.slice(0, 3) : []);
        })
        .catch(() => {
          if (active) setPlaces([]);
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [placeText, selectedPlace]);

  const calculateMatch = async () => {
    setError("");
    if (!partnerName.trim()) {
      return setError("Please enter partner's name.");
    }
    let day: number, month: number, year: number;
    const dmy = /^(\d{1,2})[\s/.-]+(\d{1,2})[\s/.-]+(\d{4})$/.exec(dob.trim());
    const ymd = /^(\d{4})[\s/.-]+(\d{1,2})[\s/.-]+(\d{1,2})$/.exec(dob.trim());
    if (dmy) {
      day = Number(dmy[1]);
      month = Number(dmy[2]);
      year = Number(dmy[3]);
    } else if (ymd) {
      year = Number(ymd[1]);
      month = Number(ymd[2]);
      day = Number(ymd[3]);
    } else {
      return setError("Enter date of birth as DD / MM / YYYY or YYYY-MM-DD.");
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day ||
      date > new Date()
    ) {
      return setError("Please enter a valid birth date.");
    }

    let time24: string | null = null;
    if (hour.trim() || minute.trim()) {
      const hNum = Number(hour);
      const mNum = Number(minute);
      if (
        !hour.trim() ||
        !minute.trim() ||
        hNum < 1 ||
        hNum > 12 ||
        mNum < 0 ||
        mNum > 59
      ) {
        return setError("Enter valid 12-hour time (HH:MM) or leave blank.");
      }
      const h24 = (hNum % 12) + (period === "PM" ? 12 : 0);
      time24 = `${String(h24).padStart(2, "0")}:${String(mNum).padStart(2, "0")}`;
    }

    if (!selectedPlace && !placeText.trim()) {
      return setError("Please enter partner's place of birth.");
    }

    setBusy(true);
    try {
      let place = selectedPlace;
      if (!place && placeText.trim()) {
        const found = await apiRequest(
          `/places/search?q=${encodeURIComponent(placeText.trim())}`,
        );
        if (found && found.length > 0) {
          place = found[0];
          setSelectedPlace(place);
        }
      }
      if (!place) {
        setBusy(false);
        return setError("Could not resolve coordinates for partner's birth city.");
      }

      const data: GunMilanResult = await apiRequest(
        "/kundli/match",
        {
          partnerName: partnerName.trim(),
          partner: {
            dob: date.toISOString(),
            time: time24,
            placeName: place.name,
            lat: place.lat,
            lng: place.lng,
            timezone: place.timezone,
          },
        },
        true,
        "POST",
      );
      setResult(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not calculate compatibility.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const scorePct = Math.round((result.totalScore / result.maxScore) * 100);
    const isGood = result.totalScore >= 18;

    return (
      <View style={{ gap: 16 }}>
        {/* Score Banner Card */}
        <View
          style={{
            borderRadius: 22,
            borderWidth: 1,
            borderColor: isGood
              ? "rgba(127, 224, 168, 0.4)"
              : "rgba(243, 197, 86, 0.35)",
            backgroundColor: "rgba(18, 16, 28, 0.85)",
            padding: 20,
            alignItems: "center",
            gap: 12,
          }}
        >
          <Text
            style={{
              color: C.gold,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.6,
              textTransform: "uppercase",
            }}
          >
            ✦ Ashtakoota Gun Milan Report
          </Text>

          <View
            style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              borderWidth: 2,
              borderColor: isGood ? "#7FE0A8" : C.gold,
              backgroundColor: isGood
                ? "rgba(127, 224, 168, 0.1)"
                : "rgba(243, 197, 86, 0.1)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 30,
                fontWeight: "800",
                color: isGood ? "#7FE0A8" : C.gold,
              }}
            >
              {result.totalScore}
            </Text>
            <Text style={{ color: C.secondary, fontSize: 12 }}>
              out of {result.maxScore} ({scorePct}%)
            </Text>
          </View>

          <Text
            style={{
              color: "#F7F3EA",
              fontSize: 17,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {result.verdict}
          </Text>

          {/* You vs Partner Summary */}
          <View
            style={{
              flexDirection: "row",
              width: "100%",
              gap: 10,
              marginTop: 4,
            }}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                padding: 10,
                gap: 2,
              }}
            >
              <Text style={{ color: C.gold, fontSize: 11, fontWeight: "700" }}>
                YOU
              </Text>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }}>
                {result.userSummary.moonSign}
              </Text>
              <Text style={{ color: C.muted, fontSize: 11 }}>
                {result.userSummary.nakshatra} (P{result.userSummary.pada})
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                padding: 10,
                gap: 2,
              }}
            >
              <Text style={{ color: C.gold, fontSize: 11, fontWeight: "700" }}>
                {result.partnerName.toUpperCase()}
              </Text>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }}>
                {result.partnerSummary.moonSign}
              </Text>
              <Text style={{ color: C.muted, fontSize: 11 }}>
                {result.partnerSummary.nakshatra} (P{result.partnerSummary.pada})
              </Text>
            </View>
          </View>

          {/* Manglik Verdict */}
          <View
            style={{
              width: "100%",
              backgroundColor: "rgba(243, 197, 86, 0.08)",
              borderLeftWidth: 2.5,
              borderLeftColor: C.gold,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              gap: 2,
            }}
          >
            <Text style={{ color: C.gold, fontSize: 11, fontWeight: "700" }}>
              MANGLIK YOGA COMPARISON
            </Text>
            <Text style={{ color: "#EAE3D2", fontSize: 12.5 }}>
              {result.manglik.verdict}
            </Text>
          </View>
        </View>

        {/* 8 Kootas Breakdown */}
        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(243, 197, 86, 0.25)",
            backgroundColor: "rgba(18, 16, 28, 0.8)",
            padding: 18,
            gap: 14,
          }}
        >
          <Text
            style={{
              color: C.gold,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            ✦ 8-Fold Ashtakoota Breakdown
          </Text>

          <Pressable
            onPress={() => setShowGuide(!showGuide)}
            style={{
              alignSelf: "flex-start",
              backgroundColor: showGuide ? "rgba(243, 197, 86, 0.2)" : "rgba(255, 255, 255, 0.06)",
              borderWidth: 1,
              borderColor: showGuide ? C.gold : "rgba(255, 255, 255, 0.14)",
              borderRadius: 8,
              paddingHorizontal: 9,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: showGuide ? C.gold : C.text, fontSize: 11, fontWeight: "600" }}>
              {showGuide ? "Hide Score Guide" : "? How to read your 36-point Gun Milan score"}
            </Text>
          </Pressable>

          {showGuide && (
            <View
              style={{
                backgroundColor: "rgba(243, 197, 86, 0.07)",
                borderRadius: 12,
                padding: 12,
                gap: 6,
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.22)",
              }}
            >
              <Text style={{ color: C.gold, fontSize: 11, fontWeight: "700" }}>
                INTERPRETING ASHTAKOOTA GUN MILAN (36 POINTS)
              </Text>
              <Text style={{ color: "#EAE3D2", fontSize: 11.5, lineHeight: 17 }}>
                • <Text style={{ color: "#7FE0A8", fontWeight: "700" }}>32–36 Points (Ati Uttama):</Text> Exceptional compatibility across mind, vitality, and harmony.
              </Text>
              <Text style={{ color: "#EAE3D2", fontSize: 11.5, lineHeight: 17 }}>
                • <Text style={{ color: "#7FE0A8", fontWeight: "700" }}>25–31 Points (Uttama):</Text> Very strong marriage &amp; partnership foundation.
              </Text>
              <Text style={{ color: "#EAE3D2", fontSize: 11.5, lineHeight: 17 }}>
                • <Text style={{ color: C.gold, fontWeight: "700" }}>18–24 Points (Madhyama):</Text> Good acceptable match with balanced understanding.
              </Text>
              <Text style={{ color: "#EAE3D2", fontSize: 11.5, lineHeight: 17 }}>
                • <Text style={{ color: "#FFB4AB", fontWeight: "700" }}>Below 18 Points:</Text> Differences in temperament/vitality; check Bhakoot/Nadi cancellations and consult AI Pandit.
              </Text>
            </View>
          )}

          {result.kootas.map((k) => {
            const ratio = k.score / k.max;
            return (
              <View key={k.name} style={{ gap: 6 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text style={{ color: C.text, fontSize: 13.5, fontWeight: "700" }}>
                      {k.name}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 11 }}>{k.meaning}</Text>
                  </View>
                  <Text
                    style={{
                      color: ratio >= 0.5 ? "#7FE0A8" : ratio > 0 ? C.gold : "#FFB4AB",
                      fontSize: 13.5,
                      fontWeight: "700",
                    }}
                  >
                    {k.score} / {k.max}
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${Math.round(ratio * 100)}%`,
                      borderRadius: 3,
                      backgroundColor:
                        ratio >= 0.5 ? "#7FE0A8" : ratio > 0 ? C.gold : "#FFB4AB",
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <Button
          label="Match Another Partner"
          onPress={() => setResult(null)}
          variant="glass"
        />
      </View>
    );
  }

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(243, 197, 86, 0.28)",
        backgroundColor: "rgba(18, 16, 28, 0.8)",
        padding: 18,
        gap: 14,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text
          style={{
            color: C.gold,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          ✦ Kundli Matching · Gun Milan
        </Text>
        <Text style={s.sub}>
          Enter your partner&apos;s birth details to compute your 36-point Vedic Ashtakoota &amp; Manglik compatibility.
        </Text>
      </View>

      <Field
        label="Partner's full name"
        value={partnerName}
        onChange={setPartnerName}
        placeholder="e.g. Ananya"
      />

      <Field
        label="Partner's date of birth"
        value={dob}
        onChange={setDob}
        placeholder="DD / MM / YYYY or YYYY-MM-DD"
      />

      {/* Dedicated Non-Overflowing Time Input */}
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Partner&apos;s time of birth (optional)</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              height: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: focusedTime === "hour" ? C.gold : C.border,
              backgroundColor: C.glass,
              overflow: "hidden",
              justifyContent: "center",
            }}
          >
            <TextInput
              value={hour}
              onFocus={() => setFocusedTime("hour")}
              onBlur={() => setFocusedTime(null)}
              onChangeText={(v) => {
                const c = v.replace(/\D/g, "").slice(0, 2);
                if (c === "" || Number(c) <= 12) setHour(c);
              }}
              placeholder="HH"
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
              maxLength={2}
              style={{
                width: "100%",
                height: "100%",
                color: C.text,
                fontSize: 15,
                textAlign: "center",
                fontWeight: "600",
                ...({ outlineStyle: "none" } as object),
              }}
            />
          </View>
          <Text style={{ color: C.muted, fontSize: 18, fontWeight: "700" }}>:</Text>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              height: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: focusedTime === "minute" ? C.gold : C.border,
              backgroundColor: C.glass,
              overflow: "hidden",
              justifyContent: "center",
            }}
          >
            <TextInput
              value={minute}
              onFocus={() => setFocusedTime("minute")}
              onBlur={() => setFocusedTime(null)}
              onChangeText={(v) => {
                const c = v.replace(/\D/g, "").slice(0, 2);
                if (c === "" || Number(c) <= 59) setMinute(c);
              }}
              placeholder="MM"
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
              maxLength={2}
              style={{
                width: "100%",
                height: "100%",
                color: C.text,
                fontSize: 15,
                textAlign: "center",
                fontWeight: "600",
                ...({ outlineStyle: "none" } as object),
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              height: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: C.glass,
              overflow: "hidden",
            }}
          >
            {(["AM", "PM"] as const).map((p) => (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={{
                  paddingHorizontal: 14,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: period === p ? C.gold : "transparent",
                }}
              >
                <Text
                  style={{
                    color: period === p ? C.onGold : C.text,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Field
          label="Partner's place of birth"
          value={placeText}
          onChange={(x) => {
            setSelectedPlace(null);
            setPlaceText(x);
          }}
          placeholder="City / Town, State, Country"
        />
        {places.length > 0 && !selectedPlace && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {places.map((p) => (
              <Pressable
                key={`${p.lat}:${p.lng}`}
                onPress={() => {
                  setSelectedPlace(p);
                  setPlaceText(p.name);
                  setPlaces([]);
                }}
                style={{
                  backgroundColor: "rgba(243, 197, 86, 0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(243, 197, 86, 0.35)",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ color: "#F6E7B8", fontSize: 11.5 }}>
                  📍 {p.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {!!error && (
        <Text style={{ color: "#FFB4AB", fontSize: 12.5 }}>{error}</Text>
      )}

      <Button
        label={busy ? "Calculating 36 Gunas…" : "Match Kundlis (36 Gunas)"}
        onPress={calculateMatch}
        disabled={busy}
      />
    </View>
  );
}
