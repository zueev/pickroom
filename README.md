# 픽룸

신상마켓에서 가져온 옷에 **직접 입고 찍은 사진**을 붙여 카페24에 올리는 개인 작업실입니다.
주소를 아는 사람이 아니라 **등록된 이메일 한 개만** 들어올 수 있습니다.

- 주소: https://pickroom.vercel.app
- 흐름: 옷 고르기 → 실착 사진·문구 → 상세페이지 생성 → 카페24 등록

## 구조

| | |
|---|---|
| 화면·서버 | Next.js (Vercel) |
| 자료·사진·로그인 | Supabase (서울 리전) |
| 등록 | 카페24 Admin API (`mall.read_product`, `mall.write_product`) |

카페24 토큰은 `cafe24_connection` 테이블에 있고 RLS 정책이 하나도 없어 **서버 라우트만** 읽습니다.
상품과 사진은 `app_owner`에 등록된 이메일로 로그인한 경우에만 열립니다.

## 환경변수 (Vercel)

| 이름 | 값 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API의 `service_role` 키 |
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
