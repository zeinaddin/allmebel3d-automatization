import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAssets,
  getCatalogs,
  createAsset,
  deleteAsset,
  type AdminAsset,
  type AdminCatalog,
} from '../../api/adminClient';

const TIERS = ['lower', 'upper', 'upper_tall', 'antresol_35', 'antresol_45', 'antresol_35_deep', 'antresol_45_deep', 'pantry'];
const SUBTYPES = ['standard', 'drawer', 'combo', 'corner', 'filler', 'sink', 'oven', 'with_oven', 'with_oven_microwave'];

export default function AssetsPage() {
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [catalogs, setCatalogs] = useState<AdminCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCatalog, setFilterCatalog] = useState<number | ''>('');
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', code: '', width: '', tier: 'lower', subtype: 'standard',
    isCorner: false, price: '0', description: '', catalogId: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        getAssets(filterCatalog || undefined),
        getCatalogs(),
      ]);
      setAssets(a);
      setCatalogs(c);
    } finally {
      setLoading(false);
    }
  }, [filterCatalog]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { alert('Выберите GLB файл'); return; }
    if (!form.name || !form.code || !form.width || !form.catalogId) {
      alert('Заполните обязательные поля');
      return;
    }

    const fd = new FormData();
    fd.append('glb', file);
    fd.append('name', form.name);
    fd.append('code', form.code);
    fd.append('width', form.width);
    fd.append('tier', form.tier);
    fd.append('subtype', form.subtype);
    fd.append('isCorner', String(form.isCorner));
    fd.append('price', form.price || '0');
    fd.append('description', form.description);
    fd.append('catalogId', form.catalogId);
    fd.append('annotations', '[]');

    try {
      await createAsset(fd);
      setShowForm(false);
      setForm({ name: '', code: '', width: '', tier: 'lower', subtype: 'standard', isCorner: false, price: '0', description: '', catalogId: '' });
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить модуль?')) return;
    await deleteAsset(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary-900">Модули (Assets)</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm font-semibold bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
        >
          {showForm ? 'Скрыть' : '+ Добавить модуль'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-primary-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-primary-700">Новый модуль</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-primary-500 mb-1">Каталог *</label>
              <select
                value={form.catalogId}
                onChange={(e) => setForm({ ...form, catalogId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-primary-200 rounded-lg"
              >
                <option value="">Выберите...</option>
                {catalogs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-primary-500 mb-1">Название *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="С 600"
                className="w-full px-3 py-2 text-sm border border-primary-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-primary-500 mb-1">Код *</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="С"
                className="w-full px-3 py-2 text-sm border border-primary-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-primary-500 mb-1">Ширина (мм) *</label>
              <input
                type="number"
                value={form.width}
                onChange={(e) => setForm({ ...form, width: e.target.value })}
                placeholder="600"
                className="w-full px-3 py-2 text-sm border border-primary-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-primary-500 mb-1">Тир</label>
              <select
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-primary-200 rounded-lg"
              >
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-primary-500 mb-1">Подтип</label>
              <select
                value={form.subtype}
                onChange={(e) => setForm({ ...form, subtype: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-primary-200 rounded-lg"
              >
                {SUBTYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-primary-500 mb-1">Цена</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-primary-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-primary-500 mb-1">Описание</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-primary-200 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isCorner}
                  onChange={(e) => setForm({ ...form, isCorner: e.target.checked })}
                />
                Угловой
              </label>
            </div>
          </div>

          {/* GLB Upload */}
          <div>
            <label className="block text-xs text-primary-500 mb-1">GLB файл *</label>
            <input
              ref={fileRef}
              type="file"
              accept=".glb"
              className="text-sm text-primary-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent-50 file:text-accent-600 hover:file:bg-accent-100"
            />
          </div>

          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-semibold bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
          >
            Загрузить модуль
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 items-center">
        <span className="text-xs text-primary-500">Каталог:</span>
        <select
          value={filterCatalog}
          onChange={(e) => setFilterCatalog(e.target.value ? parseInt(e.target.value, 10) : '')}
          className="px-3 py-1.5 text-sm border border-primary-200 rounded-lg"
        >
          <option value="">Все</option>
          {catalogs.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="text-xs text-primary-400 ml-2">{assets.length} модулей</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-sm text-primary-400 text-center py-8">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-xl border border-primary-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-50 text-primary-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">Название</th>
                  <th className="text-left px-4 py-3 font-medium">Код</th>
                  <th className="text-left px-4 py-3 font-medium">Ширина</th>
                  <th className="text-left px-4 py-3 font-medium">Тир</th>
                  <th className="text-left px-4 py-3 font-medium">Подтип</th>
                  <th className="text-left px-4 py-3 font-medium">Цена</th>
                  <th className="text-left px-4 py-3 font-medium">Каталог</th>
                  <th className="text-right px-4 py-3 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-primary-50/50">
                    <td className="px-4 py-2.5 text-primary-400 font-mono text-xs">{a.id}</td>
                    <td className="px-4 py-2.5 font-medium text-primary-800">{a.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono">
                        {a.code}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-primary-600 font-mono">{a.width}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-600">
                        {a.tier}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                        {a.subtype}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-primary-600 font-mono">
                      {parseFloat(a.price) > 0 ? `${a.price}` : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-primary-500 text-xs">{a.catalog.name}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {assets.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-primary-400">
                      Нет модулей
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
