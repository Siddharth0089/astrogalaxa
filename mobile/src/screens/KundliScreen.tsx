import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../components/Button";
import { LagnaChart } from "../components/LagnaChart";
import { PlanetsTable } from "../components/PlanetsTable";
import { DashaTimeline } from "../components/DashaTimeline";
import { ZodiacIcon } from "../components/ZodiacBadge";
import { KundliData, Screen } from "../types";
import { C } from "../theme/colors";
import { formatTitleCase } from "../theme/i18n";
import { s } from "../theme/styles";

const SIGN_LORDS: Record<string, string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

const NAKSHATRA_LORDS = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
];

function getNakshatraLord(nakshatraIndex?: number): string {
  if (nakshatraIndex === undefined || nakshatraIndex === null) return "—";
  return NAKSHATRA_LORDS[nakshatraIndex % 9] || "—";
}

function formatDegreeShort(deg?: number): string {
  if (deg === undefined || deg === null || !Number.isFinite(deg)) return "";
  const whole = Math.floor(deg);
  const mins = Math.floor((deg - whole) * 60);
  return `${whole}°${String(mins).padStart(2, "0")}'`;
}

export function KundliScreen({
  name,
  birth,
  kundli,
  kundliLoading,
  kundliError,
  token,
  onRetry,
  onNavigate,
}: {
  name: string;
  birth: { dob: string; time: string; place: string };
  kundli: KundliData | null;
  kundliLoading: boolean;
  kundliError: string;
  token?: string;
  onRetry: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const [tab, setTab] = useState<"Chart" | "Planets" | "Dasha">("Chart");
  const [chartType, setChartType] = useState<"lagna" | "chandra">("lagna");

  const displayName = formatTitleCase(name) || "Your";

  // Astrological metadata derived from real chart data
  const moonLord = kundli?.moonSign ? SIGN_LORDS[kundli.moonSign] || "—" : "—";
  const nakshatraLord = getNakshatraLord(kundli?.nakshatra?.index);
  const retrogradePlanets =
    kundli?.planets.filter((p) => p.retrograde).map((p) => p.id) ?? [];

  const mars = kundli?.planets.find((p) => p.id === "Mars");
  const manglikHouses = new Set([1, 2, 4, 7, 8, 12]);
  const manglikStatus = !kundli?.ascendant
    ? "Needs exact birth time"
    : mars?.house && manglikHouses.has(mars.house)
      ? `Present (Mars in H${mars.house})`
      : "Non-Manglik";

  return (
    <ScrollView
      contentContainerStyle={[s.page, { paddingTop: 22, paddingBottom: 28, gap: 18 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Spiritual Editorial Header (No App Bar) */}
      <View style={{ gap: 6 }}>
        <Text
          style={{
            color: C.gold,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1.8,
            textTransform: "uppercase",
          }}
        >
          ✦ Janma Kundli · Lahiri Sidereal
        </Text>
        <Text style={s.title}>{displayName}&apos;s Natal Chart</Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            marginTop: 2,
          }}
        >
          <Text style={s.sub}>
            {birth.dob || "Birth date"} · {birth.time || "No birth time"}
            {birth.place ? ` · ${birth.place}` : ""}
          </Text>
          {!birth.time && (
            <Pressable
              onPress={() => onNavigate("birth")}
              style={{
                backgroundColor: "rgba(243, 197, 86, 0.14)",
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.4)",
                borderRadius: 10,
                paddingHorizontal: 9,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: C.gold, fontSize: 11, fontWeight: "700" }}>
                + Add time
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Modern Cosmic Segmented Tabs */}
      <View
        style={{
          height: 46,
          flexDirection: "row",
          backgroundColor: "rgba(18, 16, 28, 0.85)",
          borderWidth: 1,
          borderColor: "rgba(243, 197, 86, 0.22)",
          borderRadius: 14,
          padding: 4,
        }}
      >
        {(["Chart", "Planets", "Dasha"] as const).map((x) => {
          const active = tab === x;
          return (
            <Pressable
              key={x}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(x)}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                backgroundColor: active ? C.gold : "transparent",
              }}
            >
              <Text
                style={{
                  color: active ? C.onGold : C.secondary,
                  fontWeight: active ? "700" : "600",
                  fontSize: 13.5,
                }}
              >
                {x}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {kundliLoading ? (
        <Text style={s.sub}>Calculating your planetary ephemeris…</Text>
      ) : !kundli ? (
        <View style={[s.card, { gap: 12, padding: 20 }]}>
          <Text style={s.sub}>
            {kundliError ||
              "Sign in and complete your birth details to view your Kundli."}
          </Text>
          {!!token && (
            <Button label="Try again" onPress={onRetry} variant="glass" />
          )}
        </View>
      ) : tab === "Chart" ? (
        <View style={{ gap: 16 }}>
          {/* Chart Variant Switcher OR Approximate Guidance Note */}
          {kundli.ascendant ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(
                [
                  { id: "lagna" as const, label: "Lagna Chart (D1)" },
                  { id: "chandra" as const, label: "Chandra Chart (Moon)" },
                ] as const
              ).map((mode) => {
                const isActive = chartType === mode.id;
                return (
                  <Pressable
                    key={mode.id}
                    onPress={() => setChartType(mode.id)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isActive
                        ? "rgba(243, 197, 86, 0.6)"
                        : "rgba(255, 255, 255, 0.1)",
                      backgroundColor: isActive
                        ? "rgba(243, 197, 86, 0.14)"
                        : "rgba(255, 255, 255, 0.03)",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? "#F6E7B8" : C.secondary,
                        fontSize: 12,
                        fontWeight: isActive ? "700" : "500",
                      }}
                    >
                      {mode.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: "rgba(243, 197, 86, 0.09)",
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.28)",
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 11,
                gap: 4,
              }}
            >
              <Text style={{ color: C.gold, fontSize: 12, fontWeight: "700" }}>
                Chandra Kundli Active
              </Text>
              <Text style={{ color: "#EAE3D2", fontSize: 12, lineHeight: 18 }}>
                Showing your Moon Chart from your birth date. Add exact birth time to unlock Ascendant (Lagna) and 12-house predictions.
              </Text>
            </View>
          )}

          {/* North Indian Diamond Chart (Always Rendered!) */}
          <LagnaChart
            data={kundli}
            chartType={kundli.ascendant ? chartType : "chandra"}
          />

          {/* 3 Core Identity Pills */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {/* Ascendant Tile */}
            <View
              style={{
                flex: 1,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.22)",
                backgroundColor: "rgba(18, 16, 28, 0.78)",
                padding: 12,
                gap: 6,
              }}
            >
              <Text style={{ color: C.secondary, fontSize: 11, fontWeight: "600" }}>
                Ascendant
              </Text>
              {kundli.ascendant?.sign ? (
                <View style={{ gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <ZodiacIcon sign={kundli.ascendant.sign} size={14} color={C.gold} />
                    <Text style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>
                      {kundli.ascendant.sign}
                    </Text>
                  </View>
                  {kundli.ascendant.degree !== undefined && (
                    <Text style={{ color: C.muted, fontSize: 11 }}>
                      {formatDegreeShort(kundli.ascendant.degree)}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={{ color: C.gold, fontWeight: "600", fontSize: 12 }}>
                  Add time
                </Text>
              )}
            </View>

            {/* Moon Sign Tile */}
            <View
              style={{
                flex: 1,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.22)",
                backgroundColor: "rgba(18, 16, 28, 0.78)",
                padding: 12,
                gap: 6,
              }}
            >
              <Text style={{ color: C.secondary, fontSize: 11, fontWeight: "600" }}>
                Moon Sign
              </Text>
              <View style={{ gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <ZodiacIcon sign={kundli.moonSign} size={14} color={C.gold} />
                  <Text style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>
                    {kundli.moonSign}
                  </Text>
                </View>
                <Text style={{ color: C.muted, fontSize: 11 }}>
                  Lord: {moonLord}
                </Text>
              </View>
            </View>

            {/* Nakshatra Tile */}
            <View
              style={{
                flex: 1,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.22)",
                backgroundColor: "rgba(18, 16, 28, 0.78)",
                padding: 12,
                gap: 6,
              }}
            >
              <Text style={{ color: C.secondary, fontSize: 11, fontWeight: "600" }}>
                Nakshatra
              </Text>
              <View style={{ gap: 2 }}>
                <Text style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>
                  {kundli.nakshatra.name}
                </Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>
                  {kundli.nakshatra.pada ? `Pada ${kundli.nakshatra.pada}` : "Pada —"}
                </Text>
              </View>
            </View>
          </View>

          {/* Vedic Astrological Summary & Dosha Analysis Card */}
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(243, 197, 86, 0.25)",
              backgroundColor: "rgba(18, 16, 28, 0.78)",
              padding: 18,
              gap: 12,
            }}
          >
            <Text
              style={{
                color: C.gold,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              ✦ Vedic Analysis & Calculation Details
            </Text>

            {[
              ["Rashi Swami (Moon Lord)", moonLord],
              ["Janma Nakshatra Lord", nakshatraLord],
              ["Manglik Yoga Check", manglikStatus],
              [
                "Retrograde (Vakri)",
                retrogradePlanets.length > 0
                  ? retrogradePlanets.join(", ")
                  : "All planets direct",
              ],
              ["Ayanamsa Standard", "Lahiri (Chitrapaksha)"],
            ].map(([label, val], idx, arr) => (
              <View
                key={label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: idx < arr.length - 1 ? 10 : 0,
                  borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                  borderBottomColor: "rgba(255, 255, 255, 0.07)",
                }}
              >
                <Text style={{ color: C.secondary, fontSize: 13 }}>{label}</Text>
                <Text
                  style={{
                    color: C.text,
                    fontSize: 13,
                    fontWeight: "600",
                    maxWidth: "55%",
                    textAlign: "right",
                  }}
                >
                  {val}
                </Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          {!kundli.ascendant && (
            <Button
              label="Add exact time of birth"
              onPress={() => onNavigate("birth")}
              variant="glass"
            />
          )}
          <Button
            label="Ask AI Pandit About This Chart"
            onPress={() => onNavigate("chat")}
          />
        </View>
      ) : tab === "Planets" ? (
        <PlanetsTable planets={kundli.planets} />
      ) : (
        <DashaTimeline dasha={kundli.dasha} />
      )}
    </ScrollView>
  );
}
