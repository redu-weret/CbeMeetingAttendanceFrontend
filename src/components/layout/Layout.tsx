import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { DemoModeBanner } from '../ui/DemoModeBanner';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <DemoModeBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
