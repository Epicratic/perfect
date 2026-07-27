// Domain Data Hierarchy from SLURP_v2 with Exact Sub-Sectors Specified by User

export const sectorData = {
  pillars: [
    { id: "Economic", key: "pillarEconomic" },
    { id: "Social", key: "pillarSocial" },
    { id: "Environmental", key: "pillarEnvironmental" }
  ],

  indicatorCategories: {
    Social: ["Facility", "Staff", "Programs"],
    Economic: ["InvestmentAmount", "JobsCreated", "ValueAdded"],
    Environmental: ["PollutionEmission", "ResourceConsumption", "Resilience"]
  },

  indicatorTypes: {
    // Social
    Facility: ["Accessibility", "Cleanliness", "Comfort"],
    Staff: ["Availability", "Friendliness", "Expertise"],
    Programs: ["Effectiveness", "Inclusivity", "Innovation"],
    
    // Economic
    InvestmentAmount: ["Domestic", "Foreign"],
    JobsCreated: ["Specialist", "Technician"],
    ValueAdded: ["Gross", "Net"],
    
    // Environmental
    PollutionEmission: ["Waste", "GHG"],
    ResourceConsumption: ["Water", "Energy"],
    Resilience: ["Floods", "Earthquakes"]
  },

  macroSectors: [
    "Governance",
    "SecurityDefense",
    "HealthHygiene",
    "InstructionCulture",
    "FoodFinance",
    "HousingTourism",
    "TransportTelco"
  ],

  mesoSectors: {
    Governance: [
      { id: "Parlement", names: { fr: "Parlement", en: "Parliament", ar: "البرلمان" } },
      { id: "Gouvernement", names: { fr: "Gouvernement", en: "Government", ar: "الحكومة" } },
      { id: "Justice", names: { fr: "Justice", en: "Justice", ar: "العدالة" } }
    ],
    SecurityDefense: [
      { id: "Police", names: { fr: "Police", en: "Police", ar: "الشرطة" } },
      { id: "Gendarmerie", names: { fr: "Gendarmerie", en: "Gendarmerie", ar: "الدرك" } },
      { id: "Pompiers", names: { fr: "Pompiers", en: "Firefighters", ar: "إطفائيون" } },
      { id: "ArmeeTerre", names: { fr: "Armée de Terre", en: "Army", ar: "الجيش البري" } },
      { id: "MarineNationale", names: { fr: "Marine Nationale", en: "Navy", ar: "البحرية الوطنية" } },
      { id: "ArmeeAir", names: { fr: "Armée de l'Air", en: "Air Force", ar: "القوات الجوية" } }
    ],
    HealthHygiene: [
      { id: "Medecine", names: { fr: "Médecine", en: "Medicine", ar: "الطب" } },
      { id: "Pharmacie", names: { fr: "Pharmacie", en: "Pharmacy", ar: "الصيدلة" } },
      { id: "Biologie", names: { fr: "Biologie", en: "Biology", ar: "علم الأحياء" } },
      { id: "GestionDechets", names: { fr: "Gestion des déchets", en: "Waste management", ar: "إدارة النفايات" } },
      { id: "Assainissement", names: { fr: "Assainissement", en: "Sanitation", ar: "التطهير والصرف الصحي" } },
      { id: "ProtectionEnvironnement", names: { fr: "Protection de l'environnement", en: "Environmental protection", ar: "حماية البيئة" } }
    ],
    InstructionCulture: [
      { id: "Education", names: { fr: "Education", en: "Education", ar: "التعليم" } },
      { id: "EnseignementSuperieur", names: { fr: "Enseignement supérieur", en: "Higher education", ar: "التعليم العالي" } },
      { id: "FormationProfessionnelle", names: { fr: "Formation professionnelle", en: "Vocational training", ar: "التدريب المهني" } },
      { id: "Arts", names: { fr: "Arts", en: "Arts", ar: "الفنون" } },
      { id: "Sports", names: { fr: "Sports", en: "Sports", ar: "الرياضة" } },
      { id: "Cultes", names: { fr: "Cultes", en: "Worship", ar: "الشؤون الدينية" } }
    ],
    FoodFinance: [
      { id: "Agriculture", names: { fr: "Agriculture", en: "Agriculture", ar: "الزراعة" } },
      { id: "Industrie", names: { fr: "Industrie", en: "Industry", ar: "الصناعة" } },
      { id: "Commerce", names: { fr: "Commerce", en: "Commerce", ar: "التجارة" } },
      { id: "Banque", names: { fr: "Banque", en: "Banking", ar: "البنوك" } },
      { id: "Bourse", names: { fr: "Bourse", en: "Stock market", ar: "البورصة" } },
      { id: "Assurance", names: { fr: "Assurance", en: "Insurance", ar: "التأمين" } }
    ],
    HousingTourism: [
      { id: "Amenagement", names: { fr: "Aménagement", en: "Urban planning", ar: "التهيئة والتخطيط" } },
      { id: "Equipement", names: { fr: "Equipement", en: "Equipment", ar: "التجهيز" } },
      { id: "Immobilier", names: { fr: "Immobilier", en: "Real estate", ar: "العقارات" } },
      { id: "Hotels", names: { fr: "Hôtels", en: "Hotels", ar: "الفنادق" } },
      { id: "Auberges", names: { fr: "Auberges", en: "Hostels", ar: "النزل" } },
      { id: "Campings", names: { fr: "Campings", en: "Campsites", ar: "المخيمات" } }
    ],
    TransportTelco: [
      { id: "Route", names: { fr: "Route (bus et taxis)", en: "Road (buses and taxis)", ar: "الطرقات (حافلات وسيارة أجهزة)" } },
      { id: "CheminDeFer", names: { fr: "Chemin de fer (trains et tramways)", en: "Railways (trains and trams)", ar: "السكك الحديدية (قطارات وترامواي)" } },
      { id: "Maritime", names: { fr: "Maritime", en: "Maritime", ar: "النقل البحري" } },
      { id: "Aerien", names: { fr: "Aérien", en: "Air transport", ar: "النقل الجوي" } },
      { id: "ServicePostal", names: { fr: "Service postal", en: "Postal service", ar: "الخدمات البريدية" } },
      { id: "Telephonie", names: { fr: "Téléphonie", en: "Telephony", ar: "الهاتف" } },
      { id: "Internet", names: { fr: "Internet", en: "Internet", ar: "الإنترنت" } }
    ]
  }
};
