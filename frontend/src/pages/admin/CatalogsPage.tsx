import { useState, useEffect, useCallback } from 'react';
import {
  getCatalogs,
  createCatalog,
  updateCatalog,
  deleteCatalog,
  getCompanies,
  type AdminCatalog,
  type Company,
} from '../../api/adminClient';

export default function CatalogsPage() {
  const [catalogs, setCatalogs] = useState<AdminCatalog[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newCompanyId, setNewCompanyId] = useState<number | ''>('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, comps] = await Promise.all([getCatalogs(), getCompanies()]);
      setCatalogs(cats);
      setCompanies(comps);
      if (!newCompanyId && comps.length > 0) setNewCompanyId(comps[0]!.id);
    } finally {
      setLoading(false);
    }
  }, [newCompanyId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim() || !newCompanyId) return;
    await createCatalog(newName.trim(), newCompanyId as number);
    setNewName('');
    load();
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    await updateCatalog(id, { name: editName.trim() });
    setEditId(null);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить каталог и все модули?')) return;
    await deleteCatalog(id);
    load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-primary-900">Каталоги</h2>

      {/* Create form */}
      <div className="flex gap-2">
        <select
          value={newCompanyId}
          onChange={(e) => setNewCompanyId(parseInt(e.target.value, 10))}
          className="px-3 py-2 text-sm border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
        >
          <option value="">Компания...</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Название каталога"
          className="flex-1 px-3 py-2 text-sm border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || !newCompanyId}
          className="px-4 py-2 text-sm font-semibold bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
        >
          Создать
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-sm text-primary-400 text-center py-8">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-xl border border-primary-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary-50 text-primary-500 text-xs">
                <th className="text-left px-4 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium">Название</th>
                <th className="text-left px-4 py-3 font-medium">Компания</th>
                <th className="text-left px-4 py-3 font-medium">Модули</th>
                <th className="text-left px-4 py-3 font-medium">Создано</th>
                <th className="text-right px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {catalogs.map((c) => (
                <tr key={c.id} className="hover:bg-primary-50/50">
                  <td className="px-4 py-3 text-primary-400 font-mono">{c.id}</td>
                  <td className="px-4 py-3">
                    {editId === c.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(c.id)}
                        onBlur={() => setEditId(null)}
                        autoFocus
                        className="px-2 py-1 text-sm border border-accent-300 rounded focus:outline-none focus:ring-1 focus:ring-accent-500"
                      />
                    ) : (
                      <span className="font-medium text-primary-800">{c.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-primary-500">{c.company.name}</td>
                  <td className="px-4 py-3 text-primary-500">{c._count.assets}</td>
                  <td className="px-4 py-3 text-primary-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => { setEditId(c.id); setEditName(c.name); }}
                      className="text-xs px-2 py-1 text-accent-600 hover:bg-accent-50 rounded transition-colors"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              {catalogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-primary-400">
                    Нет каталогов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
