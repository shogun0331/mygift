/** `build-electron-uncensored.bat` / VITE_DISABLE_MOSAIC=true 일 때 SNS·VN·승급심사 모자이크를 그리지 않는다. */
export const IS_MOSAIC_DISABLED = import.meta.env.VITE_DISABLE_MOSAIC === 'true'
