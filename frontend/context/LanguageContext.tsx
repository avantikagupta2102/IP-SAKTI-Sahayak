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

// Comprehensive UI token translations across Schedule 8 Indian Languages
const DICTIONARY: Record<string, Record<string, string>> = {
  hi: {
    dashboard: "डैशबोर्ड",
    compliance_passport: "अनुपालन पासपोर्ट",
    smart_iot_compliance: "स्मार्ट आईओटी अनुपालन एवं साक्ष्य निगरानी",
    tkdl_assessor: "पारंपरिक ज्ञान जोखिम मूल्यांकन",
    ip_regulations: "आईपी नियमावली",
    deadline_calendar: "समय-सीमा कैलेंडर",
    expert_brief: "विशेषज्ञ रिपोर्ट",
    investor_match: "निवेशक मैचमेकर",
    ask_ai_advisor: "एआई कानूनी सलाहकार",
    alerts_page: "अधिसूचनाएं एवं वैधानिक चेतावनियां",
    select_ip_category: "आईपी सुरक्षा श्रेणी चुनें",
    click_card_consultation: "मार्गदर्शित परामर्श शुरू करने के लिए कार्ड पर क्लिक करें",
    patent_protection: "पेटेंट सुरक्षा",
    patent_desc: "आविष्कार, रासायनिक और आयुर्वेदिक प्रक्रियाएं, फॉर्मूलेशन",
    trademark_brand: "ट्रेडमार्क एवं ब्रांड",
    trademark_desc: "ब्रांड नाम, लोगो, नारे, क्लास 5 फार्मास्यूटिकल्स",
    copyright_content: "कॉपीराइट एवं सामग्री",
    copyright_desc: "मैनुअल, सॉफ्टवेयर कोड, लेबल कलाकृति, शोध पत्र",
    traditional_knowledge: "पारंपरिक ज्ञान (TKDL)",
    tk_desc: "हर्बल फॉर्मूलेशन, TKDL पूर्व-कला, धारा 3(p) अनुपालन",
    start_consultation: "परामर्श शुरू करें",
    ask_legal_ayush: "कानूनी एवं आयुष सलाहकार से पूछें",
    ask_legal_desc: "पेटेंट वैधता, ट्रेडमार्क श्रेणी, फॉर्म 25-डी या लेबल दावों के बारे में पूछें",
    scan_notice_pdf: "सरकारी नोटिस / पीडीएफ स्कैन करें",
    scan_notice_desc: "ट्रेडमार्क परीक्षा रिपोर्ट या पेटेंट कार्यालय कार्रवाई अपलोड करें",
    good_morning: "शुभ प्रभात",
    good_afternoon: "शुभ अपराह्न",
    good_evening: "शुभ संध्या",
    wizard_button: '"मुझे किस आईपी की आवश्यकता है?" विजार्ड',
    open_prompt_interface: "इंटरफ़ेस खोलें",
    upload_analyze_pdf: "पीडीएफ अपलोड और विश्लेषण करें",
    sign_out: "साइन आउट",
    language_label: "भाषा:",
    device_online: "उपकरण ऑनलाइन",
    device_offline: "उपकरण ऑफलाइन",
    connected: "जुड़ा हुआ",
    disconnected: "डिस्कनेक्टेड",
    last_synchronized: "अंतिम सिंक समय",
    demo_sensor_mode: "डेमो सेंसर मोड",
    live_telemetry: "लाइव आईओटी सेंसर मॉनिटरिंग",
    configure_limits: "प्रक्रिया सीमाएं सेट करें",
    generate_evidence_report: "साक्ष्य रिपोर्ट तैयार करें",
    humidity: "आर्द्रता",
    temperature: "तापमान",
    sound_activity: "ध्वनि / गतिविधि",
    device_status: "उपकरण की स्थिति",
    normal_status: "सामान्य अनुपालन",
    attention_status: "ध्यान दें",
    deviation_detected: "प्रक्रिया उल्लंघन मिला",
    view_evidence: "साक्ष्य देखें",
    acknowledge: "स्वीकार करें",
    assess_tkdl_risk: "TKDL एवं धारा 3(p) पेटेंट जोखिम मूल्यांकन करें",
  },
  ta: {
    dashboard: "முகப்பு பலகை",
    compliance_passport: "இணக்க கடவுச்சீட்டு",
    smart_iot_compliance: "ஸ்மார்ட் IoT இணக்கம் & சான்றுகள் கண்காணிப்பு",
    tkdl_assessor: "பாரம்பரிய அறிவு அபாய மதிப்பீடு",
    ip_regulations: "IP விதிகள்",
    deadline_calendar: "காலக்கெடு நாள்காட்டி",
    expert_brief: "நிபுணர் சுருக்கம்",
    investor_match: "முதலீட்டாளர் பொருத்தம்",
    ask_ai_advisor: "AI சட்ட ஆலோசகர்",
    alerts_page: "அறிவிப்புகள் & சட்ட எச்சரிக்கைகள்",
    select_ip_category: "IP பாதுகாப்பு வகையைத் தேர்ந்தெடுக்கவும்",
    click_card_consultation: "ஆலோசனைக்கு கார்டைக் கிளிக் செய்யவும்",
    patent_protection: "காப்புரிமை பாதுகாப்பு",
    patent_desc: "கண்டுபிடிப்புகள், இரசாயன & ஆயுர்வேத முறைகள்",
    trademark_brand: "வர்த்தக முத்திரை & பிராண்ட்",
    trademark_desc: "பிராண்ட் பெயர்கள், லோகோக்கள், வகுப்பு 5 மருந்துகள்",
    copyright_content: "பதிப்புரிமை & உள்ளடக்கம்",
    copyright_desc: "கையேடுகள், மென்பொருள் குறியீடு, ஆராய்ச்சி தாள்கள்",
    traditional_knowledge: "பாரம்பரிய அறிவு (TKDL)",
    tk_desc: "மூலிகை சூத்திரங்கள், TKDL முன் அறிவு, பிரிவு 3(p) இணக்கம்",
    start_consultation: "ஆலோசனையைத் தொடங்குங்கள்",
    ask_legal_ayush: "சட்ட & ஆயுஷ் ஆலோசகரிடம் கேட்கவும்",
    ask_legal_desc: "காப்புரிமை செல்லுபடி மற்றும் ஆயுஷ் உரிமம் பற்றி கேளுங்கள்",
    scan_notice_pdf: "அரசு அறிவிப்பு / PDF ஐ ஸ்கேன் செய்யவும்",
    scan_notice_desc: "காப்புரிமை அல்லது வர்த்தக முத்திரை அறிக்கையை பதிவேற்றவும்",
    good_morning: "காலை வணக்கம்",
    good_afternoon: "மதிய வணக்கம்",
    good_evening: "மாலை வணக்கம்",
    wizard_button: '"எனக்கு என்ன IP தேவை?" வழிகாட்டி',
    open_prompt_interface: "இடைமுகத்தைத் திறக்கவும்",
    upload_analyze_pdf: "PDF ஐ பதிவேற்றி பகுப்பாய்வு செய்யுங்கள்",
    sign_out: "வெளியேறு",
    language_label: "மொழி:",
    device_online: "சாதனம் ஆன்லைனில் உள்ளது",
    device_offline: "சாதனம் ஆஃப்லைனில் உள்ளது",
    connected: "இணைக்கப்பட்டது",
    disconnected: "துண்டிக்கப்பட்டது",
    last_synchronized: "கடைசி ஒத்திசைவு நேரம்",
    demo_sensor_mode: "டெமோ சென்சார் பயன்முறை",
    live_telemetry: "நேரடி IoT சென்சார் கண்காணிப்பு",
    configure_limits: "செயல்முறை வரம்புகளை அமை",
    generate_evidence_report: "சான்று அறிக்கையை உருவாக்கு",
    humidity: "ஈரப்பதம்",
    temperature: "வெப்பநிலை",
    sound_activity: "ஒலி / செயல்பாடு",
    device_status: "சாதனத்தின் நிலை",
    normal_status: "சாதாரண இணக்கம்",
    attention_status: "கவனம் தேவை",
    deviation_detected: "செயல்முறை மீறல் கண்டறியப்பட்டது",
    view_evidence: "சான்றைப் பார்",
    acknowledge: "ஏற்றுக்கொள்",
    assess_tkdl_risk: "TKDL & பிரிவு 3(p) காப்புரிமை அபாயத்தை மதிப்பிடுக",
  },
  te: {
    dashboard: "డాష్‌బోర్డ్",
    compliance_passport: "పాటింపు పాస్‌పోర్ట్",
    tkdl_assessor: "సాంప్రదాయ పరిజ్ఞాన ప్రమాద అంచనా",
    ip_regulations: "IP నిబంధనలు",
    deadline_calendar: "గడువు క్యాలెండర్",
    expert_brief: "నిపుణుల నివేదిక",
    investor_match: "పెట్టుబడిదారుల మ్యాచ్‌మేకర్",
    ask_ai_advisor: "AI సలహాదారుని అడగండి",
    select_ip_category: "IP రక్షణ వర్గాన్ని ఎంచుకోండి",
    click_card_consultation: "సలహా కోసం కార్డ్‌పై క్లిక్ చేయండి",
    patent_protection: "పేటెంట్ రక్షణ",
    patent_desc: "ఆవిష్కరణలు, రసాయన మరియు ఆయుర్వేద ప్రక్రియలు",
    trademark_brand: "ట్రేడ్‌మార్క్ & బ్రాండ్",
    trademark_desc: "బ్రాండ్ పేర్లు, లోగోలు, క్లాస్ 5 ఫార్మాస్యూటికల్స్",
    copyright_content: "కాపీరైట్ & కంటెంట్",
    copyright_desc: "మాన్యువల్స్, సాఫ్ట్‌వేర్ కోడ్, పరిశోధన పత్రాలు",
    traditional_knowledge: "సాంప్రదాయ పరిజ్ఞానం (TKDL)",
    tk_desc: "మూలికా ఫార్ములేషన్లు, TKDL పూర్వజ్ఞానం, సెక్షన్ 3(p)",
    start_consultation: "సలహా ప్రారంభించండి",
    ask_legal_ayush: "చట్టపరమైన & ఆయుష్ సలహాదారుని అడగండి",
    ask_legal_desc: "పేటెంట్ ప్రామాణికత మరియు లైసెన్సింగ్ గురించి అడగండి",
    scan_notice_pdf: "ప్రభుత్వ నోటీసు / PDF స్కాన్ చేయండి",
    scan_notice_desc: "పేటెంట్ లేదా ట్రేడ్‌మార్క్ నివేదికను అప్‌లోడ్ చేయండి",
    good_morning: "శుభోదయం",
    good_afternoon: "శుభ మధ్యాహ్నం",
    good_evening: "శుభ సాయంత్రం",
    wizard_button: '"నాకు ఏ IP అవసరం?" విజార్డ్',
    open_prompt_interface: "ఇంటర్‌ఫేస్ తెరవండి",
    upload_analyze_pdf: "PDFని అప్‌లోడ్ చేసి విశ్లేషించండి",
    sign_out: "సైన్ అవుట్",
    language_label: "భాష:",
  },
  mr: {
    dashboard: "डॅशबोर्ड",
    compliance_passport: "अनुपालन पासपोर्ट",
    tkdl_assessor: "पारंपारिक ज्ञान धोका मूल्यांकन",
    ip_regulations: "आयपी नियमावली",
    deadline_calendar: "मुदत कॅलेंडर",
    expert_brief: "तज्ञ अहवाल",
    investor_match: "गुंतवणूकदार मॅचमेकर",
    ask_ai_advisor: "एआय सल्लागाराला विचारा",
    select_ip_category: "आयपी संरक्षण श्रेणी निवडा",
    click_card_consultation: "सल्ला सुरू करण्यासाठी कार्डवर क्लिक करा",
    patent_protection: "पेटंट संरक्षण",
    patent_desc: "शोध, रासायनिक आणि आयुर्वेदिक प्रक्रिया",
    trademark_brand: "ट्रेडमार्क आणि ब्रँड",
    trademark_desc: "ब्रँड नावे, लोगो, वर्ग 5 औषधे",
    copyright_content: "कॉपीराइट आणि सामग्री",
    copyright_desc: "मॅन्युअल, सॉफ्टवेअर कोड, संशोधन पेपर",
    traditional_knowledge: "पारंपारिक ज्ञान (TKDL)",
    tk_desc: "हर्बल फॉर्म्युलेशन्स, TKDL पूर्व-कला, कलम 3(p)",
    start_consultation: "सल्ला सुरू करा",
    ask_legal_ayush: "कायदेशीर आणि आयुष सल्लागाराला विचारा",
    ask_legal_desc: "पेटेंट वैधता आणि परवान्याबद्दल विचारा",
    scan_notice_pdf: "सरकारी नोटीस / PDF स्कॅन करा",
    scan_notice_desc: "ट्रेडमार्क किंवा पेटंट अहवाल अपलोड करा",
    good_morning: "शुभ सकाळ",
    good_afternoon: "शुभ दुपार",
    good_evening: "शुभ संध्याकाळ",
    wizard_button: '"मला कोणत्या IP ची गरज आहे?" विजार्ड',
    open_prompt_interface: "इंटरफेस उघडा",
    upload_analyze_pdf: "PDF अपलोड आणि विश्लेषण करा",
    sign_out: "साइन आउट",
    language_label: "भाषा:",
  },
  bn: {
    dashboard: "ড্যাশবোর্ড",
    compliance_passport: "সম্মতি পাসপোর্ট",
    tkdl_assessor: "ঐতিহ্যগত জ্ঞান ঝুঁকি মূল্যায়ন",
    ip_regulations: "আইপি নিয়মাবলী",
    deadline_calendar: "সময়সীমার ক্যালেন্ডার",
    expert_brief: "বিশেষজ্ঞ রিপোর্ট",
    investor_match: "বিনিয়োগকারী ম্যাচমেকার",
    ask_ai_advisor: "এআই উপদেষ্টাকে জিজ্ঞাসা করুন",
    select_ip_category: "আইপি সুরক্ষা বিভাগ নির্বাচন করুন",
    patent_protection: "পেটেন্ট সুরক্ষা",
    trademark_brand: "ট্রেডমার্ক ও ব্র্যান্ড",
    copyright_content: "কপিরাইট ও বিষয়বস্তু",
    traditional_knowledge: "ঐতিহ্যগত জ্ঞান (TKDL)",
    start_consultation: "পরামর্শ শুরু করুন",
    good_morning: "শুভ সকাল",
    good_afternoon: "শুভ অপরাহ্ন",
    good_evening: "শুভ সন্ধ্যা",
    sign_out: "সাইন আউট",
    language_label: "ভাষা:",
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
