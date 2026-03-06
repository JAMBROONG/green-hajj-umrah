'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { HajiJourney, PhaseId, CategoryId, CategoryData } from '@/lib/types';
import { 
  loadDataFromStorage, 
  saveDataToStorage, 
  calculateTotalEmission,
  calculatePhaseEmission 
} from '@/lib/utils';

export function useHajiJourney() {
  const { data: session, status } = useSession();
  const [journey, setJourney] = useState<HajiJourney | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from API or localStorage
  useEffect(() => {
    const loadData = async () => {
      if (status === 'loading') return;

      if (session) {
        // User logged in - fetch from API
        try {
          const response = await fetch('/api/journey');
          if (response.ok) {
            const data = await response.json();
            setJourney(data.journey);
          } else {
            // API error, fallback to localStorage
            const localData = loadDataFromStorage();
            setJourney(localData);
          }
        } catch (error) {
          console.error('Failed to load journey from API:', error);
          // Fallback to localStorage
          const localData = loadDataFromStorage();
          setJourney(localData);
        }
      } else {
        // Not logged in - use localStorage
        const localData = loadDataFromStorage();
        setJourney(localData);
      }
      
      setIsLoading(false);
    };

    loadData();
  }, [session, status]);

  const updateJourney = useCallback(async (newJourney: HajiJourney) => {
    setJourney(newJourney);
    
    if (session) {
      // Save to API
      try {
        await fetch('/api/journey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            journey: newJourney,
            totalEmission: calculateTotalEmission(newJourney)
          })
        });
      } catch (error) {
        console.error('Failed to save to API:', error);
        // Fallback to localStorage
        saveDataToStorage(newJourney);
      }
    } else {
      // Save to localStorage
      saveDataToStorage(newJourney);
    }
  }, [session]);

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
