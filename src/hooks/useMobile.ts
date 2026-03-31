import { useMediaQuery } from './useMediaQuery'

export const useMobile = () => useMediaQuery('(max-width: 767px)')
export const useTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
export const useDesktop = () => useMediaQuery('(min-width: 1024px)')
