export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#1A1916] text-white p-4">
      <nav>
        <ul className="space-y-2">
          <li><a href="/dashboard" className="block px-3 py-2 rounded hover:bg-white/10">Dashboard</a></li>
          <li><a href="/projects" className="block px-3 py-2 rounded hover:bg-white/10">Projekt</a></li>
          <li><a href="/cases" className="block px-3 py-2 rounded hover:bg-white/10">Ärenden</a></li>
          <li><a href="/contacts" className="block px-3 py-2 rounded hover:bg-white/10">Kontakter</a></li>
        </ul>
      </nav>
    </aside>
  );
}
