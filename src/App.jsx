import React, { useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from './supabase';

const SOURCES = [
  {
    name: '국가기록원 — 11월 17일 순국선열의 날',
    detail: '기념일의 유래, 1939년 임시정부의 결정, 순국선열의 의미',
    url: 'https://theme.archives.go.kr/next/specialDay/subInfo.do?specialDayId=00000038'
  },
  {
    name: '국가기록원 — 법정기념일 순국선열의 날',
    detail: '기념행사 연혁과 1997년 법정기념일 제정 기록',
    url: 'https://theme.archives.go.kr/next/anniversary/anniversary.do?anniversaryId=9866000000'
  },
  {
    name: '국가보훈부 — 11월 17일에 되새기는 순국선열의 헌신',
    detail: '순국선열의 의미와 11월 17일의 역사적 배경',
    url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148936394'
  }
];

function App() {
  const [page, setPage] = useState('home');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [showAuth, setShowAuth] = useState(false);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [quizState, setQuizState] = useState('idle');
  const [result, setResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    const loadProfile = async () => {
      const { data } = await supabase.from('profiles').select('nickname').eq('id', session.user.id).maybeSingle();
      setProfile(data);
    };
    loadProfile();
  }, [session]);

  useEffect(() => {
    if (page === 'ranking') loadLeaderboard();
  }, [page]);

  async function loadLeaderboard() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_leaderboard');
    if (error) setNotice('랭킹을 불러오지 못했어. Supabase SQL 설정을 확인해 줘.');
    else setLeaderboard(data || []);
    setLoading(false);
  }

  async function handleAuth(e) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true); setAuthMessage('');
    if (authMode === 'signup') {
      const cleanNick = nickname.trim();
      if (cleanNick.length < 2 || cleanNick.length > 14) {
        setAuthMessage('닉네임은 2~14자로 입력해 줘.'); setLoading(false); return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { nickname: cleanNick } }
      });
      if (error) setAuthMessage(error.message);
      else if (!data.session) setAuthMessage('가입 요청 완료! 이메일 인증을 마친 뒤 로그인해 줘.');
      else { setShowAuth(false); setNotice('가입 및 로그인 완료!'); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setAuthMessage('로그인에 실패했어. 이메일과 비밀번호를 확인해 줘.');
      else { setShowAuth(false); setNotice('로그인했어.'); }
    }
    setLoading(false);
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setNotice('로그아웃했어.');
  }

  async function startQuiz() {
    if (!session) { setShowAuth(true); setAuthMode('login'); setAuthMessage('퀴즈 기록을 저장하려면 먼저 로그인해 줘.'); return; }
    if (!supabase) return;
    setLoading(true); setNotice('');
    const { data, error } = await supabase.rpc('get_quiz_questions');
    if (error || !data?.length) {
      setNotice('문제를 불러오지 못했어. Supabase SQL을 실행했는지 확인해 줘.');
    } else {
      setQuestions(data); setAnswers({}); setResult(null); setQuizState('playing'); setPage('quiz');
    }
    setLoading(false);
  }

  async function submitQuiz() {
    if (Object.keys(answers).length !== questions.length) {
      setNotice('모든 문제에 답을 선택한 뒤 제출해 줘.'); return;
    }
    setLoading(true); setNotice('');
    const payload = questions.map(q => ({ id: q.id, selected: answers[q.id] }));
    const { data, error } = await supabase.rpc('submit_quiz', { p_answers: payload });
    if (error) setNotice('점수를 저장하지 못했어. 로그인 상태와 데이터베이스 설정을 확인해 줘.');
    else { setResult(data); setQuizState('finished'); }
    setLoading(false);
  }

  const bestScore = useMemo(() => {
    const me = leaderboard.find(row => row.user_id === session?.user?.id);
    return me?.best_score ?? null;
  }, [leaderboard, session]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage('home')} aria-label="홈으로">
          <span className="brand-mark">記</span><span>REMEMBER <b>11.17</b></span>
        </button>
        <nav>
          <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>홈</button>
          <button className={page === 'ranking' ? 'active' : ''} onClick={() => setPage('ranking')}>랭킹</button>
          <button className={page === 'sources' ? 'active' : ''} onClick={() => setPage('sources')}>자료실</button>
        </nav>
        {session ? <button className="user-chip" onClick={logout}>{profile?.nickname || '참가자'} · 로그아웃</button>
          : <button className="login-button" onClick={() => {setAuthMode('login');setShowAuth(true);}}>로그인</button>}
      </header>

      {!isSupabaseConfigured && <div className="setup-banner">아직 데이터베이스 연결 전이야. <b>.env</b> 설정과 Supabase SQL 실행을 마치면 회원가입·점수 저장·랭킹이 활성화돼.</div>}
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')}>확인</button></div>}

      {page === 'home' && <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span></span> 11월 17일 · 순국선열의 날</div>
            <h1>기억하는 사람들,<br/><em>잊히지 않는 역사.</em></h1>
            <p>오늘의 우리가 기억해야 할 이름과 역사.<br/>공식 기록을 바탕으로 만든 역사 퀴즈에 도전해 봐.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={startQuiz} disabled={loading}>{loading ? '준비 중...' : '역사 퀴즈 시작'} <span>↗</span></button>
              <button className="text-button" onClick={() => setPage('ranking')}>명예의 전당 보기 →</button>
            </div>
            <div className="hero-meta"><span>✓ 공식 기관 자료 기반</span><span>✓ 출처·해설 제공</span><span>✓ 개인 최고 점수 랭킹</span></div>
          </div>
          <div className="hero-art" aria-label="역사를 기억하는 상징 이미지">
            <div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div>
            <div className="art-center"><span>1919</span><strong>기억은<br/>이어진다</strong><small>REMEMBER THE HISTORY</small></div>
            <div className="art-caption">대한민국의 독립을 위해 헌신한<br/>순국선열을 기억합니다.</div>
          </div>
        </section>
        <section className="intro-grid">
          <article className="intro-card"><span className="card-index">01 / CHALLENGE</span><div className="card-icon">✳</div><h2>역사를 풀다</h2><p>공식 기록을 근거로 만든 문제를 풀고, 정답과 해설을 확인해.</p></article>
          <article className="intro-card"><span className="card-index">02 / RECORD</span><div className="card-icon">↗</div><h2>기록을 남기다</h2><p>회원 계정에 점수를 저장하고 나의 최고 기록을 쌓아.</p></article>
          <article className="intro-card"><span className="card-index">03 / REMEMBER</span><div className="card-icon">⌑</div><h2>함께 기억하다</h2><p>참가자 랭킹과 자료실에서 더 많은 역사적 사실을 만나.</p></article>
        </section>
        <section className="quote-band"><span>“</span><p>기억하는 일은, 역사를 이어가는 일입니다.</p><small>REMEMBER 11.17</small></section>
      </main>}

      {page === 'quiz' && <main className="content-page">
        <div className="page-heading"><div className="eyebrow">HISTORY CHALLENGE</div><h1>역사 퀴즈</h1><p>각 문제의 근거 자료는 제출 후 해설에서 확인할 수 있어.</p></div>
        {quizState === 'playing' && <div className="quiz-list">
          {questions.map((q, i) => <section className="question-card" key={q.id}>
            <div className="question-top"><span>QUESTION {String(i+1).padStart(2,'0')}</span><span>{i+1} / {questions.length}</span></div>
            <h2>{q.question}</h2>
            <div className="options">{q.options.map((option, idx) => <button key={idx} className={answers[q.id] === idx ? 'option selected' : 'option'} onClick={() => setAnswers(prev => ({...prev,[q.id]:idx}))}><span>{String.fromCharCode(65+idx)}</span>{option}</button>)}</div>
          </section>)}
          <button className="primary-button submit-button" onClick={submitQuiz} disabled={loading}>{loading ? '채점 중...' : '답안 제출하기'} ↗</button>
        </div>}
        {quizState === 'finished' && result && <section className="result-card">
          <div className="eyebrow">YOUR RESULT</div><h2>도전이 완료됐어.</h2><div className="score">{result.score}<small> / 100점</small></div>
          <p>정답 {result.correct_count}개 · 전체 {result.total_count}문제</p>
          <div className="explanations">{questions.map((q,i) => <article key={q.id}><b>{i+1}. {q.question}</b><p>{q.explanation}</p><a href={q.source_url} target="_blank" rel="noreferrer">출처: {q.source_name} ↗</a></article>)}</div>
          <div className="hero-actions"><button className="primary-button" onClick={() => setPage('ranking')}>랭킹 확인 ↗</button><button className="text-button" onClick={startQuiz}>다시 도전하기</button></div>
        </section>}
      </main>}

      {page === 'ranking' && <main className="content-page">
        <div className="page-heading"><div className="eyebrow">HALL OF HONOR</div><h1>명예의 전당</h1><p>참가자들의 개인 최고 점수를 기준으로 정렬해.</p></div>
        <section className="ranking-card">
          <div className="ranking-head"><div><span className="eyebrow">LEADERBOARD</span><h2>전체 랭킹</h2></div><button className="refresh-button" onClick={loadLeaderboard}>새로고침 ↻</button></div>
          {!isSupabaseConfigured ? <p className="empty-state">데이터베이스 연결 후 실제 참가자 랭킹이 표시돼.</p>
          : loading ? <p className="empty-state">불러오는 중...</p>
          : leaderboard.length === 0 ? <p className="empty-state">아직 등록된 기록이 없어. 첫 번째 도전자가 되어 봐!</p>
          : <div className="ranking-table"><div className="table-row table-label"><span>순위</span><span>참가자</span><span>최고 점수</span></div>{leaderboard.map((row,i)=><div className="table-row" key={row.user_id}><span className="rank-number">{String(i+1).padStart(2,'0')}</span><strong>{row.nickname}</strong><b>{row.best_score} <small>PT</small></b></div>)}</div>}
        </section>
      </main>}

      {page === 'sources' && <main className="content-page">
        <div className="page-heading"><div className="eyebrow">ARCHIVE & REFERENCES</div><h1>역사 자료실</h1><p>퀴즈는 아래 공식 자료를 중심으로 구성했어. 원문을 직접 확인할 수 있어.</p></div>
        <div className="source-list">{SOURCES.map((s,i)=><a className="source-card" href={s.url} target="_blank" rel="noreferrer" key={s.url}><span className="source-no">0{i+1}</span><div><h2>{s.name}</h2><p>{s.detail}</p></div><span className="source-arrow">↗</span></a>)}</div>
        <p className="source-note">문제의 내용·정답·해설은 자료에 적힌 사실을 기준으로 작성했어. 자료에서 확인할 수 없는 내용은 출제하지 않는 것을 원칙으로 해.</p>
      </main>}

      <footer><span>REMEMBER 11.17</span><span>순국선열의 날 · 역사를 기억하는 퀴즈 프로젝트</span><button onClick={() => setPage('sources')}>자료 출처 확인 ↗</button></footer>

      {showAuth && <div className="modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setShowAuth(false);}}>
        <form className="auth-modal" onSubmit={handleAuth}>
          <button type="button" className="modal-close" onClick={() => setShowAuth(false)}>×</button>
          <div className="eyebrow">PARTICIPANT ACCOUNT</div><h2>{authMode === 'signup' ? '참가자 등록' : '다시 만나서 반가워.'}</h2><p>점수와 기록을 저장하려면 계정으로 로그인해 줘.</p>
          {authMode === 'signup' && <label>공개 닉네임<input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="랭킹에 표시할 이름" maxLength={14} required /></label>}
          <label>이메일<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일 주소" required /></label>
          <label>비밀번호<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="6자 이상" minLength={6} required /></label>
          {authMessage && <p className="auth-message">{authMessage}</p>}
          <button className="primary-button auth-submit" disabled={loading || !isSupabaseConfigured}>{loading ? '처리 중...' : authMode === 'signup' ? '계정 만들기' : '로그인하기'}</button>
          {!isSupabaseConfigured && <p className="auth-message">Supabase 연결 설정을 먼저 완료해 줘.</p>}
          <button type="button" className="switch-auth" onClick={() => {setAuthMode(authMode==='signup'?'login':'signup');setAuthMessage('');}}>{authMode==='signup'?'이미 계정이 있어? 로그인':'처음 방문했어? 참가자 등록'}</button>
          <small className="privacy-note">이메일은 로그인 용도로만 사용하고, 랭킹에는 닉네임만 표시해.</small>
        </form>
      </div>}
    </div>
  );
}

export default App;
