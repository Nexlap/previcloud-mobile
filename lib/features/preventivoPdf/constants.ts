import { Dimensions } from 'react-native'

const TEMPLATE_WIDTH_PX = 800
const PAGE_HEIGHT_LAYOUT = 1123

export const PREVIEW_WIDTH = Dimensions.get('window').width - 16 * 2 - 16 * 2 - 2
export const PREVIEW_HEIGHT = Math.round(PAGE_HEIGHT_LAYOUT * (PREVIEW_WIDTH / TEMPLATE_WIDTH_PX))
