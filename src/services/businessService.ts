// TODO: Firebase - replace with Firestore collection /businesses/{businessId}
// TODO: Firebase Auth - filter by user.uid

import { storageService } from "./storageService";
import type { Business } from "@/types";
import { SAMPLE_BUSINESS } from "@/data/sampleData";

const KEY = "businesses";

function getAll(): Business[] {
  return storageService.get<Business[]>(KEY) ?? [];
}

function init(): void {
  const existing = storageService.get<Business[]>(KEY);
  if (!existing || existing.length === 0) {
    storageService.set(KEY, [SAMPLE_BUSINESS]);
  }
}

function getById(id: string): Business | undefined {
  return getAll().find(b => b.id === id);
}

function create(business: Business): Business {
  const businesses = getAll();
  businesses.push(business);
  storageService.set(KEY, businesses);
  return business;
}

function update(id: string, data: Partial<Business>): Business | undefined {
  const businesses = getAll();
  const idx = businesses.findIndex(b => b.id === id);
  if (idx === -1) return undefined;
  businesses[idx] = { ...businesses[idx], ...data };
  storageService.set(KEY, businesses);
  return businesses[idx];
}

function remove(id: string): void {
  const businesses = getAll().filter(b => b.id !== id);
  storageService.set(KEY, businesses);
}

export const businessService = { getAll, init, getById, create, update, remove };
