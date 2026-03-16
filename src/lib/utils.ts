import { 
  HajiJourney, 
  PhaseId, 
  CategoryId,
  PhaseData 
} from './types';
import { 
  STORAGE_KEY, 
  PHASE_DEFINITIONS,
  TARGET_EMISSION,
  AVG_EMISSION 
} from './constants';

// Migration helper: convert old phase IDs to new ones
export function migratePhaseIds(journey: HajiJourney): HajiJourney {
  const oldToNewMap: Record<string, PhaseId> = {
    'penerbangan-pergi': 'keberangkatan',
    'pulang': 'kepulangan'
  };

  const migratedPhases: { [key in PhaseId]?: PhaseData } = {};
  
  Object.entries(journey.phases).forEach(([key, value]) => {
    const newKey = oldToNewMap[key] || key;
    migratedPhases[newKey as PhaseId] = value;
  });

  return {
    ...journey,
    phases: migratedPhases
  };
}

// Storage Functions
export function loadDataFromStorage(): HajiJourney {
  if (typeof window === 'undefined') {
    return initializePhases();
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      let data = JSON.parse(stored) as HajiJourney;
      
      // Migrate old phase IDs to new ones
      data = migratePhaseIds(data);
      
      // Ensure all phases exist (for backward compatibility when new phases are added)
      PHASE_DEFINITIONS.forEach(phase => {
        if (!data.phases[phase.id as PhaseId]) {
          const phaseData: PhaseData = {
            completed: false,
            categories: {}
          };

          phase.categories.forEach(cat => {
            phaseData.categories[cat as CategoryId] = {
              completed: false,
              emission: 0,
              totalEmission: 0,
              activities: [],
              details: {}
            };
          });

          data.phases[phase.id as PhaseId] = phaseData;
        }
      });
      
      // Save updated data back to localStorage
      saveDataToStorage(data);
      
      return data;
    } else {
      return initializePhases();
    }
  } catch {
    return initializePhases();
  }
}

export function saveDataToStorage(data: HajiJourney): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

export function initializePhases(): HajiJourney {
  const journey: HajiJourney = {
    currentPhase: 0,
    phases: {}
  };

  PHASE_DEFINITIONS.forEach(phase => {
    const phaseData: PhaseData = {
      completed: false,
      categories: {}
    };

    phase.categories.forEach(cat => {
      phaseData.categories[cat as CategoryId] = {
        completed: false,
        emission: 0,
        totalEmission: 0,
        activities: [],
        details: {}
      };
    });

    journey.phases[phase.id as PhaseId] = phaseData;
  });

  return journey;
}

// Calculation Functions
export function calculateTotalEmission(journey: HajiJourney): number {
  if (!journey || !journey.phases) {
    return 0;
  }
  let total = 0;
  Object.values(journey.phases).forEach(phase => {
    if (phase?.categories) {
      Object.values(phase.categories).forEach(cat => {
        // Prefer totalEmission (new activities system), fallback to emission (legacy)
        total += (cat?.totalEmission ?? cat?.emission) || 0;
      });
    }
  });
  return Math.round(total);
}

export function calculatePhaseEmission(journey: HajiJourney, phaseId: PhaseId): number {
  if (!journey || !journey.phases) return 0;
  const phase = journey.phases[phaseId];
  if (!phase || !phase.categories) return 0;
  
  let total = 0;
  Object.values(phase.categories).forEach(cat => {
    // Prefer totalEmission (new activities system), fallback to emission (legacy)
    total += (cat?.totalEmission ?? cat?.emission) || 0;
  });
  return Math.round(total);
}

export function getCompletedPhasesCount(journey: HajiJourney): number {
  if (!journey || !journey.phases) return 0;
  return PHASE_DEFINITIONS.filter(p => 
    journey.phases[p.id as PhaseId]?.completed
  ).length;
}

export function getProgressPercent(journey: HajiJourney): number {
  const total = calculateTotalEmission(journey);
  return Math.min((total / TARGET_EMISSION) * 100, 100);
}

export function getCompletedCategoriesCount(journey: HajiJourney, phaseId: PhaseId): number {
  if (!journey || !journey.phases) return 0;
  const phase = PHASE_DEFINITIONS.find(p => p.id === phaseId);
  if (!phase) return 0;
  
  const phaseData = journey.phases[phaseId];
  if (!phaseData) return 0;
  
  return phase.categories.filter(cat => 
    phaseData.categories[cat as CategoryId]?.completed
  ).length;
}

export function getTopEmissions(journey: HajiJourney, limit: number = 3) {
  return PHASE_DEFINITIONS
    .map(phase => ({
      name: phase.name,
      icon: phase.icon,
      emission: calculatePhaseEmission(journey, phase.id as PhaseId)
    }))
    .filter(p => p.emission > 0)
    .sort((a, b) => b.emission - a.emission)
    .slice(0, limit);
}

export function getCategoryEmissions(journey: HajiJourney) {
  const categoryEmissions: { [key: string]: number } = {};
  
  PHASE_DEFINITIONS.forEach(phase => {
    const phaseData = journey.phases[phase.id as PhaseId];
    if (!phaseData || !phaseData.categories) return;
    
    phase.categories.forEach(catId => {
      const catData = phaseData.categories[catId as CategoryId];
      if (!catData) return;
      
      if (!categoryEmissions[catId]) {
        categoryEmissions[catId] = 0;
      }
      categoryEmissions[catId] += catData.emission || 0;
    });
  });

  return Object.entries(categoryEmissions)
    .filter(([, emission]) => emission > 0)
    .sort((a, b) => b[1] - a[1]);
}

export function getEmissionComparison(journey: HajiJourney) {
  const total = calculateTotalEmission(journey);
  const difference = total - AVG_EMISSION;
  
  return {
    yourEmission: total,
    avgEmission: AVG_EMISSION,
    difference,
    isAboveAverage: difference > 0
  };
}

// Format Functions
export function formatEmission(emission: number, unit: 'kg' | 'ton' = 'kg'): string {
  if (unit === 'ton') {
    return (emission / 1000).toFixed(2);
  }
  return emission.toFixed(2);
}

export function formatCurrency(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

// Time Functions
export function getGreeting(): string {
  const hours = new Date().getHours();
  
  if (hours >= 5 && hours < 11) {
    return 'Selamat pagi';
  } else if (hours >= 11 && hours < 15) {
    return 'Selamat siang';
  } else if (hours >= 15 && hours < 18) {
    return 'Selamat sore';
  }
  return 'Selamat malam';
}

export function getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Generate Transaction ID
export function generateTransactionId(): string {
  const randomNum = Math.floor(Math.random() * 900000) + 100000;
  return `BPKH-GH-2026-${randomNum}`;
}
