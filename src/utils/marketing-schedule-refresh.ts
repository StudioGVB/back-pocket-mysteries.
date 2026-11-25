export interface SchedulableMarketingItem {
  id: string;
  status: string;
  scheduled_at: string | null;
}

export interface ScheduleRefreshUpdate {
  id: string;
  oldScheduledAt: string | null;
  newScheduledAt: string;
}

/**
 * Checks whether a draft item's scheduled_at date has already passed (or is within 5 minutes of now).
 */
export function isScheduledDateInPast(
  scheduledAt: string | null | undefined,
  nowDate: Date = new Date()
): boolean {
  if (!scheduledAt) return true;
  const ms = new Date(scheduledAt).getTime();
  if (Number.isNaN(ms)) return true;
  return ms <= nowDate.getTime() + 5 * 60_000;
}

/**
 * Reassigns any past-due draft posts to upcoming future dates while preserving the queue's
 * chronological order, original time-of-day (e.g. 09:00 UTC vs 18:00 UTC), and preventing
 * multiple draft posts from colliding on the same timestamp.
 */
export function computeRefreshedFutureSchedule<
  T extends { id: string; status: string; scheduled_at: string | null }
>(
  items: T[],
  nowDate: Date = new Date()
): {
  updates: ScheduleRefreshUpdate[];
  pastDueCount: number;
} {
  const nowMs = nowDate.getTime();
  const minFutureMs = nowMs + 15 * 60_000;

  const draftItems = [...items]
    .filter((item) => item.status === "draft")
    .sort((a, b) => {
      const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
      return String(a.id).localeCompare(String(b.id));
    });

  const pastDueCount = draftItems.filter((item) =>
    isScheduledDateInPast(item.scheduled_at, nowDate)
  ).length;

  // Keep track of timestamps already occupied by scheduled/published items in the future
  const occupiedFutureMs = new Set<number>(
    items
      .filter((item) => item.status !== "draft" && item.scheduled_at)
      .map((item) => new Date(item.scheduled_at as string).getTime())
      .filter((ms) => !Number.isNaN(ms) && ms > nowMs)
  );

  const updates: ScheduleRefreshUpdate[] = [];
  let prevAssignedMs: number | null = null;

  for (const item of draftItems) {
    const origDate = item.scheduled_at ? new Date(item.scheduled_at) : null;
    const isValidOrig = origDate && !Number.isNaN(origDate.getTime());

    const preferredHours = isValidOrig ? origDate.getUTCHours() : 9;
    const preferredMinutes = isValidOrig ? origDate.getUTCMinutes() : 0;

    let candidateMs = isValidOrig ? origDate.getTime() : 0;

    // 1. If the date has already passed, move it to the next upcoming occurrence of (preferredHours:preferredMinutes) UTC
    if (candidateMs <= minFutureMs) {
      const candidate = new Date(
        Date.UTC(
          nowDate.getUTCFullYear(),
          nowDate.getUTCMonth(),
          nowDate.getUTCDate(),
          preferredHours,
          preferredMinutes,
          0,
          0
        )
      );
      if (candidate.getTime() <= minFutureMs) {
        candidate.setUTCDate(candidate.getUTCDate() + 1);
      }
      candidateMs = candidate.getTime();
    }

    // 2. Ensure queue order is preserved and no two posts collide when earlier posts roll forward
    if (prevAssignedMs !== null && candidateMs <= prevAssignedMs) {
      const prevDate = new Date(prevAssignedMs);
      const prevHours = prevDate.getUTCHours();

      // If previous post was a morning post (< 14:00 UTC) and this post prefers an evening slot (>= 15:00 UTC),
      // allow it to take the evening slot on the same UTC day
      if (prevHours < 14 && preferredHours >= 15) {
        const sameDayEvening = new Date(
          Date.UTC(
            prevDate.getUTCFullYear(),
            prevDate.getUTCMonth(),
            prevDate.getUTCDate(),
            preferredHours,
            preferredMinutes,
            0,
            0
          )
        );
        if (sameDayEvening.getTime() > prevAssignedMs && sameDayEvening.getTime() > minFutureMs) {
          candidateMs = sameDayEvening.getTime();
        }
      }

      // If still <= prevAssignedMs, advance to the next UTC day at (preferredHours:preferredMinutes)
      if (candidateMs <= prevAssignedMs) {
        const nextDay = new Date(
          Date.UTC(
            prevDate.getUTCFullYear(),
            prevDate.getUTCMonth(),
            prevDate.getUTCDate() + 1,
            preferredHours,
            preferredMinutes,
            0,
            0
          )
        );
        candidateMs = nextDay.getTime();
      }
    }

    // 3. Avoid colliding with already-scheduled future posts
    while (occupiedFutureMs.has(candidateMs)) {
      const bumped = new Date(candidateMs);
      bumped.setUTCDate(bumped.getUTCDate() + 1);
      candidateMs = bumped.getTime();
    }

    occupiedFutureMs.add(candidateMs);
    prevAssignedMs = candidateMs;

    const newIso = new Date(candidateMs).toISOString().replace(".000Z", "Z");
    const oldNormalized = item.scheduled_at
      ? new Date(item.scheduled_at).toISOString().replace(".000Z", "Z")
      : null;

    if (newIso !== oldNormalized) {
      updates.push({
        id: item.id,
        oldScheduledAt: item.scheduled_at,
        newScheduledAt: newIso,
      });
    }
  }

  return {
    updates,
    pastDueCount,
  };
}
