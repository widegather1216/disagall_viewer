// Image Parser & Filter for DC Inside

export const EXCLUDED_CONTAINER_SELECTORS = [
  '.comment_box',
  '.comment_wrap',
  '.cmt_list',
  '.reply_box',
  '.btn_box',
  '.rcmd_box',
  '.dc_allbanner',
  '.con_banner',
  '#right_box',
  '.side_box',
  '.gall_list',
  '.recommend_box',
  '.pop_info',
  '.attached_file',
  '.option_box',
  '.written_dccon',
  '#ad_nv_slot',
  '.ad_box',
  'header',
  'footer',
  '.gnb',
  '.lnb'
].join(', ');

export const POST_BODY_CONTAINER_SELECTORS = [
  '.write_div',
  '.thum-txtin',
  '.us-txt',
  '.usertxt',
  '.writing_view_box',
  '.gallview_contents',
  '.view_content_wrap',
  '.reading_box',
  '.article-content',
  '#dc_contents',
  '[id*="write_div"]',
  '[class*="write_div"]',
  '.gall_view_box',
  '.view_content',
  '.contents'
].join(', ');

// Clean and resolve original resolution URL for DC Inside
export function getCleanOriginalUrl(url, baseProtocol = (typeof window !== 'undefined' ? window.location?.protocol : 'https:')) {
  if (!url) return '';
  if (url.startsWith('//')) {
    url = (baseProtocol || 'https:') + url;
  }
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('s');
    parsed.searchParams.delete('type');
    return parsed.toString();
  } catch (e) {
    return url;
  }
}

// Extract real image URL considering lazy loading & parent <a> link
export function getBestImgUrl(img) {
  if (!img) return '';

  let rawUrl = img.getAttribute?.('data-original') ||
               img.getAttribute?.('data-src') ||
               img.getAttribute?.('data-url') ||
               img.getAttribute?.('data-lazy-src') ||
               (img.dataset ? (img.dataset.original || img.dataset.src || img.dataset.url) : '') ||
               img.src ||
               '';

  if (!rawUrl || rawUrl.includes('gallview_loading') || rawUrl.includes('loading') || rawUrl.includes('blank.gif') || rawUrl.includes('nstatic.dcinside.com')) {
    const dataOrig = img.getAttribute?.('data-original') || img.getAttribute?.('data-src') || (img.dataset ? (img.dataset.original || img.dataset.src) : '');
    if (dataOrig && !dataOrig.includes('loading')) {
      rawUrl = dataOrig;
    } else {
      const parentAnchor = img.closest ? img.closest('a') : null;
      if (parentAnchor && parentAnchor.href) {
        const anchorHref = parentAnchor.href;
        if (anchorHref.includes('viewimage.php') || anchorHref.includes('dcimg') || anchorHref.includes('image') || anchorHref.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
          rawUrl = anchorHref;
        }
      }
    }
  }

  return getCleanOriginalUrl(rawUrl);
}

// Check if an element or URL is a DC Con, Nikcon, profile icon, or UI asset
export function isDcIconOrUiAsset(img, url) {
  if (!url) return true;

  if (
    url.includes('/dcicon/') ||
    url.includes('/emoticon/') ||
    url.includes('/dccon') ||
    url.includes('dccon.php') ||
    url.includes('nik.gif') ||
    url.includes('fix_nik.gif') ||
    url.includes('bestcon') ||
    url.includes('/btn_') ||
    url.includes('icon_') ||
    url.includes('logo') ||
    url.includes('banner') ||
    url.includes('gallview_loading') ||
    url.includes('nstatic.dcinside.com')
  ) {
    return true;
  }

  if (img) {
    if (
      img.classList?.contains('written_dccon') ||
      img.classList?.contains('dccon') ||
      img.hasAttribute?.('conalt') ||
      img.hasAttribute?.('detail') ||
      (img.dataset && img.dataset.dcconoverstatus !== undefined) ||
      (img.title && img.title.includes('갤로그'))
    ) {
      return true;
    }
  }

  return false;
}

// Helper to check if an image belongs to post body content
export function isPostBodyImage(img) {
  if (!img || img.tagName !== 'IMG') return false;

  if (img.closest && img.closest(EXCLUDED_CONTAINER_SELECTORS)) return false;

  const url = getBestImgUrl(img);
  if (isDcIconOrUiAsset(img, url)) return false;

  if (img.closest && img.closest(POST_BODY_CONTAINER_SELECTORS)) return true;

  const isKnownPhotoUrl = url.includes('viewimage.php') ||
                          url.includes('dcimg') ||
                          url.includes('dccdn') ||
                          url.includes('upload') ||
                          url.includes('image.dcinside') ||
                          url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);

  return !!isKnownPhotoUrl;
}

// Helper to extract image candidates from elements with deduplication
export function extractImagesFromElements(imageElements, seenUrls) {
  const results = [];
  imageElements.forEach((img) => {
    if (!isPostBodyImage(img)) return;

    const cleanUrl = getBestImgUrl(img);
    if (cleanUrl && !seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      results.push({
        url: cleanUrl,
        element: img,
        alt: img.alt || '디시 갤러리 본문 이미지'
      });
    }
  });
  return results;
}

// Find all post body images strictly in given root
export function extractPostImages(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root || !root.querySelectorAll) return [];
  const seenUrls = new Set();
  const collected = [];

  let containers = Array.from(root.querySelectorAll(POST_BODY_CONTAINER_SELECTORS));
  containers = containers.filter(c => !c.closest || !c.closest(EXCLUDED_CONTAINER_SELECTORS));

  containers.forEach((container) => {
    collected.push(...extractImagesFromElements(container.querySelectorAll('img'), seenUrls));
  });

  if (collected.length === 0) {
    collected.push(...extractImagesFromElements(root.querySelectorAll('img'), seenUrls));
  }

  return collected;
}
