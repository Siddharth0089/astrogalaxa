import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { C, disclaimer } from "../theme/colors";
import { s } from "../theme/styles";

export type LegalTab = "terms" | "privacy";

export function LegalModal({
  visible,
  tab,
  onClose,
  onSwitchTab,
}: {
  visible: boolean;
  tab: LegalTab;
  onClose: () => void;
  onSwitchTab: (tab: LegalTab) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.84)",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            maxHeight: "82%",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "rgba(243, 197, 86, 0.34)",
            backgroundColor: "#11101C",
            padding: 20,
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
            <Text style={[s.sign, { fontSize: 24 }]}>
              {tab === "terms" ? "Terms of Service" : "Privacy Policy"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close legal document"
              onPress={onClose}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.16)",
              }}
            >
              <Text style={{ color: C.text, fontSize: 12, fontWeight: "700" }}>
                Close
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: "row",
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: 12,
              padding: 4,
              gap: 4,
            }}
          >
            {(["terms", "privacy"] as const).map((item) => {
              const active = tab === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => onSwitchTab(item)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 9,
                    alignItems: "center",
                    backgroundColor: active ? C.gold : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: active ? C.onGold : C.secondary,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {item === "terms" ? "Terms of Service" : "Privacy Policy"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {tab === "terms" ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: "#EAE3D2", fontSize: 13.5, lineHeight: 20 }}>
                  Welcome to Astro Galaxa. By signing in and generating charts, horoscopes, Tarot readings, or AI/live consultations, you agree to use the service responsibly.
                </Text>
                <Text style={{ color: C.gold, fontSize: 13, fontWeight: "700" }}>
                  1. Guidance &amp; Entertainment Notice
                </Text>
                <Text style={{ color: C.secondary, fontSize: 13, lineHeight: 19 }}>
                  {disclaimer} All planetary calculations, Tarot syntheses, and live/AI responses are intended for self-reflection only.
                </Text>
                <Text style={{ color: C.gold, fontSize: 13, fontWeight: "700" }}>
                  2. Accounts &amp; Free Access
                </Text>
                <Text style={{ color: C.secondary, fontSize: 13, lineHeight: 19 }}>
                  All current features—including Natal Charts, Gun Milan matching, Tarot Sanctuary (up to 3 daily cards per spread mode), AI Astrologer, and Live Consultations—are provided free of charge without paid subscriptions.
                </Text>
                <Text style={{ color: C.gold, fontSize: 13, fontWeight: "700" }}>
                  3. Respectful Conduct
                </Text>
                <Text style={{ color: C.secondary, fontSize: 13, lineHeight: 19 }}>
                  Abusive messages, automated scraping, or attempts to bypass daily quotas may result in session revocation or account suspension.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={{ color: "#EAE3D2", fontSize: 13.5, lineHeight: 20 }}>
                  Astro Galaxa respects your privacy and handles personal birth data transparently under modern data protection principles.
                </Text>
                <Text style={{ color: C.gold, fontSize: 13, fontWeight: "700" }}>
                  1. Data We Collect
                </Text>
                <Text style={{ color: C.secondary, fontSize: 13, lineHeight: 19 }}>
                  We store your email address (for passwordless OTP sign-in), display name, gender, preferred language, optional birth date/time/city coordinates (strictly to compute your sidereal chart), Tarot reading journal, and consultation messages.
                </Text>
                <Text style={{ color: C.gold, fontSize: 13, fontWeight: "700" }}>
                  2. How AI &amp; Astrologers Use Data
                </Text>
                <Text style={{ color: C.secondary, fontSize: 13, lineHeight: 19 }}>
                  Your chart placements and chosen language are shared only with your selected AI session or live consultation when consented. We never sell personal data to third-party advertisers.
                </Text>
                <Text style={{ color: C.gold, fontSize: 13, fontWeight: "700" }}>
                  3. Export &amp; Permanent Deletion
                </Text>
                <Text style={{ color: C.secondary, fontSize: 13, lineHeight: 19 }}>
                  You can export your complete profile, Kundli, Tarot readings, and chat history or permanently erase your entire account anytime from Profile &amp; Settings. For privacy questions, contact support@astrogalaxa.com.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
