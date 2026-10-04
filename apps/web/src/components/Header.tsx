import { fmt } from '@simrush/shared';
import { useHasRewards } from '../features/rewards/RewardsSheet';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { Coin, Gift, Plus, SimIcon } from './icons';

export function Header() {
  const balance = useGame(s => s.balance);
  const topUp = useGame(s => s.topUp);
  const setUi = useUi(s => s.set);
  const hasRewards = useHasRewards();

  return (
    <div className="hdr">
      <div className="disp logo">
        <SimIcon w={20} h={22} sw={1.8} stroke="#ECEDEF" />
        <span>SIMRUSH</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button className="ib gift" data-tour="gift" aria-label="Награды" onClick={() => setUi({ rewardsOpen: true })}>
          <Gift />
          {hasRewards && <span className="gift-dot" />}
        </button>
        <div className="bal">
          <Coin />
          <span className="bal-v tnum">{fmt(balance)}</span>
          <button className="ib" aria-label="Пополнить" onClick={() => void topUp()}>
            <Plus />
          </button>
        </div>
      </div>
    </div>
  );
}
