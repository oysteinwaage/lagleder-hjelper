import { formatTime } from '@/lib/utils';
import type { Match, Team } from '@/types';

interface Props {
  match: Match;
  team: Team;
  enterFieldId: string | null;
  enterBenchId: string | null;
  currentTime: number;
  keeperId?: string;
}

function getPositions(count: number): { x: number; y: number }[] {
  if (count === 1) return [{ x: 0.5, y: 0.50 }];
  if (count === 2) return [{ x: 0.5, y: 0.28 }, { x: 0.5, y: 0.72 }];
  if (count === 3) return [
    { x: 0.5, y: 0.20 },
    { x: 0.25, y: 0.63 },
    { x: 0.75, y: 0.63 },
  ];
  if (count === 4) return [
    { x: 0.5, y: 0.17 },
    { x: 0.25, y: 0.50 },
    { x: 0.75, y: 0.50 },
    { x: 0.5, y: 0.76 },
  ];
  if (count === 5) return [
    { x: 0.5, y: 0.16 },
    { x: 0.2, y: 0.45 },
    { x: 0.8, y: 0.45 },
    { x: 0.35, y: 0.72 },
    { x: 0.65, y: 0.72 },
  ];
  if (count === 6) return [
    { x: 0.5, y: 0.15 },
    { x: 0.2, y: 0.38 },
    { x: 0.8, y: 0.38 },
    { x: 0.2, y: 0.63 },
    { x: 0.8, y: 0.63 },
    { x: 0.5, y: 0.76 },
  ];
  if (count === 7) return [
    { x: 0.5, y: 0.15 },
    { x: 0.2, y: 0.35 },
    { x: 0.5, y: 0.35 },
    { x: 0.8, y: 0.35 },
    { x: 0.2, y: 0.63 },
    { x: 0.8, y: 0.63 },
    { x: 0.5, y: 0.76 },
  ];
  const rows = [
    [{ x: 0.5, y: 0.13 }],
    [0.2, 0.4, 0.6, 0.8].map((x) => ({ x, y: 0.34 })),
    [0.25, 0.5, 0.75].map((x) => ({ x, y: 0.57 })),
    [0.3, 0.5, 0.7].map((x) => ({ x, y: 0.76 })),
  ];
  return rows.flat().slice(0, count);
}

// Playing field dimensions — bench now lives on the right so field is taller
const W = 248;
const H_FIELD = 266;
const BENCH_W = 72;
const BENCH_CX = W + BENCH_W / 2;
const TOTAL_W = W + BENCH_W;

// Positions calculated so every player label fits within H_FIELD with 2px gaps between players.
// Each player element spans 62px (head-top at center−24, label-bottom at center+38).
// Working up from keeper: 226 → 162 → 98 → 34 (spacing 64px = 62 + 2px gap each).
const KEEPER_POS = { x: 0.5, y: 226 / H_FIELD };

// Outfield positions when a keeper holds the bottom goal area — 1-2-1 for 4 players
function getOutfieldPositions(count: number): { x: number; y: number }[] {
  if (count === 1) return [{ x: 0.5, y: 100 / H_FIELD }];
  if (count === 2) return [
    { x: 0.5, y: 60 / H_FIELD },
    { x: 0.5, y: 150 / H_FIELD },
  ];
  if (count === 3) return [
    { x: 0.5,  y: 42 / H_FIELD },
    { x: 0.25, y: 120 / H_FIELD },
    { x: 0.75, y: 120 / H_FIELD },
  ];
  // 1-2-1: spiss, venstre ving, høyre ving, back
  if (count === 4) return [
    { x: 0.5,  y: 34 / H_FIELD  },  // spiss
    { x: 0.22, y: 98 / H_FIELD  },  // venstre ving
    { x: 0.78, y: 98 / H_FIELD  },  // høyre ving
    { x: 0.5,  y: 162 / H_FIELD },  // back
  ];
  return getPositions(count);
}

export function FootballPitch({ match, team, enterFieldId, enterBenchId, currentTime, keeperId }: Props) {
  const fieldPlayers = match.matchPlayers
    .filter((mp) => mp.onField)
    .sort((a, b) => a.lineupOrder - b.lineupOrder);

  const benchPlayers = match.matchPlayers
    .filter((mp) => !mp.onField)
    .sort((a, b) => a.lineupOrder - b.lineupOrder);

  // Separate keeper from outfield players when keeperId is set
  const keeperMp = keeperId ? fieldPlayers.find((mp) => mp.playerId === keeperId) : undefined;
  const outfieldPlayers = keeperMp
    ? fieldPlayers.filter((mp) => mp.playerId !== keeperId)
    : fieldPlayers;
  const outfieldPositions = keeperMp
    ? getOutfieldPositions(outfieldPlayers.length)
    : getPositions(outfieldPlayers.length);

  const N = benchPlayers.length;
  const BENCH_START_Y = 28;
  const BENCH_AVAIL_H = H_FIELD - BENCH_START_Y - 10;
  function benchPlayerY(i: number) {
    return N > 0 ? BENCH_START_Y + (i + 1) * BENCH_AVAIL_H / (N + 1) : H_FIELD / 2;
  }

  function getPlayerName(id: string) {
    return team.players.find((p) => p.id === id)?.name ?? '?';
  }

  // Swap animation — now goes from field (left) to bench panel (right)
  let swapFx = 0, swapFy = 0, swapBx = BENCH_CX, swapBy = 0;
  let showSwapLine = false;
  if (enterFieldId && enterBenchId) {
    const fi = outfieldPlayers.findIndex((mp) => mp.playerId === enterFieldId);
    const bi = benchPlayers.findIndex((mp) => mp.playerId === enterBenchId);
    if (fi >= 0 && bi >= 0) {
      const fp = outfieldPositions[fi];
      swapFx = fp.x * W;
      swapFy = fp.y * H_FIELD;
      swapBy = benchPlayerY(bi);
      showSwapLine = true;
    }
  }

  const dx = swapBx - swapFx;
  const dy = swapBy - swapFy;
  const lineLen = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = (dy / lineLen) * 4;
  const py = -(dx / lineLen) * 4;

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${TOTAL_W} ${H_FIELD}`}
        width={TOTAL_W}
        height={H_FIELD}
        className="rounded-xl overflow-hidden max-w-full"
      >
        <defs>
          <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a5e15" />
            <stop offset="50%" stopColor="#2f6b18" />
            <stop offset="100%" stopColor="#2a5e15" />
          </linearGradient>
          <pattern id="stripes" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="20" height="40" fill="rgba(0,0,0,0.05)" />
          </pattern>
          <marker id="arrowGreen" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="rgba(34,197,94,0.9)" />
          </marker>
          <marker id="arrowRed" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="rgba(239,68,68,0.85)" />
          </marker>
        </defs>

        {/* Field */}
        <rect width={W} height={H_FIELD} fill="url(#grass)" />
        <rect width={W} height={H_FIELD} fill="url(#stripes)" />
        <rect x={10} y={10} width={W - 20} height={H_FIELD - 20} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <line x1={10} y1={H_FIELD / 2} x2={W - 10} y2={H_FIELD / 2} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <circle cx={W / 2} cy={H_FIELD / 2} r={26} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <circle cx={W / 2} cy={H_FIELD / 2} r={3} fill="rgba(255,255,255,0.6)" />
        <rect x={W / 2 - 45} y={10} width={90} height={28} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <rect x={W / 2 - 45} y={H_FIELD - 38} width={90} height={28} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

        {/* Swap animation lines */}
        {showSwapLine && (
          <>
            <line
              x1={swapBx + px} y1={swapBy + py}
              x2={swapFx + px} y2={swapFy + py}
              stroke="rgba(34,197,94,0.9)" strokeWidth={2.5}
              markerEnd="url(#arrowGreen)"
              className="svg-swap-line"
            />
            <line
              x1={swapFx - px} y1={swapFy - py}
              x2={swapBx - px} y2={swapBy - py}
              stroke="rgba(239,68,68,0.85)" strokeWidth={2.5}
              markerEnd="url(#arrowRed)"
              className="svg-swap-line"
            />
          </>
        )}

        {/* Outfield players */}
        {outfieldPlayers.map((mp, i) => {
          const pos = outfieldPositions[i];
          const x = pos.x * W;
          const y = pos.y * H_FIELD;
          const isEntering = mp.playerId === enterFieldId;
          const name = getPlayerName(mp.playerId);
          const displayName = name.length > 10 ? name.slice(0, 9) + '…' : name;
          const spellSeconds = currentTime - mp.lastEventTime;

          return (
            <g key={mp.playerId} transform={`translate(${x}, ${y})`}>
              {isEntering && (
                <>
                  <circle r={14} fill="rgba(34,205,94,0.18)" className="svg-ring-fill" />
                  <circle r={14} fill="none" stroke="rgba(34,205,94,0.85)" strokeWidth={2} className="svg-ring-expand" />
                </>
              )}
              <g className={isEntering ? 'svg-player-pop' : undefined}>
                <ellipse cx={0} cy={14} rx={11} ry={4} fill="rgba(0,0,0,0.25)" />
                <circle r={12} fill={isEntering ? '#16a34a' : '#1d4ed8'} stroke="white" strokeWidth={isEntering ? 2 : 1.5} />
                <line x1={-6} y1={-4} x2={-6} y2={8} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
                <line x1={6} y1={-4} x2={6} y2={8} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
                <circle cx={0} cy={-16} r={8} fill="#f5c89a" stroke="white" strokeWidth={1.5} />
                <rect x={-26} y={16} width={52} height={22} rx={3} fill="rgba(0,0,0,0.70)" />
                <text x={0} y={26} textAnchor="middle" fill="white" fontSize={8} fontFamily="system-ui, sans-serif" fontWeight="600">
                  {displayName}
                </text>
                <text x={0} y={35} textAnchor="middle" fill="#86efac" fontSize={8} fontFamily="ui-monospace, monospace" fontWeight="500">
                  {formatTime(Math.max(0, Math.floor(spellSeconds)))}
                </text>
              </g>
            </g>
          );
        })}

        {/* Keeper — fixed at bottom goal area */}
        {keeperMp && (() => {
          const x = KEEPER_POS.x * W;
          const y = KEEPER_POS.y * H_FIELD;
          const name = getPlayerName(keeperMp.playerId);
          const displayName = name.length > 10 ? name.slice(0, 9) + '…' : name;
          const spellSeconds = currentTime - keeperMp.lastEventTime;
          return (
            <g key={keeperMp.playerId} transform={`translate(${x}, ${y})`}>
              <ellipse cx={0} cy={14} rx={11} ry={4} fill="rgba(0,0,0,0.25)" />
              <circle r={12} fill="#d97706" stroke="white" strokeWidth={1.5} />
              <line x1={-6} y1={-4} x2={-6} y2={8} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              <line x1={6} y1={-4} x2={6} y2={8} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              <circle cx={0} cy={-16} r={8} fill="#f5c89a" stroke="white" strokeWidth={1.5} />
              <rect x={-26} y={16} width={52} height={22} rx={3} fill="rgba(0,0,0,0.70)" />
              <text x={0} y={26} textAnchor="middle" fill="white" fontSize={8} fontFamily="system-ui, sans-serif" fontWeight="600">
                {displayName}
              </text>
              <text x={0} y={35} textAnchor="middle" fill="#fbbf24" fontSize={8} fontFamily="ui-monospace, monospace" fontWeight="500">
                {formatTime(Math.max(0, Math.floor(spellSeconds)))}
              </text>
            </g>
          );
        })()}

        {/* Bench panel */}
        <rect x={W} y={0} width={BENCH_W} height={H_FIELD} fill="rgba(0,0,0,0.32)" />
        <line x1={W} y1={0} x2={W} y2={H_FIELD} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        <text x={BENCH_CX} y={12} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="system-ui, sans-serif" letterSpacing="1">
          BENKEN
        </text>

        {/* Bench players */}
        {benchPlayers.map((mp, i) => {
          const x = BENCH_CX;
          const y = benchPlayerY(i);
          const isJustBenched = mp.playerId === enterBenchId;
          const name = getPlayerName(mp.playerId);
          const displayName = name.length > 8 ? name.slice(0, 7) + '…' : name;
          const benchTime = mp.benchSeconds + (currentTime - mp.lastEventTime);

          return (
            <g key={mp.playerId} transform={`translate(${x}, ${y})`}>
              {isJustBenched && (
                <circle r={10} fill="none" stroke="rgba(239,68,68,0.85)" strokeWidth={2} className="svg-red-ring" />
              )}
              <g className={isJustBenched ? 'svg-bench-pop' : undefined}>
                <ellipse cx={0} cy={8} rx={6} ry={2} fill="rgba(0,0,0,0.25)" />
                <circle r={7} fill={isJustBenched ? '#991b1b' : '#334155'} stroke="rgba(255,255,255,0.65)" strokeWidth={1.5} />
                <circle cx={0} cy={-10} r={5} fill="#f5c89a" stroke="rgba(255,255,255,0.65)" strokeWidth={1.5} />
                <rect x={-28} y={10} width={56} height={18} rx={2} fill="rgba(0,0,0,0.72)" />
                <text x={0} y={19} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize={7} fontFamily="system-ui, sans-serif" fontWeight="600">
                  {displayName}
                </text>
                <text x={0} y={27} textAnchor="middle" fill="#94a3b8" fontSize={7} fontFamily="ui-monospace, monospace" fontWeight="500">
                  {formatTime(Math.max(0, Math.floor(benchTime)))}
                </text>
              </g>
            </g>
          );
        })}

        {/* Empty bench message */}
        {benchPlayers.length === 0 && (
          <>
            <text x={BENCH_CX} y={H_FIELD / 2 - 5} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={8} fontFamily="system-ui, sans-serif">
              Ingen
            </text>
            <text x={BENCH_CX} y={H_FIELD / 2 + 8} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={8} fontFamily="system-ui, sans-serif">
              på benken
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
