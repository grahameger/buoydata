import { Measurement } from '../models/measurement';

/**
 * Returns a UTC Date instance for a buoy measurement.
 */
export function getMeasurementDate(measurement: Measurement): Date {
  const { year, month, day, hour, minute } = measurement;
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}
