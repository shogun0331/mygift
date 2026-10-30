const SHELL_BASE = '/ui/shell'
const SHELL_VER = 'v3'

export const SHELL_UI_ASSETS = {
  dialogFrame: `${SHELL_BASE}/ui_dialog_frame.webp?${SHELL_VER}`,
  dialogBtn: `${SHELL_BASE}/ui_dialog_btn_primary.webp?${SHELL_VER}`,
  dialogBtnPressed: `${SHELL_BASE}/ui_dialog_btn_primary_pressed.webp?${SHELL_VER}`,
  liveChatFrame: `${SHELL_BASE}/dash_live_chat_frame.webp?${SHELL_VER}`,
  vnDialogueStrip: `${SHELL_BASE}/ui_vn_dialogue_strip.webp?${SHELL_VER}`,
  phoneBezel: `${SHELL_BASE}/ui_phone_bezel.webp?${SHELL_VER}`,
  toastFrame: `${SHELL_BASE}/ui_toast_frame.webp?${SHELL_VER}`,
} as const
