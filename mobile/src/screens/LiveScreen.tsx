import React, { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { io, Socket } from "socket.io-client";
import { Button } from "../components/Button";
import { Astrologer, Language, Screen } from "../types";
import { apiRequest, getAccessToken, getSocketUrl } from "../../session";
import { C, disclaimer } from "../theme/colors";
import { s } from "../theme/styles";

type LiveMessage = {
  _id?: string;
  sender: "user" | "astrologer" | "system" | "ai";
  text: string;
  createdAt?: string;
};

export function LiveScreen({
  authenticated,
  language = "English",
  onNavigate,
}: {
  authenticated: boolean;
  language?: Language;
  onNavigate: (s: Screen) => void;
}) {
  const [filter, setFilter] = useState("All");
  const [items, setItems] = useState<Astrologer[]>([]);
  const [shareKundli, setShareKundli] = useState(true);
  const [loading, setLoading] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  // Active consultation thread state
  const [activeExpert, setActiveExpert] = useState<Astrologer | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [ratingPrompt, setRatingPrompt] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [ending, setEnding] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let active = true;
    if (!authenticated) {
      setItems([]);
      setError("Sign in to connect with an astrologer.");
      return;
    }
    setLoading(true);
    setError("");
    apiRequest(
      `/astrologers?specialty=${encodeURIComponent(filter)}`,
      undefined,
      true,
    )
      .then((result: Astrologer[]) => {
        if (active) setItems(Array.isArray(result) ? result : []);
      })
      .catch(() => {
        if (active) {
          setItems([]);
          setError("Could not load astrologers. Please try again.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticated, filter, retry]);

  // Connect real-time Socket.IO room when entering a live consultation
  useEffect(() => {
    if (!threadId) return;
    const token = getAccessToken();
    if (!token) return;
    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("join_thread", threadId);
    });
    socket.on("message", (incoming: LiveMessage) => {
      if (!incoming?.text) return;
      setMessages((prev) => {
        if (incoming._id && prev.some((m) => m._id === incoming._id)) return prev;
        return [...prev, incoming];
      });
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [threadId]);

  useEffect(() => {
    if (!threadId || Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setRatingPrompt(true);
      return true;
    });
    return () => sub.remove();
  }, [threadId]);

  const startSession = async (expert: Astrologer) => {
    if (connectingId) return;
    setConnectingId(expert._id);
    setError("");
    try {
      const res = await apiRequest(
        `/astrologers/${expert._id}/connect`,
        { shareKundli },
        true,
        "POST",
      );
      setActiveExpert(res.astrologer || expert);
      setThreadId(res.thread?._id || null);
      setMessages(Array.isArray(res.messages) ? res.messages : []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to start consultation session.",
      );
    } finally {
      setConnectingId(null);
    }
  };

  const sendLiveMessage = async () => {
    if (!threadId || !inputText.trim() || sending) return;
    const text = inputText.trim();
    const clientMsgId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setInputText("");
    setSending(true);
    try {
      const res = await apiRequest(
        `/astrologers/threads/${threadId}/messages`,
        { text, clientMsgId },
        true,
        "POST",
      );
      setMessages((prev) => {
        const next = [...prev];
        for (const msg of [res.userMessage, res.replyMessage]) {
          if (msg && (!msg._id || !next.some((m) => m._id === msg._id))) {
            next.push(msg);
          }
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not deliver message.");
    } finally {
      setSending(false);
    }
  };

  const endSession = async (submitRating?: number) => {
    if (!threadId || ending) return;
    setEnding(true);
    try {
      await apiRequest(
        `/astrologers/threads/${threadId}/end`,
        submitRating ? { rating: submitRating } : {},
        true,
        "PATCH",
      );
      setActiveExpert(null);
      setThreadId(null);
      setMessages([]);
      setRatingPrompt(false);
      setRetry((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close session.");
    } finally {
      setEnding(false);
    }
  };

  // Active Live Consultation View
  if (threadId && activeExpert) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[s.chatPage, { paddingBottom: 14 }]}>
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to astrologers"
            onPress={() => setRatingPrompt(true)}
            style={{
              width: 40,
              height: 40,
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            <Text style={[s.backText, { fontSize: 32, lineHeight: 34 }]}>‹</Text>
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: C.text, fontWeight: "700", fontSize: 15 }}>
              {activeExpert.name}
            </Text>
            <Text style={{ color: "#7FE0A8", fontSize: 11, fontWeight: "600" }}>
              ● Free Live Session · {language}
            </Text>
          </View>
          <Pressable
            onPress={() => setRatingPrompt(true)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "rgba(255, 180, 171, 0.35)",
              backgroundColor: "rgba(255, 180, 171, 0.1)",
            }}
          >
            <Text style={{ color: "#FFB4AB", fontSize: 11, fontWeight: "700" }}>
              End
            </Text>
          </Pressable>
        </View>

        {ratingPrompt && (
          <View
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "rgba(243, 197, 86, 0.35)",
              backgroundColor: "rgba(18, 16, 28, 0.92)",
              padding: 16,
              gap: 10,
              marginBottom: 8,
            }}
          >
            <Text style={{ color: C.gold, fontWeight: "700", fontSize: 13 }}>
              Rate this free consultation before closing
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setSelectedRating(star)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor:
                      selectedRating >= star
                        ? "rgba(243, 197, 86, 0.22)"
                        : "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor:
                      selectedRating >= star ? C.gold : "rgba(255,255,255,0.12)",
                  }}
                >
                  <Text style={{ color: C.gold, fontWeight: "700" }}>
                    {star} ★
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Continue Chat"
                  onPress={() => setRatingPrompt(false)}
                  variant="glass"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={ending ? "Ending…" : "Submit & End"}
                  disabled={ending}
                  onPress={() => void endSession(selectedRating)}
                />
              </View>
            </View>
          </View>
        )}

        <FlatList
          data={messages}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item, i) => item._id || String(i)}
          renderItem={({ item }) => (
            <View
              style={[
                s.bubble,
                item.sender === "user" ? s.userBubble : s.aiBubble,
              ]}
            >
              <Text
                style={[
                  s.cardText,
                  item.sender === "user" && { color: C.onGold, fontWeight: "500" },
                ]}
              >
                {item.text}
              </Text>
            </View>
          )}
        />

        {!!error && (
          <Text style={{ color: "#FFB4AB", fontSize: 12, marginBottom: 4 }}>
            {error}
          </Text>
        )}
        <Text style={s.disclaimer}>{disclaimer}</Text>
        <View style={s.composer}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Write your question to the astrologer…"
            placeholderTextColor={C.muted}
            style={s.composeInput}
            onSubmitEditing={() => void sendLiveMessage()}
          />
          <Pressable
            accessibilityLabel="Send"
            onPress={() => void sendLiveMessage()}
            style={[s.send, sending && { opacity: 0.6 }]}
            disabled={sending}
          >
            <Text style={{ color: C.onGold, fontWeight: "800" }}>↑</Text>
          </Pressable>
        </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[s.page, { paddingBottom: 28 }]}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => onNavigate("chat")}
          style={{
            width: 40,
            height: 40,
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <Text style={[s.backText, { fontSize: 32, lineHeight: 34 }]}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>Live Astrologer</Text>
        <View style={{ width: 40 }} />
      </View>
      <Text style={s.title}>Talk to an Astrologer</Text>
      <Text style={s.sub}>
        Free verified Vedic guidance sessions. Real-time messaging with optional Natal Chart sharing.
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(18, 16, 28, 0.8)",
          borderWidth: 1,
          borderColor: "rgba(243, 197, 86, 0.25)",
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }}>
            Share Birth Chart Summary
          </Text>
          <Text style={{ color: C.muted, fontSize: 11 }}>
            Lets the expert view your Moon sign, Ascendant &amp; Star
          </Text>
        </View>
        <Switch
          accessibilityLabel="Share birth chart summary"
          value={shareKundli}
          onValueChange={setShareKundli}
          trackColor={{ true: C.gold }}
        />
      </View>

      <View style={s.chips}>
        {["All", "Career", "Love", "Health"].map((x) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === x }}
            accessibilityLabel={x}
            onPress={() => setFilter(x)}
            key={x}
          >
            <Text style={[s.chip, filter === x && s.chipActive]}>{x}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <Text style={s.sub}>Loading astrologers…</Text>
      ) : !!error ? (
        <>
          <Text style={s.sub}>{error}</Text>
          {authenticated && (
            <Button
              label="Try again"
              onPress={() => setRetry((x) => x + 1)}
              variant="glass"
            />
          )}
        </>
      ) : items.length === 0 ? (
        <Text style={s.sub}>
          No verified astrologers are online for this specialty right now. Try AI Chat anytime!
        </Text>
      ) : (
        items.map((item) => (
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(243, 197, 86, 0.28)",
              backgroundColor: "rgba(18, 16, 28, 0.82)",
              padding: 16,
              gap: 10,
            }}
            key={item._id}
          >
            <View
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(item.name || "?").charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tileTitle}>{item.name}</Text>
                <Text style={s.sub}>
                  {(item.specialties ?? []).join(" · ")}
                </Text>
                <Text style={s.helper}>
                  {(item.languages ?? []).join(", ")}
                  {item.experienceYears != null
                    ? ` · ${item.experienceYears} years`
                    : ""}
                </Text>
              </View>
            </View>
            <Text style={item.status === "online" ? s.online : s.sub}>
              {item.status === "online"
                ? "● Online · Free Session"
                : item.status === "busy"
                  ? "○ Busy"
                  : "○ Offline"}
              {item.ratingCount
                ? ` · ${item.ratingAvg?.toFixed(1) ?? "—"} ★ (${item.ratingCount})`
                : ""}
            </Text>
            <Button
              label={
                connectingId === item._id
                  ? "Connecting…"
                  : item.status === "online"
                    ? "Connect Free Now"
                    : "Unavailable"
              }
              disabled={item.status !== "online" || Boolean(connectingId)}
              onPress={() => void startSession(item)}
              variant={item.status === "online" ? "gold" : "glass"}
            />
          </View>
        ))
      )}
    </ScrollView>
  );
}
