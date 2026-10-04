import { Close } from '../../components/icons';
import { useServerNow } from '../../lib/hooks';
import { isBonusAvailable, useBonus } from '../../store/bonus';
import { hasClaimableQuests, useQuests } from '../../store/quests';
import { useUi } from '../../store/ui';
import { BonusSection } from './BonusSection';
import { QuestsSection } from './QuestsSection';

/** Есть ли награда, которую можно забрать прямо сейчас (бонус или выполненное задание). */
export function useHasRewards(): boolean {
  const bonusReady = useBonus(s => isBonusAvailable(s.bonus));
  const questsReady = useQuests(s => hasClaimableQuests(s.data));
  return bonusReady || questsReady;
}

/** Bottom sheet «Награды»: ежедневный бонус и задания дня. */
export function RewardsSheet() {
  const open = useUi(s => s.rewardsOpen);
  if (!open) return null;
  return <SheetBody />;
}

function SheetBody() {
  const setUi = useUi(s => s.set);
  const bonus = useBonus(s => s.bonus);
  const quests = useQuests(s => s.data);
  const now = useServerNow();
  const close = () => setUi({ rewardsOpen: false });

  return (
    <>
      <button className="ov" aria-label="Закрыть" onClick={close} />
      <div className="sh tall">
        <div className="grab" />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div className="col" style={{ gap: 6, minWidth: 0 }}>
            <span className="disp" style={{ fontSize: 18, fontWeight: 600 }}>Ежедневный бонус</span>
            <span className="meta">Заходите каждый день — награда растёт</span>
          </div>
          <button className="ib" aria-label="Закрыть" onClick={close} style={{ width: 44, height: 44, margin: '-6px -10px 0 0' }}>
            <Close />
          </button>
        </div>

        {bonus && (
          <div className="col" data-tour="bonus" style={{ gap: 18, flex: 'none' }}>
            <BonusSection bonus={bonus} now={now} />
          </div>
        )}
        <div style={{ height: 1, background: '#23262D', flex: 'none' }} />
        {quests && <QuestsSection data={quests} now={now} />}
      </div>
    </>
  );
}
