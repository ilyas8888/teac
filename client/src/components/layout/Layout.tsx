import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import EmailVerificationBanner from './EmailVerificationBanner';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <EmailVerificationBanner />
        <Outlet />
      </main>
    </div>
  );
}
