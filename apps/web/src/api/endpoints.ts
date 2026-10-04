import type {
  AlbumDTO, ClaimAlbumResponse, CraftRequest, CraftResponse, UpgradeRequest, UpgradeResponse,
  BalanceResponse, BidResponse, BuyUpgradeResponse, UpgradeId, UpgradesDTO, ClaimBonusResponse, ClaimQuestResponse, DailyBonusDTO, QuestsDTO, LeaderboardDTO, LeaderboardMetric, ListResponse, LotsSnapshot,
  Rarity, SellManyResponse, SellResponse, SessionResponse, SimDTO, SpinResponse, UserDTO
} from '@simrush/shared';
import { request } from './http';

const enc = encodeURIComponent;

export const api = {
  createSession: () => request<SessionResponse>('POST', '/api/session'),
  me: () => request<UserDTO>('GET', '/api/me'),
  topUp: () => request<BalanceResponse>('POST', '/api/wallet/topup'),
  saveTutorial: (step: number) => request<void>('POST', '/api/tutorial', { step }),

  bonus: () => request<DailyBonusDTO>('GET', '/api/bonus'),
  claimBonus: () => request<ClaimBonusResponse>('POST', '/api/bonus/claim'),

  album: () => request<AlbumDTO>('GET', '/api/album'),
  claimAlbum: (id: string) => request<ClaimAlbumResponse>('POST', `/api/album/${enc(id)}/claim`),

  upgrades: () => request<UpgradesDTO>('GET', '/api/upgrades'),
  buyUpgrade: (id: UpgradeId) => request<BuyUpgradeResponse>('POST', `/api/upgrades/${enc(id)}/buy`),

  quests: () => request<QuestsDTO>('GET', '/api/quests'),
  claimQuest: (questId: string) => request<ClaimQuestResponse>('POST', `/api/quests/${enc(questId)}/claim`),

  spin: (rarity?: Rarity) => request<SpinResponse>('POST', '/api/spin', rarity ? { rarity } : {}),

  sims: () => request<SimDTO[]>('GET', '/api/sims'),
  sell: (simId: string) => request<SellResponse>('POST', `/api/sims/${enc(simId)}/sell`),
  sellMany: (ids: string[]) => request<SellManyResponse>('POST', '/api/sims/sell-many', { ids }),
  list: (simId: string, startPrice: number) => request<ListResponse>('POST', `/api/sims/${enc(simId)}/list`, { startPrice }),

  craft: (body: CraftRequest) => request<CraftResponse>('POST', '/api/craft', body),
  upgrade: (body: UpgradeRequest) => request<UpgradeResponse>('POST', '/api/upgrade', body),

  lots: () => request<LotsSnapshot>('GET', '/api/lots'),
  bid: (lotId: string) => request<BidResponse>('POST', `/api/lots/${enc(lotId)}/bid`),
  cancel: (lotId: string) => request<void>('POST', `/api/lots/${enc(lotId)}/cancel`),

  leaderboard: (by: LeaderboardMetric) => request<LeaderboardDTO>('GET', `/api/leaderboard?by=${by}`)
};
