# REMEMBER 11.17

순국선열의 날을 주제로 한 모바일 대응 역사 퀴즈 사이트입니다.

## 기능
- 이메일/비밀번호 회원가입 및 로그인 (Supabase Auth)
- 공개 닉네임 프로필
- 서버에서 무작위 5문제 출제
- 정답은 브라우저로 내려주지 않고 DB 함수에서 채점
- 실제 참가 기록 기반 개인 최고 점수 랭킹
- 문제별 해설과 공식 출처 링크
- 반응형 모바일 UI

## 기술
- React + Vite
- Supabase Auth + PostgreSQL RPC
- Vercel 배포
- GitHub 소스 관리

## 1. Supabase 준비
1. https://supabase.com 에서 새 프로젝트를 만듭니다.
2. 프로젝트의 SQL Editor를 엽니다.
3. `supabase/setup.sql` 파일 전체를 붙여 넣고 실행합니다.
4. Project Settings > API에서 Project URL과 anon/public key를 확인합니다.

## 2. 로컬 실행
1. Node.js LTS를 설치합니다.
2. 이 폴더에서 터미널을 열고 `npm install`을 실행합니다.
3. `.env.example`을 복사해 `.env`로 이름을 바꿉니다.
4. `.env`의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 실제 값으로 바꿉니다.
5. `npm run dev` 실행 후 터미널에 나온 주소를 엽니다.

## 3. GitHub 업로드
1. GitHub에서 새 공개 저장소를 만듭니다. 예: `remember-1117`
2. 압축을 푼 프로젝트 파일 전체를 저장소에 업로드합니다.
3. `.env` 파일은 절대 업로드하지 않습니다. `.env.example`만 올립니다.

## 4. Vercel 배포
1. https://vercel.com 에서 GitHub 계정으로 로그인합니다.
2. Add New > Project에서 `remember-1117` 저장소를 가져옵니다.
3. Framework Preset은 Vite, Build Command는 `npm run build`, Output Directory는 `dist`로 둡니다.
4. Environment Variables에 다음 두 값을 추가합니다.
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy를 누릅니다.

## 5. Supabase 인증 주소 설정
Supabase > Authentication > URL Configuration에서 Site URL을 배포된 Vercel 주소로 설정합니다. Redirect URLs에도 배포 주소를 추가합니다. 이메일 인증을 켜 두었다면 가입 후 이메일 인증을 완료해야 로그인할 수 있습니다.

## 중요
- Supabase의 `anon/public` 키만 프런트엔드 환경변수에 사용합니다. `service_role` 키는 절대 브라우저나 GitHub에 넣지 않습니다.
- 이메일은 로그인용이며 공개 랭킹에는 닉네임만 표시됩니다.
- 초기 문제는 국가기록원 공식 페이지에 기재된 사실을 바탕으로 구성했습니다. 새로운 문제를 추가하기 전 원문 출처와 날짜를 다시 확인하세요.
- 이 프로젝트는 기본적인 서버 채점을 적용한 출발점입니다. 대규모 공개 행사에서 운영하기 전에는 계정 인증, 요청 제한, 부정 참여 대응 등을 추가 점검하세요.
