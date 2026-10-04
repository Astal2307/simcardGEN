import { Fragment, useEffect } from 'react';
import {
  activeGuarantees, BASE_GUARANTEE, fmt, RARITIES, RARITY, UPGRADE_BRANCHES, UPGRADES,
  type Guarantee, type PityDTO, type UpgradeId
} from '@simrush/shared';
import { Check, Coin, Lock } from '../../components/icons';
import { useGame } from '../../store/game';
import { useUpgrades } from '../../store/upgrades';

type NodeState = 'active' | 'owned' | 'available' | 'locked';

const rarityOfTier = (tier: number) => RARITIES[tier - 1];

/** Дерево апгрейдов: корень — базовая гарантия, ветки — период и пороги старших тиров. */
export function UpgradesScreen() {
  const data = useUpgrades(s => s.data);
  const refresh = useUpgrades(s => s.refresh);
  useEffect(() => { void refresh(); }, [refresh]);
  if (!data) return null;

  const owned = new Set(data.owned);
  const active = activeGuarantees(data.owned);
  const isActive = (g: Guarantee) => active.some(a => a.tier === g.tier && a.period === g.period);
  const pityOf = (tier: number) => data.pity.find(p => p.tier === tier);

  const stateOf = (id: UpgradeId): NodeState => {
    const u = UPGRADES[id];
    if (owned.has(id)) return isActive(u) ? 'active' : 'owned';
    return !u.requires || owned.has(u.requires) ? 'available' : 'locked';
  };

  const [left, right] = UPGRADE_BRANCHES;
  return (
    <div className="col">
      <div className="tree-root">
        <UpgradeNode
          tier={BASE_GUARANTEE.tier}
          period={BASE_GUARANTEE.period}
          state={isActive(BASE_GUARANTEE) ? 'active' : 'owned'}
          pity={pityOf(BASE_GUARANTEE.tier)}
        />
      </div>
      <div className="fork">
        <i className="stem on" />
        <i className={'half l' + (owned.has(left[0]) ? ' on' : '')} />
        <i className={'half r' + (owned.has(right[0]) ? ' on' : '')} />
        <i className={'drop l' + (owned.has(left[0]) ? ' on' : '')} />
        <i className={'drop r' + (owned.has(right[0]) ? ' on' : '')} />
      </div>
      <div className="tree">
        {UPGRADE_BRANCHES.map((branch, b) => (
          <div className="branch" key={b}>
            {branch.map((id, i) => (
              <Fragment key={id}>
                {i > 0 && <i className={'lnk' + (owned.has(id) ? ' on' : '')} />}
                <UpgradeNode id={id} tier={UPGRADES[id].tier} period={UPGRADES[id].period} state={stateOf(id)} pity={pityOf(UPGRADES[id].tier)} />
              </Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface NodeProps {
  id?: UpgradeId;
  tier: number;
  period: number;
  state: NodeState;
  pity?: PityDTO;
}

function UpgradeNode({ id, tier, period, state, pity }: NodeProps) {
  const balance = useGame(s => s.balance);
  const buy = useUpgrades(s => s.buy);
  const buying = useUpgrades(s => s.buying);
  const r = rarityOfTier(tier);
  const cost = id ? UPGRADES[id].cost : 0;
  const owned = state === 'active' || state === 'owned';

  return (
    <div className={`un ${state}` + (r === 'legendary' && owned ? ' leg' : '')}>
      <div className="un-p"><span className="disp">{period}</span>-я крутка</div>
      <div className="un-top">
        <span className={'tag t-' + r}>{RARITY[r].name}+</span>
        {owned && <Check />}
        {state === 'locked' && <Lock />}
      </div>
      <div className="un-b">
        {state === 'active' && pity && (
          <>
            <div className="un-bar">
              <div className={'bg-' + r} style={{ width: `${(pity.count / pity.period) * 100}%` }} />
            </div>
            <span className="un-c mono">{pity.count}/{pity.period}</span>
          </>
        )}
        {state === 'available' && id && (
          <button className="bb ub" disabled={balance < cost || buying !== null} onClick={() => void buy(id)}>
            <Coin s={13} c="#0E0F12" />
            <span className="tnum">{fmt(cost)}</span>
          </button>
        )}
        {state === 'locked' && (
          <span className="un-cost tnum"><Coin s={13} /><span>{fmt(cost)}</span></span>
        )}
      </div>
    </div>
  );
}
