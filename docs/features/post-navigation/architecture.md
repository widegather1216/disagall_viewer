# 🏛️ [post-navigation] Architecture & Dependency Blueprint

## 1. 데이터 및 네비게이션 흐름도 (Mermaid Flow)

```mermaid
flowchart TD
    UserArrow["방향키 입력 (ArrowUp / ArrowDown)"] --> Controller["src/controller/viewer_controller.js"]
    Controller -->|뷰어 active 상태 검증| NavService["navigatePost(direction)"]
    
    NavService --> Parser["src/parser/post_navigator.js (getAdjacentPostUrl)"]
    Parser --> ListTable["table.gall_list tbody tr.ub-content"]
    Parser --> MobileList[".gall-detail-lst li"]
    
    Parser -->|현재 글 행 식별 (isCurrentPost / crt_icon)| CurrentRow["Current Post Index"]
    Parser -->|공지/광고/설문 제외 & 사진글 우선 탐색| TargetRow["Adjacent Target URL"]
    
    NavService -->|이동할 글 없음 (경계)| Toast["showToast ('처음/마지막 글입니다')"]
    NavService -->|유효 URL 존재| Session["sessionStorage ('disagall_auto_open' = '1')"]
    Session --> Location["window.location.href = targetUrl"]
    
    Location --> NextPage["새 페이지 로드"]
    NextPage --> CheckAuto["checkAutoOpen()"]
    CheckAuto -->|플래그 확인 & sessionStorage.removeItem| OpenViewer["openViewer(null, true)"]
```

## 2. 도메인 파일 트리 및 단일 책임 (File Tree & SRP)

- **도메인 파서 계층**:
  - `src/parser/post_navigator.js`:
    - `extractPostNo(url)`: URL 경로 및 쿼리 파라미터에서 게시글 고유 ID 추출
    - `isDesktopPostRowValid()` / `isMobilePostItemValid()`: 광고, 설문, 공지 배제 및 유효 행 검증
    - `findCurrentPostRowIndex()`: `crt`, `crt_icon`, `data-no` 기반 현재 열람 행 탐색
    - `getAdjacentPostUrl(direction, preferPhoto)`: 위/아래 인접 행 및 사진 게시글 우선 탐색
- **컨트롤러 및 세션 라이프사이클**:
  - `src/controller/viewer_controller.js`:
    - `navigatePost(direction)`: 딜레이 토스트 표시 및 `sessionStorage` 플래그 설정 후 페이지 이동
    - `checkAutoOpen()`: 페이지 로드 시 `disagall_auto_open` 확인 후 뷰어 자동 활성화
- **테스트 계층**:
  - `tests/post_navigation.test.js`: 행 필터링, `crt_icon` 빈 번호(DEFECT-01), 사진글 스킵 단위/통합 테스트

## 3. 타 도메인 참조 및 경계 계약 (Cross-Domain Dependencies)
- **참조 계약 (Inbound)**:
  - `core-viewer`: 뷰어의 `active` 상태일 때만 방향키 이벤트를 수신하여 일반 웹 브라우징 스크롤과의 충돌 방지
  - `src/config.js`: `STORAGE_KEY_AUTO_OPEN`('disagall_auto_open'), `POST_NAV_DELAY`(150ms) 상수 참조
- **외부 노출 계약 (Outbound)**:
  - 페이지 전환 시 `sessionStorage`를 통해 `core-viewer`의 `openViewer()`를 자동 호출하도록 제어 신호 전달

## 4. 계층 의존성 및 전역 제약 준수
- 전역 아키텍처 헌법([`00_core_foundation/architecture.md`](../00_core_foundation/architecture.md)) 준수:
  - DOM 파서(`post_navigator.js`)는 `window.location`을 직접 변경하지 않고 순수 URL만 반환하며, 페이지 이동 부수효과는 `viewer_controller.js`에서만 전담
