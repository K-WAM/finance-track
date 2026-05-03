// TODO: Firebase Storage - replace with Firestore collection /businesses/{businessId}/documents/{documentId}
// TODO: Firebase Storage - upload actual file bytes to Firebase Storage and store download URL

import { storageService } from "./storageService";
import type { BusinessDocument } from "@/types";

const KEY = "documents";

function getAll(): BusinessDocument[] {
  return storageService.get<BusinessDocument[]>(KEY) ?? [];
}

function getByBusiness(businessId: string): BusinessDocument[] {
  return getAll().filter(d => d.businessId === businessId);
}

function getById(id: string): BusinessDocument | undefined {
  return getAll().find(d => d.id === id);
}

function create(doc: BusinessDocument): BusinessDocument {
  const docs = getAll();
  docs.push(doc);
  storageService.set(KEY, docs);
  return doc;
}

function update(id: string, data: Partial<BusinessDocument>): BusinessDocument | undefined {
  const docs = getAll();
  const idx = docs.findIndex(d => d.id === id);
  if (idx === -1) return undefined;
  docs[idx] = { ...docs[idx], ...data };
  storageService.set(KEY, docs);
  return docs[idx];
}

function remove(id: string): void {
  const docs = getAll().filter(d => d.id !== id);
  storageService.set(KEY, docs);
}

export const documentService = { getAll, getByBusiness, getById, create, update, remove };
