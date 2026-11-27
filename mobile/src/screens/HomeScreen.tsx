import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ZodiacBadge, ZodiacIcon } from "../components/ZodiacBadge";
import { Horoscope, Language, NameSign, PanchangData, Screen } from "../types";
import { apiRequest } from "../../session";
import { C, disclaimer } from "../theme/colors";
import { PANCHANG_GUIDE } from "../theme/astroGuide";
import { getCopy } from "../theme/i18n";
import { s } from "../theme/styles";

export function HomeScreen({
  name,
  language = "English",
  nameSign,
  sunSign,
  horoscope,
  horoscopeLoading,
  horoscopeError,
  token,
  onRetryHoroscope,
  onNavigate,
}: {
  name: string;
  language?: Language;
  nameSign: NameSign | null;
  sunSign: string | null;
  horoscope: Horoscope | null;
  horoscopeLoading: boolean;
  horoscopeError: string;
  token?: string;
  onRetryHoroscope: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [showPanchangGuide, setShowPanchangGuide] = useState(false);
  const t = getCopy(language);

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiRequest("/panchang/today", undefined, true)
      .then((res: PanchangData) => {
        if (active) setPanchang(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <ScrollView
      contentContainerStyle={[s.page, { paddingBottom: 100, gap: 18 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Greeting & Modern Celestial Profile Button */}
      <View style={s.homeTop}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={s.date}>
            {new Intl.DateTimeFormat(language === "Hindi" ? "hi-IN" : "en-US", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </Text>
          <Text style={s.title}>{t.greeting(name)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.nav.chat}
          onPress={() => onNavigate("chat")}
          style={{
            height: 40,
            paddingHorizontal: 14,
            borderRadius: 20,
            flexDirection: "row",
            gap: 6,
            backgroundColor: "rgba(243, 197, 86, 0.14)",
            borderWidth: 1.5,
            borderColor: "rgba(243, 197, 86, 0.65)",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: C.gold,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Svg width={15} height={15} viewBox="0 0 24 24">
            <Path
              d="M12 3L14.2 9.8L21 12L14.2 14.2L12 21L9.8 14.2L3 12L9.8 9.8L12 3Z"
              stroke={C.gold}
              strokeWidth={1.8}
              strokeLinejoin="round"
              fill="rgba(243, 197, 86, 0.28)"
            />
          </Svg>
          <Text
            style={{
              color: "#F6E7B8",
              fontWeight: "700",
              fontSize: 13,
              letterSpacing: 0.3,
            }}
          >
            {t.nav.chat}
          </Text>
        </Pressable>
      </View>

      {/* Celestial Identity Card */}
      <View
        style={[
          s.card,
          {
            padding: 18,
            borderColor: "rgba(243, 197, 86, 0.25)",
            backgroundColor: "rgba(255, 255, 255, 0.04)",
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <ZodiacBadge
            sign={nameSign?.name || sunSign}
            size={56}
            pulse={true}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.sign}>
              {nameSign
                ? t.signTitle(nameSign.name, nameSign.vedicName)
                : sunSign || "Your Sign"}
            </Text>
            <Text style={s.sub}>
              {nameSign
                ? t.ruledBy(nameSign.element, nameSign.ruler)
                : "Add your birth details to reveal your sign."}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: "rgba(255, 255, 255, 0.07)",
          }}
        >
          <Text style={s.sub}>{t.sunSignLabel}</Text>
          <ZodiacIcon sign={sunSign} size={15} color={C.gold} />
          <Text style={[s.sub, { color: C.text, fontWeight: "600" }]}>
            {sunSign ?? t.unavailable}
          </Text>
        </View>
      </View>

      {/* Modern & Spiritual Today's Horoscope Card */}
      <View
        style={{
          borderRadius: 22,
          borderWidth: 1,
          borderColor: "rgba(243, 197, 86, 0.34)",
          backgroundColor: "rgba(18, 16, 28, 0.78)",
          padding: 20,
          gap: 16,
          shadowColor: C.gold,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 5,
        }}
      >
        {/* Card Spiritual Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path
                d="M12 2L14.3 9.7L22 12L14.3 14.3L12 22L9.7 14.3L2 12L9.7 9.7L12 2Z"
                fill={C.gold}
              />
            </Svg>
            <Text
              style={{
                color: C.gold,
                fontWeight: "700",
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {t.horoscopeEyebrow}
            </Text>
          </View>
          {horoscope?.sign && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: "rgba(243, 197, 86, 0.12)",
                borderWidth: 1,
                borderColor: "rgba(243, 197, 86, 0.3)",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              <ZodiacIcon sign={horoscope.sign} size={12} color="#F6E7B8" />
              <Text
                style={{
                  color: "#F6E7B8",
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {horoscope.sign}
              </Text>
            </View>
          )}
        </View>

        {horoscopeLoading ? (
          <Text style={s.sub}>{t.horoscopeLoading}</Text>
        ) : horoscope ? (
          <>
            {/* Horoscope Oracle Verse */}
            <Text
              style={{
                color: "#F7F3EA",
                fontSize: 17,
                lineHeight: 26,
                fontWeight: "500",
                letterSpacing: 0.2,
              }}
            >
              "{horoscope.text}"
            </Text>

            {/* Sacred Divider */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: "rgba(243, 197, 86, 0.2)",
                }}
              />
              <Text style={{ color: C.gold, fontSize: 11 }}>✦</Text>
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: "rgba(243, 197, 86, 0.2)",
                }}
              />
            </View>

            {/* Spiritual Advice Box */}
            <View
              style={{
                backgroundColor: "rgba(243, 197, 86, 0.08)",
                borderLeftWidth: 2.5,
                borderLeftColor: C.gold,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: C.gold,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {t.adviceLabel}
              </Text>
              <Text
                style={{
                  color: "#EAE3D2",
                  fontSize: 14,
                  lineHeight: 21,
                }}
              >
                {horoscope.advice}
              </Text>
            </View>

            {/* Lucky Elements Pills */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 2,
              }}
            >
              <View
                style={{
                  flex: 1,
                  minWidth: 130,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: C.gold,
                  }}
                />
                <Text style={{ color: C.secondary, fontSize: 12 }}>
                  {t.luckyColorLabel}:{" "}
                  <Text style={{ color: C.text, fontWeight: "700" }}>
                    {horoscope.luckyColor}
                  </Text>
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  minWidth: 130,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: C.gold, fontSize: 12 }}>✧</Text>
                <Text style={{ color: C.secondary, fontSize: 12 }}>
                  {t.luckyNumberLabel}:{" "}
                  <Text style={{ color: C.text, fontWeight: "700" }}>
                    {horoscope.luckyNumber}
                  </Text>
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={{ gap: 8 }}>
            <Text style={s.sub}>
              {horoscopeError ||
                "Sign in and complete your profile to see your horoscope."}
            </Text>
            {!!token && (
              <Pressable accessibilityRole="button" onPress={onRetryHoroscope}>
                <Text style={{ color: C.gold, fontWeight: "700" }}>
                  Try again
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Today's Vedic Panchang Almanac Card */}
      {panchang && (
        <View
          style={{
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "rgba(243, 197, 86, 0.25)",
            backgroundColor: "rgba(18, 16, 28, 0.72)",
            padding: 18,
            gap: 14,
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
              {t.panchang.eyebrow}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: C.secondary, fontSize: 11 }}>
                {panchang.vara}
              </Text>
              <Pressable
                onPress={() => setShowPanchangGuide(!showPanchangGuide)}
                style={{
                  backgroundColor: showPanchangGuide
                    ? "rgba(243, 197, 86, 0.2)"
                    : "rgba(255, 255, 255, 0.06)",
                  borderWidth: 1,
                  borderColor: showPanchangGuide
                    ? C.gold
                    : "rgba(255, 255, 255, 0.14)",
                  borderRadius: 8,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    color: showPanchangGuide ? C.gold : C.text,
                    fontSize: 10.5,
                    fontWeight: "600",
                  }}
                >
                  {showPanchangGuide ? t.panchang.guideOpen : t.panchang.guideClosed}
                </Text>
              </Pressable>
            </View>
          </View>

          {showPanchangGuide && (
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
                {t.panchang.guideHeading}
              </Text>
              {PANCHANG_GUIDE.map((item) => (
                <Text
                  key={item.label}
                  style={{ color: "#EAE3D2", fontSize: 11.5, lineHeight: 17 }}
                >
                  <Text style={{ color: "#F6E7B8", fontWeight: "700" }}>
                    {item.label}:{" "}
                  </Text>
                  {item.desc}
                </Text>
              ))}
            </View>
          )}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              [t.panchang.tithi, `${panchang.tithi} (${panchang.paksha.replace(" Paksha", "")})`],
              [t.panchang.nakshatra, `${panchang.nakshatra.name} · P${panchang.nakshatra.pada}`],
              [t.panchang.yoga, panchang.yoga],
              [t.panchang.karana, panchang.karana],
            ].map(([lbl, val]) => (
              <View
                key={lbl}
                style={{
                  width: "48%",
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.07)",
                  borderRadius: 12,
                  paddingHorizontal: 11,
                  paddingVertical: 9,
                  gap: 2,
                }}
              >
                <Text style={{ color: C.muted, fontSize: 11 }}>{lbl}</Text>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: "700" }}>
                  {val}
                </Text>
              </View>
            ))}
          </View>

          {/* Muhurat Timings */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <View
              style={{
                flex: 1,
                minWidth: 140,
                backgroundColor: "rgba(127, 224, 168, 0.09)",
                borderWidth: 1,
                borderColor: "rgba(127, 224, 168, 0.3)",
                borderRadius: 12,
                paddingHorizontal: 11,
                paddingVertical: 8,
                gap: 2,
              }}
            >
              <Text style={{ color: "#7FE0A8", fontSize: 10.5, fontWeight: "700" }}>
                {t.panchang.abhijit}
              </Text>
              <Text style={{ color: C.text, fontSize: 12, fontWeight: "600" }}>
                {panchang.abhijitMuhurat}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                minWidth: 140,
                backgroundColor: "rgba(255, 180, 171, 0.08)",
                borderWidth: 1,
                borderColor: "rgba(255, 180, 171, 0.25)",
                borderRadius: 12,
                paddingHorizontal: 11,
                paddingVertical: 8,
                gap: 2,
              }}
            >
              <Text style={{ color: "#FFB4AB", fontSize: 10.5, fontWeight: "700" }}>
                {t.panchang.rahu}
              </Text>
              <Text style={{ color: C.text, fontSize: 12, fontWeight: "600" }}>
                {panchang.rahuKaal}
              </Text>
            </View>
          </View>
        </View>
      )}

      <Text style={[s.disclaimer, { textAlign: "center", marginTop: 2 }]}>
        {disclaimer}
      </Text>
    </ScrollView>
  );
}
