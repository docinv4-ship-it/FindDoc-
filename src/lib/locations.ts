import { Country, State, City } from "country-state-city";

export interface GlobalCountry {
  name: string;
  isoCode: string;
  currency: string;
  phonecode: string;
  latitude: string;
  longitude: string;
}

export interface GlobalState {
  name: string;
  isoCode: string;
}

export interface GlobalCity {
  name: string;
}

// Fetch all countries with their built-in currency and coordinates
export const getGlobalCountries = (): GlobalCountry[] => {
  return Country.getAllCountries().map((c) => ({
    name: c.name,
    isoCode: c.isoCode,
    currency: c.currency || "USD",
    phonecode: c.phonecode,
    latitude: c.latitude,
    longitude: c.longitude,
  }));
};

// Fetch states purely based on the Country's ISO Code
export const getGlobalStates = (countryCode: string): GlobalState[] => {
  if (!countryCode) return [];
  return State.getStatesOfCountry(countryCode).map((s) => ({
    name: s.name,
    isoCode: s.isoCode,
  }));
};

// Fetch cities based on Country ISO and State ISO
export const getGlobalCities = (countryCode: string, stateCode: string): GlobalCity[] => {
  if (!countryCode || !stateCode) return [];
  return City.getCitiesOfState(countryCode, stateCode).map((c) => ({
    name: c.name,
  }));
};
