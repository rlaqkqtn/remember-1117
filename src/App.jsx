import React, { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from './supabase';

const SOURCE = {
  name: '2026년 11월 1주 인성교육 자료',
  detail: '학생독립운동기념일 / 순국선열의 날 · 학교 배부 자료 1쪽'
};

function App() {
  const [page, setPage] = useState('home');
  const [studentId, setStudentId] = useState('');
  const [studentInput, setStudentInput] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [quizState, setQuizState] = useState('idle');
  const [result, setResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState(null);
  const [adminKey, setAdminKey] = useState('');
  const [adminVerified, setAdminVerified] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    async function refreshStatus() {
      const { data, error } = await supabase.rpc('get_quiz_status');
      if (active && !error) setStatus(data);
    }
    refreshStatus();
    const timer = setInterval(refreshStatus, 3000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (status === 'stopped' && !adminVerified && page !== 'admin' && page !== 'ranking') {
      setPage('ranking');
      setNotice('퀴즈가 종료되었어. 랭킹을 확인해 줘.');
    }
  }, [status, page, adminVerified]);

  async function adminAction(action, key = adminKey) {
    if (loading || !supabase) return;
    setLoading(true);
    setNotice('');
    const { data, error } = await supabase.rpc('admin_quiz_control', { p_key: key, p_action: action });
    if (error) setNotice(error.message || '운영자 인증 또는 상태 변경에 실패했어.');
    else {
      setAdminKey(key);
      setAdminVerified(true);
      setAdminInput('');
      setStatus(data);
      setPage('admin');
    }
    setLoading(false);
  }

  async function startPreview() {
    if (loading || !adminVerified) return;
    setLoading(true);
    setNotice('');
    const { data, error } = await supabase.rpc('admin_preview_questions', { p_key: adminKey });
    if (error || !Array.isArray(data) || data.length !== 5) setNotice(error?.message || '테스트 문제를 불러오지 못했어.');
    else {
      setStudentId('20729'); setTestMode(true); setQuestions(data); setAnswers({});
      setResult(null); setQuizState('playing'); setPage('quiz');
    }
    setLoading(false);
  }

  function leaveAdmin() {
    setAdminVerified(false); setAdminKey(''); setAdminInput(''); setTestMode(false);
    setStudentId(''); setStudentInput(''); setPage(status === 'stopped' ? 'ranking' : 'home');
  }

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

  async function startQuiz(event) {
    event?.preventDefault();
    if (loading) return;
    const cleanId = studentInput.trim();
    if (cleanId === '20729') {
      setPage('admin'); setNotice(''); return;
    }
    if (!/^207(?:0[1-9]|1[0-9]|2[0-8])$/.test(cleanId)) {
      setNotice('20701부터 20728 사이의 학번을 정확히 입력해 줘.');
      return;
    }
    if (!supabase) {
      setNotice('Supabase 연결 설정을 먼저 완료해 줘.');
      return;
    }
    if (status !== 'running') {
      setNotice(status === 'stopped' ? '퀴즈가 종료되었어.' : '아직 퀴즈가 시작되지 않았어.');
      if (status === 'stopped') setPage('ranking');
      return;
    }
    setTestMode(false);
    setStudentId(cleanId);
    setLoading(true);
    setNotice('');
    const { data, error } = await supabase.rpc('begin_student_quiz', { p_student_id: Number(cleanId) });
    if (error || !Array.isArray(data) || data.length !== 5 || new Set(data.map(q => q.id)).size !== 5) {
      setNotice(error?.message || '서로 다른 문제 5개를 불러오지 못했어.');
    } else {
      setQuestions(data);
      setAnswers({});
      setResult(null);
      setQuizState('playing');
      setPage('quiz');
    }
    setLoading(false);
  }

  async function submitQuiz() {
    if (loading) return;
    if (Object.keys(answers).length !== questions.length) {
      setNotice('모든 문제에 답을 선택한 뒤 제출해 줘.');
      return;
    }
    setLoading(true);
    setNotice('');
    const payload = questions.map(q => ({ id: q.id, selected: answers[q.id] }));
    const { data, error } = testMode
      ? await supabase.rpc('admin_preview_submit', { p_key: adminKey, p_answers: payload })
      : await supabase.rpc('submit_quiz', { p_student_id: Number(studentId), p_answers: payload });
    if (error) setNotice(error.message || '점수를 저장하지 못했어.');
    else {
      setResult(data);
      setQuizState('finished');
    }
    setLoading(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage(status === 'stopped' && !adminVerified ? 'ranking' : 'home')} aria-label="홈으로">
          <span className="brand-mark">記</span><span>REMEMBER <b>11.17</b></span>
        </button>
        <nav>
          {(status !== 'stopped' || adminVerified) && <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>홈</button>}
          <button className={page === 'ranking' ? 'active' : ''} onClick={() => setPage('ranking')}>랭킹</button>
          {(status !== 'stopped' || adminVerified) && <button className={page === 'sources' ? 'active' : ''} onClick={() => setPage('sources')}>자료실</button>}
          {adminVerified && <button onClick={() => setPage('admin')}>운영자</button>}
        </nav>
        <span className="student-chip">{studentId ? studentId + ' 참가 중' : '학번으로 참여'}</span>
      </header>

      {!isSupabaseConfigured && <div className="setup-banner">데이터베이스 연결 전이야. Vercel 환경 변수 설정을 확인해 줘.</div>}
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')}>확인</button></div>}

      {page === 'home' && <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span></span> 11월 17일 · 순국선열의 날</div>
            <h1>기억하는 사람들,<br/><em>잊히지 않는 역사.</em></h1>
            <p>오늘의 우리가 기억해야 할 이름과 역사.<br/>학교 인성교육 자료를 바탕으로 만든 역사 퀴즈에 도전해 봐.</p>
            <p>현재 상태: {status === 'running' ? '진행 중' : status === 'stopped' ? '종료' : '시작 대기 중'}</p>
            <form className="student-entry" onSubmit={startQuiz}>
              <label htmlFor="student-number">본인의 학번을 입력해 줘.</label>
              <input id="student-number" inputMode="numeric" autoComplete="off" maxLength={5} value={studentInput} onChange={e => setStudentInput(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="예: 20701" />
              <button className="primary-button" type="submit" disabled={loading}>{loading ? '준비 중...' : '역사 퀴즈 시작'} <span>↗</span></button>
              <small>20701 ~ 20728 학번만 참여할 수 있어.</small>
            </form>
            <div className="hero-actions">
              <button className="text-button" onClick={() => setPage('ranking')}>명예의 전당 보기 →</button>
            </div>
            <div className="hero-meta"><span>✓ 학교 배부 자료 기반</span><span>✓ 분야별 무작위 5문제</span><span>✓ 학번별 1회 제출</span></div>
          </div>
          <div className="hero-art" aria-label="역사를 기억하는 상징 이미지">
            <div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div>
            <div className="art-center"><span>1919</span><strong>기억은<br/>이어진다</strong><small>REMEMBER THE HISTORY</small></div>
            <div className="art-caption">대한민국의 독립을 위해 헌신한<br/>순국선열을 기억합니다.</div>
          </div>
        </section>
        <section className="intro-grid">
          <article className="intro-card"><span className="card-index">01 / CHALLENGE</span><div className="card-icon">✳</div><h2>역사를 풀다</h2><p>학교 배부 자료를 근거로 만든 문제를 풀고, 정답과 해설을 확인해.</p></article>
          <article className="intro-card"><span className="card-index">02 / RECORD</span><div className="card-icon">↗</div><h2>기록을 남기다</h2><p>학번별로 한 번 제출한 점수를 저장해.</p></article>
          <article className="intro-card"><span className="card-index">03 / REMEMBER</span><div className="card-icon">⌑</div><h2>함께 기억하다</h2><p>참가자 랭킹과 자료실에서 역사적 사실을 만나.</p></article>
        </section>
        <section className="quote-band"><span>“</span><p>기억하는 일은, 역사를 이어가는 일입니다.</p><small>REMEMBER 11.17</small></section>
      </main>}

      {page === 'admin' && <main className="content-page">
        <div className="page-heading"><div className="eyebrow">QUIZ CONTROL</div><h1>운영자 화면</h1><p>전체 퀴즈 진행 상태를 관리해.</p></div>
        <section className="result-card">
          {!adminVerified ? <form className="student-entry" onSubmit={e => { e.preventDefault(); adminAction('status', adminInput.trim()); }}>
            <label>운영자 키</label><input type="password" value={adminInput} onChange={e => setAdminInput(e.target.value)} autoComplete="off" placeholder="Supabase에서 발급된 운영자 키" />
            <button className="primary-button" disabled={loading || !adminInput.trim()}>확인</button>
          </form> : <>
            <h2>현재 상태: {status === 'running' ? '진행 중' : status === 'stopped' ? '종료' : '시작 대기 중'}</h2>
            <div className="hero-actions">
              <button className="primary-button" disabled={loading || status === 'running'} onClick={() => adminAction('start')}>퀴즈 시작하기</button>
              <button className="text-button" disabled={loading || status !== 'running'} onClick={() => { if (window.confirm('전체 퀴즈를 중지할까? 미제출 답안은 저장되지 않아.')) adminAction('stop'); }}>퀴즈 중지</button>
            </div>
            <div className="hero-actions"><button className="text-button" disabled={loading} onClick={startPreview}>테스트 퀴즈 (기록 저장 안 함)</button><button className="text-button" onClick={() => setPage('ranking')}>랭킹 확인</button></div>
          </>}
          <button className="text-button" onClick={leaveAdmin}>운영자 화면 나가기</button>
        </section>
      </main>}

      {page === 'quiz' && <main className="content-page">
        <div className="page-heading"><div className="eyebrow">HISTORY CHALLENGE · {studentId}</div><h1>역사 퀴즈</h1><p>각 문제의 근거 자료는 제출 후 해설에서 확인할 수 있어.</p></div>
        {quizState === 'playing' && <div className="quiz-list">
          {questions.map((q, i) => <section className="question-card" key={q.id}>
            <div className="question-top"><span>QUESTION {String(i+1).padStart(2,'0')}</span><span>{i+1} / {questions.length}</span></div>
            <h2>{q.question}</h2>
            <div className="options">{q.options.map((option, idx) => <button type="button" key={idx} className={answers[q.id] === idx ? 'option selected' : 'option'} disabled={loading} onClick={() => setAnswers(prev => ({...prev,[q.id]:idx}))}><span>{String.fromCharCode(65+idx)}</span>{option}</button>)}</div>
          </section>)}
          <button className="primary-button submit-button" onClick={submitQuiz} disabled={loading}>{loading ? '채점 중...' : '답안 제출하기'} ↗</button>
        </div>}
        {quizState === 'finished' && result && <section className="result-card">
          <div className="eyebrow">YOUR RESULT · {studentId}</div><h2>{testMode ? '테스트 완료 · 랭킹에 저장되지 않아.' : '도전이 완료됐어.'}</h2><div className="score">{result.score}<small> / 100점</small></div>
          <p>정답 {result.correct_count}개 · 전체 {result.total_count}문제</p>
          <div className="explanations">{questions.map((q,i) => <article key={q.id}><b>{i+1}. {q.question}</b><p>{result.explanations?.find(x => x.id === q.id)?.explanation || ''}</p><button className="text-button" onClick={() => setPage('sources')}>출처: {q.source_name} ↗</button></article>)}</div>
          <div className="hero-actions"><button className="primary-button" onClick={() => setPage('ranking')}>랭킹 확인 ↗</button>{testMode && <button className="text-button" onClick={() => setPage('admin')}>운영자 화면으로</button>}</div>
        </section>}
      </main>}

      {page === 'ranking' && <main className="content-page">
        <div className="page-heading"><div className="eyebrow">HALL OF HONOR</div><h1>명예의 전당</h1><p>참가자들의 제출 점수를 기준으로 정렬해.</p></div>
        <section className="ranking-card">
          <div className="ranking-head"><div><span className="eyebrow">LEADERBOARD</span><h2>전체 랭킹</h2></div><button className="refresh-button" onClick={loadLeaderboard}>새로고침 ↻</button></div>
          {!isSupabaseConfigured ? <p className="empty-state">데이터베이스 연결 후 실제 참가자 랭킹이 표시돼.</p>
          : loading ? <p className="empty-state">불러오는 중...</p>
          : leaderboard.length === 0 ? <p className="empty-state">아직 등록된 기록이 없어. 첫 번째 도전자가 되어 봐!</p>
          : <div className="ranking-table"><div className="table-row table-label"><span>순위</span><span>학번</span><span>점수</span></div>{leaderboard.map((row,i)=><div className="table-row" key={row.student_id}><span className="rank-number">{String(i+1).padStart(2,'0')}</span><strong>{row.student_id}</strong><b>{row.best_score} <small>PT</small></b></div>)}</div>}
        </section>
      </main>}

      {page === 'sources' && <main className="content-page">
        <div className="page-heading"><div className="eyebrow">ARCHIVE & REFERENCES</div><h1>역사 자료실</h1><p>모든 문제는 학교에서 배부한 인성교육 자료 한 장을 근거로 구성했어.</p></div>
        <div className="source-list"><article className="source-card"><span className="source-no">01</span><div><h2>{SOURCE.name}</h2><p>{SOURCE.detail}</p></div></article></div>
        <p className="source-note">출제 범위: 학생독립운동기념일, 순국선열의 날, 백범김구기념관, 유관순열사기념관, 매헌윤봉길의사기념관. 원문은 학교 배부 자료에서 확인해 줘.</p>
      </main>}

      <footer><span>REMEMBER 11.17</span>{status === 'stopped' && <button onClick={() => setPage('admin')}>운영자</button>}<span>순국선열의 날 · 역사를 기억하는 퀴즈 프로젝트</span>{status !== 'stopped' && <button onClick={() => setPage('sources')}>자료 출처 확인 ↗</button> }</footer>
    </div>
  );
}

export default App;
