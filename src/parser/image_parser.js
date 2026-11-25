// Image Parser & Filter for DC Inside

export const EXCLUDED_CONTAINER_SELECTORS = [
  '.comment_box', '.comment_wrap', '.cmt_list', '.reply_box', '.btn_box',
  '.rcmd_box', '.dc_allbanner', '.con_banner', '#right_box', '.side_box',
  '.gall_list', '.recommend_box', '.pop_info', '.attached_file', '.option_box',
  '.written_dccon', '#ad_nv_slot', '.ad_box', 'header', 'footer', '.gnb', '.lnb',
  '#disagall-viewer-overlay'
].join(', ');

export const POST_BODY_CONTAINER_SELECTORS = [
  '.write_div', '.thum-txtin', '.us-txt', '.usertxt', '.writing_view_box',
  '.gallview_contents', '.view_content_wrap', '.reading_box', '.article-content',
  '#dc_contents', '[id*="write_div"]', '[class*="write_div"]',
  '.gall_view_box', '.view_content', '.contents'
].join(', ');

const DEFAULT_ORIGIN = 'https://gall.dcinside.com';
const LAZY_ATTRS = ['data-original', 'data-src', 'data-url', 'data-lazy-src'];
const LAZY_DATASET_KEYS = ['original', 'src', 'url'];
const PLACEHOLDER_URL_SUBSTRINGS = ['gallview_loading', 'loading', 'blank.gif', 'nstatic.dcinside.com'];
const DC_ICON_URL_SUBSTRINGS = [
  '/dcicon/', '/emoticon/', '/dccon', 'dccon.php', 'nik.gif', 'fix_nik.gif',
  'bestcon', '/btn_', 'icon_', 'logo', 'banner', 'gallview_loading', 'nstatic.dcinside.com'
];
const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i;

function resolveBaseOrigin() {
  const origin = typeof window !== 'undefined' ? window.location?.origin : '';
  if (origin && origin !== 'null' && (origin.startsWith('http://') || origin.startsWith('https://'))) {
    return origin;
  }
  return DEFAULT_ORIGIN;
}

// Clean and resolve original resolution URL for DC Inside
export function getCleanOriginalUrl(
  url,
  baseProtocol = (typeof window !== 'undefined' ? window.location?.protocol : 'https:')
) {
  if (typeof url !== 'string' || !url.trim()) return '';
  const trimmed = url.trim();
  const normalized = trimmed.startsWith('//') ? `${baseProtocol || 'https:'}${trimmed}` : trimmed;
  try {
    const parsed = new URL(normalized, resolveBaseOrigin());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    parsed.searchParams.delete('s');
    parsed.searchParams.delete('type');
    return parsed.toString();
  } catch (e) {
    return '';
  }
}

function isPlaceholderImageUrl(url) {
  return !url || PLACEHOLDER_URL_SUBSTRINGS.some((sub) => url.includes(sub));
}

function isImageCandidateUrl(url) {
  return Boolean(url && (url.includes('viewimage.php') || url.includes('dcimg') || url.includes('image') || IMAGE_EXT_REGEX.test(url)));
}

function collectImgUrlCandidates(img) {
  const candidates = [];
  for (const attr of LAZY_ATTRS) {
    const val = img.getAttribute?.(attr);
    if (val) candidates.push(val);
  }
  if (img.dataset) {
    for (const key of LAZY_DATASET_KEYS) {
      if (img.dataset[key]) candidates.push(img.dataset[key]);
    }
  }
  if (img.src) candidates.push(img.src);
  return candidates;
}

function getAnchorImageUrl(img) {
  const parentAnchor = img.closest ? img.closest('a') : null;
  if (!parentAnchor || !parentAnchor.href) return '';
  const cleanHref = getCleanOriginalUrl(parentAnchor.href);
  return isImageCandidateUrl(cleanHref) ? cleanHref : '';
}

// Extract real image URL considering lazy loading & parent <a> link
export function getBestImgUrl(img) {
  if (!img) return '';
  const cleaned = collectImgUrlCandidates(img).map((raw) => getCleanOriginalUrl(raw)).filter(Boolean);
  const validUrl = cleaned.find((u) => !isPlaceholderImageUrl(u));
  if (validUrl) return validUrl;

  const anchorUrl = getAnchorImageUrl(img);
  if (anchorUrl) return anchorUrl;

  return cleaned[0] || '';
}

function hasDcIconAttributes(img) {
  if (!img) return false;
  return Boolean(
    img.classList?.contains('written_dccon') ||
    img.classList?.contains('dccon') ||
    img.hasAttribute?.('conalt') ||
    img.hasAttribute?.('detail') ||
    img.dataset?.dcconoverstatus !== undefined ||
    img.title?.includes('갤로그')
  );
}

// Check if an element or URL is a DC Con, Nikcon, profile icon, or UI asset
export function isDcIconOrUiAsset(img, url) {
  if (!url) return true;
  if (DC_ICON_URL_SUBSTRINGS.some((sub) => url.includes(sub))) return true;
  return hasDcIconAttributes(img);
}

// Helper to check if an image belongs to post body content
export function isPostBodyImage(img, resolvedUrl = null) {
  if (!img || img.tagName !== 'IMG') return false;
  if (img.closest && img.closest(EXCLUDED_CONTAINER_SELECTORS)) return false;

  const url = resolvedUrl ?? getBestImgUrl(img);
  if (isDcIconOrUiAsset(img, url)) return false;
  if (img.closest && img.closest(POST_BODY_CONTAINER_SELECTORS)) return true;

  return Boolean(
    url.includes('viewimage.php') ||
    url.includes('dcimg') ||
    url.includes('dccdn') ||
    url.includes('upload') ||
    url.includes('image.dcinside') ||
    IMAGE_EXT_REGEX.test(url)
  );
}

// Helper to extract image candidates from elements with deduplication
export function extractImagesFromElements(imageElements = [], seenUrls = new Set()) {
  const results = [];
  for (const img of imageElements) {
    const cleanUrl = getBestImgUrl(img);
    if (!cleanUrl || seenUrls.has(cleanUrl) || !isPostBodyImage(img, cleanUrl)) continue;
    seenUrls.add(cleanUrl);
    results.push({ url: cleanUrl, element: img, alt: img.alt || '디시 갤러리 본문 이미지' });
  }
  return results;
}

function isNestedContainer(container, containerSet) {
  let parent = container.parentElement;
  while (parent) {
    if (containerSet.has(parent)) return true;
    parent = parent.parentElement;
  }
  return false;
}

// Find all post body images strictly in given root
export function extractPostImages(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root || !root.querySelectorAll) return [];
  const seenUrls = new Set();
  const collected = [];

  const rawContainers = Array.from(root.querySelectorAll(POST_BODY_CONTAINER_SELECTORS))
    .filter((c) => !c.closest || !c.closest(EXCLUDED_CONTAINER_SELECTORS));
  const containerSet = new Set(rawContainers);
  const containers = rawContainers.filter((c) => !isNestedContainer(c, containerSet));

  for (const container of containers) {
    collected.push(...extractImagesFromElements(container.querySelectorAll('img'), seenUrls));
  }
  if (collected.length === 0) {
    collected.push(...extractImagesFromElements(root.querySelectorAll('img'), seenUrls));
  }
  return collected;
}
