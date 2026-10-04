import { useEffect, useRef } from 'react';
import { BottomNav } from '../components/BottomNav';
import { Header } from '../components/Header';
import { ToastView } from '../components/ToastView';
import { AlbumFx } from '../features/album/AlbumFx';
import { AlbumScreen } from '../features/album/AlbumScreen';
import { AuctionScreen } from '../features/auction/AuctionScreen';
import { CollectionScreen } from '../features/collection/CollectionScreen';
import { SellAllSheet } from '../features/collection/SellAllSheet';
import { SimSheet } from '../features/collection/SimSheet';
import { RatingScreen } from '../features/rating/RatingScreen';
import { RewardsSheet } from '../features/rewards/RewardsSheet';
import { SpinScreen } from '../features/spin/SpinScreen';
import { SimPicker } from '../features/workshop/SimPicker';
import { Tutorial } from '../features/tutorial/Tutorial';
import { useTutorial } from '../features/tutorial/tutorialStore';
import { UpgradesScreen } from '../features/upgrades/UpgradesScreen';
import { hasClaimableAlbum, useAlbum } from '../store/album';
import { isBonusAvailable, useBonus } from '../store/bonus';
import { useGame } from '../store/game';
import { hasClaimableQuests, useQuests } from '../store/quests';
import { connectRealtime } from '../store/realtime';
import { useUpgrades } from '../store/upgrades';
import { useUi, type Tab } from '../store/ui';

const SCREENS: Record<Tab, () => React.JSX.Element | null> = {
  spin: SpinScreen,
  coll: CollectionScreen,
  album: AlbumScreen,
  auc: AuctionScreen,
  upg: UpgradesScreen,
  rate: RatingScreen
};

export function App() {
  const status = useGame(s => s.status);
  const boot = useGame(s => s.boot);
  const tab = useUi(s => s.tab);
  const setUi = useUi(s => s.set);
  const scr = useRef<HTMLDivElement>(null);
  const albumReward = useAlbum(hasClaimableAlbum);
  const touring = useTutorial(s => s.active);

  useEffect(() => { void boot(); }, [boot]);

  // после входа: подписка на события, загрузка наград и автопоказ, если что-то ждёт игрока
  useEffect(() => {
    if (status !== 'ready') return;
    const disconnect = connectRealtime();
    // новый игрок — обучение; оно само подведёт к наградам
    useTutorial.getState().init(useGame.getState().user!.tutorial);
    void useUpgrades.getState().refresh();
    void useAlbum.getState().refresh();
    void Promise.all([useBonus.getState().refresh(), useQuests.getState().refresh()]).then(() => {
      if (useTutorial.getState().active) return;
      const ready = isBonusAvailable(useBonus.getState().bonus) || hasClaimableQuests(useQuests.getState().data);
      if (ready) useUi.getState().set({ rewardsOpen: true });
    });
    return disconnect;
  }, [status]);

  const go = (t: Tab) => {
    setUi({ tab: t, sheet: null, sellAllOpen: false });
    scr.current?.scrollTo({ top: 0 });
  };

  const Screen = SCREENS[tab];
  return (
    <div className={'app' + (touring ? ' touring' : '')}>
      <Header />
      <ToastView />
      <AlbumFx />

      <div className="scr" ref={scr}>
        {status === 'ready' && <Screen />}
        {status === 'loading' && <div className="boot">Загрузка…</div>}
        {status === 'error' && (
          <div className="boot">
            <span>Не удалось подключиться к серверу</span>
            <button className="bb" onClick={() => void boot()}>Повторить</button>
          </div>
        )}
      </div>

      <BottomNav tab={tab} onChange={go} dots={{ album: albumReward }} />
      <SimSheet />
      <SimPicker />
      <SellAllSheet />
      <Tutorial />
      <RewardsSheet />
    </div>
  );
}
