// TODO: Firebase - replace with Firestore collection /businesses/{businessId}/transactions/{transactionId}
// TODO: Firebase Auth - check user.uid

import { storageService } from "./storageService";
import type { Transaction } from "@/types";
import { SAMPLE_TRANSACTIONS } from "@/data/sampleData";

const KEY = "transactions";

function getAll(): Transaction[] {
  return storageService.get<Transaction[]>(KEY) ?? [];
}

function init(): void {
  const existing = storageService.get<Transaction[]>(KEY);
  if (!existing || existing.length === 0) {
    storageService.set(KEY, SAMPLE_TRANSACTIONS);
  }
}

function getByBusiness(businessId: string): Transaction[] {
  return getAll().filter(t => t.businessId === businessId);
}

function getById(id: string): Transaction | undefined {
  return getAll().find(t => t.id === id);
}

function create(transaction: Transaction): Transaction {
  const transactions = getAll();
  transactions.push(transaction);
  storageService.set(KEY, transactions);
  return transaction;
}

function update(id: string, data: Partial<Transaction>): Transaction | undefined {
  const transactions = getAll();
  const idx = transactions.findIndex(t => t.id === id);
  if (idx === -1) return undefined;
  transactions[idx] = { ...transactions[idx], ...data, updatedAt: new Date().toISOString() };
  storageService.set(KEY, transactions);
  return transactions[idx];
}

function remove(id: string): void {
  const transactions = getAll().filter(t => t.id !== id);
  storageService.set(KEY, transactions);
}

function resetToSample(): void {
  storageService.set(KEY, SAMPLE_TRANSACTIONS);
}

export const transactionService = { getAll, init, getByBusiness, getById, create, update, remove, resetToSample };
