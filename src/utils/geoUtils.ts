/**
 * Geographic projection utilities for India Flight Network Map.
 * Projects real lat/lng coordinates to SVG canvas space (viewBox 0 0 800 850).
 */

export interface Point {
  x: number;
  y: number;
}

// Bounding box for India airport coordinates
const MIN_LNG = 68.0;
const MAX_LNG = 94.0;
const MIN_LAT = 7.0;
const MAX_LAT = 34.0;

const SVG_WIDTH = 800;
const SVG_HEIGHT = 850;
const PADDING = 50;

/**
 * Projects (lat, lng) to SVG (x, y) coordinates.
 * Inverts latitude because SVG y goes downwards.
 */
export function projectCoordinates(lat: number, lng: number): Point {
  const normX = (lng - MIN_LNG) / (MAX_LNG - MIN_LNG);
  const normY = (MAX_LAT - lat) / (MAX_LAT - MIN_LAT);

  const x = PADDING + normX * (SVG_WIDTH - 2 * PADDING);
  const y = PADDING + normY * (SVG_HEIGHT - 2 * PADDING);

  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Generates an SVG quadratic bezier curve path with a smooth arc between two points.
 */
export function generateArcPath(from: Point, to: Point, curvature: number = 0.15): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return `M ${from.x} ${from.y}`;

  // Normal vector perpendicular to the chord
  const nx = -dy / dist;
  const ny = dx / dist;

  // Midpoint with curve offset
  const midX = (from.x + to.x) / 2 + nx * dist * curvature;
  const midY = (from.y + to.y) / 2 + ny * dist * curvature;

  return `M ${from.x} ${from.y} Q ${Math.round(midX)} ${Math.round(midY)} ${to.x} ${to.y}`;
}

/**
 * Authentic polygonal coastline and border coordinates for India in SVG space
 */
export const INDIA_COASTLINE_PATH = [
  // Jammu & Kashmir / Ladakh north
  "M 285 55",
  "L 330 45",
  "L 375 60",
  "L 405 90",
  "L 370 145",
  // Punjab / Rajasthan border
  "L 315 170",
  "L 255 210",
  "L 215 280",
  "L 190 340",
  // Gujarat / Rann of Kutch
  "L 130 380",
  "L 115 425",
  "L 155 450",
  "L 175 420",
  "L 200 460",
  // Maharashtra / Goa / Karnataka / Kerala western coast
  "L 215 500",
  "L 225 560",
  "L 255 640",
  "L 285 710",
  "L 325 780",
  // Kanyakumari (Southernmost tip)
  "L 345 805",
  // Tamil Nadu / Andhra / Odisha / Bengal eastern coast
  "L 375 780",
  "L 420 720",
  "L 460 640",
  "L 520 545",
  "L 580 475",
  "L 630 425",
  "L 645 390",
  // Sundarbans / Bangladesh border cut
  "L 660 380",
  "L 665 350",
  "L 690 340",
  // Northeast (Assam / Meghalaya / Arunachal)
  "L 720 300",
  "L 765 260",
  "L 760 215",
  "L 715 220",
  "L 680 250",
  "L 640 270",
  // Sikkim / Nepal / Uttarakhand northern arc
  "L 610 270",
  "L 550 250",
  "L 480 240",
  "L 430 200",
  "L 370 145",
  "Z"
].join(" ");
