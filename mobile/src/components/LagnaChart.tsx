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

export function LagnaChart({
  data,
  chartType = "lagna",
}: {
  data: KundliData;
  chartType?: "lagna" | "chandra";
}) {
  // Coordinates for the 12 North Indian Diamond Houses (1 through 12 counter-clockwise)
  const positions: [number, number][] = [
    [170, 72],   // House 1 (Top Center Diamond)
    [90, 36],    // House 2 (Top Left Upper Triangle)
    [42, 82],    // House 3 (Top Left Outer Triangle)
    [88, 162],   // House 4 (Left Center Diamond)
    [42, 242],   // House 5 (Bottom Left Outer Triangle)
    [90, 290],   // House 6 (Bottom Left Lower Triangle)
    [170, 248],  // House 7 (Bottom Center Diamond)
    [250, 290],  // House 8 (Bottom Right Lower Triangle)
    [298, 242],  // House 9 (Bottom Right Outer Triangle)
    [252, 162],  // House 10 (Right Center Diamond)
    [298, 82],   // House 11 (Top Right Outer Triangle)
    [250, 36],   // House 12 (Top Right Upper Triangle)
  ];

  const useChandra = chartType === "chandra" || !data.ascendant?.sign;
  const baseSignName = useChandra ? data.moonSign : data.ascendant?.sign || data.moonSign;
  const baseIdx = Math.max(0, signNames.indexOf(baseSignName));

  // Map each planet to its house (1..12) relative to either Lagna or Moon Sign
  const planetsByHouse = (houseNum: number) => {
    return data.planets.filter((p) => {
      if (!useChandra && p.house != null) {
        return p.house === houseNum;
      }
      const pIdx = signNames.indexOf(p.sign);
      if (pIdx < 0) return false;
      const computedHouse = ((pIdx - baseIdx + 12) % 12) + 1;
      return computedHouse === houseNum;
    });
  };

  return (
    <View
      accessibilityLabel={
        useChandra ? "North Indian Chandra Moon chart" : "North Indian Lagna chart"
      }
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
          ✦ {useChandra ? "Chandra Kundli (Moon)" : "Janma Kundli (D1 Lagna)"}
        </Text>
        <Text style={{ color: C.secondary, fontSize: 11 }}>
          North Indian Chart
        </Text>
      </View>

      <View style={{ width: "100%", aspectRatio: 1 }}>
        <Svg viewBox="0 0 340 340" width="100%" height="100%">
          {/* Outer Cosmic Frame */}
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
          {/* North Indian Diamond Geometry */}
          <Line x1="8" y1="8" x2="332" y2="332" stroke="rgba(243, 197, 86, 0.55)" strokeWidth="1.1" />
          <Line x1="332" y1="8" x2="8" y2="332" stroke="rgba(243, 197, 86, 0.55)" strokeWidth="1.1" />
          <Line x1="170" y1="8" x2="332" y2="170" stroke="rgba(243, 197, 86, 0.65)" strokeWidth="1.2" />
          <Line x1="332" y1="170" x2="170" y2="332" stroke="rgba(243, 197, 86, 0.65)" strokeWidth="1.2" />
          <Line x1="170" y1="332" x2="8" y2="170" stroke="rgba(243, 197, 86, 0.65)" strokeWidth="1.2" />
          <Line x1="8" y1="170" x2="170" y2="8" stroke="rgba(243, 197, 86, 0.65)" strokeWidth="1.2" />

          {/* Center Cosmic Bindu */}
          <Circle cx="170" cy="170" r="2.5" fill={C.gold} opacity="0.6" />

          {positions.map(([x, y], i) => {
            const houseNumber = i + 1;
            const signNumber = ((baseIdx + i) % 12) + 1;
            const housePlanets = planetsByHouse(houseNumber);
            const labels = housePlanets.map(
              (p) => `${abbreviations[p.id] || p.id.slice(0, 2)}${p.retrograde ? "*" : ""}`,
            );
            const line1 = labels.slice(0, 3).join(" ");
            const line2 = labels.slice(3, 6).join(" ");

            return (
              <React.Fragment key={houseNumber}>
                {/* Zodiac Rashi Sign Number */}
                <SvgText
                  x={x}
                  y={y}
                  textAnchor="middle"
                  fill="rgba(243, 197, 86, 0.72)"
                  fontSize="11"
                  fontWeight="700"
                >
                  {houseNumber === 1
                    ? `${signNumber} · ${useChandra ? "Mo" : "Asc"}`
                    : String(signNumber)}
                </SvgText>

                {/* Planets in this house */}
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
      </View>

      <Text
        style={{
          color: C.muted,
          fontSize: 11,
          textAlign: "center",
        }}
      >
        Numbers show zodiac signs (1 Aries – 12 Pisces) • * denotes Retrograde (Vakri)
      </Text>
    </View>
  );
}
