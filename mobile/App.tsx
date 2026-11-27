import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { CormorantGaramond_700Bold } from "@expo-google-fonts/cormorant-garamond";

import {
  apiRequest,
  clearSession,
  deviceDetails,
  logoutSession,
  restoreSession,
  saveSession,
} from "./session";

import { C } from "./src/theme/colors";
import { s } from "./src/theme/styles";
import {
  Horoscope,
  KundliData,
  NameSign,
  Place,
  Screen,
  TarotReading,
} from "./src/types";

import { Galaxy } from "./src/components/Galaxy";
import { Button } from "./src/components/Button";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { BottomNav } from "./src/components/BottomNav";

import { LoginScreen } from "./src/screens/LoginScreen";
import { OtpScreen } from "./src/screens/OtpScreen";
import { BirthDetailsScreen } from "./src/screens/BirthDetailsScreen";
import { ResultScreen } from "./src/screens/ResultScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { KundliScreen } from "./src/screens/KundliScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { LiveScreen } from "./src/screens/LiveScreen";
import { TarotScreen } from "./src/screens/TarotScreen";
import { ReadingScreen } from "./src/screens/ReadingScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";

async function request(
  path: string,
  body?: unknown,
  token?: string,
  method?: "GET" | "POST" | "PATCH" | "DELETE",
) {
  return apiRequest(path, body, Boolean(token), method);
}

export default function App() {
  const [fontsLoaded] = useFonts({ CormorantGaramond_700Bold });
  const [screen, setScreen] = useState<Screen>("login");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [birth, setBirth] = useState({ dob: "", time: "", place: "" });
  const [cards, setCards] = useState<string[]>([]);
  const [topic, setTopic] = useState("General");
  const [reading, setReading] = useState<TarotReading | null>(null);
  const [horoscope, setHoroscope] = useState<Horoscope | null>(null);
  const [horoscopeError, setHoroscopeError] = useState("");
  const [horoscopeLoading, setHoroscopeLoading] = useState(false);
  const [horoscopeRetry, setHoroscopeRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [sessionRetry, setSessionRetry] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [authError, setAuthError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [nameSign, setNameSign] = useState<NameSign | null>(null);
  const [sunSign, setSunSign] = useState<string | null>(null);
  const [kundli, setKundli] = useState<KundliData | null>(null);
  const [kundliError, setKundliError] = useState("");
  const [kundliLoading, setKundliLoading] = useState(false);
  const [kundliRetry, setKundliRetry] = useState(0);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesError, setPlacesError] = useState("");
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const codeInput = useRef<TextInput>(null);

  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    let active = true;
    setSessionLoading(true);
    setSessionError("");
    restoreSession()
      .then((session) => {
        if (!active || !session) return;
        setToken(session.accessToken);
        setName(session.user?.name ?? "");
        setEmail(session.user?.email ?? "");
        setNameSign((session.user?.nameSign as NameSign | null) ?? null);
        setSunSign(session.user?.sunSign ?? null);
        setScreen(session.onboardingComplete ? "home" : "birth");
      })
      .catch(() => {
        if (active)
          setSessionError(
            "Unable to restore your session. Check your connection and try again.",
          );
      })
      .finally(() => {
        if (active) setSessionLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionRetry]);

  useEffect(() => {
    if (screen !== "otp" || resendAt <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [screen, resendAt]);

  useEffect(() => {
    if (screen !== "home" || !token) return;
    let active = true;
    setHoroscope(null);
    setHoroscopeError("");
    setHoroscopeLoading(true);
    apiRequest("/horoscope/today", undefined, true)
      .then((value: Horoscope) => {
        if (active) setHoroscope(value);
      })
      .catch((error: unknown) => {
        if (active)
          setHoroscopeError(
            error instanceof Error
              ? error.message
              : "Could not load your horoscope.",
          );
      })
      .finally(() => {
        if (active) setHoroscopeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [screen, token, horoscopeRetry]);

  useEffect(() => {
    if (screen !== "kundli" || !token) return;
    let active = true;
    setKundliLoading(true);
    setKundliError("");
    request("/kundli", undefined, token)
      .then((data: KundliData) => {
        if (active) setKundli(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setKundli(null);
          setKundliError(
            error instanceof Error
              ? error.message
              : "Could not load your Kundli.",
          );
        }
      })
      .finally(() => {
        if (active) setKundliLoading(false);
      });
    return () => {
      active = false;
    };
  }, [screen, token, kundliRetry]);

  useEffect(() => {
    if (screen !== "birth" || selectedPlace || birth.place.trim().length < 2) {
      setPlaces([]);
      setSearchingPlaces(false);
      return;
    }
    let active = true;
    setSearchingPlaces(true);
    const timeout = setTimeout(() => {
      request(`/places/search?q=${encodeURIComponent(birth.place.trim())}`)
        .then((results: Place[]) => {
          if (active) {
            setPlaces(results);
            setPlacesError(
              results.length ? "" : "No places found. Try another search.",
            );
          }
        })
        .catch(() => {
          if (active) {
            setPlaces([]);
            setPlacesError("Place search is unavailable. Please try again.");
          }
        })
        .finally(() => {
          if (active) setSearchingPlaces(false);
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [screen, birth.place, selectedPlace]);

  const go = (x: Screen) => setScreen(x);

  const login = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email))
      return Alert.alert("Enter a valid email");
    if (busy) return;
    setBusy(true);
    setAuthError("");
    try {
      const result = await request("/auth/otp/request", {
        email: email.trim(),
      });
      const timestamp = Date.now();
      setNow(timestamp);
      setResendAt(timestamp + (result.resendAfterSeconds ?? 60) * 1000);
      setCode("");
      go("otp");
    } catch (e) {
      setAuthError(
        e instanceof Error
          ? e.message
          : "Unable to send code. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (busy) return;
    setBusy(true);
    setAuthError("");
    try {
      const d = await request("/auth/otp/verify", {
        email,
        code,
        ...(await deviceDetails()),
      });
      await saveSession(d);
      setToken(d.accessToken);
      setName(d.user?.name ?? "");
      setNameSign(d.user?.nameSign ?? null);
      setSunSign(d.user?.sunSign ?? null);
      go(d.onboardingComplete ? "home" : "birth");
    } catch (e) {
      setAuthError(
        e instanceof Error
          ? e.message
          : "Verification failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveBirth = async () => {
    if (!name.trim() || !birth.dob || (!selectedPlace && !birth.place.trim()))
      return Alert.alert(
        "Complete all required fields",
        "Please enter your name, date of birth, and birth city or location.",
      );
    const match = /^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/.exec(birth.dob);
    if (!match)
      return Alert.alert(
        "Invalid date",
        "Enter your date of birth as DD / MM / YYYY.",
      );
    const [, day, month, year] = match;
    const date = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );
    if (
      date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() !== Number(month) - 1 ||
      date.getUTCDate() !== Number(day) ||
      date > new Date()
    )
      return Alert.alert(
        "Invalid date",
        "Enter a valid date that is not in the future.",
      );
    const timeMatch = birth.time.trim()
      ? /^(0?[1-9]|1[0-2])\s*:\s*([0-5]\d)\s*(AM|PM)$/i.exec(birth.time.trim())
      : null;
    if (birth.time.trim() && !timeMatch)
      return Alert.alert(
        "Invalid time",
        "Enter a time such as 6:40 AM, or leave it blank.",
      );
    const time = timeMatch
      ? `${String((Number(timeMatch[1]) % 12) + (timeMatch[3].toUpperCase() === "PM" ? 12 : 0)).padStart(2, "0")}:${timeMatch[2]}`
      : null;

    let placeToUse = selectedPlace;
    if (!placeToUse && birth.place.trim()) {
      try {
        const results = await request(
          `/places/search?q=${encodeURIComponent(birth.place.trim())}`,
        );
        if (results && results.length > 0) {
          placeToUse = results[0];
          setSelectedPlace(placeToUse);
        }
      } catch {}
    }
    if (!placeToUse) {
      return Alert.alert(
        "Location needed",
        "Could not find coordinates for this location. Please enter a valid city or region.",
      );
    }

    try {
      const updated = await request(
        "/users/me",
        {
          name,
          birth: {
            dob: date.toISOString(),
            time,
            placeName: placeToUse.name,
            lat: placeToUse.lat,
            lng: placeToUse.lng,
            timezone: placeToUse.timezone,
          },
        },
        token,
        "PATCH",
      );
      setNameSign(updated.nameSign ?? null);
      setSunSign(updated.sunSign ?? null);
      go("result");
    } catch (e) {
      Alert.alert("Could not save details", String(e));
    }
  };

  const logout = async () => {
    try {
      await logoutSession();
      setToken(undefined);
      setKundli(null);
      setHoroscope(null);
      setReading(null);
      setCards([]);
      setName("");
      setNameSign(null);
      setSunSign(null);
      setBirth({ dob: "", time: "", place: "" });
      setSelectedPlace(null);
      setCode("");
      go("login");
    } catch {
      Alert.alert(
        "Unable to log out",
        "Please check your connection and try again.",
      );
    }
  };

  const deleteAccount = async () => {
    if (!token)
      return Alert.alert(
        "Sign in required",
        "Please sign in to delete your account.",
      );
    try {
      await request("/users/me", undefined, token, "DELETE");
    } catch {
      return Alert.alert(
        "Unable to delete account",
        "Please try again later or contact support.",
      );
    }
    let cleared = true;
    try {
      await clearSession();
    } catch {
      cleared = false;
    }
    setToken(undefined);
    setKundli(null);
    setHoroscope(null);
    setReading(null);
    setCards([]);
    setName("");
    setEmail("");
    setNameSign(null);
    setSunSign(null);
    setBirth({ dob: "", time: "", place: "" });
    setSelectedPlace(null);
    setCode("");
    go("login");
    Alert.alert(
      "Account deleted",
      cleared
        ? "Your account has been deleted."
        : "Your account has been deleted, but local session storage could not be cleared. Restart the app or clear its data.",
    );
  };

  if (!fontsLoaded) return null;

  if (sessionLoading || sessionError)
    return (
      <SafeAreaProvider>
        <SafeAreaView style={s.safe}>
          <Galaxy>
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                padding: 28,
                gap: 20,
              }}
            >
              <Text style={s.sub}>
                {sessionError || "Checking your session…"}
              </Text>
              {!!sessionError && (
                <Button
                  label="Try again"
                  onPress={() => setSessionRetry((value) => value + 1)}
                />
              )}
            </View>
          </Galaxy>
        </SafeAreaView>
      </SafeAreaProvider>
    );

  let body: React.ReactNode;
  if (screen === "login")
    body = (
      <LoginScreen
        email={email}
        setEmail={setEmail}
        busy={busy}
        authError={authError}
        onLogin={login}
      />
    );
  else if (screen === "otp")
    body = (
      <OtpScreen
        email={email}
        code={code}
        setCode={setCode}
        busy={busy}
        authError={authError}
        setAuthError={setAuthError}
        secondsLeft={secondsLeft}
        codeInput={codeInput}
        onVerify={verify}
        onResend={login}
        onChangeEmail={() => {
          setCode("");
          setAuthError("");
          go("login");
        }}
      />
    );
  else if (screen === "birth")
    body = (
      <BirthDetailsScreen
        name={name}
        setName={setName}
        birth={birth}
        setBirth={setBirth}
        selectedPlace={selectedPlace}
        setSelectedPlace={setSelectedPlace}
        places={places}
        setPlaces={setPlaces}
        placesError={placesError}
        setPlacesError={setPlacesError}
        searchingPlaces={searchingPlaces}
        onSave={saveBirth}
        onBack={() => go("login")}
      />
    );
  else if (screen === "result")
    body = (
      <ResultScreen
        name={name}
        birthDob={birth.dob}
        nameSign={nameSign}
        sunSign={sunSign}
        onContinue={() => go("kundli")}
        onBack={() => go("birth")}
      />
    );
  else if (screen === "home")
    body = (
      <HomeScreen
        name={name}
        nameSign={nameSign}
        sunSign={sunSign}
        horoscope={horoscope}
        horoscopeLoading={horoscopeLoading}
        horoscopeError={horoscopeError}
        token={token}
        onRetryHoroscope={() => setHoroscopeRetry((x) => x + 1)}
        onNavigate={go}
      />
    );
  else if (screen === "kundli")
    body = (
      <KundliScreen
        name={name}
        birth={birth}
        kundli={kundli}
        kundliLoading={kundliLoading}
        kundliError={kundliError}
        token={token}
        onRetry={() => setKundliRetry((x) => x + 1)}
        onNavigate={go}
      />
    );
  else if (screen === "chat")
    body = <ChatScreen onNavigate={go} name={name} />;
  else if (screen === "live")
    body = <LiveScreen authenticated={Boolean(token)} onNavigate={go} />;
  else if (screen === "tarot")
    body = (
      <TarotScreen
        cards={cards}
        setCards={setCards}
        topic={topic}
        setTopic={setTopic}
        authenticated={Boolean(token)}
        onReading={(value) => {
          setReading(value);
          go("reading");
        }}
        onNavigate={go}
      />
    );
  else if (screen === "reading")
    body = (
      <ReadingScreen
        reading={reading}
        onDrawAgain={() => {
          setCards([]);
          setReading(null);
          go("tarot");
        }}
        onNavigate={go}
      />
    );
  else
    body = (
      <ProfileScreen
        authenticated={Boolean(token)}
        onBack={() => go("home")}
        logout={logout}
        deleteAccount={deleteAccount}
        onSaved={(profile) => {
          setName(profile.name ?? "");
          setNameSign(profile.nameSign ?? null);
        }}
        onEditBirth={(profile) => {
          if (profile.birth) {
            const d = new Date(profile.birth.dob);
            const time = profile.birth.time;
            const hour = time ? Number(time.slice(0, 2)) : 0;
            setBirth({
              dob: `${String(d.getUTCDate()).padStart(2, "0")} / ${String(d.getUTCMonth() + 1).padStart(2, "0")} / ${d.getUTCFullYear()}`,
              time: time
                ? `${hour % 12 || 12}:${time.slice(3, 5)} ${hour >= 12 ? "PM" : "AM"}`
                : "",
              place: profile.birth.placeName,
            });
            setSelectedPlace({
              name: profile.birth.placeName,
              lat: profile.birth.lat,
              lng: profile.birth.lng,
              timezone: profile.birth.timezone,
            });
          }
          go("birth");
        }}
      />
    );

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <SafeAreaView style={s.safe}>
          <Galaxy>
            {__DEV__ && process.env.EXPO_PUBLIC_UI_PREVIEW === "true" && (
              <View style={{ height: 50, backgroundColor: "#262018" }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 8,
                  }}
                >
                  {(
                    [
                      "login",
                      "otp",
                      "birth",
                      "result",
                      "home",
                      "kundli",
                      "chat",
                      "live",
                      "tarot",
                      "reading",
                      "profile",
                    ] as Screen[]
                  ).map((x) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Preview ${x}`}
                      key={x}
                      onPress={() => go(x)}
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: screen === x ? C.gold : C.glass,
                      }}
                    >
                      <Text style={{ color: screen === x ? C.onGold : C.text }}>
                        {x}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={{ flex: 1 }}>{body}</View>
            {(["home", "kundli", "chat", "live", "tarot"] as Screen[]).includes(
              screen,
            ) && <BottomNav active={screen} go={go} visible={true} />}
          </Galaxy>
        </SafeAreaView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
