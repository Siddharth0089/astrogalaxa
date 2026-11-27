import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Place } from "../types";
import { s } from "../theme/styles";

export function BirthDetailsScreen({
  name,
  setName,
  birth,
  setBirth,
  selectedPlace,
  setSelectedPlace,
  places,
  setPlaces,
  placesError,
  setPlacesError,
  searchingPlaces,
  onSave,
  onBack,
}: {
  name: string;
  setName: (n: string) => void;
  birth: { dob: string; time: string; place: string };
  setBirth: React.Dispatch<React.SetStateAction<{ dob: string; time: string; place: string }>>;
  selectedPlace: Place | null;
  setSelectedPlace: (p: Place | null) => void;
  places: Place[];
  setPlaces: (p: Place[]) => void;
  placesError: string;
  setPlacesError: (e: string) => void;
  searchingPlaces: boolean;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.header}>
        <Pressable accessibilityLabel="Go back" onPress={onBack} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.headerTitle}>Birth Details</Text>
        <View style={s.back} />
      </View>
      <Text style={s.title}>Tell us when you were born</Text>
      <Text style={s.sub}>
        We use this to create your kundli and find your zodiac sign.
      </Text>
      <Field
        label="Full name"
        value={name}
        onChange={setName}
        placeholder="Your full name"
      />
      <Field
        label="Date of birth"
        value={birth.dob}
        onChange={(x) => setBirth({ ...birth, dob: x })}
        placeholder="DD / MM / YYYY"
      />
      <Field
        label="Time of birth (optional)"
        value={birth.time}
        onChange={(x) => setBirth({ ...birth, time: x })}
        placeholder="HH : MM AM / PM"
      />
      <Text style={s.helper}>
        Not sure? Skip it. Your sign will still be accurate, but the ascendant and house details need an exact time.
      </Text>
      <Field
        label="Place of birth"
        value={birth.place}
        onChange={(x) => {
          setSelectedPlace(null);
          setPlacesError("");
          setBirth({ ...birth, place: x });
        }}
        placeholder="Search city or town"
      />
      {searchingPlaces && <Text style={s.helper}>Searching places…</Text>}
      {!!placesError && !selectedPlace && (
        <Text style={s.helper}>{placesError}</Text>
      )}
      {places.map((place) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select ${place.name}`}
          key={`${place.lat}:${place.lng}`}
          onPress={() => {
            setSelectedPlace(place);
            setBirth({ ...birth, place: place.name });
            setPlaces([]);
            setPlacesError("");
          }}
          style={[s.card, { padding: 12 }]}
        >
          <Text style={s.cardText}>{place.name}</Text>
        </Pressable>
      ))}
      {selectedPlace && (
        <Text style={s.helper}>Selected: {selectedPlace.name}</Text>
      )}
      <Text style={s.helper}>
        Location data provided by GeoNames via Open-Meteo.
      </Text>
      <Button label="Create my Kundli" onPress={onSave} />
    </ScrollView>
  );
}
