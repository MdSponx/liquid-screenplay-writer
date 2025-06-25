import th from './th';
import en from './en';

export const translations = {
  th,
  en
};

export type Language = keyof typeof translations;