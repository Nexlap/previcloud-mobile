import { Dimensions } from 'react-native'

const A4_RATIO = 297 / 210

export const PREVIEW_WIDTH = Dimensions.get('window').width - 16 * 2 - 16 * 2 - 2
export const PREVIEW_HEIGHT = PREVIEW_WIDTH * A4_RATIO
