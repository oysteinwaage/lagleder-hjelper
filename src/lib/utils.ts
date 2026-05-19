import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Match, MatchPlayer } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Recalculate the sub queue.
 *  Out priority: longest on field since last subbed on (currentTime - lastEventTime).
 *  In priority:  longest on bench since last subbed off (currentTime - lastEventTime). */
export function buildSubQueue(
  matchPlayers: MatchPlayer[],
  _currentTime: number,
  _playersOnField: number
): { outId: string; inId: string }[] {
  // Smallest lastEventTime = entered/sat down earliest = longest current spell
  const updatedField = [...matchPlayers.filter((p) => p.onField)]
    .sort((a, b) => a.lastEventTime - b.lastEventTime);

  const updatedBench = [...matchPlayers.filter((p) => !p.onField)]
    .sort((a, b) => a.lastEventTime - b.lastEventTime);

  const queue: { outId: string; inId: string }[] = [];
  const swapCount = Math.min(updatedField.length, updatedBench.length);
  for (let i = 0; i < swapCount; i++) {
    queue.push({ outId: updatedField[i].playerId, inId: updatedBench[i].playerId });
  }
  return queue;
}

/** Apply a substitution, returning updated matchPlayers and new subQueue */
export function applySubstitution(
  match: Match,
  outPlayerId: string,
  inPlayerId: string,
  currentTime: number
): { matchPlayers: MatchPlayer[]; subQueue: { outId: string; inId: string }[] } {
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

  const newQueue = buildSubQueue(updated, currentTime, match.settings.playersOnField);
  return { matchPlayers: updated, subQueue: newQueue };
}
