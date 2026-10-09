export function mostVisibleProject(slots, viewportHeight, active) {
  let selected = active;
  let largest = 0;
  for (const { index, top, bottom } of slots) {
    const visible = Math.max(0, Math.min(bottom, viewportHeight) - Math.max(top, 0));
    if (visible > largest || (visible > 0 && visible === largest && index === active)) {
      largest = visible;
      selected = index;
    }
  }
  return selected;
}