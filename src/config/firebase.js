// Firebase SDK Integration for Project: perfect-net

export const firebaseConfig = {
  apiKey: "AIzaSyAWVAGYhQtNDoBL-YQ7RF9IOet8vtigav0",
  authDomain: "perfect-net.firebaseapp.com",
  projectId: "perfect-net",
  storageBucket: "perfect-net.firebasestorage.app",
  messagingSenderId: "213183884101",
  appId: "1:213183884101:android:076fbb26525dd4c9a72c2c"
};

class StorageEngine {
  constructor() {
    this.storageKey = "PERFECT_NET_DATABASE_V1";
  }

  loadState(initialData) {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...initialData,
          ...parsed,
          recentEvaluations: (parsed.recentEvaluations && parsed.recentEvaluations.length > 0) ? parsed.recentEvaluations : initialData.recentEvaluations,
          topActors: (parsed.topActors && parsed.topActors.length > 0) ? parsed.topActors : initialData.topActors
        };
      }
    } catch (e) {
      console.warn("Could not access localStorage, using initial state.", e);
    }
    this.saveState(initialData);
    return initialData;
  }

  saveState(state) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  }

  addEvaluation(state, newEval) {
    const updatedEvaluations = [newEval, ...state.evaluations];
    
    // Recalculate average scores
    let totalScore = 0;
    let econSum = 0, econCount = 0;
    let socialSum = 0, socialCount = 0;
    let envSum = 0, envCount = 0;

    updatedEvaluations.forEach(ev => {
      totalScore += ev.rating;
      if (ev.pillar === "Economic") { econSum += ev.rating; econCount++; }
      if (ev.pillar === "Social") { socialSum += ev.rating; socialCount++; }
      if (ev.pillar === "Environmental") { envSum += ev.rating; envCount++; }
    });

    const newOverall = parseFloat((totalScore / updatedEvaluations.length).toFixed(1));
    const newPillars = {
      Economic: econCount ? parseFloat((econSum / econCount).toFixed(1)) : state.pillarScores.Economic,
      Social: socialCount ? parseFloat((socialSum / socialCount).toFixed(1)) : state.pillarScores.Social,
      Environmental: envCount ? parseFloat((envSum / envCount).toFixed(1)) : state.pillarScores.Environmental
    };

    const newState = {
      ...state,
      overallScore: newOverall,
      pillarScores: newPillars,
      evaluations: updatedEvaluations
    };

    this.saveState(newState);
    return newState;
  }
}

export const dbStorage = new StorageEngine();
