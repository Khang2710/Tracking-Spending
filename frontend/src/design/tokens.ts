export const paperLedger = {
  canvas: "#F4F3EF",
  surface: "#FFFFFF",
  ink: "#191B17",
  action: "#171A16",
  muted: "#4F534D",
  subtle: "#74786F",
  border: "#DEDDD6",
  sage: "#A9B8A0",
  sageSoft: "#E8EEE4",
  sand: "#E8D9BE",
  sandSoft: "#F4ECE0",
  income: "#4F7D62",
  expense: "#A75D4D",
  warning: "#A66F2C",
} as const;

/**
 * Compatibility palette for the older feature surfaces that have not yet
 * moved to the paper-ledger CSS custom properties. Keeping it here prevents
 * feature components from importing the application root.
 */
export const C = {
  bg: "#F4F3EF",
  sec: "#ECEBE5",
  card: "#FFFFFF",
  surf: "#F0EFEA",
  gold: "#171A16",
  goldL: "#30352E",
  high: "#191B17",
  purple: "#746783",
  green: "#4F7D62",
  red: "#A75D4D",
  white: "#191B17",
  t2: "#4F534D",
  tm: "#74786F",
  border: "rgba(25,27,23,0.10)",
} as const;
