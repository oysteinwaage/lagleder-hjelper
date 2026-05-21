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
  if (count === 1) return [{ x: 0.5, y: 0.5 }];
  if (count === 2) return [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.7 }];
  if (count === 3) return [
    { x: 0.5, y: 0.22 },
    { x: 0.25, y: 0.65 },
    { x: 0.75, y: 0.65 },
  ];
  if (count === 4) return [
    { x: 0.5, y: 0.18 },
    { x: 0.25, y: 0.5 },
    { x: 0.75, y: 0.5 },
    { x: 0.5, y: 0.78 },
  ];
  if (count === 5) return [
    { x: 0.5, y: 0.15 },
    { x: 0.2, y: 0.45 },
    { x: 0.8, y: 0.45 },
    { x: 0.35, y: 0.75 },
    { x: 0.65, y: 0.75 },
  ];
  if (count === 6) return [
    { x: 0.5, y: 0.12 },
    { x: 0.2, y: 0.38 },
    { x: 0.8, y: 0.38 },
    { x: 0.2, y: 0.65 },
    { x: 0.8, y: 0.65 },
    { x: 0.5, y: 0.82 },
  ];
  if (count === 7) return [
    { x: 0.5, y: 0.12 },
    { x: 0.2, y: 0.35 },
    { x: 0.5, y: 0.35 },
    { x: 0.8, y: 0.35 },
    { x: 0.2, y: 0.65 },
    { x: 0.8, y: 0.65 },
    { x: 0.5, y: 0.78 },
  ];
  const rows = [
    [{ x: 0.5, y: 0.1 }],
    [0.2, 0.4, 0.6, 0.8].map((x) => ({ x, y: 0.35 })),
    [0.25, 0.5, 0.75].map((x) => ({ x, y: 0.6 })),
    [0.3, 0.5, 0.7].map((x) => ({ x, y: 0.82 })),
  ];
  return rows.flat().slice(0, count);
}

export function FootballPitch({ match, team, animatingPlayerIds, currentTime }: Props) {
  const fieldPlayers = match.matchPlayers
    .filter((mp) => mp.onField)
    .sort((a, b) => a.lineupOrder - b.lineupOrder);

  const positions = getPositions(fieldPlayers.length);

  const W = 340;
  const H = 500;

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
        <rect x={12} y={12} width={W - 24} height={H - 24} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />

        {/* Centre line */}
        <line x1={12} y1={H / 2} x2={W - 12} y2={H / 2} stroke="rgba(255,255,255,0.5)" strokeWidth="2" />

        {/* Centre circle */}
        <circle cx={W / 2} cy={H / 2} r={45} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <circle cx={W / 2} cy={H / 2} r={4} fill="rgba(255,255,255,0.6)" />

        {/* Top penalty area */}
        <rect x={W / 2 - 70} y={12} width={140} height={70} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <rect x={W / 2 - 35} y={12} width={70} height={30} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <circle cx={W / 2} cy={82} r={4} fill="rgba(255,255,255,0.6)" />

        {/* Bottom penalty area */}
        <rect x={W / 2 - 70} y={H - 82} width={140} height={70} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <rect x={W / 2 - 35} y={H - 42} width={70} height={30} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <circle cx={W / 2} cy={H - 82} r={4} fill="rgba(255,255,255,0.6)" />

        {/* Players */}
        {players.map((p) => {
          const isAnim = animatingPlayerIds.has(p.id);
          const displayName = p.name.length > 10 ? p.name.slice(0, 9) + '…' : p.name;
          return (
            <g key={p.id} transform={`translate(${p.x}, ${p.y})`}>
              {isAnim && (
                <circle r={22} fill="rgba(251,191,36,0.3)" className="animate-ping" />
              )}
              {/* Shadow */}
              <ellipse cx={0} cy={18} rx={14} ry={5} fill="rgba(0,0,0,0.25)" />
              {/* Body */}
              <circle r={16} fill="#1d4ed8" stroke="white" strokeWidth={2} />
              {/* Jersey stripes */}
              <line x1={-8} y1={-5} x2={-8} y2={10} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
              <line x1={8} y1={-5} x2={8} y2={10} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
              {/* Head */}
              <circle cx={0} cy={-20} r={10} fill="#f5c89a" stroke="white" strokeWidth={1.5} />
              {/* Name + timer tag */}
              <rect x={-32} y={25} width={64} height={28} rx={4} fill="rgba(0,0,0,0.70)" />
              <text x={0} y={37} textAnchor="middle" fill="white" fontSize={9} fontFamily="system-ui, sans-serif" fontWeight="600">
                {displayName}
              </text>
              <text x={0} y={49} textAnchor="middle" fill="#86efac" fontSize={9} fontFamily="ui-monospace, monospace" fontWeight="500">
                {formatTime(p.spellSeconds)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
