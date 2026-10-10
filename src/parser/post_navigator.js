// Post Navigation Parser for DC Inside

export function extractPostNo(url, origin = (typeof window !== 'undefined' ? window.location?.origin : 'https://gall.dcinside.com')) {
  if (!url) return null;
  try {
    const parsed = new URL(url, origin);
    const no = parsed.searchParams.get('no');
    if (no) return no;
    const match = parsed.pathname.match(/\/(\d+)(?:\/|\?|$)/);
    if (match) return match[1];
  } catch (e) {
    const match = url.match(/[?&]no=(\d+)/) || url.match(/\/(\d+)(?:\/|\?|$)/);
    if (match) return match[1];
  }
  return null;
}

export function isDesktopPostRowValid(tr, currentPostNo) {
  if (!tr) return false;
  const titLink = tr.querySelector?.('.gall_tit a:not(.reply_numbox)') || tr.querySelector?.('a');
  if (!titLink || !titLink.href) return false;
  const hrefAttr = (titLink.getAttribute && titLink.getAttribute('href')) || titLink.href || '';
  if (hrefAttr.startsWith('javascript:')) return false;

  const isCurrentPost = (tr.classList && tr.classList.contains('crt')) ||
                        (tr.className && tr.className.includes('crt')) ||
                        !!(tr.querySelector && tr.querySelector('.crt_icon')) ||
                        (currentPostNo && (
                          (tr.innerHTML && tr.innerHTML.includes(currentPostNo)) ||
                          extractPostNo(titLink.href) === currentPostNo
                        ));

  if (isCurrentPost) return true;

  const numEl = tr.querySelector?.('.gall_num');
  const subjectEl = tr.querySelector?.('.gall_subject');
  const numText = numEl ? numEl.textContent.trim() : '';
  const subjectText = subjectEl ? subjectEl.textContent.trim() : '';

  if (numText === '-' || !numText || isNaN(Number(numText))) return false;
  if (subjectText === '공지' || subjectText === 'AD' || subjectText === '설문') return false;
  if (numText === '공지' || numText === '설문') return false;
  if (tr.classList && tr.classList.contains('notice')) return false;

  return true;
}

export function isMobilePostItemValid(li) {
  if (!li) return false;
  const link = li.querySelector?.('a');
  if (!link || !link.href) return false;
  const hrefAttr = (link.getAttribute && link.getAttribute('href')) || link.href || '';
  if (hrefAttr.startsWith('javascript:')) return false;
  if ((li.classList && li.classList.contains('notice')) || (li.querySelector && li.querySelector('.sp-notice'))) return false;
  return true;
}

export function getValidPostRows(currentPostNo, root = (typeof document !== 'undefined' ? document : null)) {
  if (!root || !root.querySelectorAll) return [];
  const tableRows = Array.from(root.querySelectorAll('table.gall_list tbody tr.ub-content, .gall_listwrap table tbody tr.ub-content'));
  if (tableRows.length > 0) {
    return tableRows.filter(tr => isDesktopPostRowValid(tr, currentPostNo));
  }
  const mobileItems = Array.from(root.querySelectorAll('.gall-detail-lst li, .gall-thum-btm li'));
  return mobileItems.filter(isMobilePostItemValid);
}

export function findCurrentPostRowIndex(validRows, currentPostNo) {
  return validRows.findIndex(row => {
    if ((row.classList && row.classList.contains('crt')) || (row.className && row.className.includes('crt')) || !!row.querySelector?.('.crt_icon')) {
      return true;
    }

    if (currentPostNo) {
      const numEl = row.querySelector?.('.gall_num');
      if (numEl && numEl.textContent.trim() === currentPostNo) return true;

      const titLink = row.querySelector?.('.gall_tit a:not(.reply_numbox)') || row.querySelector?.('a');
      if (titLink && extractPostNo(titLink.href) === currentPostNo) return true;
    }
    return false;
  });
}

export function hasPhotoAttachment(row) {
  if (!row) return false;

  // 1. Check subject text (e.g. '사진' category)
  const subjectEl = row.querySelector?.('.gall_subject');
  if (subjectEl) {
    const subj = subjectEl.textContent.trim();
    if (subj.includes('사진')) return true;
  }

  // 2. Check desktop DC title photo icon (.icon_pic, .icon_recomimg)
  const photoIcon = row.querySelector?.(
    '.icon_pic, .icon_recomimg, .icon_img.icon_pic, .icon_img.icon_recomimg, [class*="icon_pic"], em.icon_pic, em.icon_recomimg'
  );
  if (photoIcon) return true;

  // 3. Check mobile DC photo icon
  const mobilePhotoIcon = row.querySelector?.('.sp-lst-img, .sp-photo, [class*="sp-lst-img"], [class*="ico_pic"]');
  if (mobilePhotoIcon) return true;

  // 4. Check general image icon excluding text/survey/ad icons
  const anyImgIcon = row.querySelector?.('.icon_img');
  if (anyImgIcon) {
    const cls = anyImgIcon.className || '';
    if (!cls.includes('icon_txt') && !cls.includes('survey') && !cls.includes('notice') && !cls.includes('ad')) {
      return true;
    }
  }

  return false;
}

export function getAdjacentPostUrl(direction, preferPhotos = true, currentUrl = (typeof window !== 'undefined' ? window.location?.href : '')) {
  const currentPostNo = extractPostNo(currentUrl);
  const validRows = getValidPostRows(currentPostNo);

  if (validRows.length === 0) {
    return null;
  }

  const currentIdx = findCurrentPostRowIndex(validRows, currentPostNo);
  if (currentIdx === -1) {
    return null;
  }

  const step = direction === 'up' ? -1 : 1;
  let targetIdx = -1;

  if (preferPhotos) {
    let candidateIdx = currentIdx + step;
    while (candidateIdx >= 0 && candidateIdx < validRows.length) {
      if (hasPhotoAttachment(validRows[candidateIdx])) {
        targetIdx = candidateIdx;
        break;
      }
      candidateIdx += step;
    }
  }

  if (targetIdx === -1) {
    const fallbackIdx = currentIdx + step;
    if (fallbackIdx >= 0 && fallbackIdx < validRows.length) {
      targetIdx = fallbackIdx;
    }
  }

  if (targetIdx < 0) {
    return { error: 'top', message: '목록의 가장 최신 글입니다.' };
  }
  if (targetIdx >= validRows.length) {
    return { error: 'bottom', message: '목록의 마지막 글입니다.' };
  }

  const targetRow = validRows[targetIdx];
  const targetLink = targetRow.querySelector?.('.gall_tit a:not(.reply_numbox)') || targetRow.querySelector?.('a');
  const targetTitle = targetLink ? (targetLink.textContent || '').trim().replace(/\s+/g, ' ') : '';

  return {
    url: targetLink ? targetLink.href : null,
    title: targetTitle,
    hasPhoto: hasPhotoAttachment(targetRow)
  };
}
