import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Rect, Text as SvgText } from "react-native-svg";
import { KundliData } from "../types";
import { C } from "../theme/colors";

const signNames = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const signShort = [
  "Ari",
  "Tau",
  "Gem",
  "Can",
  "Leo",
  "Vir",
  "Lib",
  "Sco",
  "Sag",
  "Cap",
  "Aqu",
  "Pis",
];

const abbreviations: Record<string, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};

// Clockwise 4x4 grid coordinates [col, row] for each Zodiac sign (0=Aries..11=Pisces) in South Indian chart
const SOUTH_CELLS: [number, number][] = [
  [1, 0], // 0 Aries
  [2, 0], // 1 Taurus
  [3, 0], // 2 Gemini
  [3, 1], // 3 Cancer
  [3, 2], // 4 Leo
  [3, 3], // 5 Virgo
  [2, 3], // 6 Libra
  [1, 3], // 7 Scorpio
  [0, 3], // 8 Sagittarius
  [0, 2], // 9 Capricorn
  [0, 1], // 10 Aquarius
  [0, 0], // 11 Pisces
];

export type ChartVariant = "lagna" | "chandra" | "d9" | "d10";
export type ChartStyleMode = "north" | "south";

export function LagnaChart({
  data,
  chartType = "lagna",
  chartStyle = "north",
}: {
  data: KundliData;
  chartType?: ChartVariant;
  chartStyle?: ChartStyleMode;
}) {
  // Determine which planetary list and ascendant/base sign to plot
  const isD9 = chartType === "d9" && Boolean(data.d9);
  const isD10 = chartType === "d10" && Boolean(data.d10);
  const isChandra =
    chartType === "chandra" || (!isD9 && !isD10 && !data.ascendant?.sign);

  const sourcePlanets = isD9
    ? data.d9!.planets
    : isD10
      ? data.d10!.planets
      : data.planets;

  const moonD9Sign = isD9
    ? sourcePlanets.find((p) => p.id === "Moon")?.sign
    : isD10
      ? sourcePlanets.find((p) => p.id === "Moon")?.sign
      : data.moonSign;

  const baseSignName = isD9
    ? data.d9?.ascendant?.sign || moonD9Sign || data.moonSign
    : isD10
      ? data.d10?.ascendant?.sign || moonD9Sign || data.moonSign
      : isChandra
        ? data.moonSign
        : data.ascendant?.sign || data.moonSign;

  const hasExactAsc =
    (isD9 && Boolean(data.d9?.ascendant?.sign)) ||
    (isD10 && Boolean(data.d10?.ascendant?.sign)) ||
    (!isD9 && !isD10 && !isChandra && Boolean(data.ascendant?.sign));

  const baseIdx = Math.max(0, signNames.indexOf(baseSignName));

  const chartTitle = isD9
    ? "Navamsa Chart (D9)"
    : isD10
      ? "Dasamsa Chart (D10)"
      : isChandra
        ? "Chandra Kundli (Moon)"
        : "Janma Kundli (D1 Lagna)";

  // Helper to get planets for a given sign index (0..11)
  const planetsInSign = (signIdx: number) =>
    sourcePlanets.filter((p) => signNames.indexOf(p.sign) === signIdx);

  // Helper to get planets for a North Indian house (1..12)
  const planetsByHouse = (houseNum: number) => {
    return sourcePlanets.filter((p) => {
      if (hasExactAsc && p.house != null) {
        return p.house === houseNum;
      }
      const pIdx = signNames.indexOf(p.sign);
      if (pIdx < 0) return false;
      const computedHouse = ((pIdx - baseIdx + 12) % 12) + 1;
      return computedHouse === houseNum;
    });
  };

  // Coordinates for the 12 North Indian Diamond Houses
  const northPositions: [number, number][] = [
    [170, 72],
    [90, 36],
    [42, 82],
    [88, 162],
    [42, 242],
    [90, 290],
    [170, 248],
    [250, 290],
    [298, 242],
    [252, 162],
    [298, 82],
    [250, 36],
  ];

  const renderPlanetLabel = (p: { id: string; retrograde?: boolean }) =>
    `${abbreviations[p.id] || p.id.slice(0, 2)}${p.retrograde ? "*" : ""}`;

  return (
    <View
      accessibilityLabel={`${chartStyle} Indian ${chartTitle}`}
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(243, 197, 86, 0.34)",
        backgroundColor: "rgba(16, 14, 24, 0.84)",
        padding: 14,
        gap: 10,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 4,
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
          ✦ {chartTitle}
        </Text>
        <Text style={{ color: C.secondary, fontSize: 11 }}>
          {chartStyle === "south" ? "South Indian" : "North Indian"}
        </Text>
      </View>

      <View style={{ width: "100%", aspectRatio: 1 }}>
        {chartStyle === "north" ? (
          <Svg viewBox="0 0 340 340" width="100%" height="100%">
            <Rect
              x="8"
              y="8"
              width="324"
              height="324"
              rx="6"
              fill="rgba(243, 197, 86, 0.03)"
              stroke="rgba(243, 197, 86, 0.72)"
              strokeWidth="1.6"
            />
            <Rect
              x="12"
              y="12"
              width="316"
              height="316"
              rx="4"
              fill="none"
              stroke="rgba(243, 197, 86, 0.22)"
              strokeWidth="0.8"
            />
            <Line
              x1="8"
              y1="8"
              x2="332"
              y2="332"
              stroke="rgba(243, 197, 86, 0.55)"
              strokeWidth="1.1"
            />
            <Line
              x1="332"
              y1="8"
              x2="8"
              y2="332"
              stroke="rgba(243, 197, 86, 0.55)"
              strokeWidth="1.1"
            />
            <Line
              x1="170"
              y1="8"
              x2="332"
              y2="170"
              stroke="rgba(243, 197, 86, 0.65)"
              strokeWidth="1.2"
            />
            <Line
              x1="332"
              y1="170"
              x2="170"
              y2="332"
              stroke="rgba(243, 197, 86, 0.65)"
              strokeWidth="1.2"
            />
            <Line
              x1="170"
              y1="332"
              x2="8"
              y2="170"
              stroke="rgba(243, 197, 86, 0.65)"
              strokeWidth="1.2"
            />
            <Line
              x1="8"
              y1="170"
              x2="170"
              y2="8"
              stroke="rgba(243, 197, 86, 0.65)"
              strokeWidth="1.2"
            />
            <Circle cx="170" cy="170" r="2.5" fill={C.gold} opacity="0.6" />

            {northPositions.map(([x, y], i) => {
              const houseNumber = i + 1;
              const signNumber = ((baseIdx + i) % 12) + 1;
              const labels = planetsByHouse(houseNumber).map(renderPlanetLabel);
              const line1 = labels.slice(0, 3).join(" ");
              const line2 = labels.slice(3, 6).join(" ");

              return (
                <React.Fragment key={houseNumber}>
                  <SvgText
                    x={x}
                    y={y}
                    textAnchor="middle"
                    fill="rgba(243, 197, 86, 0.72)"
                    fontSize="11"
                    fontWeight="700"
                  >
                    {houseNumber === 1
                      ? `${signNumber} · ${hasExactAsc ? "Asc" : "Mo"}`
                      : String(signNumber)}
                  </SvgText>
                  {!!line1 && (
                    <SvgText
                      x={x}
                      y={y + 16}
                      textAnchor="middle"
                      fill="#F7F3EA"
                      fontSize="12.5"
                      fontWeight="700"
                    >
                      {line1}
                    </SvgText>
                  )}
                  {!!line2 && (
                    <SvgText
                      x={x}
                      y={y + 30}
                      textAnchor="middle"
                      fill="#F7F3EA"
                      fontSize="12"
                      fontWeight="700"
                    >
                      {line2}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
        ) : (
          /* South Indian 4x4 Fixed Sign Grid */
          <Svg viewBox="0 0 340 340" width="100%" height="100%">
            <Rect
              x="6"
              y="6"
              width="328"
              height="328"
              rx="6"
              fill="rgba(243, 197, 86, 0.03)"
              stroke="rgba(243, 197, 86, 0.72)"
              strokeWidth="1.6"
            />
            {/* Grid Lines */}
            {[88, 170, 252].map((pos) => (
              <React.Fragment key={pos}>
                <Line
                  x1={pos}
                  y1={pos === 170 ? 6 : 6}
                  x2={pos}
                  y2={pos === 170 ? 88 : 334}
                  stroke="rgba(243, 197, 86, 0.5)"
                  strokeWidth="1.1"
                />
                {pos === 170 && (
                  <Line
                    x1={170}
                    y1={252}
                    x2={170}
                    y2={334}
                    stroke="rgba(243, 197, 86, 0.5)"
                    strokeWidth="1.1"
                  />
                )}
                <Line
                  x1={6}
                  y1={pos}
                  x2={pos === 170 ? 88 : 334}
                  y2={pos}
                  stroke="rgba(243, 197, 86, 0.5)"
                  strokeWidth="1.1"
                />
                {pos === 170 && (
                  <Line
                    x1={252}
                    y1={170}
                    x2={334}
                    y2={170}
                    stroke="rgba(243, 197, 86, 0.5)"
                    strokeWidth="1.1"
                  />
                )}
              </React.Fragment>
            ))}

            {/* Center Label inside 2x2 Inner Square */}
            <Rect
              x="94"
              y="94"
              width="152"
              height="152"
              rx="8"
              fill="rgba(243, 197, 86, 0.04)"
              stroke="rgba(243, 197, 86, 0.25)"
              strokeWidth="1"
            />
            <SvgText
              x="170"
              y="164"
              textAnchor="middle"
              fill={C.gold}
              fontSize="14"
              fontWeight="700"
            >
              {isD9 ? "NAVAMSA (D9)" : isD10 ? "DASAMSA (D10)" : isChandra ? "CHANDRA" : "RASHI (D1)"}
            </SvgText>
            <SvgText
              x="170"
              y="184"
              textAnchor="middle"
              fill={C.secondary}
              fontSize="11"
            >
              {hasExactAsc ? `Lagna: ${baseSignName}` : `Moon: ${baseSignName}`}
            </SvgText>

            {/* 12 Fixed Zodiac Boxes */}
            {SOUTH_CELLS.map(([col, row], signIdx) => {
              const x0 = 6 + col * 82;
              const y0 = 6 + row * 82;
              const isBase = signIdx === baseIdx;
              const labels = planetsInSign(signIdx).map(renderPlanetLabel);
              const line1 = labels.slice(0, 3).join(" ");
              const line2 = labels.slice(3, 6).join(" ");

              return (
                <React.Fragment key={signIdx}>
                  {/* Double Diagonal Ascendant Slash Mark */}
                  {isBase && (
                    <>
                      <Line
                        x1={x0 + 62}
                        y1={y0 + 4}
                        x2={x0 + 78}
                        y2={y0 + 20}
                        stroke={C.gold}
                        strokeWidth="1.2"
                      />
                      <Line
                        x1={x0 + 56}
                        y1={y0 + 4}
                        x2={x0 + 78}
                        y2={y0 + 26}
                        stroke={C.gold}
                        strokeWidth="1.2"
                      />
                    </>
                  )}
                  <SvgText
                    x={x0 + 8}
                    y={y0 + 18}
                    fill={isBase ? C.gold : "rgba(243, 197, 86, 0.58)"}
                    fontSize="10"
                    fontWeight="700"
                  >
                    {signShort[signIdx]}
                    {isBase ? (hasExactAsc ? " · Asc" : " · Mo") : ""}
                  </SvgText>

                  {!!line1 && (
                    <SvgText
                      x={x0 + 41}
                      y={y0 + 44}
                      textAnchor="middle"
                      fill="#F7F3EA"
                      fontSize="12"
                      fontWeight="700"
                    >
                      {line1}
                    </SvgText>
                  )}
                  {!!line2 && (
                    <SvgText
                      x={x0 + 41}
                      y={y0 + 60}
                      textAnchor="middle"
                      fill="#F7F3EA"
                      fontSize="11.5"
                      fontWeight="700"
                    >
                      {line2}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
        )}
      </View>

      <Text
        style={{
          color: C.muted,
          fontSize: 11,
          textAlign: "center",
        }}
      >
        * denotes Retrograde (Vakri) • Lahiri Sidereal Whole-Sign
      </Text>
    </View>
  );
}
