# Feature: 위/아래 방향키 게시글 탐색 (Post Navigation)

## 📌 기능 개요
디시 사진 뷰어가 열려 있는 상태에서 `↑` / `↓` 방향키를 눌러 하단 글 목록(사진탭/말머리 목록 포함)의 이전/다음 게시글로 이동하고, 연속 감상 모드(`sessionStorage`)를 통해 새 게시글에서도 뷰어가 자동으로 열려 끊김 없이 사진을 감상할 수 있는 2차원 내비게이션 기능.

## 🧭 키 매핑 및 동작 규칙
- `←` / `→`: 현재 게시글 본문의 이전/다음 사진 넘기기
- `↑` (ArrowUp / w / W): 목록 상 위쪽 글(최신 글)로 이동
- `↓` (ArrowDown / s / S): 목록 상 아래쪽 글(이전 글)로 이동
- 단축키 동작 조건: **사진 뷰어가 활성화(`active`)된 상태에서만 동작** (웹 브라우징 기본 스크롤과의 충돌 방지)

## 🏗️ 아키텍처 및 구현 레이어
1. **DOM 탐색 레이어 (`getAdjacentPostUrl(direction)`)**
   - 하단 갤러리 리스트(`table.gall_list tbody tr.ub-content`) 파싱
   - 공지, 설문, AD 광고 행 필터링
   - 현재 활성 게시글(`tr.crt`, `.crt_icon`, `data-no`) 탐색
   - 인접(위/아래) 유효 행의 제목 링크(`a[href]`) 추출
2. **상태 및 연속 감상 레이어 (`navigatePost(direction)`)**
   - 유효 링크가 있을 경우 `sessionStorage.setItem('disagall_auto_open', '1')` 플래그 설정 후 `window.location.href`로 페이지 전환
   - 다음/이전 글이 없는 경우(목록의 시작/끝) 인디케이터 토스트 안내
   - 페이지 로드 시 플래그 확인 후 `openViewer()` 자동 호출
3. **UI/UX 피드백 레이어**
   - 하단 힌트 바에 `↑ ↓ 이전/다음 글` 단축키 힌트 추가
   - 화면 중앙/상단에 이동 안내 및 경계 도달 알림 토스트 표시

## 📋 구현 체크리스트
- [x] 1. `getAdjacentPostUrl(direction)` 순수 탐색 함수 구현
- [x] 2. `showToast(message)` 알림 함수 구현
- [x] 3. `handleKeyDown`에 `ArrowUp`, `ArrowDown` 핸들러 추가
- [x] 4. `sessionStorage` 기반 자동 뷰어 오픈 부트스트랩 로직 추가
- [x] 5. 뷰어 하단 `disagall-keyhints`에 안내 추가
- [x] 6. `content.js`, `disagall_viewer.user.js`, `Safari extension` 리소스 동기화
- [x] 7. `test_page.html`에 테스트용 게시판 목록 추가 및 동작 검증 (Unit tests PASS)
