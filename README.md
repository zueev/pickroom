# 픽룸

신상마켓에서 가져온 옷에 **직접 입고 찍은 사진**을 붙여 카페24에 올리는 개인 작업실입니다.
**암구호**를 아는 사람만 들어올 수 있습니다. 로그인도 메일도 없습니다.

- 주소: https://pickroom.vercel.app
- 흐름: 옷 고르기 → 실착 사진·문구 → 상세페이지 생성 → 카페24 등록

## 구조

| | |
|---|---|
| 화면·서버 | Next.js (Vercel) |
| 자료·사진 | Supabase (서울 리전) |
| 등록 | 카페24 Admin API (`mall.read_product`, `mall.write_product`) |

암구호를 맞히면 1년짜리 httpOnly 쿠키가 생기고, 그 기기에서는 다시 묻지 않습니다.
암구호 자체는 쿠키에 담기지 않고 해시만 담깁니다.

브라우저는 Supabase에 직접 닿지 않습니다. 모든 읽기·쓰기가 서버 라우트를 지나며,
`middleware.ts`가 쿠키 없는 요청을 전부 막습니다. 카페24 토큰도 서버만 읽습니다.
사진만 예외로 브라우저가 Supabase에 곧장 올리는데, 서버가 발급한 일회용 주소로만 됩니다
(Vercel 함수의 요청 크기 제한에 폰 사진이 걸리기 때문).

## 환경변수 (Vercel)

| 이름 | 값 |
|---|---|
| `PICKROOM_PASSPHRASE` | 들어갈 때 쓰는 암구호. 이걸 아는 사람만 들어옵니다 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API의 secret 키 |
| `APP_ORIGIN` | `https://pickroom.vercel.app` (없으면 Vercel 배포 주소를 씀) |

Supabase 주소와 publishable 키는 브라우저에 실려 나가는 값이라 `lib/config.ts`에 두었습니다.
`service_role` 키는 저장소에 절대 넣지 않습니다.

## 카페24 앱 설정

카페24 개발자센터에서 앱을 만들고 아래대로 넣습니다.

- App URL: `https://pickroom.vercel.app`
- Redirect URI: `https://pickroom.vercel.app/api/cafe24/callback`
- 권한: 상품(Product) 읽기+쓰기

Client ID와 Secret은 앱 화면의 **연결 설정**에서 입력합니다. 저장소나 환경변수에 넣지 않습니다.

## 아직 안 되는 것

- 신상마켓 자동 수집. 상품은 사람이 확인한 자료를 DB에 넣습니다.
- 옵션별 재고. 신상마켓이 재고 수량을 공개하지 않아 매장 문의가 필요합니다.
- 스마트스토어·쿠팡 연동. 하지 않습니다.
- 등록은 **진열 안 함 · 판매 안 함** 상태까지입니다. 판매 시작은 카페24에서 직접 합니다.

## 실행

Node 20 이상. `npm install`, `npm run dev`.
