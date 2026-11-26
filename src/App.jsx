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
    if (!/^207(?:0[1-9]|1[0-9]|2[0-9])$/.test(cleanId)) {
      setNotice('20701부터 20729 사이의 학번을 정확히 입력해 줘.');
      return;
    }
    if (!supabase) {
      setNotice('Supabase 연결 설정을 먼저 완료해 줘.');
      return;
    }
    setStudentId(cleanId);
    setLoading(true);
    setNotice('');
    const { data, error } = await supabase.rpc('get_quiz_questions');
    if (error || !Array.isArray(data) || data.length !== 5 || new Set(data.map(q => q.id)).size !== 5) {
      setNotice('서로 다른 문제 5개를 불러오지 못했어. Supabase 문제은행 설정을 확인해 줘.');
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
    const { data, error } = await supabase.rpc('submit_quiz', {
      p_student_id: Number(studentId),
      p_answers: payload
    });
    if (error) setNotice('점수를 저장하지 못했어. Supabase의 학번 방식 SQL을 실행했는지 확인해 줘.');
    else {
      setResult(data);
      setQuizState('finished');
    }
    setLoading(false);
  }

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
        <span className="student-chip">{studentId ? studentId + ' 참가 중' : '학번으로 참여'}</span>
      </header>
