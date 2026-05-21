import { formatTime } from '@/lib/utils';
import type { Match, Team } from '@/types';

interface Props {
  match: Match;
  team: Team;
  animatingPlayerIds: Set<string>;
  currentTime: number;
}

interface PlayerPos {
  x: number;
  y: number;
  name: string;
  id: string;
  spellSeconds: number;
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

export function FootballPitch({ match, team, animatingPlayerIds, currentTime }: Props) {
  const fieldPlayers = match.matchPlayers
    .filter((mp) => mp.onField)
    .sort((a, b) => a.lineupOrder - b.lineupOrder);

  const positions = getPositions(fieldPlayers.length);

  const W = 320;
  const H = 200;

  const players: PlayerPos[] = fieldPlayers.map((mp, i) => {
    const player = team.players.find((p) => p.id === mp.playerId);
    const pos = positions[i] ?? { x: 0.5, y: 0.5 };
    return {
      id: mp.playerId,
      name: player?.name ?? '?',
      x: pos.x * W,
      y: pos.y * H,
      spellSeconds: currentTime - mp.lastEventTime,
    };
  });

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
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
        </defs>
        <rect width={W} height={H} fill="url(#grass)" />
        <rect width={W} height={H} fill="url(#stripes)" />

        {/* Outer border */}
        <rect x={10} y={10} width={W - 20} height={H - 20} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

        {/* Centre line */}
        <line x1={10} y1={H / 2} x2={W - 10} y2={H / 2} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

        {/* Centre circle */}
        <circle cx={W / 2} cy={H / 2} r={26} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <circle cx={W / 2} cy={H / 2} r={3} fill="rgba(255,255,255,0.6)" />

        {/* Top goal area */}
        <rect x={W / 2 - 45} y={10} width={90} height={28} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

        {/* Bottom goal area */}
        <rect x={W / 2 - 45} y={H - 38} width={90} height={28} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

        {/* Players */}
        {players.map((p) => {
          const isAnim = animatingPlayerIds.has(p.id);
          const displayName = p.name.length > 10 ? p.name.slice(0, 9) + '…' : p.name;
          return (
            <g key={p.id} transform={`translate(${p.x}, ${p.y})`}>
              {isAnim && (
                <circle r={17} fill="rgba(251,191,36,0.3)" className="animate-ping" />
              )}
              <ellipse cx={0} cy={14} rx={11} ry={4} fill="rgba(0,0,0,0.25)" />
              <circle r={12} fill="#1d4ed8" stroke="white" strokeWidth={1.5} />
              <line x1={-6} y1={-4} x2={-6} y2={8} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              <line x1={6} y1={-4} x2={6} y2={8} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              <circle cx={0} cy={-16} r={8} fill="#f5c89a" stroke="white" strokeWidth={1.5} />
              <rect x={-26} y={16} width={52} height={22} rx={3} fill="rgba(0,0,0,0.70)" />
              <text x={0} y={26} textAnchor="middle" fill="white" fontSize={8} fontFamily="system-ui, sans-serif" fontWeight="600">
                {displayName}
              </text>
              <text x={0} y={35} textAnchor="middle" fill="#86efac" fontSize={8} fontFamily="ui-monospace, monospace" fontWeight="500">
                {formatTime(Math.max(0, p.spellSeconds))}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
