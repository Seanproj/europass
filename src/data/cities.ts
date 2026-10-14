import citiesJson from './cities.json';
import countriesJson from './countries.json';
import type { City, Country } from './types';

export const CITIES = citiesJson as City[];
export const COUNTRIES = countriesJson as Country[];

const CITY_BY_ID = new Map(CITIES.map((c) => [c.id, c]));
const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCity(id: string): City | undefined {
  return CITY_BY_ID.get(id);
}

export function getCountry(code: string): Country | undefined {
  return COUNTRY_BY_CODE.get(code);
}

export function countryOfCity(cityId: string): string | undefined {
  return CITY_BY_ID.get(cityId)?.country;
}
