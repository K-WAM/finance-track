// TODO: Live FX API - replace mock with live API call (e.g. Bank of Canada or Open Exchange Rates)
// TODO: Vercel - add VITE_FX_API_KEY to environment variables

import type { Currency } from "@/types";

const MOCK_USD_TO_CAD = 1.36;
const MOCK_CAD_TO_USD = 0.735;

export interface FxRate {
  usdToCad: number;
  cadToUsd: number;
  date: string;
  isLive: boolean;
}

let cachedRate: FxRate = {
  usdToCad: MOCK_USD_TO_CAD,
  cadToUsd: MOCK_CAD_TO_USD,
  date: new Date().toISOString().split("T")[0],
  isLive: false,
};

export function getCurrentRate(): FxRate {
  return cachedRate;
}

// TODO: Live FX API - call Bank of Canada or Open Exchange Rates here
export async function refreshRate(): Promise<FxRate> {
  await new Promise(res => setTimeout(res, 600));
  cachedRate = {
    usdToCad: MOCK_USD_TO_CAD + (Math.random() - 0.5) * 0.01,
    cadToUsd: MOCK_CAD_TO_USD + (Math.random() - 0.5) * 0.005,
    date: new Date().toISOString().split("T")[0],
    isLive: false,
  };
  return cachedRate;
}

export function convert(amount: number, from: Currency, to: Currency, rate?: FxRate): number {
  const r = rate ?? cachedRate;
  if (from === to) return amount;
  if (from === "USD" && to === "CAD") return amount * r.usdToCad;
  if (from === "CAD" && to === "USD") return amount * r.cadToUsd;
  return amount;
}

export function getUsdEquivalent(amount: number, currency: Currency): number {
  return currency === "USD" ? amount : amount * cachedRate.cadToUsd;
}

export function getCadEquivalent(amount: number, currency: Currency): number {
  return currency === "CAD" ? amount : amount * cachedRate.usdToCad;
}
