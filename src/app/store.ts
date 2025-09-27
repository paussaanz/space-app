// src/app/store.ts
import { create } from 'zustand';

interface AppState {
  selectedDate: string;
  pollutant: string;
  setDate: (date: string) => void;
  setPollutant: (pollutant: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedDate: new Date().toISOString(),
  pollutant: 'PM2.5',
  setDate: (date) => set({ selectedDate: date }),
  setPollutant: (pollutant) => set({ pollutant }),
}));
