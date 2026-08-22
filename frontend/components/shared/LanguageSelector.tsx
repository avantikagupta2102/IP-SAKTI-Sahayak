"use client";

export const LANGUAGES = [
  { code: "en", name: "English", label: "English" },
  { code: "hi", name: "Hindi", label: "हिन्दी" },
  { code: "ta", name: "Tamil", label: "தமிழ்" },
  { code: "te", name: "Telugu", label: "తెలుగు" },
  { code: "kn", name: "Kannada", label: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", label: "മലയാളം" },
  { code: "mr", name: "Marathi", label: "मराठी" },
  { code: "gu", name: "Gujarati", label: "ગુજરાતી" },
  { code: "bn", name: "Bengali", label: "বাংলা" },
  { code: "pa", name: "Punjabi", label: "ਪੰਜਾਬੀ" },
  { code: "ur", name: "Urdu", label: "اردو" },
];

interface Props {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export default function LanguageSelector({ value, onChange, className = "" }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs ${className}`}
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          🌐 {lang.label} ({lang.name})
        </option>
      ))}
    </select>
  );
}
