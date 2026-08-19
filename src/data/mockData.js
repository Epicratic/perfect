// Mock Dataset for PerfECT Application Initial State

export const initialAppData = {
  overallScore: 3.8,
  maxScore: 5.0,
  ratingsCount: 1248,
  pillarScores: {
    Economic: 4.2,
    Social: 3.5,
    Environmental: 3.7
  },
  sectorScores: {
    Governance: 4.2,
    SecurityDefense: 4.6,
    HealthHygiene: 3.4,
    InstructionCulture: 3.8,
    FoodFinance: 4.1,
    HousingTourism: 4.5,
    TransportTelco: 3.7
  },
  regionScores: [
    { name: "Dakar", score: 4.2 },
    { name: "ThiÃ¨s", score: 3.9 },
    { name: "KÃ©dougou", score: 3.8 },
    { name: "Ziguinchor", score: 3.7 },
    { name: "Saint-Louis", score: 3.6 },
    { name: "Fatick", score: 3.5 },
    { name: "Kaolack", score: 3.2 },
    { name: "Tambacounda", score: 2.8 }
  ],
  topActors: [
    // --- SÃ‰NÃ‰GAL (SN) ---
    { id: "actor-sn-1", country: "SN", name: "STEO", sector: "HousingTourism", mesoSector: "Design", score: 4.8, rank: 1, badge: "Top Performer", verified: true, reviewsCount: 124, avatarUrl: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=80", description: "SociÃ©tÃ© de Travaux et d'Ã‰quipements d'Ouvrages. SpÃ©cialiste BTP et Infrastructures." },
    { id: "actor-sn-2", country: "SN", name: "AGETIP", sector: "HealthHygiene", mesoSector: "Roads", score: 4.6, rank: 2, badge: "Infrastructures", verified: true, reviewsCount: 98, avatarUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=150&auto=format&fit=crop&q=80", description: "Agence d'ExÃ©cution des Travaux dâ€™IntÃ©rÃªt Public." },
    { id: "actor-sn-3", country: "SN", name: "SONATEL", sector: "TransportTelco", mesoSector: "Telecommunications", score: 4.5, rank: 3, badge: "TÃ©lÃ©coms", verified: true, reviewsCount: 210, avatarUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80", description: "OpÃ©rateur historique de tÃ©lÃ©communications." },
    { id: "actor-sn-4", country: "SN", name: "M. Sarr (Finance)", sector: "FoodFinance", mesoSector: "Microfinance", score: 4.4, rank: 4, badge: "Services Financiers", verified: true, reviewsCount: 142, avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", description: "Cabinet d'Accompagnement Financier." },
    { id: "actor-sn-5", country: "SN", name: "HÃ´pital Principal", sector: "HealthHygiene", mesoSector: "HÃ´pitaux", score: 4.3, rank: 5, badge: "SantÃ© Publique", verified: true, reviewsCount: 189, avatarUrl: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=150&auto=format&fit=crop&q=80", description: "Ã‰tablissement hospitalier de rÃ©fÃ©rence Ã  Dakar." },
    { id: "actor-sn-6", country: "SN", name: "SENELEC", sector: "TransportTelco", mesoSector: "Ã‰nergie", score: 4.1, rank: 6, badge: "Ã‰nergie", verified: true, reviewsCount: 85, avatarUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=150&auto=format&fit=crop&q=80", description: "SociÃ©tÃ© Nationale d'Ã‰lectricitÃ© du SÃ©nÃ©gal." },
    { id: "actor-sn-7", country: "SN", name: "Mairie de Dakar", sector: "Governance", mesoSector: "Administration", score: 4.0, rank: 7, badge: "Gouvernance", verified: true, reviewsCount: 165, avatarUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=150&auto=format&fit=crop&q=80", description: "Administration Municipale de Dakar." },
    { id: "actor-sn-8", country: "SN", name: "Port Autonome de Dakar", sector: "TransportTelco", mesoSector: "Logistique", score: 3.9, rank: 8, badge: "Maritime", verified: true, reviewsCount: 77, avatarUrl: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=150&auto=format&fit=crop&q=80", description: "Plateforme portuaire stratÃ©gique." },
    { id: "actor-sn-9", country: "SN", name: "CSE BTP", sector: "HousingTourism", mesoSector: "Construction", score: 3.8, rank: 9, badge: "BTP", verified: true, reviewsCount: 64, avatarUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=150&auto=format&fit=crop&q=80", description: "Compagnie Sahelienne d'Entreprises." },
    { id: "actor-sn-10", country: "SN", name: "SDE Eau", sector: "HealthHygiene", mesoSector: "Hydraulique", score: 3.7, rank: 10, badge: "Hydraulique", verified: true, reviewsCount: 92, avatarUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80", description: "Distribution d'eau potable au SÃ©nÃ©gal." },

    // --- TUNISIE (TN) ---
    { id: "actor-tn-1", country: "TN", name: "Poulina Group Holding", sector: "FoodFinance", mesoSector: "Agroalimentaire", score: 4.7, rank: 1, badge: "Leader Industrie", verified: true, reviewsCount: 310, avatarUrl: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=80", description: "Premier groupe privÃ© industriel et agroalimentaire en Tunisie." },
    { id: "actor-tn-2", country: "TN", name: "STEG", sector: "TransportTelco", mesoSector: "Ã‰nergie", score: 4.4, rank: 2, badge: "Ã‰nergie & Gaz", verified: true, reviewsCount: 245, avatarUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=150&auto=format&fit=crop&q=80", description: "SociÃ©tÃ© Tunisienne de l'Ã‰lectricitÃ© et du Gaz." },
    { id: "actor-tn-3", country: "TN", name: "Tunisie TÃ©lÃ©com", sector: "TransportTelco", mesoSector: "TÃ©lÃ©communications", score: 4.3, rank: 3, badge: "TÃ©lÃ©coms", verified: true, reviewsCount: 198, avatarUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80", description: "OpÃ©rateur national de tÃ©lÃ©communications en Tunisie." },
    { id: "actor-tn-4", country: "TN", name: "BIAT", sector: "FoodFinance", mesoSector: "Services Financiers", score: 4.6, rank: 4, badge: "Banque", verified: true, reviewsCount: 280, avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", description: "Banque Internationale Arabe de Tunisie." },
    { id: "actor-tn-5", country: "TN", name: "Groupe Telnet", sector: "TransportTelco", mesoSector: "Technologies", score: 4.5, rank: 5, badge: "High-Tech & Spatial", verified: true, reviewsCount: 150, avatarUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80", description: "SociÃ©tÃ© d'ingÃ©nierie et de conseil en technologies." },
    { id: "actor-tn-6", country: "TN", name: "HÃ´pital Charles Nicolle", sector: "HealthHygiene", mesoSector: "SantÃ©", score: 4.2, rank: 6, badge: "SantÃ© Publique", verified: true, reviewsCount: 175, avatarUrl: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=150&auto=format&fit=crop&q=80", description: "Centre hospitalier universitaire de rÃ©fÃ©rence Ã  Tunis." },
    { id: "actor-tn-7", country: "TN", name: "Groupe DÃ©lice", sector: "FoodFinance", mesoSector: "Agroalimentaire", score: 4.4, rank: 7, badge: "Agroalimentaire", verified: true, reviewsCount: 220, avatarUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=150&auto=format&fit=crop&q=80", description: "Leader tunisien des produits laitiers et boissons." },
    { id: "actor-tn-8", country: "TN", name: "SFBT", sector: "FoodFinance", mesoSector: "Agroalimentaire", score: 4.1, rank: 8, badge: "Industrie", verified: true, reviewsCount: 130, avatarUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=150&auto=format&fit=crop&q=80", description: "SociÃ©tÃ© Frigorifique et Brasserie de Tunis." },

    // --- FRANCE (FR) ---
    { id: "actor-fr-1", country: "FR", name: "EDF", sector: "TransportTelco", mesoSector: "Ã‰nergie", score: 4.5, rank: 1, badge: "Ã‰nergie", verified: true, reviewsCount: 520, avatarUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=150&auto=format&fit=crop&q=80", description: "Ã‰lectricitÃ© de France." },
    { id: "actor-fr-2", country: "FR", name: "Orange France", sector: "TransportTelco", mesoSector: "TÃ©lÃ©communications", score: 4.4, rank: 2, badge: "TÃ©lÃ©coms", verified: true, reviewsCount: 480, avatarUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80", description: "OpÃ©rateur rÃ©seau et services numÃ©riques." },
    { id: "actor-fr-3", country: "FR", name: "BNP Paribas", sector: "FoodFinance", mesoSector: "Banque", score: 4.3, rank: 3, badge: "Services Financiers", verified: true, reviewsCount: 410, avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", description: "Groupe bancaire europÃ©en majeur." },

    // --- CÃ”TE D'IVOIRE (CI) ---
    { id: "actor-ci-1", country: "CI", name: "CIE", sector: "TransportTelco", mesoSector: "Ã‰nergie", score: 4.4, rank: 1, badge: "Ã‰nergie", verified: true, reviewsCount: 210, avatarUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=150&auto=format&fit=crop&q=80", description: "Compagnie Ivoirienne d'Ã‰lectricitÃ©." },
    { id: "actor-ci-2", country: "CI", name: "SODECI", sector: "HealthHygiene", mesoSector: "Hydraulique", score: 4.3, rank: 2, badge: "Eau Potable", verified: true, reviewsCount: 180, avatarUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80", description: "SociÃ©tÃ© des Eaux de CÃ´te d'Ivoire." },
    { id: "actor-ci-3", country: "CI", name: "Orange CI", sector: "TransportTelco", mesoSector: "TÃ©lÃ©communications", score: 4.5, rank: 3, badge: "TÃ©lÃ©coms", verified: true, reviewsCount: 290, avatarUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80", description: "OpÃ©rateur leader en CÃ´te d'Ivoire." },

    // --- MAROC (MA) ---
    { id: "actor-ma-1", country: "MA", name: "OCP Group", sector: "FoodFinance", mesoSector: "Industrie", score: 4.8, rank: 1, badge: "Leader Mondial", verified: true, reviewsCount: 610, avatarUrl: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=80", description: "Office ChÃ©rifien des Phosphates." },
    { id: "actor-ma-2", country: "MA", name: "Attijariwafa Bank", sector: "FoodFinance", mesoSector: "Banque", score: 4.6, rank: 2, badge: "Banque", verified: true, reviewsCount: 390, avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", description: "Premier groupe bancaire et financier au Maroc." },
    { id: "actor-ma-3", country: "MA", name: "Maroc Telecom", sector: "TransportTelco", mesoSector: "TÃ©lÃ©communications", score: 4.4, rank: 3, badge: "TÃ©lÃ©coms", verified: true, reviewsCount: 340, avatarUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80", description: "Itissalat Al-Maghrib." }
  ],
  recentEvaluations: [],
  evaluations: [],
  userProfile: {
    name: "Jean-Luc Moreau",
    role: "Ã‰valuateur Expert CertifiÃ©",
    email: "jeanluc.moreau@perfect-tech.io",
    phone: "+33 6 12 34 56 78",
    address: "12 Rue de Rivoli, 75004 Paris",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    stats: { evaluationsCompleted: 24, nationalRank: 12, avgScoreGiven: 4.8 }
  },
  adminStats: {
    totalUsers: 0,
    activeReports: 0,
    pendingEvals: 0,
    avgResponseTime: "12m 45s",
    financial: { totalRevenue: 450200, mrr: 12500, targetProgress: 85 },
    contributors: []
  }
};