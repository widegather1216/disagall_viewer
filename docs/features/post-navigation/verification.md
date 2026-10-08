# Verification & Defect Log - Post Navigation

### [DEFECT-01] 실 서비스 DC 게시판에서 위/아래 방향키 이동 실패 (현재 글 행 필터링 탈락)
- **현재 상태**: 🟢 RESOLVED (수정 완료)
- **발생 위치**: `content.js` 내 `getAdjacentPostUrl(direction)`
- **증상**: 
  - 실제 디시인사이드 갤러리 뷰(`gall.dcinside.com/mgallery/board/view/...`)에서 뷰어를 열고 `↑` 또는 `↓` 키를 누르면 "이동할 수 있는 게시글 목록을 찾을 수 없습니다." 토스트가 발생하며 글 이동이 동작하지 않음.
- **재현 조건**:
  - 실제 DCInside 게시판 페이지(예: `https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=2041711&search_head=10&page=1`)에서 뷰어 실행 후 위/아래 방향키 입력.
- **근본 원인**:
  1. 실제 디시 하단 목록 테이블(`table.gall_list tbody tr.ub-content`)에서 현재 열람 중인 글(`crt`)은 `td.gall_num`에 게시글 번호 대신 `<span class="sp_img crt_icon"> </span>` 아이콘이 렌더링되어 `numEl.textContent.trim()`이 빈 문자열(`""`)이 됨.
  2. 기존 필터 조건 `if (numText === '-' || !numText) return false;`에 의해 현재 글 행이 `validRows`에서 부당하게 제외됨.
  3. 그 결과 `validRows.findIndex`에서 현재 행을 찾지 못해(`-1`), `getAdjacentPostUrl`이 `null`을 반환함.
  4. 부가적으로 디시 템플릿의 클래스 파싱 버그로 `<tr class="ub-content crt>">`처럼 클래스 끝에 `>`가 포함된 경우가 있어 `classList.contains('crt')`가 실패할 가능성이 존재함.
- **해결 내역**:
  - `content.js`, `disagall_viewer.user.js`, `safari_extension/.../content.js` 수정:
    - 현재 글 판별식(`isCurrentPost`)을 `className.includes('crt')`, `crt_icon`, `currentPostNo` 매칭으로 통합하여 선행 판별.
    - 현재 글(`isCurrentPost`)인 경우 `numText` 유무와 무관하게 유효 행으로 유지.
    - 일반 행의 경우 광고(`AD`, `javascript:;`), 설문, 공지는 엄격히 제외 유지.
  - 회귀 및 통합 테스트:
    - `tests/post_navigation.test.js`에 실제 라이브 게시글(`no=2041711`) HTML 및 `dc_sample.html` 통합 테스트 케이스 추가 완료.
    - 단위 및 통합 테스트 5개 케이스 전체 PASS.
