// Mock Dataset for PerfECT Application Initial State
// All actor/evaluation data is loaded exclusively from Cloud Firestore.
// This file only provides structural defaults and empty arrays.

export const initialAppData = {
  overallScore: 0,
  maxScore: 5.0,
  ratingsCount: 0,
  pillarScores: {
    Economic: 0,
    Social: 0,
    Environmental: 0
  },
  sectorScores: {
    Governance: 0,
    SecurityDefense: 0,
    HealthHygiene: 0,
    InstructionCulture: 0,
    FoodFinance: 0,
    HousingTourism: 0,
    TransportTelco: 0
  },
  regionScores: [],
  topActors: [],
  recentEvaluations: [],
  evaluations: [],
  userProfile: {
    name: "",
    role: "",
    email: "",
    phone: "",
    address: "",
    avatarUrl: null,
    stats: { evaluationsCompleted: 0, nationalRank: 0, avgScoreGiven: 0 }
  },
  adminStats: {
    totalUsers: 0,
    activeReports: 0,
    pendingEvals: 0,
    avgResponseTime: "—",
    financial: { totalRevenue: 0, mrr: 0, targetProgress: 0 },
    contributors: []
  }
};
