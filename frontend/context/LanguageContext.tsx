"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getUser, saveUser } from "@/lib/auth";

interface LanguageContextType {
  language: string; // BCP-47: 'en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'bn', 'pa', 'ur'
  setLanguage: (lang: string) => void;
  t: (key: string, defaultText: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (_key, defaultText) => defaultText,
});

// Dictionary for common static UI tokens across top Indian Schedule 8 languages
const DICTIONARY: Record<string, Record<string, string>> = {
  hi: {
    dashboard: "डैशबोर्ड",
    chat_advisor: "एआई सलाहकार",
    document_intel: "दस्तावेज़ विश्लेषण",
    patent_search: "पेटेंट खोज",
    tkdl_assessor: "पारंपरिक ज्ञान जोखिम मूल्यांकन",
    regulations: "आईपी नियमावली",
    calendar: "समय-सीमा कैलेंडर",
    expert_brief: "विशेषज्ञ रिपोर्ट",
    investor_match: "निवेशक मैचमेकर",
    run_matching: "मैचमेकर चलाएं",
    trust_score: "विश्वसनीयता स्कोर",
    verified: "सत्यापित",
  },
  ta: {
    dashboard: "முகப்பு பலகை",
    chat_advisor: "AI ஆலோசகர்",
    document_intel: "ஆவண பகுப்பாய்வு",
    patent_search: "காப்புரிமை தேடல்",
    tkdl_assessor: "பாரம்பரிய அறிவு அபாய மதிப்பீடு",
    regulations: "IP விதிகள்",
    calendar: "காலக்கெடு நாள்காட்டி",
    expert_brief: "நிபுணர் சுருக்கம்",
    investor_match: "முதலீட்டாளர் பொருத்தம்",
    run_matching: "பொருத்தத்தை இயக்கு",
    trust_score: "நம்பகத்தன்மை புள்ளி",
    verified: "சரிபார்க்கப்பட்டது",
  },
  te: {
    dashboard: "డాష్‌బోర్డ్",
    chat_advisor: "AI సలహాదారు",
    document_intel: "పత్ర విశ్లేషణ",
    patent_search: "పేటెంట్ శోధన",
    tkdl_assessor: "సాంప్రదాయ పరిజ్ఞాన ప్రమాద అంచనా",
    regulations: "IP నిబంధనలు",
    calendar: "గడువు క్యాలెండర్",
    expert_brief: "నిపుణుల నివేదిక",
    investor_match: "పెట్టుబడిదారుల మ్యాచ్‌మేకర్",
    run_matching: "మ్యాచ్‌మేకర్‌ని ప్రారంభించండి",
    trust_score: "విశ్వసనీయత స్కోర్",
    verified: "ధృవీకరించబడింది",
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>("en");

  useEffect(() => {
    const user = getUser();
    if (user?.language) {
      setLanguageState(user.language);
    }
  }, []);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    const user = getUser();
    if (user) {
      saveUser({ ...user, language: lang });
    }
  };

  const t = (key: string, defaultText: string): string => {
    if (language === "en") return defaultText;
    const langDict = DICTIONARY[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    return defaultText;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
