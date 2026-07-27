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
    { name: "Thiès", score: 3.9 },
    { name: "Kédougou", score: 3.8 },
    { name: "Ziguinchor", score: 3.7 },
    { name: "Saint-Louis", score: 3.6 },
    { name: "Fatick", score: 3.5 },
    { name: "Kaolack", score: 3.2 },
    { name: "Tambacounda", score: 2.8 }
  ],
  topActors: [
    {
      id: "actor-1",
      name: "STEO",
      sector: "HousingTourism",
      mesoSector: "Design",
      score: 4.8,
      rank: 1,
      badge: "Top Performer",
      verified: true,
      reviewsCount: 124,
      avatarUrl: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=80",
      description: "Société de Travaux et d'Équipements d'Ouvrages. Spécialiste BTP et Infrastructures durable en Afrique de l'Ouest."
    },
    {
      id: "actor-2",
      name: "AGETIP",
      sector: "HealthHygiene",
      mesoSector: "Roads",
      score: 4.6,
      rank: 2,
      badge: "Infrastructures",
      verified: true,
      reviewsCount: 98,
      avatarUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=150&auto=format&fit=crop&q=80",
      description: "Agence d'Exécution des Travaux d’Intérêt Public contre le sous-emploi."
    },
    {
      id: "actor-3",
      name: "SONATEL",
      sector: "TransportTelco",
      mesoSector: "Telecommunications",
      score: 4.5,
      rank: 3,
      badge: "Télécoms",
      verified: true,
      reviewsCount: 210,
      avatarUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80",
      description: "Opérateur historique de télécommunications et services numériques."
    },
    {
      id: "actor-4",
      name: "M. Sarr (Finance)",
      sector: "FoodFinance",
      mesoSector: "Microfinance",
      score: 4.4,
      rank: 4,
      badge: "Services Financiers",
      verified: true,
      reviewsCount: 142,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      description: "Cabinet d'Accompagnement Financier et d'Inclusion Bancaire."
    },
    {
      id: "actor-5",
      name: "Hôpital Principal",
      sector: "HealthHygiene",
      mesoSector: "Hôpitaux",
      score: 4.3,
      rank: 5,
      badge: "Santé Publique",
      verified: true,
      reviewsCount: 189,
      avatarUrl: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=150&auto=format&fit=crop&q=80",
      description: "Établissement hospitalier de référence nationale à Dakar."
    },
    {
      id: "actor-6",
      name: "SENELEC",
      sector: "TransportTelco",
      mesoSector: "Énergie",
      score: 4.1,
      rank: 6,
      badge: "Énergie",
      verified: true,
      reviewsCount: 85,
      avatarUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=150&auto=format&fit=crop&q=80",
      description: "Société Nationale d'Électricité du Sénégal."
    },
    {
      id: "actor-7",
      name: "Mairie de Dakar",
      sector: "Governance",
      mesoSector: "Administration",
      score: 4.0,
      rank: 7,
      badge: "Gouvernance",
      verified: true,
      reviewsCount: 165,
      avatarUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=150&auto=format&fit=crop&q=80",
      description: "Administration Municipale et Services aux Citoyens."
    },
    {
      id: "actor-8",
      name: "Port Autonome de Dakar",
      sector: "TransportTelco",
      mesoSector: "Logistique",
      score: 3.9,
      rank: 8,
      badge: "Maritime",
      verified: true,
      reviewsCount: 77,
      avatarUrl: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=150&auto=format&fit=crop&q=80",
      description: "Plateforme portuaire stratégique en Afrique de l'Ouest."
    },
    {
      id: "actor-9",
      name: "CSE BTP",
      sector: "HousingTourism",
      mesoSector: "Construction",
      score: 3.8,
      rank: 9,
      badge: "BTP",
      verified: true,
      reviewsCount: 64,
      avatarUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=150&auto=format&fit=crop&q=80",
      description: "Compagnie Sahelienne d'Entreprises de Bâtiments."
    },
    {
      id: "actor-10",
      name: "SDE Eau",
      sector: "HealthHygiene",
      mesoSector: "Hydraulique",
      score: 3.7,
      rank: 10,
      badge: "Hydraulique",
      verified: true,
      reviewsCount: 92,
      avatarUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80",
      description: "Sénégalaise des Eaux et Distribution d'Eau Potable."
    }
  ],
  recentEvaluations: [
    {
      id: "rev-1",
      authorName: "Jean Dupont",
      authorInitials: "JD",
      authorAvatarBg: "#002B49",
      authorAvatarColor: "#FFFFFF",
      targetEntity: "M. Sarr (Finance)",
      sectorName: "Finance",
      rating: 4.0,
      comment: "Excellent accueil au guichet, les procédures sont devenues beaucoup plus claires et rapides.",
      location: "Dakar, Plateaux",
      timeAgo: "Il y a 2h"
    },
    {
      id: "rev-2",
      authorName: "Awa Ndiaye",
      authorInitials: "AN",
      authorAvatarBg: "#28C76F",
      authorAvatarColor: "#FFFFFF",
      targetEntity: "Hôpital Principal",
      sectorName: "Santé",
      rating: 3.0,
      comment: "Le personnel soignant est très dévoué, mais l'attente aux urgences reste un défi majeur.",
      location: "Dakar, Médina",
      timeAgo: "Il y a 4h"
    },
    {
      id: "rev-3",
      authorName: "Moussa Kane",
      authorInitials: "MK",
      authorAvatarBg: "#94A3B8",
      authorAvatarColor: "#1E293B",
      targetEntity: "Mairie",
      sectorName: "Gouvernance",
      rating: 5.0,
      comment: "Digitalisation des actes de naissance très réussie. Gain de temps incroyable !",
      location: "Dakar, Grand Yoff",
      timeAgo: "Il y a 5h"
    },
    {
      id: "rev-4",
      authorName: "Fatou Sow",
      authorInitials: "FS",
      authorAvatarBg: "#FF9F43",
      authorAvatarColor: "#FFFFFF",
      targetEntity: "STEO",
      sectorName: "Logement",
      rating: 5.0,
      comment: "Qualité exceptionnelle des matériaux et respect scrupuleux des délais de livraison.",
      location: "Thiès, Centre",
      timeAgo: "Il y a 7h"
    },
    {
      id: "rev-5",
      authorName: "Oumar Faye",
      authorInitials: "OF",
      authorAvatarBg: "#00A8FF",
      authorAvatarColor: "#FFFFFF",
      targetEntity: "SONATEL",
      sectorName: "Télécoms",
      rating: 4.0,
      comment: "Couverture 5G fluide et débit très rapide sur l'axe Dakar-Mbour.",
      location: "Rufisque",
      timeAgo: "Il y a 10h"
    }
  ],
  evaluations: [
    {
      id: "eval-101",
      country: "SN",
      region: "dakar",
      actorName: "STEO",
      macroSector: "HousingTourism",
      mesoSector: "Design",
      pillar: "Economic",
      category: "InvestmentAmount",
      type: "Foreign",
      rating: 4.8,
      currentValue: 125000,
      potentialValue: 150000,
      comment: "Excellente exécution des travaux d'infrastructure à Dakar Plateau. Normes environnementales et créations d'emplois locaux respectées.",
      author: "Jean-Luc Moreau",
      date: "2026-07-25",
      status: "Verified"
    }
  ],
  userProfile: {
    name: "Jean-Luc Moreau",
    role: "Évaluateur Expert Certifié",
    email: "jeanluc.moreau@perfect-tech.io",
    phone: "+33 6 12 34 56 78",
    address: "12 Rue de Rivoli, 75004 Paris",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    stats: {
      evaluationsCompleted: 24,
      nationalRank: 12,
      avgScoreGiven: 4.8
    }
  },
  adminStats: {
    totalUsers: 12450,
    activeReports: 850,
    pendingEvals: 42,
    avgResponseTime: "12m 45s",
    financial: {
      totalRevenue: 450200,
      mrr: 12500,
      targetProgress: 85
    },
    contributors: [
      { id: "u-1", name: "Jean-Luc Moreau", role: "Évaluateur Senior", status: "Active" },
      { id: "u-2", name: "Fatou Sow", role: "Auditeur Qualité", status: "Active" },
      { id: "u-3", name: "STEO Rep", role: "Entreprise", status: "Active" },
      { id: "u-4", name: "Marc Laurent", role: "Analyste", status: "Inactive" }
    ]
  }
};
