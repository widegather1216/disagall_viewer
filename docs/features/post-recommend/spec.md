# 📜 [post-recommend] Full-Stack Specification

## 1. 데이터 모델 및 스키마 (Data Models & Schema)

### 🟢 [As-Is 기구현]
- `CONFIG.RECOMMEND_THROTTLE_MS`: `1200` (ms, 추천 중복 입력 방어 쓰로틀 시간)
- `CONFIG.RECOMMEND_SYNC_DELAYS`: `[500, 1200]` (ms, 디시 서버 반영 후 추천 수 재조회 주기)

## 2. DOM 탐색 및 제어 계약 (`recommend_parser.js`)

### 2.1 본문 추천 버튼 셀렉터 (`RECOMMEND_BUTTON_PRIORITY_SELECTORS`)
- **데스크톱**: `.btn_recommend_box button.btn_recom_up`, `button.btn_recom_up`, `a.btn_recom_up`, `div.btn_recom_up`, `.btn_recom_up`, `.btn_recommend_up`, `button[data-action="recommend"]`, `button[data-type="recommend"]`, `button.recom_btn`
- **모바일**: `button.btn-recom`, `.btn-recom`, `.btn_recom`, `.btn_recommend`
- **자가/오탐 배제**: `isExcludedRecommendElement()`로 `#disagall-viewer-overlay`, `#disagall-no-photo-notice`, `#disagall-quick-launcher` 및 `[id^="disagall-"]` 내부 요소를 전수 배제 (`RECOMMEND_BUTTON_SELECTORS` 문자열 별칭 호환 유지)

### 2.2 추천 수 추출 및 상태 판별 (`recommend_parser.js`)
- **우선순위 셀렉터 (`RECOMMEND_COUNT_PRIORITY_SELECTORS`)**: `[id^="recommend_view_up_"]`, `.up_num_box .up_num`, `.btn_recommend_box .up_num`, `.recom_num`, `.btn-recom .recom-num`
- **폴백 및 실패 반환**: 숫자 정규식 `/[^0-9]/g` 제거 후 정수 변환 (탐색 또는 파싱 실패 시 `0`과 미확인을 구분하기 위해 `null` 반환)
- **상태/제어 헬퍼**: `getNativeRecommendButton(root)`, `isRecommendButtonDisabled(btn)`, `isUserLoggedIn(root)`, `isGalleryCodeEnforced(root)`, `dispatchRecommendClick(btn)`

## 3. 추천 디스패치 및 피드백 계약 (`recommend_controller.js`)

### 3.1 `triggerPostRecommend()`
- **동작 가드**:
  1. 뷰어가 비활성(`!active`) 상태이거나 추천 처리 중(`isRecommending`) 또는 쓰로틀링 중(`Date.now() - lastRecommendTime < CONFIG.RECOMMEND_THROTTLE_MS`)이면 조기 리턴
  2. 이미 현재 글에서 추천을 성공(`hasVotedCurrentPost`)했거나 버튼 비활성/`.voted` 상태이면 토스트 `"이미 개념글 추천을 완료한 게시글입니다. 👍"` 출력
- **단일 클릭 디스패치 (Single Dispatch)**:
  - `dispatchRecommendClick(btn)`로 `btn.click()`(미지원 시 `MouseEvent` 폴백) 1회 단독 실행 (실패 시 `"추천 실행에 실패했습니다."` 토스트 후 조기 반환)
- **2단계 카운트 갱신 (Count Refresh)**:
  - `500ms`, `1200ms` 후 `getPostRecommendCount()`를 비동기 호출
  - 추천 수 증가(`afterCount > beforeCount`) 감지 시:
    - 버튼 클래스에 `.voted` 추가
    - `updateRecommendButtonUi()`로 라벨을 `개추 (N)`(비로그인 코드 제한 갤러리 시 `🔒` 포함)로 업데이트
- **토스트 피드백**:
  - 디스패치 성공 즉시 `showViewerToast("개념글 추천을 눌렀습니다! 👍")` (비로그인 코드 제한 시 안내 토스트) 노출

## 4. UI 및 단축키 바인딩 규칙
- **UI 마크업**: 상단 헤더 우측(`.disagall-header-right`)에 `#disagall-btn-recommend` 버튼 렌더링
- **키 매핑**: `r`, `R`, `c`, `C` 키 입력 시 `triggerPostRecommend()` 실행
- **하단 키힌트**: `.disagall-keyhints`에 `<kbd>R</kbd> 개추` 배지 표기
