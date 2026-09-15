export function toCamelCase(value) {
  if (Array.isArray(value)) {
    return value.map(toCamelCase);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [
      key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()),
      val,
    ]),
  );
}
