export interface WasteEmissionFactorOption {
  id: number;
  name: string;
  emissionFactor: number;
  emissionFactorName: string;
  source: string | null;
  unit: string;
}

export interface WasteSelectOption {
  value: string;
  label: string;
  factor: number;
  factorName: string;
  source: string | null;
  unit: string;
}

export async function fetchWasteEmissionFactors(): Promise<WasteEmissionFactorOption[]> {
  const response = await fetch('/api/waste-emission-factors', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Failed to fetch waste emission factors');
  }

  const data = await response.json();
  return data.items || [];
}

export function toWasteSelectOptions(items: WasteEmissionFactorOption[]): WasteSelectOption[] {
  return items.map((item) => ({
    value: item.name,
    label: item.name,
    factor: item.emissionFactor,
    factorName: item.emissionFactorName,
    source: item.source,
    unit: item.unit
  }));
}
