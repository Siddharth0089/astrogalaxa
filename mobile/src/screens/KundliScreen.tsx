import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../components/Button";
import { ChartStyleMode, ChartVariant, LagnaChart } from "../components/LagnaChart";
import { PlanetsTable } from "../components/PlanetsTable";
import { DashaTimeline } from "../components/DashaTimeline";
import { GunMilanMatch } from "../components/GunMilanMatch";
import { ZodiacIcon } from "../components/ZodiacBadge";
import { KundliData, Language, Screen } from "../types";
import { C } from "../theme/colors";
import {
  AVAKHADA_GUIDE,
  CHART_GUIDES,
  HOUSE_MEANINGS,
  PLANET_MEANINGS,
} from "../theme/astroGuide";
import { formatTitleCase, getCopy } from "../theme/i18n";
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
  language = "English",
  birth,
  kundli,
  kundliLoading,
  kundliError,
  token,
  onRetry,
  onNavigate,
}: {
  name: string;
  language?: Language;
  birth: { dob: string; time: string; place: string };
  kundli: KundliData | null;
  kundliLoading: boolean;
  kundliError: string;
  token?: string;
  onRetry: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const t = getCopy(language).kundli;
  const [tab, setTab] = useState<"Chart" | "Planets" | "Match" | "Insights" | "Dasha">("Chart");
  const [chartType, setChartType] = useState<ChartVariant>("lagna");
  const [chartStyle, setChartStyle] = useState<ChartStyleMode>("north");
  const [showChartGuide, setShowChartGuide] = useState(false);
  const [showAvakhadaGuide, setShowAvakhadaGuide] = useState(false);

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
    ? t.noBirthTime
    : mars?.house && manglikHouses.has(mars.house)
      ? language === "Hindi"
        ? `उपस्थित (मंगल भाव ${mars.house} में)`
        : language === "Hinglish"
          ? `Present (Mars H${mars.house} me)`
          : `Active (Mars in House ${mars.house})`
      : language === "English"
        ? "Balanced (None)"
        : "Non-Manglik";

  const chartOptions: { id: ChartVariant; label: string }[] = kundli?.ascendant
    ? [
        { id: "lagna", label: t.charts.lagna },
        { id: "chandra", label: t.charts.chandra },
        { id: "d9", label: t.charts.d9 },
        { id: "d10", label: t.charts.d10 },
      ]
    : [
        { id: "chandra", label: t.charts.chandraFull },
        { id: "d9", label: t.charts.d9 },
        { id: "d10", label: t.charts.d10 },
      ];

  const activeChartType: ChartVariant =
    !kundli?.ascendant && chartType === "lagna" ? "chandra" : chartType;

  return (
    <ScrollView
      contentContainerStyle={[s.page, { paddingTop: 22, paddingBottom: 100, gap: 18 }]}
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
          {t.eyebrow}
        </Text>
        <Text style={s.title}>{t.title(displayName)}</Text>
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
            {birth.dob || "—"} · {birth.time || t.noBirthTime}
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
                {t.addTimeBadge}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Modern Cosmic 5-Tab Bar */}
      <View
        style={{
          height: 44,
          flexDirection: "row",
          backgroundColor: "rgba(18, 16, 28, 0.85)",
          borderWidth: 1,
          borderColor: "rgba(243, 197, 86, 0.22)",
          borderRadius: 14,
          padding: 4,
        }}
      >
        {(["Chart", "Planets", "Match", "Insights", "Dasha"] as const).map((x) => {
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
                  fontSize: 11.5,
                }}
              >
                {t.tabs[x]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {kundliLoading ? (
        <Text style={s.sub}>{t.loading}</Text>
      ) : !kundli ? (
        <View style={[s.card, { gap: 12, padding: 20 }]}>
          <Text style={s.sub}>
            {kundliError || t.emptyFallback}
          </Text>
          {!!token && (
            <Button label={t.tryAgain} onPress={onRetry} variant="glass" />
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
                {t.moonActiveTitle}
              </Text>
              <Text style={{ color: "#EAE3D2", fontSize: 12, lineHeight: 18 }}>
                {t.moonActiveBody}
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
                  { id: "north" as const, label: t.northStyle },
                  { id: "south" as const, label: t.southStyle },
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

          {/* Active Chart Explanation & Tap-to-Learn Houses Guide */}
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(243, 197, 86, 0.22)",
              backgroundColor: "rgba(18, 16, 28, 0.72)",
              padding: 14,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text style={{ color: C.gold, fontSize: 12.5, fontWeight: "700", flex: 1 }}>
                {CHART_GUIDES[activeChartType]?.title}
              </Text>
              <Pressable
                onPress={() => setShowChartGuide(!showChartGuide)}
                style={{
                  backgroundColor: showChartGuide
                    ? "rgba(243, 197, 86, 0.2)"
                    : "rgba(255, 255, 255, 0.06)",
                  borderWidth: 1,
                  borderColor: showChartGuide ? C.gold : "rgba(255, 255, 255, 0.14)",
                  borderRadius: 8,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    color: showChartGuide ? C.gold : C.text,
                    fontSize: 11,
                    fontWeight: "600",
                  }}
                >
                  {showChartGuide ? t.closeGuide : t.howToRead}
                </Text>
              </Pressable>
            </View>
            <Text style={{ color: C.secondary, fontSize: 12, lineHeight: 18 }}>
              {CHART_GUIDES[activeChartType]?.summary}
            </Text>

            {showChartGuide && (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255, 255, 255, 0.08)",
                  paddingTop: 10,
                  gap: 10,
                }}
              >
                <Text style={{ color: C.gold, fontSize: 11, fontWeight: "700" }}>
                  {t.planetSymbolsHeading}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {Object.entries(PLANET_MEANINGS).map(([pName, info]) => (
                    <View
                      key={pName}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.05)",
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ color: "#F6E7B8", fontSize: 11, fontWeight: "600" }}>
                        {info.symbol} = {pName}
                      </Text>
                    </View>
                  ))}
                  <View
                    style={{
                      backgroundColor: "rgba(243, 197, 86, 0.12)",
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: C.gold, fontSize: 11, fontWeight: "600" }}>
                      {language === "English" ? "* = Retrograde" : "* = Retrograde (Vakri)"}
                    </Text>
                  </View>
                </View>

                <Text style={{ color: C.gold, fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                  {t.housesHeading}
                </Text>
                <View style={{ gap: 6 }}>
                  {Object.entries(HOUSE_MEANINGS).map(([hNum, hData]) => (
                    <Text
                      key={hNum}
                      style={{ color: "#EAE3D2", fontSize: 11.5, lineHeight: 17 }}
                    >
                      <Text style={{ color: "#F6E7B8", fontWeight: "700" }}>
                        {hData.title}:{" "}
                      </Text>
                      {hData.meaning}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </View>

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
                {t.ascendant}
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
                  {t.addTimeShort}
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
                {t.moonSign}
              </Text>
              <View style={{ gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <ZodiacIcon sign={kundli.moonSign} size={14} color={C.gold} />
                  <Text style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>
                    {kundli.moonSign}
                  </Text>
                </View>
                <Text style={{ color: C.muted, fontSize: 11 }}>
                  {t.lordLabel} {moonLord}
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
                {t.nakshatra}
              </Text>
              <View style={{ gap: 2 }}>
                <Text style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>
                  {kundli.nakshatra.name}
                </Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>
                  {kundli.nakshatra.pada ? `${t.padaLabel} ${kundli.nakshatra.pada}` : `${t.padaLabel} —`}
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
                  {t.sadeSatiLabel}
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
                {t.viewInsights}
              </Text>
            </Pressable>
          )}

          {!kundli.ascendant && (
            <Button
              label={t.addExactTimeBtn}
              onPress={() => onNavigate("birth")}
              variant="glass"
            />
          )}
          <Button
            label={t.askAiBtn}
            onPress={() => onNavigate("chat")}
          />
        </View>
      ) : tab === "Planets" ? (
        <PlanetsTable planets={kundli.planets} language={language} />
      ) : tab === "Match" ? (
        <GunMilanMatch language={language} />
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
                {t.transitsTitle}
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
                  {t.sadeSatiHeading}: {kundli.transits.sadeSati.status}
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
                      {tp.sign} · H{tp.houseFromMoon} ({t.fromMoon})
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
              {t.yogasTitle}
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
                {t.yogasEmpty}
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
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
                {t.avakhadaTitle}
              </Text>
              <Pressable
                onPress={() => setShowAvakhadaGuide(!showAvakhadaGuide)}
                style={{
                  backgroundColor: showAvakhadaGuide
                    ? "rgba(243, 197, 86, 0.2)"
                    : "rgba(255, 255, 255, 0.06)",
                  borderWidth: 1,
                  borderColor: showAvakhadaGuide
                    ? C.gold
                    : "rgba(255, 255, 255, 0.14)",
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    color: showAvakhadaGuide ? C.gold : C.text,
                    fontSize: 10.5,
                    fontWeight: "600",
                  }}
                >
                  {showAvakhadaGuide ? t.closeBtn : t.guideBtn}
                </Text>
              </Pressable>
            </View>

            {showAvakhadaGuide && (
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
                  {t.avakhadaGuideTitle}
                </Text>
                {Object.entries(AVAKHADA_GUIDE).map(([k, desc]) => (
                  <Text
                    key={k}
                    style={{ color: "#EAE3D2", fontSize: 11.5, lineHeight: 17 }}
                  >
                    <Text style={{ color: "#F6E7B8", fontWeight: "700" }}>
                      {k}:{" "}
                    </Text>
                    {desc}
                  </Text>
                ))}
              </View>
            )}

            {[
              [t.avakhadaRows.varna, kundli.avakhada?.varna || "—"],
              [t.avakhadaRows.vashya, kundli.avakhada?.vashya || "—"],
              [t.avakhadaRows.yoni, kundli.avakhada?.yoni || "—"],
              [t.avakhadaRows.gana, kundli.avakhada?.gana || "—"],
              [t.avakhadaRows.nadi, kundli.avakhada?.nadi || "—"],
              [t.avakhadaRows.tatva, kundli.avakhada?.tatva || "—"],
              [t.avakhadaRows.payaa, kundli.avakhada?.payaa || "—"],
              [t.avakhadaRows.rashiLord, moonLord],
              [t.avakhadaRows.nakshatraLord, nakshatraLord],
              [t.avakhadaRows.manglik, manglikStatus],
              [
                t.avakhadaRows.retrograde,
                retrogradePlanets.length > 0
                  ? retrogradePlanets.join(", ")
                  : t.avakhadaRows.allDirect,
              ],
              [t.avakhadaRows.ayanamsa, t.avakhadaRows.ayanamsaValue],
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
        <DashaTimeline dasha={kundli.dasha} language={language} />
      )}
    </ScrollView>
  );
}
