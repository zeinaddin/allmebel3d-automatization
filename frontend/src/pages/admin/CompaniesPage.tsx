import { useState, useEffect, useCallback } from 'react';
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  type Company,
} from '../../api/adminClient';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCompanies(await getCompanies());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCompany(newName.trim());
    setNewName('');
    load();
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    await updateCompany(id, editName.trim());
    setEditId(null);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить компанию и все её каталоги?')) return;
    await deleteCompany(id);
    load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-primary-900">Компании</h2>

      {/* Create form */}
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Название новой компании"
          className="flex-1 px-3 py-2 text-sm border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
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
                <th className="text-left px-4 py-3 font-medium">Каталоги</th>
                <th className="text-left px-4 py-3 font-medium">Создано</th>
                <th className="text-right px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {companies.map((c) => (
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
                  <td className="px-4 py-3 text-primary-500">{c._count.catalogs}</td>
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
              {companies.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-primary-400">
                    Нет компаний
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
