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
    // Never fall back to the other user-facing language. Missing keys are
    // easier to spot than silently mixing English and Vietnamese in one view.
    fallbackLng: false,
    debug: import.meta.env.MODE === "development",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
