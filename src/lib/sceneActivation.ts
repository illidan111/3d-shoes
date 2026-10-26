import { configsEqual, DEFAULT_CONFIG } from '../config/parts'
import { parseConfig } from './urlState'

/** A customized share link must never show a mismatched static preview. */
export function shouldStartScene(compact: boolean, search: string): boolean {
  return !compact || !configsEqual(parseConfig(search), DEFAULT_CONFIG)
}
