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
  },

  toastTimer: null,

  // Zoom & Pan
  zoom: {
    scale: 1.0,
    panX: 0,
    panY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    transformRafId: null,
  }
};
