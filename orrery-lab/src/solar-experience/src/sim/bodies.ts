import * as Astronomy from "astronomy-engine";

export type OrreryBody = {
  id: string;
  label: string;
  body: Astronomy.Body | null;
  color: string;
  radius: number;
  periodDays: number;
  /** Display weight for the potential mesh. Planet ratios follow GM; the Sun is on its own scale. */
  mu: number;
  ring?: { inner: number; outer: number; color: string };
};

export const ORRERY: OrreryBody[] = [
  { id: "sun", label: "Sun", body: Astronomy.Body.Sun, color: "#ffd38a", radius: 0.72, periodDays: 0, mu: 2.6 },
  { id: "mercury", label: "Mercury", body: Astronomy.Body.Mercury, color: "#b7b1a8", radius: 0.11, periodDays: 87.969, mu: 0.0015 },
  { id: "venus", label: "Venus", body: Astronomy.Body.Venus, color: "#e6c98a", radius: 0.16, periodDays: 224.701, mu: 0.006 },
  { id: "earth", label: "Earth", body: Astronomy.Body.Earth, color: "#6ea0d8", radius: 0.17, periodDays: 365.256, mu: 0.008 },
  { id: "mars", label: "Mars", body: Astronomy.Body.Mars, color: "#c46a45", radius: 0.14, periodDays: 686.98, mu: 0.002 },
  { id: "jupiter", label: "Jupiter", body: Astronomy.Body.Jupiter, color: "#d7b48a", radius: 0.4, periodDays: 4332.6, mu: 0.85 },
  { id: "saturn", label: "Saturn", body: Astronomy.Body.Saturn, color: "#e6d3a1", radius: 0.34, periodDays: 10759, mu: 0.25, ring: { inner: 1.28, outer: 2.15, color: "#e4d2a4" } },
  { id: "uranus", label: "Uranus", body: Astronomy.Body.Uranus, color: "#b7e4e4", radius: 0.24, periodDays: 30687, mu: 0.039, ring: { inner: 1.55, outer: 1.95, color: "#c5d0d2" } },
  { id: "neptune", label: "Neptune", body: Astronomy.Body.Neptune, color: "#4060c8", radius: 0.23, periodDays: 60190, mu: 0.046 },
  { id: "pluto", label: "Pluto", body: Astronomy.Body.Pluto, color: "#c2b09a", radius: 0.09, periodDays: 90560, mu: 0.0008 },
];

export const livePos: Record<string, { x: number; y: number; z: number }> = {};

export const MOON = {
  id: "moon",
  label: "Moon",
  body: Astronomy.Body.Moon,
  color: "#d5d1c8",
  radius: 0.07,
};
