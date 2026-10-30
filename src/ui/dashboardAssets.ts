const DASH_ASSET_BASE = '/ui/dashboard'
const DASH_ASSET_VER = 'v1'

export const DASHBOARD_UI_ASSETS = {
  stageBg: `${DASH_ASSET_BASE}/dash_stage_bg.webp?${DASH_ASSET_VER}`,
  streamBezel: `${DASH_ASSET_BASE}/dash_stream_bezel.webp?${DASH_ASSET_VER}`,
  btnStartLive: `${DASH_ASSET_BASE}/dash_btn_start_live.webp?${DASH_ASSET_VER}`,
  btnStartLivePressed: `${DASH_ASSET_BASE}/dash_btn_start_live_pressed.webp?${DASH_ASSET_VER}`,
  hudQuestFrame: `${DASH_ASSET_BASE}/dash_hud_quest_frame.webp?${DASH_ASSET_VER}`,
  btnPromoAudit: `${DASH_ASSET_BASE}/dash_btn_promo_audit.webp?${DASH_ASSET_VER}`,
  rankCrown: `${DASH_ASSET_BASE}/dash_rank_crown.webp?${DASH_ASSET_VER}`,
} as const
