import { NavLink, Outlet, Link } from 'react-router-dom';

const NAV = [
  { to: '/admin/companies', label: 'Компании' },
  { to: '/admin/catalogs', label: 'Каталоги' },
  { to: '/admin/assets', label: 'Модули' },
];

export default function AdminPage() {
  return (
    <div className="h-screen flex flex-col bg-primary-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-5 py-2.5 flex items-center gap-5 flex-shrink-0">
        <Link to="/" className="text-base font-bold tracking-tight">
          Algorithm<span className="text-accent-600">Mebel</span>
        </Link>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-violet-100 text-violet-700">
          АДМИН
        </span>
        <nav className="flex gap-0.5 bg-primary-100 rounded-lg p-0.5 ml-4">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-white text-primary-900 shadow-sm'
                    : 'text-primary-500 hover:text-primary-700'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <Link
          to="/"
          className="ml-auto text-xs text-primary-400 hover:text-primary-600 transition-colors"
        >
          Планировщик
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
