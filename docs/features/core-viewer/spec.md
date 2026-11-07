# 📜 [core-viewer] Full-Stack Specification

## 1. 데이터 모델 및 상태 스키마 (Data Models & Schema)

### 🟢 [As-Is 기구현]
- **`CONFIG` 상수 규격**:
  - `DEFAULT_PADDING`: `24` (px)
  - `STORAGE_KEY_PADDING`: `'defaultPadding'`
  - `TOAST_DURATION`: `1800` (ms)
- **`state` 스키마 규격**:
  - `postImages`: `Array<{ url: string, element: HTMLImageElement, alt: string }>`
  - `currentIndex`: `number` (현재 표시 중인 이미지 인덱스, 0-based)
  - `currentPadding`: `number` (현재 적용된 여백 크기, 0 ~ 100px)
  - `lastRightClickedImgSrc`: `string | null` (우클릭 캡처 타겟 이미지 원본 URL)
  - `previousBodyOverflow`: `string` (뷰어 오픈 전 원본 overflow 백업값)
  - `zoom`: `{ scale: number, panX: number, panY: number, isDragging: boolean, startX: number, startY: number, transformRafId: number | null }`

## 2. 인터페이스 및 통신 계약 (Interface & Communication Contracts)

### 2.1 Extension Background Context Menu 계약
- **메뉴 ID**: `"open_dc_photo_viewer"`
- **타이틀**: `"📷 디시 사진 뷰어로 화면 맞춤 보기"`
- **컨텍스트**: `["image", "page"]`
- **메시지 페이로드**: `{ action: "open_viewer", srcUrl: string | null }`

### 2.2 DOM 이미지 크롤링 및 URL 정제 계약 (`image_parser.js`)
- **본문 컨테이너 15종**: `.write_div`, `.thum-txtin`, `.us-txt`, `.usertxt`, `.writing_view_box`, `.gallview_contents`, `.view_content_wrap`, `.reading_box`, `.article-content`, `#dc_contents` 등
- **제외 컨테이너 21종**: 댓글창(`.comment_box`), 사이드바(`.side_box`), 광고(`.ad_box`, `#ad_nv_slot`), 배너(`.con_banner`), 갤러리목록(`.gall_list`) 등
- **디시콘/UI 블랙리스트 12종**: `/dcicon/`, `/emoticon/`, `/dccon`, `dccon.php`, `nik.gif`, `bestcon`, `icon_`, `logo`, `banner` 등
- **다운스케일 쿼리 제거**: URL 쿼리 파라미터에서 `s`, `type` 파라미터 강제 삭제하여 CDN 원본 복원

## 3. 화면 맞춤(피팅) 및 줌앤팬 엔진 규격 (`overlay.js`, `zoom_pan.js`)

### 3.1 종횡비 보존 피팅 수학 공식 (`applyFittingAndPadding`)
- `availableHeight = Math.max(100, window.innerHeight - headerHeight - footerHeight - (currentPadding * 2))`
- `availableWidth = Math.max(100, window.innerWidth - (currentPadding * 2))`
- `scale = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight)`
- `targetWidth = Math.round(naturalWidth * scale)`, `targetHeight = Math.round(naturalHeight * scale)`

### 3.2 줌앤팬 제스처 및 렌더링 규격
- **스케일 한도**: `1.0x` ~ `5.0x` (휠 1회당 `±0.15`)
- **더블클릭 토글**: `scale > 1.0` 시 1.0x 리셋, `scale <= 1.0` 시 2.0x 확대
- **드래그 이동**: 좌클릭 드래그 시 `panX`, `panY` 갱신 (`cursor: grabbing`)
- **임계값 복원**: `scale <= 1.001` 시 오차 방지를 위해 `scale = 1.0, panX = 0, panY = 0`으로 강제 초기화

## 4. UI 5대 상태 및 디자인 규칙 (UI States & Design Rules)
- **오버레이 루트**: `#disagall-viewer-overlay` (`fixed`, `z-index: 99999999`, `100vw x 100vh`)
- **Loading**: 고화질 원본 비동기 로딩 중 중앙 스피너(`.disagall-spinner`) 노출
- **Empty**: 수집된 이미지가 0개일 경우 `alert("본문에서 사진을 찾을 수 없습니다.")` 조기 리턴
- **Success (Active)**: `.active` 클래스 추가로 화면 페이드인, `document.body.style.overflow = 'hidden'` 적용

## 5. 예외 처리 및 엣지 케이스 정책 (Edge Cases & Fallbacks)
- **이미지 1장 이하**: 좌우 이동 버튼에 `.disabled` 부여 (`pointer-events: none, opacity: 0.25`)
- **이미지 프리로드 실패**: 고화질 로드 실패 시 원본 태그의 `src`로 자동 폴백
- **입력 폼 포커스 방어**: `<input>`, `<textarea>` 활성화 상태에서는 ESC 제외 단축키 차단
- **뷰어 닫기 배경 클릭**: 스테이지 빈 공간 클릭 시만 닫히며, 헤더/푸터 클릭 시 전파 방지
