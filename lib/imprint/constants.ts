export const VIEWBOX = "0 0 1000 520"
export const SAFE = {
  left: 60,
  right: 60,
  top: 56,
  bottom: 74,
}
export const LANE_A_Y = 205
export const LANE_B_Y = 325
export const SCENE_VERSION = 1

export const FALLBACK_MINUTES: Record<string, number> = {
  Breakfast: 480, // 08:00
  Lunch: 780,     // 13:00
  Snack: 1020,    // 17:00
  Dinner: 1230,   // 20:30
  Other: 720,     // 12:00
}
export const COLLISION_OFFSET_MINUTES = 18
export const MAX_CONTOURS = 8
export const MAX_POINTS_PER_CONTOUR = 36
