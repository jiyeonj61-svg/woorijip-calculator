# 우리집계산기

세금·급여·대출·부동산·투자·생활 계산기 20개를 하나의 도메인에서 운영하기 위한 정적 웹사이트 프로젝트입니다.

- GitHub Free 사용 가능
- Cloudflare Pages Free 배포 가능
- 별도 서버·데이터베이스 불필요
- Google AdSense 코드 연결 가능
- 각 계산기별 독립 URL·고유 SEO 제목·설명·canonical·구조화 데이터 적용
- `sitemap.xml`, `robots.txt`, `ads.txt` 자동 생성
- 모바일 반응형
- 계산 입력값은 브라우저에서만 처리

---

## 1. 포함된 계산기

1. `/tax/3-3-calculator/` — 3.3% 계산기
2. `/tax/vat-calculator/` — 부가세 계산기
3. `/salary/net-salary-calculator/` — 연봉 실수령액 계산기
4. `/salary/hourly-monthly-calculator/` — 시급·월급 변환 계산기
5. `/salary/weekly-holiday-pay-calculator/` — 주휴수당 계산기
6. `/salary/severance-pay-calculator/` — 퇴직금 계산기
7. `/salary/annual-leave-calculator/` — 연차 계산기
8. `/salary/four-insurance-calculator/` — 4대보험 계산기
9. `/loan/loan-interest-calculator/` — 대출이자 계산기
10. `/loan/equal-payment-calculator/` — 원리금균등상환 계산기
11. `/loan/deposit-interest-calculator/` — 예금이자 계산기
12. `/investment/compound-interest-calculator/` — 복리 계산기
13. `/real-estate/rent-conversion-calculator/` — 전월세 전환 계산기
14. `/real-estate/brokerage-fee-calculator/` — 부동산 중개보수 계산기
15. `/living/pyeong-calculator/` — 평수 계산기
16. `/living/discount-calculator/` — 할인율 계산기
17. `/living/percentage-change-calculator/` — 퍼센트 증감률 계산기
18. `/investment/stock-average-calculator/` — 주식 평단가 계산기
19. `/investment/cagr-calculator/` — CAGR 계산기
20. `/living/date-dday-calculator/` — 날짜·D-day 계산기

---

## 2. 프로젝트 구조

```text
woorijip-calculator/
├─ content/
│  ├─ calculators.json       # 계산기 이름·URL·SEO 설명·기준 출처
│  └─ categories.json        # 카테고리 정보
├─ src/assets/
│  ├─ calculators.js         # 20개 계산 로직
│  ├─ site.js                # 메뉴·검색·결과 복사 등 공통 기능
│  └─ styles.css             # 전체 디자인
├─ tools/
│  ├─ build.mjs              # 정적 HTML·사이트맵 생성
│  └─ check.mjs              # 필수 파일 및 페이지 검사
├─ public/                   # Cloudflare가 실제 배포할 완성 파일
├─ site.config.json          # 도메인·이메일·AdSense·검색엔진 설정
├─ package.json
└─ wrangler.toml
```

`public` 폴더는 `npm run build` 실행 시 다시 생성됩니다. 따라서 디자인·계산식·콘텐츠를 수정할 때는 `src`, `content`, `site.config.json`, `tools`를 수정하세요.

---

## 3. 가장 먼저 수정할 파일

`site.config.json`을 열고 아래 두 값을 실제 정보로 바꾸세요.

```json
{
  "siteUrl": "https://실제도메인.com",
  "contactEmail": "실제이메일@example.com"
}
```

### 매우 중요

`siteUrl`을 `https://example.com` 상태로 배포하면 canonical 주소와 사이트맵이 잘못 생성됩니다. 정식 도메인 연결 전에 반드시 수정하고 다시 빌드해야 합니다.

설정을 바꾼 후 실행:

```bash
npm run build
npm run check
```

---

## 4. GitHub에 업로드하는 방법

### 방법 A: 웹에서 업로드

1. GitHub 로그인
2. **New repository** 선택
3. 저장소 이름: `woorijip-calculator`
4. Public 또는 Private 선택
5. **Create repository**
6. **Add file → Upload files**
7. ZIP을 먼저 풀고, `woorijip-calculator` 폴더 안의 모든 파일과 폴더를 업로드
8. **Commit changes**

주의: ZIP 파일 자체만 GitHub에 올리는 것이 아니라 ZIP을 해제한 뒤 프로젝트 파일 전체를 올려야 합니다.

### 방법 B: Git 명령어

```bash
git init
git add .
git commit -m "우리집계산기 최초 배포"
git branch -M main
git remote add origin https://github.com/본인계정/woorijip-calculator.git
git push -u origin main
```

---

## 5. Cloudflare Pages 무료 배포

Cloudflare 대시보드에서 다음 순서로 진행합니다.

1. **Workers & Pages**
2. **Create application** 또는 **Create**
3. **Pages**
4. **Connect to Git**
5. GitHub 연결
6. `woorijip-calculator` 저장소 선택

### 빌드 설정

```text
Production branch: main
Framework preset: None
Build command: npm run build
Build output directory: public
Root directory: 비워두기
```

환경변수는 필요하지 않습니다.

**Save and Deploy**를 누르면 다음과 같은 임시 주소가 생성됩니다.

```text
https://woorijip-calculator.pages.dev
```

임시 주소에서 홈과 20개 계산기가 정상 작동하는지 먼저 확인하세요.

---

## 6. 개인 도메인 연결

### 도메인이 Cloudflare DNS에 등록된 경우

1. Cloudflare Pages 프로젝트 선택
2. **Custom domains**
3. **Set up a custom domain**
4. 실제 도메인 입력
5. 안내에 따라 DNS 연결

권장 대표 주소:

```text
https://실제도메인.com
```

`www.실제도메인.com`도 추가한 뒤 대표 주소로 리디렉션하세요.

### 가비아에서 도메인을 구입한 경우

1. Cloudflare 메인에서 **Add a domain**
2. 구입한 도메인 입력
3. Free 플랜 선택
4. Cloudflare가 제시한 네임서버 2개 확인
5. 가비아 → My 가비아 → 도메인 관리 → 네임서버 설정
6. 기존 네임서버를 Cloudflare 네임서버 2개로 변경
7. 네임서버 적용 후 Pages의 **Custom domains**에서 도메인 연결

도메인은 계속 가비아에서 소유·갱신하고, DNS와 보안 연결만 Cloudflare에서 관리하는 방식입니다.

---

## 7. Google AdSense 연결

### 승인 신청 전 권장 순서

1. 실제 도메인 연결
2. `site.config.json`의 `siteUrl` 수정
3. 다시 빌드·배포
4. 홈과 20개 계산기 정상 작동 확인
5. 개인정보처리방침·이용약관·면책·문의 페이지 확인
6. Google Search Console과 네이버 서치어드바이저 등록
7. 주요 페이지 색인 확인
8. AdSense 신청

### 게시자 ID 입력

AdSense 게시자 ID 예시:

```text
ca-pub-1234567890123456
```

`site.config.json`:

```json
{
  "adsenseClient": "ca-pub-1234567890123456"
}
```

이 값만 입력해도 전체 페이지 `<head>`에 AdSense 스크립트가 들어갑니다. AdSense에서 자동광고를 켰다면 자동광고 방식으로 운영할 수 있습니다.

### 수동 광고 단위 사용

광고 단위에서 받은 슬롯 번호를 입력하세요.

```json
{
  "adsenseSlots": {
    "top": "1111111111",
    "middle": "2222222222",
    "bottom": "3333333333"
  }
}
```

- `top`: 계산기 위
- `middle`: 계산기와 설명 사이
- `bottom`: 관련 계산기 아래

설정 후:

```bash
npm run build
npm run check
```

GitHub에 Commit하면 Cloudflare가 자동 재배포합니다.

`ads.txt`도 게시자 ID를 기준으로 자동 생성됩니다.

---

## 8. Google Search Console 등록

### 도메인 DNS 인증

Search Console에서 도메인 속성을 추가하고 Cloudflare DNS에 TXT 레코드를 등록하는 방법이 가장 확실합니다.

### HTML 메타태그 인증

Google이 제공한 태그:

```html
<meta name="google-site-verification" content="ABC123">
```

`content` 값만 입력:

```json
{
  "googleSiteVerification": "ABC123"
}
```

다시 빌드·배포한 뒤 소유권을 확인합니다.

### 사이트맵 제출

```text
https://실제도메인.com/sitemap.xml
```

Search Console의 사이트맵 입력란에는 보통 다음만 입력하면 됩니다.

```text
sitemap.xml
```

---

## 9. 네이버 서치어드바이저 등록

네이버에서 제공한 태그:

```html
<meta name="naver-site-verification" content="NAVER123">
```

`site.config.json`:

```json
{
  "naverSiteVerification": "NAVER123"
}
```

다시 빌드·배포한 뒤 소유확인을 완료하고 다음 주소를 제출하세요.

```text
https://실제도메인.com/sitemap.xml
https://실제도메인.com/robots.txt
```

---

## 10. Google Analytics 연결

GA4 측정 ID 예시:

```text
G-ABCDEFGHIJ
```

설정:

```json
{
  "googleAnalyticsId": "G-ABCDEFGHIJ"
}
```

다시 빌드·배포하면 모든 페이지에 자동 적용됩니다.

---

## 11. 컴퓨터에서 미리보기

Node.js 18 이상과 Python이 설치되어 있다면 프로젝트 폴더에서 실행하세요.

```bash
npm run build
npm run check
npm run preview
```

브라우저에서:

```text
http://localhost:4173
```

종료는 터미널에서 `Ctrl + C`입니다.

Python이 없다면 GitHub에 업로드한 뒤 Cloudflare의 `pages.dev` 임시 주소로 테스트해도 됩니다.

---

## 12. 수정 위치

### 사이트명·도메인·이메일·광고·검색 인증

```text
site.config.json
```

### 계산기 제목·주소·SEO 설명·공식 출처

```text
content/calculators.json
```

### 실제 계산 공식

```text
src/assets/calculators.js
```

### 디자인

```text
src/assets/styles.css
```

### 페이지 레이아웃·설명 콘텐츠·사이트맵 생성

```text
tools/build.mjs
```

수정 후 항상 실행:

```bash
npm run build
npm run check
```

---

## 13. 매년 또는 제도 변경 시 점검할 항목

- 최저임금
- 국민연금 보험료율과 기준소득월액 상·하한
- 건강보험료율
- 장기요양보험료율
- 고용보험료율
- 근로소득 간이세액 기준
- 전월세 전환율과 한국은행 기준금리
- 부동산 중개보수 조례
- 이자소득세율
- 세금·노무 관련 법령

현재 프로젝트의 급여·보험·전월세 관련 기본값은 **2026년 8월 기준으로 제작**되어 있습니다. 제도가 변경되면 계산식과 안내문을 함께 업데이트하세요.

---

## 14. 배포 전 최종 점검표

- [ ] `site.config.json`의 `siteUrl` 수정
- [ ] `contactEmail` 수정
- [ ] `npm run build` 성공
- [ ] `npm run check` 성공
- [ ] 홈에서 계산기 20개 노출 확인
- [ ] 모바일 화면 확인
- [ ] 각 계산기의 예시 입력·계산 확인
- [ ] 개인정보처리방침 확인
- [ ] 이용약관 확인
- [ ] 면책 안내 확인
- [ ] 도메인 HTTPS 정상 확인
- [ ] `sitemap.xml` 접속 확인
- [ ] `robots.txt` 접속 확인
- [ ] 검색엔진 등록
- [ ] AdSense 승인 후 게시자 ID 입력

---

## 15. 중요한 주의사항

연봉 실수령액, 4대보험, 연차, 퇴직금, 전월세와 중개보수 계산은 실제 조건에 따라 달라질 수 있습니다. 사이트 내에도 참고용 면책 안내를 적용했지만, 운영자는 기준 변경을 정기적으로 점검해야 합니다.
배포 설정 확인
