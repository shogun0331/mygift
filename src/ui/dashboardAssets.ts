import { uiAsset } from '../game/mediaUrl'

const VER = 'v1'

export const DASHBOARD_UI_ASSETS = {
  stageBg: uiAsset('ui/dashboard/dash_stage_bg.webp', VER),
  streamBezel: uiAsset('ui/dashboard/dash_stream_bezel.webp', VER),
  btnStartLive: uiAsset('ui/dashboard/dash_btn_start_live.webp', VER),
  btnStartLivePressed: uiAsset('ui/dashboard/dash_btn_start_live_pressed.webp', VER),
  hudQuestFrame: uiAsset('ui/dashboard/dash_hud_quest_frame.webp', VER),
  btnPromoAudit: uiAsset('ui/dashboard/dash_btn_promo_audit.webp', VER),
  rankCrown: uiAsset('ui/dashboard/dash_rank_crown.webp', VER),
} as const
