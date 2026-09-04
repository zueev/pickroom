# 픽룸

ChatGPT 로그인 없이 사용하는 모바일 상품 상세페이지 작업실입니다.

- 사이트: https://zueev.github.io/pickroom/
- 바로 편집: https://github.dev/zueev/pickroom
- 화면과 문구: `app/page.tsx`
- 색상과 배치: `app/globals.css`

GitHub에서 파일을 열고 연필 버튼으로 수정한 뒤 Commit changes를 누르면 Actions가 다시 배포합니다.

## 실행

Node.js 22.13 이상: `npm ci`, `npm run dev`.
`npm run build` 결과는 `dist-github/`에 생성됩니다.

## 배포

Settings → Pages → Source를 GitHub Actions로 선택합니다.
main 수정 시 Pages workflow가 자동 배포합니다.

## 현재 기능과 제한

예시 상품 선택, 휴대폰 이미지 추가, 수정 요청 입력, 판매가 입력, 등록 전 확인.
신상마켓 데이터 수집, AI 이미지 편집, 카페24 등록은 아직 구현 및 연결되지 않았습니다.
입력은 현재 화면의 메모리에만 있으며 새로고침하면 초기화됩니다.
실제 연동에는 별도 서버와 인증, 이미지 저장소가 필요합니다. GitHub Pages는 화면만 제공합니다.
API 비밀 키와 카페24 토큰을 저장소나 브라우저 코드에 넣지 마세요.

예시 사진: Haryo Setyadi / Unsplash
https://unsplash.com/photos/white-crew-neck-t-shirt-acn5ERAeSb4
