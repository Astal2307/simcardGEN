import { RARITY, WHEEL_SECTORS, wheelLayout, type Rarity } from '@simrush/shared';
import { WHEEL_SPIN_MS } from '../../store/workshop';

const R_OUT = 112;
const R_IN = 74;
const GAP_DEG = 0.7;

const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
};

/** Сектор кольца от a0 до a1 (градусы по часовой от верха). */
const sectorPath = (a0: number, a1: number) =>
  `M ${polar(R_OUT, a0)} A ${R_OUT} ${R_OUT} 0 0 1 ${polar(R_OUT, a1)} L ${polar(R_IN, a1)} A ${R_IN} ${R_IN} 0 0 0 ${polar(R_IN, a0)} Z`;

/** Колесо апгрейда: выигрышные сектора цвета желаемой редкости, стрелка сверху. */
export function Wheel({ win, rarity, rotation, spinning, landed }: {
  win: number;
  rarity: Rarity;
  rotation: number;
  spinning: boolean;
  landed: number | null;
}) {
  const layout = wheelLayout(win);
  const step = 360 / WHEEL_SECTORS;
  const chance = Math.round((win / WHEEL_SECTORS) * 1000) / 10;

  return (
    <div className="wheel">
      <svg viewBox="-120 -128 240 248" width="100%" height="100%">
        <g style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${WHEEL_SPIN_MS}ms cubic-bezier(.12,.8,.18,1)` : 'none'
        }}>
          {layout.map((isWin, i) => (
            <path
              key={i}
              d={sectorPath(i * step + GAP_DEG / 2, (i + 1) * step - GAP_DEG / 2)}
              fill={isWin ? RARITY[rarity].color : '#23262D'}
              opacity={landed === null || landed === i ? 1 : isWin ? 0.55 : 0.7}
              stroke={landed === i ? '#ECEDEF' : 'none'}
              strokeWidth={landed === i ? 2 : 0}
            />
          ))}
        </g>
        <circle r={R_IN - 6} fill="#15171B" stroke="#23262D" />
        <text className="disp" textAnchor="middle" dominantBaseline="central" fill="#ECEDEF" fontSize="26" fontWeight="600">
          {String(chance).replace('.', ',')}%
        </text>
        <path d={`M -8 -126 L 8 -126 L 0 -110 Z`} fill="#ECEDEF" />
      </svg>
    </div>
  );
}
