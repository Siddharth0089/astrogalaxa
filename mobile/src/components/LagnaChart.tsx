import React from "react";
import { View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { KundliData } from "../types";
import { C } from "../theme/colors";
import { s } from "../theme/styles";

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

export function LagnaChart({ data }: { data: KundliData }) {
  const positions = [
    [170, 80],
    [90, 40],
    [45, 85],
    [90, 165],
    [45, 245],
    [90, 290],
    [170, 250],
    [250, 290],
    [295, 245],
    [250, 165],
    [295, 85],
    [250, 40],
  ];
  const asc = signNames.indexOf(data.ascendant?.sign ?? "");

  return (
    <View
      accessibilityLabel="North Indian Lagna chart"
      style={[s.chart, { backgroundColor: C.glass, borderRadius: 16 }]}
    >
      <Svg viewBox="0 0 340 340" width="100%" height="100%">
        <Rect
          x="8"
          y="8"
          width="324"
          height="324"
          fill="none"
          stroke={C.gold}
          strokeWidth="1.5"
        />
        <Line x1="8" y1="8" x2="332" y2="332" stroke={C.gold} />
        <Line x1="332" y1="8" x2="8" y2="332" stroke={C.gold} />
        <Line x1="170" y1="8" x2="332" y2="170" stroke={C.gold} />
        <Line x1="332" y1="170" x2="170" y2="332" stroke={C.gold} />
        <Line x1="170" y1="332" x2="8" y2="170" stroke={C.gold} />
        <Line x1="8" y1="170" x2="170" y2="8" stroke={C.gold} />
        {positions.map(([x, y], i) => (
          <React.Fragment key={i}>
            <SvgText
              x={x}
              y={y}
              textAnchor="middle"
              fill={C.secondary}
              fontSize="12"
            >
              {String(((asc + i) % 12) + 1)}
            </SvgText>
            <SvgText
              x={x}
              y={y + 17}
              textAnchor="middle"
              fill={C.text}
              fontSize="13"
              fontWeight="600"
            >
              {data.planets
                .filter((p) => p.house === i + 1)
                .map((p) => abbreviations[p.id])
                .join(" ")}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
