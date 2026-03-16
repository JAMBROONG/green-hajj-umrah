export interface FoodEmissionFactorOption {
  id: number;
  name: string;
  emissionFactor: number;
  emissionFactorName: string;
}

export interface FoodSelectOption {
  value: string;
  label: string;
  factor: number;
  factorName: string;
}

export async function fetchFoodEmissionFactors(): Promise<FoodEmissionFactorOption[]> {
  const response = await fetch('/api/food-emission-factors', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Failed to fetch food emission factors');
  }

  const data = await response.json();
  return data.items || [];
}

export function toFoodSelectOptions(items: FoodEmissionFactorOption[]): FoodSelectOption[] {
  return items.map((item) => ({
    value: String(item.id),
    label: item.name,
    factor: item.emissionFactor,
    factorName: item.emissionFactorName
  }));
}
