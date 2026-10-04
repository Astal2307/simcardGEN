import { useGame } from '../../store/game';
import type { Tab } from '../../store/ui';
import { useUpgrades } from '../../store/upgrades';
import { useWorkshop } from '../../store/workshop';
import { useSpin } from '../spin/spinStore';

/** Что подсвечивать: селектор, объединение нескольких элементов или вычисляемый элемент. */
export type Target = string | string[] | (() => Element | null);

export type StepAction =
  /** Показать и ждать «Далее». */
  | { kind: 'next'; label?: string }
  /** Ждать нажатия на подсвеченный элемент. */
  | { kind: 'tap' }
  /** Ждать, пока счётчик вырастет на need (крутки, крафт, ставка…). */
  | { kind: 'count'; counter: () => number; need: number }
  /** Ждать выполнения условия (выбран номер, позиция…). */
  | { kind: 'until'; check: () => boolean }
  /** Ждать получения ежедневного бонуса. */
  | { kind: 'claimBonus' };

export interface TourStep {
  target?: Target;
  title: string;
  text?: string;
  action: StepAction;
  /** Какой экран нужен шагу (в том числе при продолжении после перезагрузки). */
  prepare?: { tab?: Tab; rewards?: boolean; seg?: 'list' | 'craft' | 'upgrade' };
  /** Вызывается при входе в шаг. */
  enter?: () => void;
  /** Если действие сейчас невозможно (нет денег, нет лотов) — показать «Далее». */
  skipIf?: () => boolean;
}

const ws = () => useWorkshop.getState();
/** Пока открыт выбор номера — подсвечиваем его, иначе — слот. */
const pickerOr = (selector: string) => () => document.querySelector(ws().picker ? '.sh' : selector);
/** Самый дешёвый лот, на который хватает денег, — чтобы после ставки осталось на гарантию. */
const firstBiddable = () => {
  const lots = [...document.querySelectorAll('.lot')].filter(l => l.querySelector('.bb:not(.ghost):not(:disabled)'));
  const price = (l: Element) => Number(l.querySelector('.bidv')?.textContent?.replace(/\D/g, '') ?? Infinity);
  return lots.sort((a, b) => price(a) - price(b))[0] ?? null;
};
const firstBuyable = () => document.querySelector('.un.available .ub:not(:disabled)')?.closest('.un') ?? null;
const navTap = (tab: Tab, title: string): TourStep =>
  ({ target: `[data-tour=nav-${tab}]`, title, text: 'Нажмите на вкладку', action: { kind: 'tap' }, prepare: { rewards: false } });

export const STEPS: TourStep[] = [
  { title: 'SIMRUSH', text: 'Выбивайте красивые номера. Покажу, как всё устроено', action: { kind: 'next', label: 'Начать' }, prepare: { tab: 'spin', rewards: false } },

  // крутки
  {
    target: ['[data-tour=reel]', '.rinfo', '[data-tour=spin]'], title: 'Крутите',
    action: { kind: 'count', counter: () => useSpin.getState().revealed, need: 3 }, prepare: { tab: 'spin', rewards: false }
  },
  { target: '[data-tour=chances]', title: 'Шансы редкостей', action: { kind: 'next' }, prepare: { tab: 'spin' } },
  { target: '[data-tour=pity]', title: 'Гарантия', text: 'Каждая 10-я крутка — Необычный или выше', action: { kind: 'next' }, prepare: { tab: 'spin' } },

  // награды
  { target: '[data-tour=gift]', title: 'Награды', text: 'Нажмите на подарок', action: { kind: 'tap' }, prepare: { rewards: false } },
  { target: '[data-tour=bonus]', title: 'Ежедневный бонус', text: 'Заберите — завтра будет больше', action: { kind: 'claimBonus' }, prepare: { rewards: true } },
  { target: '[data-tour=quests]', title: 'Задания дня', text: 'Выполняйте и забирайте монеты', action: { kind: 'next' }, prepare: { rewards: true } },

  // номера и крафт
  navTap('coll', 'Номера'),
  { target: '[data-tour=list] .row', title: 'Ваш номер', text: 'Нажмите — продажа и аукцион', action: { kind: 'next' }, prepare: { tab: 'coll', seg: 'list' } },
  { target: '[data-tour=workshop] .sg:nth-child(2)', title: 'Крафт', text: 'Сожгите три номера — цифра в четвёртом сменится', action: { kind: 'tap' }, prepare: { tab: 'coll' } },
  {
    target: pickerOr('[data-tour=craft-target]'), title: 'Выберите номер',
    action: { kind: 'until', check: () => !!ws().targetId && !ws().picker },
    prepare: { tab: 'coll', seg: 'craft' },
    // в обучении — только то, из чего крафт гарантированно сложится
    enter: () => ws().set({ tourFilter: { target: ['common', 'uncommon'], burn: ['common'] } })
  },
  {
    target: '.ne', title: 'Выберите позицию', text: 'Цифра на ней выпадет случайно',
    action: { kind: 'until', check: () => ws().position !== null }, prepare: { tab: 'coll', seg: 'craft' }
  },
  {
    target: pickerOr('[data-tour=burns]'), title: 'Сожгите три номера', text: 'Одной редкости',
    action: { kind: 'until', check: () => ws().burnIds.every(Boolean) && !ws().picker }, prepare: { tab: 'coll', seg: 'craft' }
  },
  {
    target: '[data-tour=craft-btn]', title: 'Крафт',
    action: { kind: 'count', counter: () => ws().craftCount, need: 1 }, prepare: { tab: 'coll', seg: 'craft' }
  },

  // апгрейд номера
  { target: '[data-tour=workshop] .sg:nth-child(3)', title: 'Апгрейд', text: 'Номер на номер — шанс зависит от редкости', action: { kind: 'tap' }, prepare: { tab: 'coll' } },
  {
    target: pickerOr('[data-tour=sacrifice]'), title: 'Выберите жертву',
    action: { kind: 'until', check: () => !!ws().sacrificeId && !ws().picker },
    prepare: { tab: 'coll', seg: 'upgrade' },
    enter: () => ws().set({ tourFilter: null })
  },
  {
    target: ['.wheel', '[data-tour=upgrade-btn]'], title: 'Крутите колесо',
    action: { kind: 'count', counter: () => ws().upgradeCount, need: 1 }, prepare: { tab: 'coll', seg: 'upgrade' }
  },

  // коллекции
  navTap('album', 'Коллекции'),
  { target: '.alb', title: 'Собирайте узоры', text: 'За полную коллекцию — награда', action: { kind: 'next' }, prepare: { tab: 'album' } },

  // аукцион
  navTap('auc', 'Аукцион'),
  {
    target: firstBiddable, title: 'Сделайте ставку', text: 'Когда время выйдет, номер получит лидер',
    action: { kind: 'count', counter: () => useGame.getState().bidCount, need: 1 }, prepare: { tab: 'auc' },
    skipIf: () => !firstBiddable()
  },

  // дерево апгрейдов
  navTap('upg', 'Апгрейды'),
  {
    target: firstBuyable, title: 'Купите гарантию', text: 'Редкие номера будут выпадать чаще',
    action: { kind: 'count', counter: () => useUpgrades.getState().buyCount, need: 1 }, prepare: { tab: 'upg' },
    skipIf: () => !firstBuyable()
  },

  // рейтинг
  navTap('rate', 'Рейтинг'),
  { target: '.card.hero', title: 'Ваше место', text: 'Соревнуйтесь с другими игроками', action: { kind: 'next', label: 'Готово' }, prepare: { tab: 'rate' } }
];
