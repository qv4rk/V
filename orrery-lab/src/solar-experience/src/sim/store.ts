import { create } from "zustand";

export type Mode = "system" | "eclipse" | "chart";
export type Panel = "none" | "time" | "eclipses" | "letters" | "chart";

type Note = { kicker: string; title: string; body: string; href?: string; hrefLabel?: string } | null;

type CosmoState = {
  mode: Mode;
  focus: string;
  lat: number;
  lon: number;
  place: string;
  showOrbits: boolean;
  showZodiac: boolean;
  showWells: boolean;
  showOumuamua: boolean;
  showPlanet9: boolean;
  panel: Panel;
  note: Note;
  chartOn: boolean;
  eclipseWide: boolean;
  playing: boolean;
  daysPerSecond: number;
  setMode: (mode: Mode) => void;
  setFocus: (id: string) => void;
  patch: (partial: Partial<CosmoState>) => void;
};

export const useCosmos = create<CosmoState>((set) => ({
  mode: "system",
  focus: "sun",
  lat: 40.7128,
  lon: -74.006,
  place: "New York",
  showOrbits: true,
  showZodiac: true,
  showWells: true,
  showOumuamua: true,
  showPlanet9: true,
  panel: "none",
  note: null,
  chartOn: false,
  eclipseWide: false,
  playing: false,
  daysPerSecond: 20,
  setMode: (mode) => set({ mode }),
  setFocus: (focus) => set({ focus, mode: "system" }),
  patch: (partial) => set(partial),
}));

export const clock = {
  t: Date.UTC(2024, 3, 8, 18, 17, 19),
};

export const view = {
  autodolly: true,
  focusDistance: 26,
};
