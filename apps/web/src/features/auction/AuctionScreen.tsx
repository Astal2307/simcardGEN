import { fmt, mmss, nextBid, phone, RARITY, type LotDTO } from '@simrush/shared';
import { Clock, Coin } from '../../components/icons';
import { RarityChips } from '../../components/RarityChips';
import { Segmented } from '../../components/Segmented';
import { secondsLeft, useServerNow } from '../../lib/hooks';
import { useGame } from '../../store/game';
import { useUi } from '../../store/ui';

const byEnd = (a: LotDTO, b: LotDTO) => a.endsAt - b.endsAt;

export function AuctionScreen() {
  const lots = useGame(s => s.lots);
  const meId = useGame(s => s.user?.id);
  const { aucSeg, aucFilter, set: setUi } = useUi();
  const now = useServerNow();

  const mine = lots.filter(l => l.seller.id === meId).sort(byEnd);
  const others = lots
    .filter(l => l.seller.id !== meId && (aucFilter === 'all' || l.sim.rarity === aucFilter))
    .sort(byEnd);

  return (
    <div className="col">
      <Segmented
        value={aucSeg}
        onChange={v => setUi({ aucSeg: v })}
        options={[{ value: 'all', label: 'Лоты' }, { value: 'mine', label: `Мои · ${mine.length}` }]}
      />
      {aucSeg === 'all' ? (
        <>
          <RarityChips value={aucFilter} onChange={v => setUi({ aucFilter: v })} />
          <div className="list" style={{ gap: 10 }}>
            {others.map(l => <LotCard key={l.id} lot={l} now={now} meId={meId} />)}
            {others.length === 0 && <div className="empty">Нет лотов</div>}
          </div>
        </>
      ) : (
        <div className="list" style={{ gap: 10 }}>
          {mine.map(l => <MyLotCard key={l.id} lot={l} now={now} />)}
          {mine.length === 0 && <div className="empty">Пусто</div>}
        </div>
      )}
    </div>
  );
}

function Timer({ endsAt, now, className = '' }: { endsAt: number; now: number; className?: string }) {
  const left = secondsLeft(endsAt, now);
  return (
    <span className={'mono timer' + className + (left <= 10 ? ' urg' : '')}>
      <Clock /><span>{mmss(left)}</span>
    </span>
  );
}

function BidValue({ lot }: { lot: LotDTO }) {
  return (
    <div className="col" style={{ gap: 3, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: '#7D828B' }}>Ставка · {lot.bids}</span>
      <span className="bidv tnum"><Coin s={15} /><span>{fmt(lot.bid)}</span></span>
    </div>
  );
}

function LotCard({ lot, now, meId }: { lot: LotDTO; now: number; meId?: number }) {
  const balance = useGame(s => s.balance);
  const bid = useGame(s => s.bid);
  const leading = lot.leaderId === meId;
  const price = nextBid(lot);

  return (
    <div className="lot">
      <div className="lr wrap">
        <span className="mono ln">{phone(lot.sim.digits)}</span>
        <span className={'tag t-' + lot.sim.rarity}>{RARITY[lot.sim.rarity].name}</span>
      </div>
      <div className="lr meta">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span className="av-s">{lot.seller.name.charAt(0).toUpperCase()}</span>
          <span className="ell">{lot.seller.name}</span>
        </span>
        <Timer endsAt={lot.endsAt} now={now} />
      </div>
      <div className="lr end">
        <BidValue lot={lot} />
        {leading ? (
          <button className="bb ghost" disabled>Вы лидер</button>
        ) : (
          <button className="bb" onClick={() => void bid(lot.id)} disabled={balance < price}>
            {lot.bids > 0 ? `+ ${fmt(lot.step)}` : fmt(price)}
          </button>
        )}
      </div>
    </div>
  );
}

function MyLotCard({ lot, now }: { lot: LotDTO; now: number }) {
  const cancel = useGame(s => s.cancelLot);
  return (
    <div className="lot">
      <div className="lr">
        <span className="mono ln ell" style={{ minWidth: 0 }}>{phone(lot.sim.digits)}</span>
        <Timer endsAt={lot.endsAt} now={now} className=" meta" />
      </div>
      <div className="lr end">
        <BidValue lot={lot} />
        {lot.bids === 0 ? (
          <button className="bb ghost" onClick={() => void cancel(lot.id)}>Снять</button>
        ) : (
          <span className={'tag t-' + lot.sim.rarity}>{RARITY[lot.sim.rarity].name}</span>
        )}
      </div>
    </div>
  );
}
