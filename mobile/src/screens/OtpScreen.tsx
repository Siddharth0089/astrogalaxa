import React, { RefObject, useEffect } from "react";
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
  expirySecondsLeft = 600,
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
  expirySecondsLeft?: number;
  codeInput: RefObject<TextInput | null>;
  onVerify: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  // Automatically activate the input box when screen loads so user can immediately type
  useEffect(() => {
    const timer = setTimeout(() => {
      codeInput.current?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, [codeInput]);

  const isExpired = expirySecondsLeft <= 0;
  const expMinutes = Math.floor(expirySecondsLeft / 60);
  const expSeconds = expirySecondsLeft % 60;
  const expiryFormatted = `${String(expMinutes).padStart(2, "0")}:${String(expSeconds).padStart(2, "0")}`;

  return (
    <View style={{ flex: 1 }}>
      {/* Top Bar: Pure back arrow only (no tile background, no border, no header text) */}
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
          hitSlop={16}
          style={({ pressed }) => [
            {
              paddingVertical: 6,
              paddingRight: 16,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: "#F5F5F7",
              fontSize: 38,
              lineHeight: 38,
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
            gap: 6,
          }}
        >
          <Text style={[s.sub, { textAlign: "center" }]}>
            We sent a 6-digit code to {email}.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change email address"
            onPress={onChangeEmail}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text
              style={[
                s.link,
                { textDecorationLine: "underline", color: "#F3C556" },
              ]}
            >
              Change email
            </Text>
          </Pressable>
        </View>

        {/* 6 Digit Verification Input with Glow Focus */}
        <Pressable
          accessibilityLabel="Verification code, six digits"
          onPress={() => codeInput.current?.focus()}
          style={{ marginVertical: 12 }}
        >
          <View pointerEvents="none" style={{ flexDirection: "row", gap: 10 }}>
            {Array.from({ length: 6 }, (_, i) => {
              const isCurrent = i === code.length && !isExpired;
              const isFilled = i < code.length;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 60,
                    borderRadius: 14,
                    borderWidth: isCurrent ? 1.5 : 1,
                    borderColor: isExpired
                      ? "rgba(239, 68, 68, 0.4)"
                      : isCurrent
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
            autoFocus={true}
            style={{
              position: "absolute",
              opacity: 0,
              width: "100%",
              height: 60,
            }}
          />
        </Pressable>

        {/* Security Expiry Timer to prevent fraud */}
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 13,
              color: isExpired ? "#FCA5A5" : "#A1A1AA",
              letterSpacing: 0.2,
            }}
          >
            {isExpired
              ? "⚠️ Code expired for your security. Please request a new code."
              : `🔒 Code expires in ${expiryFormatted}`}
          </Text>
        </View>

        {/* Advanced Error Banner */}
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

        {/* 60s Resend Timer */}
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
              <Text
                style={[
                  s.link,
                  { color: "#F3C556", textDecorationLine: "underline" },
                ]}
              >
                {busy ? "Sending…" : "Resend code"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Action Button */}
        <Button
          label={busy ? "Verifying…" : "Verify and continue"}
          disabled={code.length !== 6 || busy || isExpired}
          busy={busy}
          onPress={onVerify}
        />
      </ScrollView>
    </View>
  );
}
