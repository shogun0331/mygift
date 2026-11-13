import { uiAsset } from '../game/mediaUrl'

const VER = 'v1'

export const DECK_UI_ASSETS = {
  stage: uiAsset('ui/deck/deck_modal_stage.webp', VER),
  slotEmpty: uiAsset('ui/deck/deck_slot_empty.webp', VER),
  cardBezel: uiAsset('ui/deck/deck_card_bezel.webp', VER),
} as const
