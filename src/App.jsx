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
    if (!error && action === 'reset') {
      setLeaderboard([]); setQuestions([]); setAnswers({}); setResult(null);
      setQuizState('idle'); setTestMode(false); setStudentId('');
      setNotice('랭킹과 제출 기록이 초기화됐어. 퀴즈는 시작 대기 상태야.');
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
