import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { getSession } from '../lib/auth';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push('/');
    } else {
      setError('密碼錯誤，請再試一次');
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>登入 — 訂閱管理</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon">📋</div>
          <h1>訂閱管理</h1>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="輸入密碼"
              autoFocus
              autoComplete="current-password"
            />
            {error && <p className="login-error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? '登入中...' : '登入'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ req, res }) {
  const session = await getSession(req, res);
  if (session.authenticated) {
    return { redirect: { destination: '/', permanent: false } };
  }
  return { props: {} };
}
