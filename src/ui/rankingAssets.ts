import { uiAsset } from '../game/mediaUrl'

const VER = 'v1'

export const RANKING_UI_ASSETS = {
  spotlight: uiAsset('ui/ranking/rank_spotlight.webp', VER),
  tipPlate: uiAsset('ui/ranking/rank_tip_plate.webp', VER),
} as const
