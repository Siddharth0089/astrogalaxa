import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiRequest } from "../../session";
import { C, disclaimer } from "../theme/colors";
import { formatTitleCase, getCopy } from "../theme/i18n";
import { s } from "../theme/styles";
import { KundliData, Language, NameSign, Screen } from "../types";

type ChatEntry = {
  id: string;
  who: "user" | "ai";
  text: string;
};

const CHAT_LABELS: Record<
  Language,
  {
    headerTitle: string;
    askAiTab: string;
    liveTab: string;
    newChat: string;
    statusBadge: string;
    placeholder: string;
    promptTitle: string;
    lagnaLabel: string;
    moonLabel: string;
    dashaLabel: string;
    noChartBadge: string;
    prompts: string[];
    offlineFallback: string;
  }
> = {
  English: {
    headerTitle: "Astro Galaxa AI",
    askAiTab: "AI Pandit",
    liveTab: "Live Expert",
    newChat: "+ New",
    statusBadge: "Online · Personalized to Your Birth Chart",
    placeholder: "Ask about your Kundli, career, love, Dasha…",
    promptTitle: "Suggested questions for your chart",
    lagnaLabel: "Ascendant",
    moonLabel: "Moon",
    dashaLabel: "Dasha",
    noChartBadge: "Complete birth details in Profile for full chart precision",
    prompts: [
      "What does my current Mahadasha focus on?",
      "What does my 10th house say about my career?",
      "How look love & relationship prospects in my chart?",
      "Which planetary transits affect me right now?",
      "Simple daily remedies for mental peace & clarity",
    ],
    offlineFallback:
      "Could not reach the AI Pandit right now. Please try again or tap 'Live Expert' above.",
  },
  Hindi: {
    headerTitle: "Astro Galaxa AI",
    askAiTab: "AI पंडित",
    liveTab: "लाइव गुरुजी",
    newChat: "+ नया",
    statusBadge: "सक्रिय · आपकी जन्म कुंडली पर आधारित",
    placeholder: "अपनी कुंडली, करियर, विवाह या दशा पूछें…",
    promptTitle: "आपकी कुंडली के अनुसार मुख्य प्रश्न",
    lagnaLabel: "लग्न",
    moonLabel: "चन्द्र",
    dashaLabel: "दशा",
    noChartBadge: "सटीक विश्लेषण के लिए प्रोफ़ाइल में जन्म विवरण जोड़ें",
    prompts: [
      "मेरी वर्तमान महादशा क्या संकेत दे रही है?",
      "मेरी कुंडली में करियर और प्रगति के योग कैसे हैं?",
      "विवाह और रिश्तों के बारे में मेरी कुंडली क्या कहती है?",
      "आज के ग्रह गोचर का मुझ पर क्या प्रभाव है?",
      "मानसिक शांति और सफलता के सरल उपाय बताएं",
    ],
    offlineFallback:
      "AI पंडित अभी उपलब्ध नहीं हैं। कृपया पुनः प्रयास करें या ऊपर 'लाइव गुरुजी' चुनें।",
  },
  Hinglish: {
    headerTitle: "Astro Galaxa AI",
    askAiTab: "AI Pandit",
    liveTab: "Live Expert",
    newChat: "+ New",
    statusBadge: "Online · Aapki Kundli ke hisab se",
    placeholder: "Apni Kundli, career, shaadi ya Dasha poochhein…",
    promptTitle: "Aapke chart ke liye best sawaal",
    lagnaLabel: "Lagna",
    moonLabel: "Moon",
    dashaLabel: "Dasha",
    noChartBadge: "Full precision ke liye Profile mein birth details add karein",
    prompts: [
      "Meri current Mahadasha kya focus dikha rahi hai?",
      "Mere career aur job growth ke yog kaise hain?",
      "Love aur marriage timing mere chart me kaisi hai?",
      "Abhi ke planetary transits ka mujh par kya asar hai?",
      "Peace aur clarity ke liye simple remedies batayein",
    ],
    offlineFallback:
      "AI Pandit abhi connect nahi ho pa rahe. Dobara try karein ya upar 'Live Expert' choose karein.",
  },
};

export function ChatScreen({
  onNavigate,
  name,
  language = "English",
  kundli,
  nameSign,
  sunSign,
  authenticated = false,
}: {
  onNavigate: (s: Screen) => void;
  name?: string;
  language?: Language;
  kundli?: KundliData | null;
  nameSign?: NameSign | null;
  sunSign?: string | null;
  authenticated?: boolean;
}) {
  const t = getCopy(language);
  const ui = CHAT_LABELS[language] || CHAT_LABELS.English;
  const listRef = useRef<FlatList<ChatEntry>>(null);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatEntry[]>([
    { id: "welcome", who: "ai", text: t.chatWelcome(name) },
  ]);

  // Restore latest AI consultation history when returning to ChatScreen
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    setLoadingHistory(true);
    apiRequest("/chat/threads", undefined, true)
      .then(async (threads: { _id: string; type?: string }[]) => {
        if (!active || !Array.isArray(threads)) return;
        const latestAi = threads.find((th) => th.type === "ai");
        if (!latestAi?._id) return;
        const past = await apiRequest(
          `/chat/threads/${latestAi._id}/messages`,
          undefined,
          true,
        );
        if (!active || !Array.isArray(past) || past.length === 0) return;
        setThreadId(latestAi._id);
        setMessages(
          past.map(
            (
              m: { _id?: string; sender?: string; text?: string },
              idx: number,
            ) => ({
              id: m._id || `hist-${idx}`,
              who: m.sender === "user" ? "user" : "ai",
              text: m.text || "",
            }),
          ),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, [authenticated]);

  // Keep welcome synced if user switches language on fresh thread
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "welcome") {
        return [{ id: "welcome", who: "ai", text: getCopy(language).chatWelcome(name) }];
      }
      return prev;
    });
  }, [language, name]);

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(timer);
  }, [messages.length, busy]);

  const startNewThread = () => {
    if (busy) return;
    setThreadId(undefined);
    setMessages([{ id: "welcome", who: "ai", text: getCopy(language).chatWelcome(name) }]);
  };

  const sendMessage = async (overrideText?: string) => {
    const userText = (overrideText ?? text).trim();
    if (!userText || busy) return;
    if (!overrideText) setText("");
    setBusy(true);

    const userEntry: ChatEntry = {
      id: `user-${Date.now()}`,
      who: "user",
      text: userText,
    };
    const thinkingEntry: ChatEntry = {
      id: `thinking-${Date.now()}`,
      who: "ai",
      text: "__THINKING__",
    };

    setMessages((prev) => [...prev, userEntry, thinkingEntry]);

    try {
      const response = await apiRequest(
        "/chat/ai",
        { text: userText, threadId },
        true,
        "POST",
      );
      if (response?.threadId) setThreadId(response.threadId);
      const reply =
        response?.text ||
        "The celestial bodies invite patience and clarity at this time.";
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { id: `ai-${Date.now()}`, who: "ai", text: reply },
      ]);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error && err.message ? err.message : ui.offlineFallback;
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { id: `err-${Date.now()}`, who: "ai", text: errorMsg },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const chartPills: string[] = [];
  if (kundli?.ascendant?.sign) {
    chartPills.push(`${ui.lagnaLabel}: ${kundli.ascendant.sign}`);
  }
  if (kundli?.moonSign) {
    chartPills.push(`${ui.moonLabel}: ${kundli.moonSign}`);
  } else if (nameSign?.name) {
    chartPills.push(`${nameSign.vedicName || nameSign.name}`);
  } else if (sunSign) {
    chartPills.push(sunSign);
  }
  if (kundli?.nakshatra?.name) {
    chartPills.push(`★ ${kundli.nakshatra.name}`);
  }
  if (kundli?.dasha?.current?.planet) {
    chartPills.push(`${ui.dashaLabel}: ${kundli.dasha.current.planet}`);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 12,
        }}
      >
        {/* Top Bar with Visible Back Button, AI/Live Switcher, and New Chat */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 10,
            gap: 8,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
            onPress={() => onNavigate("home")}
            style={s.back}
          >
            <Text style={s.backText}>‹</Text>
          </Pressable>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(18, 16, 28, 0.88)",
              borderWidth: 1,
              borderColor: "rgba(243, 197, 86, 0.28)",
              borderRadius: 20,
              padding: 3,
              gap: 2,
            }}
          >
            <View
              style={{
                backgroundColor: C.gold,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  color: C.onGold,
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                {ui.askAiTab}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => onNavigate("live")}
              style={{
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  color: C.secondary,
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                {ui.liveTab}
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New consultation"
            onPress={startNewThread}
            style={{
              paddingHorizontal: 11,
              height: 36,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: C.glass,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: C.gold, fontSize: 12, fontWeight: "700" }}>
              {ui.newChat}
            </Text>
          </Pressable>
        </View>

        {/* Chart-Context Banner Showing Active User Placements */}
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(243, 197, 86, 0.25)",
            backgroundColor: "rgba(18, 16, 28, 0.85)",
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 8,
            gap: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={s.cardTitle}>
              ✦ {ui.headerTitle.toUpperCase()}
              {name ? ` · ${formatTitleCase(name).toUpperCase()}` : ""}
            </Text>
            <Text style={{ color: "#7FE0A8", fontSize: 11, fontWeight: "600" }}>
              ● {ui.statusBadge}
            </Text>
          </View>

          {chartPills.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingTop: 2 }}
            >
              {chartPills.map((pill) => (
                <View
                  key={pill}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: "rgba(243, 197, 86, 0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(243, 197, 86, 0.25)",
                  }}
                >
                  <Text style={{ color: C.gold, fontSize: 11, fontWeight: "600" }}>
                    {pill}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ color: C.muted, fontSize: 11 }}>{ui.noChartBadge}</Text>
          )}
        </View>

        {/* Scrollable Message Thread */}
        <FlatList
          ref={listRef}
          data={messages}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            loadingHistory ? (
              <View style={{ paddingVertical: 8, alignItems: "center" }}>
                <ActivityIndicator color={C.gold} size="small" />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.text === "__THINKING__") {
              return (
                <View
                  style={{
                    alignSelf: "flex-start",
                    maxWidth: "85%",
                    borderRadius: 18,
                    borderBottomLeftRadius: 6,
                    borderWidth: 1,
                    borderColor: "rgba(243, 197, 86, 0.22)",
                    backgroundColor: "rgba(18, 16, 28, 0.88)",
                    padding: 13,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ActivityIndicator color={C.gold} size="small" />
                  <Text style={{ color: C.secondary, fontSize: 13 }}>
                    {t.chatThinking}
                  </Text>
                </View>
              );
            }

            const isUser = item.who === "user";
            return (
              <View
                style={
                  isUser
                    ? {
                        alignSelf: "flex-end",
                        maxWidth: "84%",
                        borderRadius: 18,
                        borderBottomRightRadius: 6,
                        backgroundColor: C.gold,
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                      }
                    : {
                        alignSelf: "flex-start",
                        maxWidth: "90%",
                        borderRadius: 18,
                        borderBottomLeftRadius: 6,
                        borderWidth: 1,
                        borderColor: "rgba(243, 197, 86, 0.22)",
                        backgroundColor: "rgba(18, 16, 28, 0.90)",
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        gap: 5,
                      }
                }
              >
                {!isUser && (
                  <Text
                    style={{
                      color: C.gold,
                      fontSize: 10,
                      fontWeight: "700",
                      letterSpacing: 0.8,
                    }}
                  >
                    ✦ ASTRO GALAXA AI
                  </Text>
                )}
                <Text
                  style={{
                    color: isUser ? C.onGold : C.text,
                    fontSize: 14,
                    lineHeight: 21,
                    fontWeight: isUser ? "600" : "400",
                  }}
                >
                  {item.text}
                </Text>
              </View>
            );
          }}
        />

        {/* Quick Chart-Aware Prompt Pills (visible when starting conversation) */}
        {messages.length <= 2 && (
          <View style={{ gap: 6, paddingTop: 4, paddingBottom: 6 }}>
            <Text style={{ color: C.muted, fontSize: 11, fontWeight: "600" }}>
              {ui.promptTitle}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {ui.prompts.map((prompt) => (
                <Pressable
                  key={prompt}
                  onPress={() => void sendMessage(prompt)}
                  disabled={busy}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(243, 197, 86, 0.28)",
                    backgroundColor: "rgba(243, 197, 86, 0.08)",
                  }}
                >
                  <Text style={{ color: C.text, fontSize: 12 }}>{prompt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom Composer ONLY — Zero Bottom Navbar */}
        <View style={{ gap: 6, paddingTop: 4 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              minHeight: 52,
              maxHeight: 116,
              borderRadius: 24,
              backgroundColor: "rgba(18, 16, 28, 0.94)",
              borderWidth: 1,
              borderColor: "rgba(243, 197, 86, 0.32)",
              paddingLeft: 16,
              paddingRight: 5,
              paddingVertical: 5,
              gap: 8,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={ui.placeholder}
              placeholderTextColor={C.muted}
              multiline
              maxLength={2000}
              onKeyPress={(e) => {
                if (
                  Platform.OS === "web" &&
                  e.nativeEvent.key === "Enter" &&
                  !(e.nativeEvent as unknown as { shiftKey?: boolean }).shiftKey
                ) {
                  e.preventDefault?.();
                  void sendMessage();
                }
              }}
              style={{
                color: C.text,
                flex: 1,
                fontSize: 15,
                lineHeight: 20,
                paddingTop: Platform.OS === "ios" ? 8 : 6,
                paddingBottom: 6,
                maxHeight: 98,
              }}
              onSubmitEditing={() => void sendMessage()}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              onPress={() => void sendMessage()}
              style={[
                s.send,
                { marginRight: 0, width: 42, height: 42, borderRadius: 21 },
                (!text.trim() || busy) && { opacity: 0.45 },
              ]}
              disabled={!text.trim() || busy}
            >
              <Text style={{ color: C.onGold, fontWeight: "800", fontSize: 18 }}>
                ↑
              </Text>
            </Pressable>
          </View>
          <Text style={[s.disclaimer, { textAlign: "center", fontSize: 10 }]}>
            {disclaimer}
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
