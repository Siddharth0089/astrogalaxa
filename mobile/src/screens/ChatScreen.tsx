import React, { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Screen } from "../types";
import { apiRequest } from "../../session";
import { C, disclaimer } from "../theme/colors";
import { s } from "../theme/styles";

export function ChatScreen({
  onNavigate,
  name,
}: {
  onNavigate: (s: Screen) => void;
  name?: string;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      who: "ai",
      text: `Namaste${name ? `, ${name}` : ""}! I am Astro Galexa AI. I have your Vedic birth chart, planetary placements, and dasha timeline ready. Ask me about your career, marriage timing, health, or personal path.`,
    },
  ]);

  const send = async () => {
    if (!text.trim() || busy) return;
    const userText = text.trim();
    setText("");
    setBusy(true);
    setMessages((prev) => [
      ...prev,
      { who: "user", text: userText },
      { who: "ai", text: "Consulting your Vedic birth chart and dasha timeline…" },
    ]);
    try {
      const response = await apiRequest(
        "/chat/ai",
        { text: userText },
        true,
        "POST",
      );
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
          style={s.back}
        >
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <View style={s.segment}>
          <Text style={s.segmentActive}>Ask AI</Text>
          <Pressable onPress={() => onNavigate("live")}>
            <Text style={s.tabText}>Live astrologer</Text>
          </Pressable>
        </View>
        <View style={s.back} />
      </View>
      <View style={s.aiHeader}>
        <Text style={s.cardTitle}>ASTRO GALEXA AI</Text>
        <Text style={s.sub}>Personalized Vedic Intelligence</Text>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[s.bubble, item.who === "user" ? s.userBubble : s.aiBubble]}>
            <Text style={s.cardText}>{item.text}</Text>
          </View>
        )}
      />
      <Text style={s.disclaimer}>{disclaimer}</Text>
      <View style={s.chips}>
        {["Marriage timing", "Career shift", "Health & Energy"].map((x) => (
          <Pressable key={x} onPress={() => setText(x)}>
            <Text style={s.chip}>{x}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.composer}>
        <TextInput
          accessibilityLabel="Ask about your future"
          value={text}
          onChangeText={setText}
          placeholder="Ask about your future…"
          placeholderTextColor={C.muted}
          style={s.composeInput}
        />
        <Pressable
          accessibilityLabel="Send message"
          onPress={send}
          style={s.send}
        >
          <Text>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}
