// TODO: Firebase - replace with Firestore collection /users/{userId}/businesses/{businessId}
// TODO: Firebase Auth - check user.uid here
// TODO: Firebase Storage - upload receipt file and store URL

const PREFIX = "finance_track_";

export const storageService = {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`${PREFIX}${key}`);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error("Error reading from localStorage", e);
      return null;
    }
  },
  
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
    } catch (e) {
      console.error("Error writing to localStorage", e);
    }
  },
  
  remove(key: string): void {
    try {
      localStorage.removeItem(`${PREFIX}${key}`);
    } catch (e) {
      console.error("Error removing from localStorage", e);
    }
  },

  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) {
        keys.push(key.replace(PREFIX, ""));
      }
    }
    return keys;
  },
  
  clearAll(): void {
    const keys = this.getAllKeys();
    keys.forEach(key => this.remove(key));
  }
};
