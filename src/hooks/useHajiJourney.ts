'use client';

import { useState, useEffect, useCallback } from 'react';
import { HajiJourney, PhaseId, CategoryId, CategoryData } from '@/lib/types';
import { 
  loadDataFromStorage, 
  saveDataToStorage, 
  calculateTotalEmission,
  calculatePhaseEmission 
} from '@/lib/utils';

export function useHajiJourney() {
  const [journey, setJourney] = useState<HajiJourney | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const data = loadDataFromStorage();
    setJourney(data);
    setIsLoading(false);
  }, []);

  const updateJourney = useCallback((newJourney: HajiJourney) => {
    setJourney(newJourney);
    saveDataToStorage(newJourney);
  }, []);

  const updateCategory = useCallback((
    phaseId: PhaseId,
    categoryId: CategoryId,
    data: CategoryData
  ) => {
    if (!journey) return;

    const newJourney = { ...journey };
    if (newJourney.phases[phaseId]) {
      newJourney.phases[phaseId]!.categories[categoryId] = data;
    }

    updateJourney(newJourney);
  }, [journey, updateJourney]);

  const markPhaseComplete = useCallback((phaseId: PhaseId) => {
    if (!journey) return;

    const newJourney = { ...journey };
    if (newJourney.phases[phaseId]) {
      newJourney.phases[phaseId]!.completed = true;
    }

    updateJourney(newJourney);
  }, [journey, updateJourney]);

  const resetAllData = useCallback(() => {
    const { initializePhases } = require('@/lib/utils');
    const newJourney = initializePhases();
    updateJourney(newJourney);
  }, [updateJourney]);

  const totalEmission = journey ? calculateTotalEmission(journey) : 0;

  return {
    journey,
    isLoading,
    totalEmission,
    updateJourney,
    updateCategory,
    markPhaseComplete,
    resetAllData
  };
}
