import { useEffect, useState } from 'react'
import { useTranslation } from '../../locales/i18n'
import { companyTierLabelKey } from '../../game/ranking'
import { resolveMediaSrc } from '../../game/mediaUrl'
import { playFanOpeningSting } from '../../game/uiSfx'
import type { StationGrade, StationGradeConfig } from '../../game/stationGradeConfig'
import {
  getCasinoHighLowMinGrade,
  getCasinoSlotMinGrade,
  getHighLowEntryFeeForGrade,
  getSlotEntryFeeForGrade,
  meetsCasinoGameGrade,
  STATION_TIER_LABEL,
} from '../../game/stationGradeConfig'
import {
  DEFAULT_HIGH_LOW_CONFIG,
  getActiveDealerMedia,
  HIGH_LOW_UI_ASSETS,
  type HighLowRoomConfig,
} from '../highlow/highLowConfig'
import { loadHighLowConfig, loadHighLowConfigFromDisk } from '../highlow/highLowStore'
import './casinoLobby.css'

export type CasinoLobbyGame = 'slot' | 'highlow'

type CasinoLobbyProps = {
  stationGrade: StationGrade
  stationGradeConfig: StationGradeConfig
  assets: number
  /** false when returning from a game / save restore — skip entrance video */
  playOpening?: boolean
  onEnterSlot: (fee: number) => void
  onEnterHighLow: (fee: number) => void
  onExit: () => void
  onTutorialSlot: () => void
  onTutorialHighLow: () => void
  onBlocked?: (reason: 'grade' | 'assets', game: CasinoLobbyGame) => void
}

const ASSET_BASE = `${import.meta.env.BASE_URL}casino/lobby/`
const CASINO_ENTRANCE_URL = `${ASSET_BASE}casino_entrance_4k48.mp4`

function pickDealerConfig(map: Record<string, HighLowRoomConfig | undefined>): HighLowRoomConfig {
  for (const key of ['local', 'legend', 'star'] as const) {
    const cfg = map[key]
    if (
      cfg?.dealerMediaStages?.tier1?.url ||
      cfg?.dealerMediaStages?.tier2?.url ||
      cfg?.dealerMediaStages?.tier3?.url ||
      cfg?.dealerMediaUrl
    ) {
      return cfg
    }
  }
  return map.local || map.legend || DEFAULT_HIGH_LOW_CONFIG.local
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden className="lobby__lock-icon">
      <path
        fill="currentColor"
        d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V6zm7 14H7V10h10v10zm-5-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
      />
    </svg>
  )
}

export function CasinoLobby({
  stationGrade,
  stationGradeConfig,
  assets,
  playOpening = true,
  onEnterSlot,
  onEnterHighLow,
  onExit,
  onTutorialSlot,
  onTutorialHighLow,
  onBlocked,
}: CasinoLobbyProps) {
  const { t, locale } = useTranslation()
  const [opening, setOpening] = useState(Boolean(playOpening))

  const [dealerConfig, setDealerConfig] = useState<HighLowRoomConfig>(() =>
    pickDealerConfig(loadHighLowConfig()),
  )

  useEffect(() => {
    if (!opening) return
    const stopSting = playFanOpeningSting()
    const timer = window.setTimeout(() => setOpening(false), 3000)
    return () => {
      window.clearTimeout(timer)
      stopSting()
    }
  }, [opening])

  useEffect(() => {
    let cancelled = false
    void loadHighLowConfigFromDisk().then((map) => {
      if (cancelled) return
      setDealerConfig(pickDealerConfig(map))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const dealerMedia = getActiveDealerMedia(dealerConfig, 0)

  const slotMin = getCasinoSlotMinGrade(stationGradeConfig)
  const highLowMin = getCasinoHighLowMinGrade(stationGradeConfig)
  const slotFee = getSlotEntryFeeForGrade(stationGradeConfig, stationGrade)
  const highLowFee = getHighLowEntryFeeForGrade(stationGradeConfig, stationGrade)

  const slotGradeOk = meetsCasinoGameGrade(stationGrade, slotMin)
  const highLowGradeOk = meetsCasinoGameGrade(stationGrade, highLowMin)
  const slotAssetsOk = assets >= slotFee
  const highLowAssetsOk = assets >= highLowFee

  const gradeName = (grade: StationGrade) => {
    const label = t(companyTierLabelKey(grade))
    return label === companyTierLabelKey(grade) ? STATION_TIER_LABEL[grade] : label
  }

  const tryEnter = (game: CasinoLobbyGame) => {
    if (opening) return
    const gradeOk = game === 'slot' ? slotGradeOk : highLowGradeOk
    const fee = game === 'slot' ? slotFee : highLowFee
    const assetsOk = assets >= fee
    if (!gradeOk) {
      onBlocked?.('grade', game)
      return
    }
    if (!assetsOk) {
      onBlocked?.('assets', game)
      return
    }
    if (game === 'slot') onEnterSlot(fee)
    else onEnterHighLow(fee)
  }

  const renderPortal = (game: CasinoLobbyGame) => {
    const isSlot = game === 'slot'
    const gradeOk = isSlot ? slotGradeOk : highLowGradeOk
    const assetsOk = isSlot ? slotAssetsOk : highLowAssetsOk
    const fee = isSlot ? slotFee : highLowFee
    const minGrade = isSlot ? slotMin : highLowMin
    const portalClass = isSlot ? 'lobby__portal--slot' : 'lobby__portal--highlow'
    const title = isSlot ? t('casino.enterSlot') : t('casino.enterHighLow')
    const canEnter = gradeOk && assetsOk

    let subtitle: string
    if (!gradeOk) {
      subtitle = t('casino.gradeRequired', { grade: gradeName(minGrade) })
    } else if (!assetsOk) {
      subtitle = t('casino.notEnoughAssets', { fee: fee.toLocaleString() })
    } else if (fee <= 0) {
      subtitle = t('casino.entryFree')
    } else {
      subtitle = t('casino.entryFee', { fee: fee.toLocaleString() })
    }

    const portalSrc = isSlot
      ? `${ASSET_BASE}lobby_portal_slot.webp`
      : `${ASSET_BASE}lobby_portal_highlow.webp`

    return (
      <div className={`lobby__portal-wrap ${portalClass}`}>
        <button
          type="button"
          className={`lobby__portal${!gradeOk ? ' is-locked' : ''}${gradeOk && !assetsOk ? ' is-broke' : ''}`}
          style={{ backgroundImage: `url(${portalSrc})` }}
          onClick={() => tryEnter(game)}
          aria-label={title}
        >
          <span
            className="lobby__portal-glow"
            style={{ backgroundImage: `url(${ASSET_BASE}lobby_portal_glow.webp)` }}
            aria-hidden
          />
          {!gradeOk ? (
            <span className="lobby__lock" aria-hidden>
              <LockIcon />
            </span>
          ) : null}
          <span className="lobby__label">
            <span className="lobby__label-title">{title}</span>
            <span className="lobby__label-sub">{subtitle}</span>
            {canEnter ? <span className="lobby__label-enter">{t('casino.lobbyEnter')}</span> : null}
          </span>
        </button>
        <button
          type="button"
          className="lobby__tutorial"
          onClick={() => (isSlot ? onTutorialSlot() : onTutorialHighLow())}
        >
          {isSlot ? t('casino.tutorialSlot') : t('casino.tutorialHighLow')}
        </button>
      </div>
    )
  }

  return (
    <div className="lobby">
      <div
        className="lobby__bg"
        style={{ backgroundImage: `url(${ASSET_BASE}lobby_stage_bg.webp)` }}
      />
      <div className="lobby__veil" aria-hidden />

      <div
        className="lobby__title"
        style={{ backgroundImage: `url(${ASSET_BASE}lobby_title_plate.webp)` }}
      >
        <span className="lobby__title-text">{t('casino.lobbyTitle')}</span>
      </div>

      <div className="lobby__assets">
        <span className="lobby__assets-label">{t('casino.userAssets')}</span>
        <span className="lobby__assets-value">${assets.toLocaleString()}</span>
      </div>

      <button
        type="button"
        className="lobby__exit"
        style={{ backgroundImage: `url(${ASSET_BASE}lobby_exit_btn.webp)` }}
        onClick={() => {
          if (opening) return
          onExit()
        }}
        disabled={opening}
      >
        <span>{t('casino.lobbyExit')}</span>
      </button>

      {/* Center CCTV — same dealer media as Slot / High-Low */}
      <div className="lobby__cctv" aria-hidden>
        <div className="lobby__cctv-monitor">
          <div className="lobby__cctv-feed">
            <div className="cctv-scanline lobby__cctv-scanline" />
            <div className="cctv-noise lobby__cctv-noise" />
            <div className="lobby__cctv-hud-tl">
              <span className="lobby__cctv-rec">
                <span className="lobby__cctv-rec-dot" />
                REC
              </span>
              <span className="lobby__cctv-cam">CAM-01</span>
            </div>
            <div className="lobby__cctv-hud-br">HD · LIVE</div>
            {dealerMedia?.url ? (
              dealerMedia.type === 'video' ? (
                <video
                  key={dealerMedia.url}
                  src={resolveMediaSrc(dealerMedia.url)}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="lobby__cctv-media"
                />
              ) : (
                <img
                  key={dealerMedia.url}
                  src={resolveMediaSrc(dealerMedia.url)}
                  alt=""
                  className="lobby__cctv-media"
                  draggable={false}
                />
              )
            ) : (
              <div className="lobby__cctv-fallback">
                <span className="lobby__cctv-fallback-icon">🎩</span>
                <span className="lobby__cctv-fallback-name">{dealerConfig.dealerName}</span>
              </div>
            )}
          </div>
          <img
            src={HIGH_LOW_UI_ASSETS.cctvBezel}
            alt=""
            draggable={false}
            className="lobby__cctv-bezel"
          />
        </div>
      </div>

      {renderPortal('slot')}
      {renderPortal('highlow')}

      {opening ? (
        <div className="fan-opening-shell absolute inset-0 z-40 flex items-center justify-center bg-black">
          <video
            src={resolveMediaSrc(CASINO_ENTRANCE_URL)}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
          />
          <p
            className={`fan-opening-title fan-opening-title--${locale} pointer-events-none absolute inset-x-0 text-center text-white`}
          >
            {t('casino.openingTitle')}
          </p>
        </div>
      ) : null}
    </div>
  )
}
