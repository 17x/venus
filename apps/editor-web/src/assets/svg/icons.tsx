/*export const icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" fill="currentColor"/>
  <path d="M6.08 9.5l-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" fill="currentColor"/>
  <path d="M12 2v4m0 0l-2-2m2 2l2-2" stroke="currentColor"/>
</svg>`*/

export const lineSeg = () => <svg stroke="currentColor" fill="none" strokeWidth="1" viewBox="0 0 24 24"
                                  strokeLinecap="round" strokeLinejoin="round" height="20" width="20"
                                  xmlns="http://www.w3.org/2000/svg">
  <path d="M6 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
  <path d="M18 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
  <path d="M7.5 16.5l9 -9"></path>
</svg>

export const mousePointer = (fill: boolean = true) => <svg xmlns="http://www.w3.org/2000/svg"
                                                           strokeLinecap="round"
                                                           strokeLinejoin="round"
                                                           width="18"
                                                           height="18"
                                                           viewBox="0 0 13.49 21.53">
  <path
    d="M12.7,13.82h-4.44l2.34,5.69c.16.39-.02.84-.4,1l-2.06.9c-.38.17-.81-.02-.98-.41l-2.22-5.4-3.63,3.73c-.48.5-1.27.11-1.27-.54V.81C.05.13.88-.21,1.32.28l11.9,12.24c.48.47.13,1.3-.52,1.3Z"
    fill={fill ? 'currentColor' : 'none'}
    stroke="currentColor"/>
</svg>