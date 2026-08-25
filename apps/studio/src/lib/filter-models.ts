export type FilterableModel = { id: string; name: string };

export function filterModels(
  models: FilterableModel[],
  query: string,
): FilterableModel[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return models;
  }
  return models.filter(
    (model) =>
      model.id.toLowerCase().includes(needle) ||
      model.name.toLowerCase().includes(needle),
  );
}
