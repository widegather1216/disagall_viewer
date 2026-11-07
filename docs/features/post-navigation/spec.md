# 📜 [post-navigation] Full-Stack Specification

## 1. 데이터 모델 및 스키마 (Data Models & Schema)

### 🟢 [As-Is 기구현]
- `CONFIG.STORAGE_KEY_AUTO_OPEN`: `'disagall_auto_open'` (sessionStorage 키)
- `CONFIG.POST_NAV_DELAY`: `150` (ms, 토스트 노출 후 페이지 전환 대기 시간)
- `CONFIG.NO_PHOTO_NOTICE_DURATION`: `8000` (ms, 사진 없는 글 알림바 노출 시간)
- `PostRowInfo`: `{ element: HTMLElement, no: string, title: string, url: string, hasPhoto: boolean, isCurrent: boolean }`

## 2. DOM 탐색 및 게시글 필터링 계약 (`post_navigator.js`)

### 2.1 대상 테이블 및 목록 셀렉터
- **데스크톱 목록**: `table.gall_list tbody tr.ub-content`, `table.gall_list tbody tr`
- **모바일 목록**: `.gall-detail-lst li`, `.gall-thum-lst li`

### 2.2 유효 게시글 검증 및 제외 규칙
- **제외 대상**:
  - `numText === '공지'` 또는 클래스에 `notice` 포함 행
  - `numText === '설문'` 또는 설문 아이콘 행
  - 광고 행 (`AD`, `javascript:;`, 애드센스 슬롯)
- **현재 열람 글 판별 우선순위 (`isCurrentPost`)**:
  1. `row.classList.contains('crt')` 또는 클래스명 끝에 `crt` 포함 여부
  2. `row.querySelector('.crt_icon')` 존재 여부 (게시글 번호가 비어있어도 현재 글로 확정)
  3. `row.dataset.no === currentPostNo` 또는 제목 링크 `href` 내 `no=` 쿼리와 일치 여부

### 2.3 스마트 사진글 우선 탐색 (`preferPhoto = true`)
- 사진 탭이 활성화되지 않은 일반 게시판에서, 글 목록 내 이미지 아이콘(`.sp_img.icon_pic`, `.icon_pic`, `.pic_icon`)을 보유한 게시글을 우선 탐색하여 글만 있는 게시글을 자동으로 건너뜀.
- 목록 내 잔여 사진글이 없을 경우 가장 가까운 일반 글로 폴백.

## 3. 세션 및 페이지 전환 계약 (`viewer_controller.js`)

### 3.1 `navigatePost(direction)`
- `direction`: `'up'` (이전/최신 글, 목록 상 위쪽) | `'down'` (다음/과거 글, 목록 상 아래쪽)
- 유효한 타겟 URL이 있을 경우:
  1. 토스트 안내: `showToast("이전 글(사진)로 이동합니다... ⏳")`
  2. 세션 플래그 설정: `sessionStorage.setItem('disagall_auto_open', '1')`
  3. 지연 전환: `setTimeout(() => { window.location.href = targetUrl; }, 150)`
- 유효한 타겟이 없을 경우:
  - `showToast("목록의 처음/마지막 글입니다.")` 토스트 출력 후 페이지 유지

### 3.2 `checkAutoOpen()` 부트스트랩
- 페이지 로드(`DOMContentLoaded` / document-end) 시 실행:
  - `sessionStorage.getItem('disagall_auto_open') === '1'` 감지 시:
    - `sessionStorage.removeItem('disagall_auto_open')` (1회성 소비)
    - 본문 이미지 수집 시도 (지연 렌더링 대비 최대 15회 폴링)
    - 사진 수집 성공 시: `openViewer(null, true)` 자동 호출
    - 사진 0장일 시: 상단 플로팅 바(`#disagall-no-photo-notice`) 마운트

## 4. UI 및 단축키 바인딩 규칙
- **키 매핑**: `ArrowUp` / `w` / `W` (위쪽 글), `ArrowDown` / `s` / `S` (아래쪽 글)
- **동작 가드**: 오버레이가 `.active` 상태일 때만 방향키 인터셉트
- **푸터 힌트**: `.disagall-keyhints`에 `<kbd>↑</kbd><kbd>↓</kbd> 이전/다음 글` 배지 노출
