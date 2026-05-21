import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Match, MatchPlayer } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const WEEKDAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return `${WEEKDAYS[d.getDay()]} ${day}. ${MONTHS[month - 1]}`;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Recalculate the sub queue.
 *  Out priority: longest on field (smallest lastEventTime).
 *  In priority:  virgins (fieldSeconds===0) first (longest bench), then veterans.
 *  Virgin subs use firstSubTimeSec + 60s spacing; veterans use subIntervalSec.
 *  firstSubTimeSec=0 disables the first-sub logic and uses plain subIntervalSec. */
export function buildSubQueue(
  matchPlayers: MatchPlayer[],
  currentTime: number,
  subIntervalSec: number,
  firstSubTimeSec = 0
): { outId: string; inId: string; dueTime: number }[] {
  const fieldPlayers = [...matchPlayers.filter((p) => p.onField)]
    .sort((a, b) => a.lastEventTime - b.lastEventTime);
  const benchPlayers = [...matchPlayers.filter((p) => !p.onField)]
    .sort((a, b) => a.lastEventTime - b.lastEventTime);

  const virginBench = benchPlayers.filter((p) => p.fieldSeconds === 0);
  const veteranBench = benchPlayers.filter((p) => p.fieldSeconds > 0);
  const orderedBench = [...virginBench, ...veteranBench];

  const useFirstSub = firstSubTimeSec > 0 && virginBench.length > 0;
  const virginBaseTime = useFirstSub
    ? Math.max(firstSubTimeSec, currentTime + 60)
    : 0;

  const queue: { outId: string; inId: string; dueTime: number }[] = [];
  const swapCount = Math.min(fieldPlayers.length, orderedBench.length);
  let lastDueTime = currentTime;

  for (let i = 0; i < swapCount; i++) {
    const isVirgin = i < virginBench.length;
    let dueTime: number;

    if (useFirstSub && isVirgin) {
      dueTime = virginBaseTime + i * 60;
    } else if (useFirstSub) {
      dueTime = lastDueTime + subIntervalSec;
    } else {
      dueTime = currentTime + (i + 1) * subIntervalSec;
    }

    lastDueTime = dueTime;
    queue.push({
      outId: fieldPlayers[i].playerId,
      inId: orderedBench[i].playerId,
      dueTime,
    });
  }
  return queue;
}

/** Apply a substitution, returning updated matchPlayers and new subQueue.
 *  If the sub matches the first queue entry, that entry is removed and a new
 *  veteran entry is appended after all remaining entries (spacing: subIntervalSec). */
export function applySubstitution(
  match: Match,
  outPlayerId: string,
  inPlayerId: string,
  currentTime: number
): { matchPlayers: MatchPlayer[]; subQueue: { outId: string; inId: string; dueTime: number }[] } {
  const subIntervalSec = match.settings.subInterval * 60;
  const firstSubTimeSec = (match.settings.firstSubTime ?? 0) * 60;

  const updated = match.matchPlayers.map((mp): MatchPlayer => {
    if (mp.playerId === outPlayerId) {
      return {
        ...mp,
        onField: false,
        fieldSeconds: mp.fieldSeconds + (currentTime - mp.lastEventTime),
        lastEventTime: currentTime,
      };
    }
    if (mp.playerId === inPlayerId) {
      return {
        ...mp,
        onField: true,
        benchSeconds: mp.benchSeconds + (currentTime - mp.lastEventTime),
        lastEventTime: currentTime,
      };
    }
    return mp;
  });

  const isQueueSub =
    match.subQueue.length > 0 &&
    match.subQueue[0].outId === outPlayerId &&
    match.subQueue[0].inId === inPlayerId;

  if (isQueueSub) {
    const remainingQueue = match.subQueue.slice(1);
    const plannedOutIds = new Set(remainingQueue.map((s) => s.outId));
    const fieldPlayersNow = updated
      .filter((mp) => mp.onField)
      .sort((a, b) => a.lastEventTime - b.lastEventTime);
    const candidates = fieldPlayersNow.filter((mp) => !plannedOutIds.has(mp.playerId));
    const newOutId = (candidates.length > 0 ? candidates[0] : fieldPlayersNow[0])?.playerId;

    const newQueue = [...remainingQueue];
    if (newOutId) {
      const lastDue = newQueue.length > 0 ? newQueue[newQueue.length - 1].dueTime : currentTime;
      const dueTime = Math.max(lastDue + subIntervalSec, currentTime + subIntervalSec);
      newQueue.push({ outId: newOutId, inId: outPlayerId, dueTime });
    }
    return { matchPlayers: updated, subQueue: newQueue };
  }

  const newQueue = buildSubQueue(updated, currentTime, subIntervalSec, firstSubTimeSec);
  return { matchPlayers: updated, subQueue: newQueue };
}
