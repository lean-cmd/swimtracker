/** A single GPS track point parsed from a GPX file. */
export interface TrackPoint {
  lat: number;
  lon: number;
  /** Unix epoch milliseconds. */
  time: number;
}

/** Result of parsing a GPX file. */
export interface ParsedTrack {
  name: string | null;
  points: TrackPoint[];
  /** Total GPS distance in meters (sum of haversine segment lengths). */
  distanceMeters: number;
  /** Elapsed time in seconds (last timestamp minus first). */
  elapsedSeconds: number;
  /** Start time as epoch ms, if the file had timestamps. */
  startTime: number | null;
  /**
   * How well the track follows the overall start→end direction, in [0, 1].
   * 1 = perfectly straight downstream line, lower = meandering track.
   * Used to project the current vector onto the actual swim path.
   */
  routeAlignment: number;
}

/** Everything the correction model needs, regardless of input mode. */
export interface SwimInput {
  distanceMeters: number;
  elapsedSeconds: number;
  /**
   * Fraction of the current vector that acts along the swim direction, [0, 1].
   * GPX mode computes this from the track geometry; manual mode assumes 1
   * (entry and exit points on the same bank, swimming straight downstream).
   */
  routeAlignment: number;
}

/** Output of the current-correction model. */
export interface CorrectionResult {
  gpsDistanceMeters: number;
  elapsedSeconds: number;
  /** Average speed over ground from GPS, m/s. */
  gpsSpeedMs: number;
  /** Current speed along the swim direction after alignment projection, m/s. */
  effectiveCurrentMs: number;
  /** Distance the river carried the swimmer, meters. */
  currentDistanceMeters: number;
  /** Distance attributable to the swimmer's own effort, meters. */
  swimmerDistanceMeters: number;
  /** Swimmer speed through the water, m/s. */
  swimmerSpeedMs: number;
  /** Seconds per 100 m at swimmer speed — the still-water equivalent pace. Null when floating. */
  stillWaterPaceSecPer100m: number | null;
  /** Seconds per 100 m from raw GPS speed. */
  gpsPaceSecPer100m: number;
  /** Share of the GPS distance contributed by the current, 0–100. */
  currentBoostPercent: number;
  /**
   * True when the configured current fully explains the GPS speed
   * (swimmer speed clamps to ~0), i.e. the swimmer was drifting/floating.
   */
  floating: boolean;
  /** GPS speed itself — equals the implied current speed when floating. */
  impliedCurrentMs: number;
}
