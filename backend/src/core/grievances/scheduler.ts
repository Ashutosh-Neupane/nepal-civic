import type { Application } from 'express';
import logger from '../../logging';

const MAX_TIMER_MS = 24 * 24 * 60 * 60 * 1000;

/**
 * Periodically escalates grievances whose deadline has passed and closes
 * resolved grievances the citizen never confirmed. Returns a stop function.
 */
export function startGrievanceScheduler(app: Application): () => void {
  const minutes = app.config.escalationIntervalMinutes;
  if (!minutes || minutes <= 0) {
    logger.info('Grievance scheduler disabled (ESCALATION_INTERVAL_MINUTES <= 0).');
    return () => undefined;
  }
  let running = false;
  const tick = async () => {
    if (running) { return; }
    running = true;
    try {
      const now = new Date();
      await app.services.grievanceService.runEscalationSweep(now);
      await app.services.grievanceService.runAutoCloseSweep(now);
    } catch (error) {
      logger.error(`Grievance scheduler failed: ${error}`);
    } finally {
      running = false;
    }
  };
  // Timers longer than 2^31-1 ms overflow and fire immediately, so cap at 24 days.
  const timer = setInterval(tick, Math.min(minutes * 60 * 1000, MAX_TIMER_MS));
  void tick();
  logger.info(`Grievance scheduler running every ${minutes} minutes.`);
  return () => clearInterval(timer);
}
