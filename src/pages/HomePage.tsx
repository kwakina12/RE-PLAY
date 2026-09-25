import { Link } from 'react-router-dom';
export function HomePage() { return <main className="mx-auto max-w-xl p-6"><h1>HomePage</h1><p>다시씀 · 구현 예정</p><Link to="/">홈으로</Link><ul>{['/records', '/records/new/expense', '/records/new/reflection', '/records/example', '/records/example/edit', '/settings'].map(path => <li key={path}><Link to={path}>{path}</Link></li>)}</ul></main>; }
