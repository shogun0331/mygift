const DECK_BASE = '/ui/deck'
const DECK_VER = 'v1'

export const DECK_UI_ASSETS = {
  stage: `${DECK_BASE}/deck_modal_stage.webp?${DECK_VER}`,
  slotEmpty: `${DECK_BASE}/deck_slot_empty.webp?${DECK_VER}`,
  cardBezel: `${DECK_BASE}/deck_card_bezel.webp?${DECK_VER}`,
} as const
