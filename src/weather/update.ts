import type { WeatherModel, WeatherUpdateStatus } from './types';

interface ModelSchedule {
  cycleHours: number[];
  availabilityDelayMinutes: number;
}

const MODEL_SCHEDULES: Record<WeatherModel, ModelSchedule> = {
  hrrr: {
    cycleHours: Array.from({ length: 24 }, (_, hour) => hour),
    availabilityDelayMinutes: 60,
  },
  nam: {
    cycleHours: [0, 6, 12, 18],
    availabilityDelayMinutes: 120,
  },
  gfs: {
    cycleHours: [0, 6, 12, 18],
    availabilityDelayMinutes: 180,
  },
  ecmwf: {
    cycleHours: [0, 12],
    availabilityDelayMinutes: 360,
  },
};

function getLastCycleTime(now: Date, cycleHours: number[]): Date {
  const sorted = [...cycleHours].sort((a, b) => a - b);
  const nowHour = now.getUTCHours();
  const nowDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  let cycleHour = sorted.filter(hour => hour <= nowHour).pop();
  if (cycleHour === undefined) {
    cycleHour = sorted[sorted.length - 1];
    const previousDay = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000);
    previousDay.setUTCHours(cycleHour, 0, 0, 0);
    return previousDay;
  }

  const result = new Date(nowDate);
  result.setUTCHours(cycleHour, 0, 0, 0);
  return result;
}

function getNextCycleTime(lastCycle: Date, cycleHours: number[]): Date {
  const sorted = [...cycleHours].sort((a, b) => a - b);
  const lastHour = lastCycle.getUTCHours();
  const index = sorted.indexOf(lastHour);
  const nextHour = sorted[index + 1];

  if (nextHour === undefined) {
    const nextDay = new Date(lastCycle.getTime() + 24 * 60 * 60 * 1000);
    nextDay.setUTCHours(sorted[0], 0, 0, 0);
    return nextDay;
  }

  const result = new Date(lastCycle);
  result.setUTCHours(nextHour, 0, 0, 0);
  return result;
}

export function getModelUpdateStatus(
  model: WeatherModel,
  now: Date = new Date(),
): WeatherUpdateStatus {
  const schedule = MODEL_SCHEDULES[model];
  const delayMs = schedule.availabilityDelayMinutes * 60 * 1000;
  const effectiveNow = new Date(now.getTime() - delayMs);

  const lastRun = getLastCycleTime(effectiveNow, schedule.cycleHours);
  const nextRun = getNextCycleTime(lastRun, schedule.cycleHours);
  const lastUpdate = new Date(lastRun.getTime() + delayMs);
  const nextUpdate = new Date(nextRun.getTime() + delayMs);

  const cadenceHours =
    schedule.cycleHours.length > 1
      ? schedule.cycleHours[1] - schedule.cycleHours[0]
      : 24;

  return {
    model,
    cadenceHours,
    cycleHours: schedule.cycleHours,
    availabilityDelayMinutes: schedule.availabilityDelayMinutes,
    lastRun,
    nextRun,
    lastUpdate,
    nextUpdate,
  };
}

export function listModelUpdateStatus(
  now: Date = new Date(),
): WeatherUpdateStatus[] {
  return (Object.keys(MODEL_SCHEDULES) as WeatherModel[]).map(model =>
    getModelUpdateStatus(model, now),
  );
}

export function getModelUpdateSchedule(model: WeatherModel): ModelSchedule {
  return MODEL_SCHEDULES[model];
}
