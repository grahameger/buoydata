// Schema reference: https://www.ndbc.noaa.gov/mods.shtml

/**
 * Real-time water measurement data.
 */
export interface WaterMeasurement {
  /**
   * Average wave period (seconds) of all waves during the 20-minute period.
   */
  averagePeriod: number;
  /**
   * The direction from which the waves at the dominant period (DPD) are coming.
   * The units are degrees from true North, increasing clockwise, with North as 0 (zero) degrees and East as 90 degrees.
   */
  dominantDirection: number;
  /**
   * Dominant wave period (seconds) is the period with the maximum wave energy.
   */
  dominantPeriod: number;
  /**
   * Significant wave height (meters) is calculated as the average of the highest one-third of all of the wave heights
   * during the 20-minute sampling period.
   */
  significantHeight: number;
  /**
   * Sea surface temperature (Celsius).
   */
  surfaceTemperature: number;
  /**
   * The water level in feet above or below Mean Lower Low Water (MLLW).
   */
  tide: number;
}

/**
 * Real-time wind measurement data.
 */
export interface WindMeasurement {
  /**
   * Wind direction (degrees clockwise from true North).
   */
  direction: number;
  /**
   * Wind speed (m/s) averaged over the buoy reporting interval.
   */
  averageSpeed: number;
  /**
   * Peak gust speed (m/s) during the reporting interval.
   */
  peakGustSpeed: number;
}

/**
 * A single real-time buoy data measurement.
 */
export interface Measurement {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /**
   * Air temperature (Celsius).
   */
  airTemperature: number;
  /**
   * Dewpoint temperature (Celsius).
   */
  dewpointTemperature: number;
  /**
   * Pressure tendency (hPa over the last three hours).
   */
  pressureTendancy: number;
  /**
   * Sea level pressure (hPa).
   */
  seaLevelPressure: number;
  /**
   * Station visibility (nautical miles).
   */
  stationVisibility: number;
  water: WaterMeasurement;
  wind: WindMeasurement;
}

export interface BuoyData {
  id: string;
  /**
   * Measurements ordered from latest to oldest as reported by NDBC.
   */
  measurements: Measurement[];
}
