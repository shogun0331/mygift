import { uiAsset } from '../game/mediaUrl'

const VER = 'v1'

export const HUD_UI_ASSETS = {
  casino: uiAsset('ui/hud/hud_ico_casino.webp', VER),
  fan: uiAsset('ui/hud/hud_ico_fan.webp', VER),
  coin: uiAsset('ui/hud/hud_ico_coin.webp', VER),
} as const
