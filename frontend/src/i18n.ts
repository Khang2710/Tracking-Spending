import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import translationEN from "./locales/en";
import translationVI from "./locales/vi";

const resources = {
  en: {
    translation: translationEN,
  },
  "en-US": {
    translation: translationEN,
  },
  vi: {
    translation: translationVI,
  },
  "vi-VN": {
    translation: translationVI,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "vi", // Set fallback to Vietnamese to ensure it defaults cleanly
    debug: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
