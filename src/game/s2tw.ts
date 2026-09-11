import OpenCC from 'opencc-js'

const convert = OpenCC.Converter({ from: 'cn', to: 'tw' })

export function s2tw(text: string): string {
  if (!text) return text
  return convert(text)
}
