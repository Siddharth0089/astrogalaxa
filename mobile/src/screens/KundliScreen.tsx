import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../components/Button";
import { ChartStyleMode, ChartVariant, LagnaChart } from "../components/LagnaChart";
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

function getNakshatraLord(nakshatraIndex?: number, explicitLord?: string): string {
  if (explicitLord) return explicitLord;
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
  const [tab, setTab] = useState<"Chart" | "Planets" | "Insights" | "Dasha">("Chart");
  const [chartType, setChartType] = useState<ChartVariant>("lagna");
  const [chartStyle, setChartStyle] = useState<ChartStyleMode>("north");

  const displayName = formatTitleCase(name) || "Your";

  const moonLord = kundli?.moonSign ? SIGN_LORDS[kundli.moonSign] || "—" : "—";
  const nakshatraLord = getNakshatraLord(
    kundli?.nakshatra?.index,
    kundli?.nakshatra?.lord,
  );
  const retrogradePlanets =
    kundli?.planets.filter((p) => p.retrograde).map((p) => p.id) ?? [];

  const mars = kundli?.planets.find((p) => p.id === "Mars");
  const manglikHouses = new Set([1, 2, 4, 7, 8, 12]);
  const manglikStatus = !kundli?.ascendant
    ? "Needs exact birth time"
    : mars?.house && manglikHouses.has(mars.house)
      ? `Present (Mars in H${mars.house})`
      : "Non-Manglik";

  const chartOptions: { id: ChartVariant; label: string }[] = kundli?.ascendant
    ? [
        { id: "lagna", label: "Lagna (D1)" },
        { id: "chandra", label: "Moon" },
        { id: "d9", label: "Navamsa (D9)" },
        { id: "d10", label: "Dasamsa (D10)" },
      ]
    : [
        { id: "chandra", label: "Moon Chart" },
        { id: "d9", label: "Navamsa (D9)" },
        { id: "d10", label: "Dasamsa (D10)" },
      ];

  const activeChartType: ChartVariant =
    !kundli?.ascendant && chartType === "lagna" ? "chandra" : chartType;

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

      {/* Modern Cosmic 4-Tab Bar */}
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
        {(["Chart", "Planets", "Insights", "Dasha"] as const).map((x) => {
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
                  fontSize: 12.5,
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
          {!kundli.ascendant && (
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
                Showing Moon, Navamsa (D9), and Dasamsa (D10) charts from your birth date. Add exact birth time to unlock Ascendant (Lagna) &amp; exact houses.
              </Text>
            </View>
          )}

          {/* Divisional Chart & Style Controls */}
          <View style={{ gap: 8 }}>
            {/* Divisional Switcher (D1, Moon, D9, D10) */}
            <View style={{ flexDirection: "row", gap: 6 }}>
              {chartOptions.map((opt) => {
                const isActive = activeChartType === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setChartType(opt.id)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
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
                        fontSize: 11.5,
                        fontWeight: isActive ? "700" : "500",
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* North Indian vs South Indian Style Switcher */}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 6 }}>
              {(
                [
                  { id: "north" as const, label: "◊ North Indian" },
                  { id: "south" as const, label: "⊞ South Indian" },
                ] as const
              ).map((st) => {
                const isActive = chartStyle === st.id;
                return (
                  <Pressable
                    key={st.id}
                    onPress={() => setChartStyle(st.id)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isActive
                        ? "rgba(243, 197, 86, 0.55)"
                        : "rgba(255, 255, 255, 0.08)",
                      backgroundColor: isActive
                        ? "rgba(243, 197, 86, 0.12)"
                        : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? C.gold : C.secondary,
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {st.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Chart Component */}
          <LagnaChart
            data={kundli}
            chartType={activeChartType}
            chartStyle={chartStyle}
          />

          {/* 3 Core Identity Pills */}
          <View style={{ flexDirection: "row", gap: 8 }}>
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

          {/* Sade Sati & Yogas Quick Glance */}
          {kundli.transits?.sadeSati && (
            <Pressable
              onPress={() => setTab("Insights")}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: kundli.transits.sadeSati.active
                  ? "rgba(243, 197, 86, 0.45)"
                  : "rgba(127, 224, 168, 0.35)",
                backgroundColor: "rgba(18, 16, 28, 0.78)",
                padding: 14,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ gap: 2, flex: 1, paddingRight: 8 }}>
                <Text style={{ color: C.secondary, fontSize: 11, fontWeight: "600" }}>
                  SHANI SADE SATI &amp; LIVE TRANSIT
                </Text>
                <Text
                  style={{
                    color: kundli.transits.sadeSati.active ? C.gold : "#7FE0A8",
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  {kundli.transits.sadeSati.status}
                </Text>
              </View>
              <Text style={{ color: C.gold, fontSize: 12, fontWeight: "600" }}>
                View Insights →
              </Text>
            </Pressable>
          )}

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
      ) : tab === "Insights" ? (
        <View style={{ gap: 16 }}>
          {/* 1. Live Transits (Gochar) & Shani Sade Sati */}
          {kundli.transits && (
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.3)",
                backgroundColor: "rgba(18, 16, 28, 0.8)",
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
                ✦ Live Transits (Gochar) &amp; Sade Sati
              </Text>
              <View
                style={{
                  backgroundColor: kundli.transits.sadeSati.active
                    ? "rgba(243, 197, 86, 0.1)"
                    : "rgba(127, 224, 168, 0.08)",
                  borderLeftWidth: 3,
                  borderLeftColor: kundli.transits.sadeSati.active
                    ? C.gold
                    : "#7FE0A8",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  gap: 4,
                }}
              >
                <Text
                  style={{
                    color: kundli.transits.sadeSati.active ? C.gold : "#7FE0A8",
                    fontSize: 13.5,
                    fontWeight: "700",
                  }}
                >
                  Sade Sati: {kundli.transits.sadeSati.status}
                </Text>
                <Text style={{ color: "#EAE3D2", fontSize: 12.5, lineHeight: 19 }}>
                  {kundli.transits.sadeSati.summary}
                </Text>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {kundli.transits.planets.map((tp) => (
                  <View
                    key={tp.id}
                    style={{
                      width: "48%",
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.08)",
                      borderRadius: 12,
                      padding: 10,
                      gap: 2,
                    }}
                  >
                    <Text style={{ color: C.gold, fontSize: 12, fontWeight: "700" }}>
                      {tp.id} {tp.retrograde ? "(R)" : ""}
                    </Text>
                    <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }}>
                      {tp.sign} · H{tp.houseFromMoon} from Moon
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 2. Auspicious Vedic Yogas */}
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(243, 197, 86, 0.25)",
              backgroundColor: "rgba(18, 16, 28, 0.8)",
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
              ✦ Planetary Yogas in Your Chart
            </Text>
            {kundli.yogas && kundli.yogas.length > 0 ? (
              kundli.yogas.map((yoga, i) => (
                <View
                  key={yoga.name}
                  style={{
                    gap: 4,
                    paddingBottom: i < kundli.yogas!.length - 1 ? 10 : 0,
                    borderBottomWidth: i < kundli.yogas!.length - 1 ? 1 : 0,
                    borderBottomColor: "rgba(255, 255, 255, 0.07)",
                  }}
                >
                  <Text style={{ color: "#F6E7B8", fontSize: 14, fontWeight: "700" }}>
                    ✧ {yoga.name}
                  </Text>
                  <Text style={{ color: C.secondary, fontSize: 12.5, lineHeight: 18 }}>
                    {yoga.description}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={s.sub}>
                Balanced planetary alignments supporting steady life growth.
              </Text>
            )}
          </View>

          {/* 3. Avakhada Chakra & Vedic Attributes */}
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(243, 197, 86, 0.25)",
              backgroundColor: "rgba(18, 16, 28, 0.8)",
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
              ✦ Avakhada Chakra &amp; Gun Milan Profile
            </Text>

            {[
              ["Varna", kundli.avakhada?.varna || "—"],
              ["Vashya", kundli.avakhada?.vashya || "—"],
              ["Yoni", kundli.avakhada?.yoni || "—"],
              ["Gana", kundli.avakhada?.gana || "—"],
              ["Nadi", kundli.avakhada?.nadi || "—"],
              ["Tatva (Element)", kundli.avakhada?.tatva || "—"],
              ["Payaa (Moon Foot)", kundli.avakhada?.payaa || "—"],
              ["Rashi Swami", moonLord],
              ["Nakshatra Lord", nakshatraLord],
              ["Manglik Yoga", manglikStatus],
              [
                "Retrograde (Vakri)",
                retrogradePlanets.length > 0
                  ? retrogradePlanets.join(", ")
                  : "All planets direct",
              ],
              ["Ayanamsa", "Lahiri (Chitrapaksha)"],
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
                    maxWidth: "56%",
                    textAlign: "right",
                  }}
                >
                  {val}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <DashaTimeline dasha={kundli.dasha} />
      )}
    </ScrollView>
  );
}
