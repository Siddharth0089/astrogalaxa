import React from "react";
import { Text, View } from "react-native";
import { Planet } from "../types";
import { s } from "../theme/styles";

export function PlanetsTable({ planets }: { planets: Planet[] }) {
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.tableHead}>Planet</Text>
        <Text style={s.tableHead}>Sign</Text>
        <Text style={s.tableHead}>House</Text>
      </View>
      {planets.map((p) => (
        <View style={s.row} key={p.id}>
          <Text style={[s.cardText, { width: "33%" }]}>{p.id}</Text>
          <Text style={[s.cardText, { width: "33%" }]}>{p.sign}</Text>
          <Text style={[s.cardText, { width: "33%" }]}>{p.house ?? "—"}</Text>
        </View>
      ))}
    </View>
  );
}
