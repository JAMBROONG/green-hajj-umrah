'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { HajiJourney, PhaseId, CategoryId, CategoryData } from '@/lib/types';
import { 
  loadDataFromStorage, 
  saveDataToStorage, 
  calculateTotalEmission,
  initializePhases,
  migratePhaseIds
} from '@/lib/utils';

interface UseHajiJourneyOptions {
  tripId?: string; // If provided, fetch journey data for this trip
}

export function useHajiJourney(options: UseHajiJourneyOptions = {}) {
  const { tripId } = options;
  const { data: session, status } = useSession();
  const [journey, setJourney] = useState<HajiJourney | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from API or localStorage
  useEffect(() => {
    const loadData = async () => {
      if (status === 'loading') return;

      if (session && tripId) {
        // User logged in with tripId - fetch from API
        try {
          const response = await fetch(`/api/trips/${tripId}/journey`);
          if (response.ok) {
            const data = await response.json();
            // data.journey.phases contains the HajiJourney structure
            let phases = data.journey?.phases;
            if (phases && phases.phases && typeof phases.phases === 'object' && Object.keys(phases.phases).length > 0) {
              // phases is a proper HajiJourney object with currentPhase and phases
              // Apply migration for old phase IDs
              phases = migratePhaseIds(phases);
              setJourney(phases);
            } else {
              // Initialize with default structure
              setJourney(initializePhases());
            }
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
      } else if (session && !tripId) {
        // Backward compatibility - old API endpoint
        try {
          const response = await fetch('/api/journey');
          if (response.ok) {
            const data = await response.json();
            const migratedJourney = migratePhaseIds(data.journey);
            setJourney(migratedJourney);
          } else {
            const localData = loadDataFromStorage();
            setJourney(localData);
          }
        } catch (error) {
          console.error('Failed to load journey from API:', error);
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
  }, [session, status, tripId]);

  const updateJourney = useCallback(async (newJourney: HajiJourney) => {
    setJourney(newJourney);
    
    if (session && tripId) {
      // Save to trip-specific API
      try {
        await fetch(`/api/trips/${tripId}/journey`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phases: newJourney,
            totalEmission: calculateTotalEmission(newJourney)
          })
        });
      } catch (error) {
        console.error('Failed to save to API:', error);
        // Fallback to localStorage
        saveDataToStorage(newJourney);
      }
    } else if (session && !tripId) {
      // Backward compatibility - old API endpoint
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
        saveDataToStorage(newJourney);
      }
    } else {
      // Save to localStorage
      saveDataToStorage(newJourney);
    }
  }, [session, tripId]);

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
