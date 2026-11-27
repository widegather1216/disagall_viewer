import { CONFIG } from './config.js';

export const state = {
  postImages: [],
  currentIndex: 0,
  currentPadding: CONFIG.DEFAULT_PADDING,
  lastRightClickedImgSrc: null,
  previousBodyOverflow: '',

  // DOM Elements Cache
  elements: {
    overlayEl: null,
    stageEl: null,
    mainImgEl: null,
    counterEl: null,
    infoBadgeEl: null,
    sliderEl: null,
    sliderValEl: null,
    prevBtnEl: null,
    nextBtnEl: null,
    loaderEl: null,
    toastEl: null,
    recommendBtnEl: null,
    fullscreenBtnEl: null,
  },

  toastTimer: null,
  noPhotoNoticeTimer: null,
  postNavTimer: null,
  autoOpenPollTimer: null,
  quickLauncherTimer: null,
  resizeRafId: null,
  recommendTimers: [],
  recommendUnlockTimer: null,

  // Immersion & UI Auto-Hide
  idleTimer: null,
  paddingSaveTimer: null,
  autoHideUi: true,
  autoFullscreen: false,
  isUiHidden: false,
  isFullscreenMode: false,
  isFullscreenPaddingZero: false,

  // Zoom & Pan
  zoom: {
    scale: 1.0,
    panX: 0,
    panY: 0,
    isDragging: false,
    pendingDragRelease: false,
    startX: 0,
    startY: 0,
    transformRafId: null,
    suppressNextBackdropClick: false,
    suppressClickTimer: null,
  }
};
