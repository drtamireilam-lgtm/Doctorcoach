export type RuntimeMode = 'local' | 'pilot' | 'production';

/** Published builds must opt in to the synthetic-data demo explicitly. */
export function resolveRuntimeMode(value: string | undefined, development: boolean): RuntimeMode {
  if (value === 'local' || value === 'pilot' || value === 'production') return value;
  if (value === undefined || value === '') return development ? 'local' : 'production';
  return 'production';
}

export function canUseDemoWorkspace(mode: RuntimeMode): boolean {
  return mode === 'local' || mode === 'pilot';
}
