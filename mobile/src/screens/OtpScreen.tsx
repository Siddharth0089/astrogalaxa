import React, { RefObject } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Button } from "../components/Button";
import { C } from "../theme/colors";
import { s } from "../theme/styles";

export function OtpScreen({
  email,
  code,
  setCode,
  busy,
  authError,
  setAuthError,
  secondsLeft,
  codeInput,
  onVerify,
  onResend,
  onChangeEmail,
}: {
  email: string;
  code: string;
  setCode: (c: string) => void;
  busy: boolean;
  authError: string;
  setAuthError: (e: string) => void;
  secondsLeft: number;
  codeInput: RefObject<TextInput | null>;
  onVerify: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      {/* Top Bar: Only back button arrow on top-left (no appbar title and no right spacer circle) */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 4,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onChangeEmail}
          hitSlop={14}
          style={({ pressed }) => [
            {
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.16)",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: C.text,
              fontSize: 32,
              lineHeight: 34,
              marginTop: -2,
            }}
          >
            ‹
          </Text>
        </Pressable>
      </View>

      {/* Main Centered Content */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingBottom: 40,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[s.title, { textAlign: "center" }]}>Check your email</Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text style={[s.sub, { textAlign: "center" }]}>
            We sent a 6-digit code to {email}.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change email"
            onPress={onChangeEmail}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[s.link, { textDecorationLine: "underline" }]}>
              Change email
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityLabel="Verification code, six digits"
          onPress={() => codeInput.current?.focus()}
          style={{ marginVertical: 14 }}
        >
          <View pointerEvents="none" style={{ flexDirection: "row", gap: 10 }}>
            {Array.from({ length: 6 }, (_, i) => {
              const isCurrent = i === code.length;
              const isFilled = i < code.length;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 60,
                    borderRadius: 14,
                    borderWidth: isCurrent ? 1.5 : 1,
                    borderColor: isCurrent
                      ? "#F3C556"
                      : isFilled
                      ? "rgba(243, 197, 86, 0.45)"
                      : "rgba(255, 255, 255, 0.14)",
                    backgroundColor: isCurrent
                      ? "rgba(243, 197, 86, 0.12)"
                      : isFilled
                      ? "rgba(243, 197, 86, 0.05)"
                      : "rgba(255, 255, 255, 0.05)",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: isCurrent ? "#EAB308" : undefined,
                    shadowRadius: isCurrent ? 8 : 0,
                    shadowOpacity: isCurrent ? 0.4 : 0,
                    elevation: isCurrent ? 4 : 0,
                  }}
                >
                  <Text
                    style={{
                      color: isFilled ? "#F6E7B8" : C.text,
                      fontSize: 26,
                      fontWeight: "700",
                    }}
                  >
                    {code[i] ?? ""}
                  </Text>
                </View>
              );
            })}
          </View>
          <TextInput
            ref={codeInput as any}
            accessibilityLabel="Six digit verification code"
            value={code}
            onChangeText={(x) => {
              setCode(x.replace(/\D/g, "").slice(0, 6));
              setAuthError("");
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            style={{
              position: "absolute",
              opacity: 0,
              width: "100%",
              height: 60,
            }}
          />
        </Pressable>

        {!!authError && (
          <View
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              borderWidth: 1,
              borderColor: "rgba(239, 68, 68, 0.35)",
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <Text
              accessibilityRole="alert"
              style={{
                color: "#FCA5A5",
                fontSize: 13,
                lineHeight: 18,
                textAlign: "center",
              }}
            >
              {authError}
            </Text>
          </View>
        )}

        <View style={{ alignItems: "center", marginVertical: 4 }}>
          {secondsLeft > 0 ? (
            <Text style={s.helper}>
              Resend code in 00:{String(secondsLeft).padStart(2, "0")}
            </Text>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resend code"
              disabled={busy}
              onPress={onResend}
              hitSlop={8}
            >
              <Text style={s.link}>{busy ? "Sending…" : "Resend code"}</Text>
            </Pressable>
          )}
        </View>

        <Button
          label={busy ? "Verifying…" : "Verify and continue"}
          disabled={code.length !== 6 || busy}
          busy={busy}
          onPress={onVerify}
        />
      </ScrollView>
    </View>
  );
}
