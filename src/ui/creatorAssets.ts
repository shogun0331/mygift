import { uiAsset } from '../game/mediaUrl'

const VER = 'v1'

export const CREATOR_UI_ASSETS = {
  gradePlate: uiAsset('ui/creator/creator_grade_plate.webp', VER),
  typeSexy: uiAsset('ui/creator/creator_type_sexy.webp', VER),
  typeTalk: uiAsset('ui/creator/creator_type_talk.webp', VER),
  typeMind: uiAsset('ui/creator/creator_type_mind.webp', VER),
  typeStage: uiAsset('ui/creator/creator_type_stage.webp', VER),
} as const
