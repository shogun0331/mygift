// 세이브/로드 UI 문구 추가 (7개국) — 용법: node fill-save-i18n.cjs
const fs = require('fs')
const path = require('path')

const DIR = path.join(__dirname, 'src', 'locales')
const FILES = ['KO.json', 'EN.json', 'JA.json', 'ZH-CN.json', 'RU.json', 'ES.json', 'DE.json']

const SAVE = {
  KO: {
    newGameTitle: '새 회사 시작',
    companyName: '회사 이름',
    companyNamePlaceholder: 'STAR',
    companyNameHint: '영문/숫자/공백만 입력 가능 · 비우면 STAR',
    start: '시작',
    cancel: '취소',
    loadTitle: '세이브 목록',
    emptySaves: '저장된 세이브가 없습니다.',
    delete: '삭제',
    deleteConfirm: '이 세이브를 삭제할까요?',
    playtime: '플레이타임',
    assets: '자산',
    viewers: '시청자',
  },
  EN: {
    newGameTitle: 'Start New Company',
    companyName: 'Company Name',
    companyNamePlaceholder: 'STAR',
    companyNameHint: 'English letters/numbers/spaces only · blank = STAR',
    start: 'Start',
    cancel: 'Cancel',
    loadTitle: 'Saved Games',
    emptySaves: 'No saved games yet.',
    delete: 'Delete',
    deleteConfirm: 'Delete this save?',
    playtime: 'Playtime',
    assets: 'Assets',
    viewers: 'Viewers',
  },
  JA: {
    newGameTitle: '新会社を始める',
    companyName: '会社名',
    companyNamePlaceholder: 'STAR',
    companyNameHint: '英数字・スペースのみ · 空欄なら STAR',
    start: '開始',
    cancel: 'キャンセル',
    loadTitle: 'セーブ一覧',
    emptySaves: 'セーブがありません。',
    delete: '削除',
    deleteConfirm: 'このセーブを削除しますか？',
    playtime: 'プレイ時間',
    assets: '資産',
    viewers: '視聴者',
  },
  'ZH-CN': {
    newGameTitle: '开始新公司',
    companyName: '公司名称',
    companyNamePlaceholder: 'STAR',
    companyNameHint: '仅限英文/数字/空格 · 留空则为 STAR',
    start: '开始',
    cancel: '取消',
    loadTitle: '存档列表',
    emptySaves: '暂无存档。',
    delete: '删除',
    deleteConfirm: '删除此存档？',
    playtime: '游戏时间',
    assets: '资产',
    viewers: '观众',
  },
  RU: {
    newGameTitle: 'Новая компания',
    companyName: 'Название компании',
    companyNamePlaceholder: 'STAR',
    companyNameHint: 'Только латиница/цифры/пробелы · пусто = STAR',
    start: 'Начать',
    cancel: 'Отмена',
    loadTitle: 'Сохранения',
    emptySaves: 'Сохранений пока нет.',
    delete: 'Удалить',
    deleteConfirm: 'Удалить это сохранение?',
    playtime: 'Время игры',
    assets: 'Активы',
    viewers: 'Зрители',
  },
  ES: {
    newGameTitle: 'Nueva compañía',
    companyName: 'Nombre de la compañía',
    companyNamePlaceholder: 'STAR',
    companyNameHint: 'Solo letras/números/espacios · vacío = STAR',
    start: 'Empezar',
    cancel: 'Cancelar',
    loadTitle: 'Partidas guardadas',
    emptySaves: 'Aún no hay partidas guardadas.',
    delete: 'Eliminar',
    deleteConfirm: '¿Eliminar esta partida?',
    playtime: 'Tiempo de juego',
    assets: 'Activos',
    viewers: 'Espectadores',
  },
  DE: {
    newGameTitle: 'Neues Unternehmen',
    companyName: 'Firmenname',
    companyNamePlaceholder: 'STAR',
    companyNameHint: 'Nur Buchstaben/Zahlen/Leerzeichen · leer = STAR',
    start: 'Starten',
    cancel: 'Abbrechen',
    loadTitle: 'Spielstände',
    emptySaves: 'Noch keine Spielstände.',
    delete: 'Löschen',
    deleteConfirm: 'Diesen Spielstand löschen?',
    playtime: 'Spielzeit',
    assets: 'Vermögen',
    viewers: 'Zuschauer',
  },
}

for (const file of FILES) {
  const lang = file.replace('.json', '')
  const filePath = path.join(DIR, file)
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  if (json.save) throw new Error(`save section already exists in ${file}`)
  json.save = SAVE[lang]
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8')
  console.log(`updated ${file}`)
}
