// locationStore.ts
// Manages Bairro / Cidade / Estado options in localStorage.

const KEYS = {
  districts: 'jbrcrm_districts',
  cities: 'jbrcrm_cities',
  states: 'jbrcrm_states',
};

const DEFAULTS = {
  districts: [] as string[],
  cities: ['Patrocínio'],
  states: ['Minas Gerais', 'São Paulo', 'Rio de Janeiro', 'Bahia', 'Paraná', 'Rio Grande do Sul', 'Goiás', 'Ceará', 'Pernambuco', 'Mato Grosso do Sul'],
};

function read(key: string, defaults: string[]): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function write(key: string, values: string[]): void {
  localStorage.setItem(key, JSON.stringify(values));
}

export function getDistricts(): string[] {
  return read(KEYS.districts, DEFAULTS.districts);
}

export function getCities(): string[] {
  return read(KEYS.cities, DEFAULTS.cities);
}

export function getStates(): string[] {
  return read(KEYS.states, DEFAULTS.states);
}

export function addDistrict(name: string): string[] {
  const current = getDistricts();
  if (!current.includes(name)) {
    const updated = [...current, name].sort();
    write(KEYS.districts, updated);
    return updated;
  }
  return current;
}

export function addCity(name: string): string[] {
  const current = getCities();
  if (!current.includes(name)) {
    const updated = [...current, name].sort();
    write(KEYS.cities, updated);
    return updated;
  }
  return current;
}

export function addState(name: string): string[] {
  const current = getStates();
  if (!current.includes(name)) {
    const updated = [...current, name].sort();
    write(KEYS.states, updated);
    return updated;
  }
  return current;
}
