import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const translations = {
  en: { dashboard: 'Dashboard', workoutGenerator: 'Workout Generator', liveCoach: 'Live Coach', nutrition: 'Nutrition', progress: 'Progress', logout: 'Logout', search: 'Search metrics...', goLive: 'Go Live', language: 'Language' },
  ta: { dashboard: 'டாஷ்போர்டு', workoutGenerator: 'உடற்பயிற்சி உருவாக்கி', liveCoach: 'நேரடி பயிற்சியாளர்', nutrition: 'ஊட்டச்சத்து', progress: 'முன்னேற்றம்', logout: 'வெளியேறு', search: 'அளவீடுகளைத் தேடுக...', goLive: 'நேரலையில் செல்', language: 'மொழி' },
  hi: { dashboard: 'डैशबोर्ड', workoutGenerator: 'वर्कआउट जनरेटर', liveCoach: 'लाइव कोच', nutrition: 'पोषण', progress: 'प्रगति', logout: 'लॉग आउट', search: 'मेट्रिक्स खोजें...', goLive: 'लाइव जाएँ', language: 'भाषा' },
  ml: { dashboard: 'ഡാഷ്ബോർഡ്', workoutGenerator: 'വർക്ക്‌ഔട്ട് ജനറേറ്റർ', liveCoach: 'ലൈവ് കോച്ച്', nutrition: 'പോഷണം', progress: 'പുരോഗതി', logout: 'ലോഗ് ഔട്ട്', search: 'മെട്രിക്കുകൾ തിരയുക...', goLive: 'ലൈവായി പോകുക', language: 'ഭാഷ' },
  mr: { dashboard: 'डॅशबोर्ड', workoutGenerator: 'वर्कआउट जनरेटर', liveCoach: 'लाइव्ह कोच', nutrition: 'पोषण', progress: 'प्रगती', logout: 'लॉग आउट', search: 'मेट्रिक्स शोधा...', goLive: 'लाइव्ह जा', language: 'भाषा' },
};

export const languages = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'mr', label: 'मराठी' },
];

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('burn-ex-language') || 'en');

  useEffect(() => {
    localStorage.setItem('burn-ex-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key) => translations[language]?.[key] ?? translations.en[key] ?? key,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
