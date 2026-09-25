import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { RecordsPage } from '@/pages/RecordsPage';
import { ExpensePage } from '@/pages/ExpensePage';
import { ReflectionPage } from '@/pages/ReflectionPage';
import { RecordDetailPage } from '@/pages/RecordDetailPage';
import { EditRecordPage } from '@/pages/EditRecordPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
export const router = createBrowserRouter([
{ path: '/', element: <HomePage />, errorElement: <main><h1>화면을 표시하지 못했어요</h1><a href="/">홈으로</a></main> },
{ path: '/records', element: <RecordsPage />, errorElement: <main><h1>화면을 표시하지 못했어요</h1><a href="/">홈으로</a></main> },
{ path: '/records/new/expense', element: <ExpensePage />, errorElement: <main><h1>화면을 표시하지 못했어요</h1><a href="/">홈으로</a></main> },
{ path: '/records/new/reflection', element: <ReflectionPage />, errorElement: <main><h1>화면을 표시하지 못했어요</h1><a href="/">홈으로</a></main> },
{ path: '/records/:id', element: <RecordDetailPage />, errorElement: <main><h1>화면을 표시하지 못했어요</h1><a href="/">홈으로</a></main> },
{ path: '/records/:id/edit', element: <EditRecordPage />, errorElement: <main><h1>화면을 표시하지 못했어요</h1><a href="/">홈으로</a></main> },
{ path: '/settings', element: <SettingsPage />, errorElement: <main><h1>화면을 표시하지 못했어요</h1><a href="/">홈으로</a></main> },
{ path: '*', element: <NotFoundPage />, errorElement: <main><h1>화면을 표시하지 못했어요</h1><a href="/">홈으로</a></main> }]);
