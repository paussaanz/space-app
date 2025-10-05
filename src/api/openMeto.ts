// src/services/openMeteo.ts
import { meteo } from "../lib/http";

export type OpenMeteoCurrent = {
  time: string;
  temperature_2m: number;
  weather_code?: number;
};

export type OpenMeteoResp = {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: OpenMeteoCurrent;
};

export async function fetchCurrentWeather(lat: number, lon: number) {
  const data = await meteo.get<OpenMeteoResp>("/v1/forecast", {
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,weather_code",
    timezone: "auto",
  });

  return {
    temp: data.current?.temperature_2m ?? null,
    code: data.current?.weather_code,
    raw: data,
  };
}
