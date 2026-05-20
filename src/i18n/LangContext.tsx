// src/i18n/LangContext.tsx
// ═══════════════════════════════════════════════════════════════
// React Context لمشاركة اللغة والترجمات بين كل المكوّنات
// بدون الحاجة لتمرير lang و t كـ props في كل مكان
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { translations, type Lang, type Translations } from "./translations";

interface LangContextType {
  lang: Lang;
  t: Translations;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextType | null>(null);

/** مزوّد اللغة — يُغلّف التطبيق بالكامل */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");
  const t = translations[lang];

  // تحديث اتجاه الصفحة عند تغيير اللغة
  useEffect(() => {
    document.body.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const toggleLang = () => setLang((prev) => (prev === "ar" ? "en" : "ar"));

  return (
    <LangContext.Provider value={{ lang, t, setLang, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

/** Hook لاستخدام اللغة والترجمات في أي مكوّن */
export function useLang(): LangContextType {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used within a LangProvider");
  }
  return ctx;
}
