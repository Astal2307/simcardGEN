import { fmt, questTitle, RARITY, shortNum, type Notice } from '@simrush/shared';
import { subscribeEvents } from '../api/events';
import { getToken } from '../api/http';
import { useBonus } from './bonus';
import { useGame } from './game';
import { useQuests } from './quests';
import { COLORS, toast } from './toast';

function noticeToast(n: Notice) {
  switch (n.kind) {
    case 'outbid': return toast('Ставку перебили · ' + shortNum(n.digits), COLORS.warning);
    case 'won': return toast('Номер ваш · ' + shortNum(n.digits), RARITY[n.rarity].color);
    case 'sold': return toast('Продано · ' + fmt(n.amount), COLORS.positive);
    case 'unsold': return toast('Без ставок · номер вернулся', COLORS.neutral);
    case 'quest_done': return toast('Задание выполнено · ' + questTitle(n.quest, n.target), COLORS.gold);
  }
}

/** Связывает поток событий сервера со сторами. Возвращает функцию отписки. */
export function connectRealtime(): () => void {
  const game = useGame.getState;
  let connected = false;
  return subscribeEvents(getToken()!, {
    open: () => {
      // после переподключения могли пропустить события — сверяемся с сервером
      if (connected) {
        void game().refreshSims();
        void useQuests.getState().refresh();
        void useBonus.getState().refresh();
      }
      connected = true;
    },
    lots: s => game().applyLots(s),
    balance: ({ balance }) => game().setBalance(balance),
    collection: () => void game().refreshSims(),
    quests: q => useQuests.getState().apply(q),
    notice: noticeToast
  });
}
