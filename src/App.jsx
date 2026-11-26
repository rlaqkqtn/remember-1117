import React, { useEffect, useRef, useState } from 'react';
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
  const [resetConfirm, setResetConfirm] = useState(false);
  const adminBusy = useRef(false);
  const statusVersion = useRef(0);

  function controlButtonStyle(enabled, danger = false) {
    const accent = danger ? '#f28b82' : '#d0b17a';
    return { padding: '12px 20px', minWidth: '145px', borderRadius: '6px',
      border: enabled ? `2px solid ${accent}` : '2px solid transparent',
      background: enabled ? (danger ? 'rgba(242,139,130,.08)' : 'rgba(208,177,122,.08)') : 'transparent',
      color: enabled ? accent : '#8b96a5', opacity: enabled ? 1 : 0.55,
      fontWeight: 600, cursor: enabled && !loading ? 'pointer' : 'default' };
  }

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    async function refreshStatus() {
      if (adminBusy.current) return;
      const version = statusVersion.current;
      const { data, error } = await supabase.rpc('get_quiz_status');
      if (active && !error && !adminBusy.current && version === statusVersion.current) setStatus(data);
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

  useEffect(() => {
    if (status === 'waiting' && !adminVerified && page === 'quiz') {
      setQuestions([]); setAnswers({}); setResult(null); setQuizState('idle');
      setPage('home'); setNotice('퀴즈 기록이 초기화되었어. 다시 시작할 때 참가해 줘.');
    }
  }, [status, page, adminVerified]);

  async function adminAction(action, key = adminKey) {
    if (loading || !supabase || adminBusy.current) return;
    adminBusy.current = true;
    statusVersion.current += 1;
    setLoading(true);
    setNotice('');
    try {
      const { data, error } = await supabase.rpc('admin_quiz_control', { p_key: key, p_action: action });
      if (error) throw error;
      if (!['waiting', 'running', 'stopped'].includes(data)) throw new Error('서버 상태 응답이 올바르지 않아.');
      setAdminKey(key);
      setAdminVerified(true);
      setAdminInput('');
      setStatus(data);
      setPage('admin');
      if (action === 'reset') {
        setLeaderboard([]); setQuestions([]); setAnswers({}); setResult(null);
        setQuizState('idle'); setTestMode(false); setStudentId('');
        setResetConfirm(false);
        setNotice('랭킹과 제출 기록이 초기화됐어. 퀴즈는 시작 대기 상태야.');
      } else if (action === 'start' || action === 'stop') {
        setResetConfirm(false);
      }
    } catch (error) {
      setNotice('운영자 요청 실패: ' + (error?.message || String(error)) + (error?.code ? ' (' + error.code + ')' : ''));
    } finally {
      statusVersion.current += 1;
      adminBusy.current = false;
      setLoading(false);
    }
  }
