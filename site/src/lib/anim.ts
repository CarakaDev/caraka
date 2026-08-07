/**
 * Staggered scroll-driven animation range, lifted from the mockups' own helper:
 *
 *   r(i, step, span) => `entry ${i*step}% cover ${i*step + span}%`
 *
 * Each item in a list starts a little later than the one before it, so a grid
 * reveals in sequence rather than all at once. `step` sets the gap between
 * items and `span` how long each one takes.
 *
 * `step` and `span` are required. Every mockup declares its own defaults —
 * 2.4, 2.6, 3, 4 and 5 for the step alone — so a shared default here would be
 * a number that matches no comp, waiting to be picked up by accident.
 */
export const r = (i: number, step: number, span: number): string => {
  const a = i * step
  return `entry ${a}% cover ${a + span}%`
}
