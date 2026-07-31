export function mergeDefinedOptions<T extends object>(
  defaults: T,
  options: Partial<T>,
): T {
  const merged = { ...defaults };

  for (const key in options) {
    const value = options[key];
    if (Object.prototype.hasOwnProperty.call(options, key) && value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}
