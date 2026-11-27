import React, { useEffect, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Language, Screen } from "../types";
import { C, disclaimer } from "../theme/colors";
import { getCopy } from "../theme/i18n";
import { apiRequest } from "../../session";
import { s } from "../theme/styles";

export function ChatScreen({
  onNavigate,
  name,
  language = "English",
}: {
  onNavigate: (s: Screen) => void;
  name?: string;
  language?: Language;
}) {
  const t = getCopy(language);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [messages, setMessages] = useState([
    {
      who: "ai",
      text: t.chatWelcome(name),
    },
  ]);

  // Keep initial welcome synced if user switches language before starting conversation
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].who === "ai") {
        return [{ who: "ai", text: getCopy(language).chatWelcome(name) }];
      }
      return prev;
    });
  }, [language, name]);

  const send = async () => {
    if (!text.trim() || busy) return;
    const userText = text.trim();
    setText("");
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { who: "user", text: userText },
      { who: "ai", text: t.chatThinking },
    ]);
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
        { who: "ai", text: reply },
      ]);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "AI consultation is temporarily resting. Check your connection.";
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { who: "ai", text: errorMsg },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.chatPage}>
      <View style={s.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => onNavigate("home")}
          style={{
            width: 40,
            height: 40,
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <Text style={[s.backText, { fontSize: 32, lineHeight: 34 }]}>‹</Text>
        </Pressable>
        <View style={s.segment}>
          <Text style={s.segmentActive}>Ask AI</Text>
          <Pressable onPress={() => onNavigate("live")}>
            <Text style={s.tabText}>Live astrologer</Text>
          </Pressable>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={s.aiHeader}>
        <Text style={s.cardTitle}>ASTRO GALAXA AI</Text>
        <Text style={s.sub}>{t.chatSubtitle}</Text>
      </View>
      <FlatList
        data={messages}
        showsVerticalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[s.bubble, item.who === "user" ? s.userBubble : s.aiBubble]}>
            <Text style={[s.cardText, item.who === "user" && { color: C.onGold, fontWeight: "500" }]}>
              {item.text}
            </Text>
          </View>
        )}
      />
      <Text style={s.disclaimer}>{disclaimer}</Text>
      <View style={s.chips}>
        {t.chatChips.map((x) => (
          <Pressable key={x} onPress={() => setText(x)}>
            <Text style={s.chip}>{x}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask Astro Galaxa AI…"
          placeholderTextColor={C.muted}
          style={s.composeInput}
          onSubmitEditing={send}
        />
        <Pressable
          accessibilityLabel="Send"
          onPress={send}
          style={[s.send, busy && { opacity: 0.6 }]}
          disabled={busy}
        >
          <Text style={{ color: C.onGold, fontWeight: "800" }}>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}
