function toShowroomEntity(showroom) {
  const entity = { ...showroom };
  // Normalize flat rows/cols into a nested layout object for documents
  // that were created before the layout field was introduced.
  if (!entity.layout && (entity.rows != null || entity.cols != null)) {
    const rows = Number(entity.rows) || 0;
    const cols = Number(entity.cols) || 0;
    entity.layout = { rows, cols, totalSeats: rows * cols };
  }
  return entity;
}

export { toShowroomEntity };
