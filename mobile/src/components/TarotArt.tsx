import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

const arcanaShapes = [
  "M16 45L25 23 34 45M22 34h8 M25 14v4",
  "M15 20h20 M25 13v35 M18 44h14 M17 29h16",
  "M18 16v31 M32 16v31 M18 20h14 M21 15h8 M21 43h8",
  "M16 38h18l-2 8H18z M18 35l3-18 4 8 4-8 3 18",
  "M17 18h16v24H17z M21 18v-5h8v5 M21 25h8 M25 21v10",
  "M25 13v35 M17 19h16 M20 25h10 M18 42h14 M21 36h8",
  "M25 44C8 34 12 20 20 21c3 0 5 2 5 5 0-3 2-5 5-5 8 0 12 13-5 23z",
  "M17 22h16l3 17H14z M19 41a3 3 0 1 0 0 6a3 3 0 0 0 0-6 M31 41a3 3 0 1 0 0 6a3 3 0 0 0 0-6",
  "M25 15c-8 0-13 6-13 14s5 14 13 14 13-6 13-14-5-14-13-14z M20 31c2-5 8-5 10 0 M20 23h.1 M30 23h.1",
  "M25 13v22 M20 42h10 M19 30h12l-2 9h-8z M25 10v2",
  "M25 14a14 14 0 1 0 0 28a14 14 0 0 0 0-28z M25 14v28 M11 28h28 M15 18l20 20 M35 18L15 38",
  "M25 13v31 M17 20h16 M17 20l-5 10h10z M33 20l-5 10h10z M19 44h12",
  "M16 14h18 M25 14v12 M25 26l-6 8 M25 26l6 8 M19 34v10 M31 34v10",
  "M15 44l20-28 M29 16h6v6 M15 44l6-1 M21 43l-5-5",
  "M16 37c5-10 13-10 18 0 M17 20h16 M20 20v8 M30 20v8 M20 28l10 9",
  "M17 16l8 6 8-6-2 12 4 12H15l4-12z M20 28h10 M25 22v19",
  "M18 44V21l7-7 7 7v23 M16 44h18 M21 27h8 M21 33h8 M25 10v4",
  "M25 12l3 10 10 1-8 6 3 10-8-6-8 6 3-10-8-6 10-1z",
  "M31 14a14 14 0 1 0 5 23a13 13 0 0 1-5-23z M18 17h.1 M35 22h.1",
  "M25 20a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M25 11v5 M25 42v5 M7 29h5 M38 29h5 M12 16l4 4 M34 38l4 4 M38 16l-4 4 M16 38l-4 4",
  "M13 35h24 M18 35V23l7-7 7 7v12 M21 23h8 M25 39v7 M21 43l4-4 4 4",
  "M25 13a16 16 0 1 0 0 32a16 16 0 0 0 0-32z M17 29l5 5 11-12",
];

// Minor Arcana Suit Symbols (Wands, Cups, Swords, Pentacles)
const suitPaths: Record<string, string> = {
  wands:
    "M25 15v31 M25 15c-3.5 0-5-3-2-6c1.5 2 3.5 3.5 2 6z M22 23l-3-2 M28 31l3-2 M22 39l-3-2",
  cups:
    "M15 16h20c0 10-4 17-10 17S15 26 15 16z M25 33v10 M18 43h14 M17 21h16",
  swords:
    "M25 11v34 M22 17l3-6l3 6 M17 34h16 M21 45h8",
  pentacles:
    "M25 16l3.5 10.5H39l-8.5 6.2l3.2 10.5L25 36.8l-8.7 6.4l3.2-10.5L11 26.5h10.5z",
};

export function TarotArt({ artKey }: { artKey: string }) {
  const isMajor = artKey.startsWith("major-");
  let path = arcanaShapes[0];
  let showCircle = false;

  if (isMajor) {
    const index = Number(artKey.replace("major-", ""));
    path = arcanaShapes[index] ?? arcanaShapes[0];
  } else {
    const suit = artKey.split("-")[0];
    if (suit && suitPaths[suit]) {
      path = suitPaths[suit];
      if (suit === "pentacles") showCircle = true;
    }
  }

  return (
    <Svg
      viewBox="0 0 50 58"
      width="68%"
      height="56%"
      accessibilityLabel="Card illustration"
    >
      {showCircle && (
        <Circle
          cx="25"
          cy="29.5"
          r="16.5"
          fill="none"
          stroke="#9B6B13"
          strokeWidth="1.5"
        />
      )}
      <Path
        d={path}
        fill="none"
        stroke="#9B6B13"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
