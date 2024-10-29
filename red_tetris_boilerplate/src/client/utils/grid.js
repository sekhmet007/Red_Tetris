export const createEmptyGrid = () => {
  const rows = 20;
  const cols = 10;
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ shape: 0, color: "0, 0, 0" }))
  );
  return grid;
};

