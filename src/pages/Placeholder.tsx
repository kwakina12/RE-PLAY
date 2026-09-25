import { Link } from 'react-router-dom';
export function Placeholder({ name }: { name: string }) { return <main className="mx-auto max-w-xl p-6"><h1>{name}</h1><p>구현 예정 · 다시씀 임시 페이지</p><Link to="/">홈으로</Link></main>; }
