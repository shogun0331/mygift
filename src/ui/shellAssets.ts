import { uiAsset } from '../game/mediaUrl'

const VER = 'v3'

export const SHELL_UI_ASSETS = {
  dialogFrame: uiAsset('ui/shell/ui_dialog_frame.webp', VER),
  dialogBtn: uiAsset('ui/shell/ui_dialog_btn_primary.webp', VER),
  dialogBtnPressed: uiAsset('ui/shell/ui_dialog_btn_primary_pressed.webp', VER),
  liveChatFrame: uiAsset('ui/shell/dash_live_chat_frame.webp', VER),
  vnDialogueStrip: uiAsset('ui/shell/ui_vn_dialogue_strip.webp', VER),
  phoneBezel: uiAsset('ui/shell/ui_phone_bezel.webp', VER),
  toastFrame: uiAsset('ui/shell/ui_toast_frame.webp', VER),
} as const
