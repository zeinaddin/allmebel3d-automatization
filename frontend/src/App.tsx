import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CatalogBrowser } from './components/catalog/CatalogBrowser';
import { LayoutSelector } from './components/configurator/LayoutSelector';
import { WallInput } from './components/configurator/WallInput';
import { WallDiagram } from './components/results/WallDiagram';
import { ModuleList } from './components/results/ModuleList';
import { ScoreCard } from './components/results/ScoreCard';
import { KitchenViewer } from './components/viewer3d/KitchenViewer';
import { GoldenTableEditor } from './components/debug/GoldenTableEditor';
import { AlgorithmDebug } from './components/debug/AlgorithmDebug';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useCatalogStore } from './store/useCatalogStore';
import { useKitchenPlan } from './hooks/useKitchenPlan';
import { useUrlState } from './hooks/useUrlState';
import { generateRoom } from './api/client';

type ViewTab = '3d' | 'diagram' | 'modules' | 'debug';

function downloadJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [page, setPage] = useState<'planner' | 'catalog'>('planner');
  const [viewTab, setViewTab] = useState<ViewTab>('3d');
  const fetchCatalogs = useCatalogStore((s) => s.fetchCatalogs);
  const loading = useCatalogStore((s) => s.loading);
  const error = useCatalogStore((s) => s.error);
  const catalogs = useCatalogStore((s) => s.catalogs);
  const selectedCatalogId = useCatalogStore((s) => s.selectedCatalogId);
  const selectCatalog = useCatalogStore((s) => s.selectCatalog);
  const viewerRef = useRef<HTMLCanvasElement | null>(null);
  const forceRenderRef = useRef<(() => void) | null>(null);

  // AI generation state
  const [genState, setGenState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [genImageUrl, setGenImageUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // URL state sync
  useUrlState();

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  const plan = useKitchenPlan();

  const handleExportJSON = useCallback(() => {
    if (!plan) return;
    downloadJSON(plan, `kitchen-plan-${Date.now()}.json`);
  }, [plan]);

  const handleExportScreenshot = useCallback(async () => {
    const canvas = viewerRef.current;
    if (!canvas) return;

    // Force a synchronous render so the buffer contains the current frame
    forceRenderRef.current?.();
    const dataUri = canvas.toDataURL('image/png');

    setGenState('loading');
    setGenImageUrl(null);
    setGenError(null);

    try {
      const result = await generateRoom(dataUri);
      if (result.images?.[0]?.url) {
        setGenImageUrl(result.images[0].url);
        setGenState('done');
      } else {
        throw new Error('No image returned');
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
      setGenState('error');
    }
  }, []);

  const handleDownloadGenerated = useCallback(() => {
    if (!genImageUrl) return;
    const a = document.createElement('a');
    a.href = genImageUrl;
    a.download = `kitchen-realistic-${Date.now()}.png`;
    a.target = '_blank';
    a.click();
  }, [genImageUrl]);

  const handleCloseModal = useCallback(() => {
    setGenState('idle');
    setGenImageUrl(null);
    setGenError(null);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-primary-50 text-primary-900">
      {/* ─── Header ─── */}
      <header className="bg-white shadow-sm px-5 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-5">
          <h1 className="text-base font-bold tracking-tight">
            Algorithm<span className="text-accent-600">Mebel</span>
          </h1>
          <nav className="flex gap-0.5 bg-primary-100 rounded-lg p-0.5">
            <button
              onClick={() => setPage('planner')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                page === 'planner'
                  ? 'bg-white text-primary-900 shadow-sm'
                  : 'text-primary-500 hover:text-primary-700'
              }`}
            >
              Планировщик
            </button>
            <button
              onClick={() => setPage('catalog')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                page === 'catalog'
                  ? 'bg-white text-primary-900 shadow-sm'
                  : 'text-primary-500 hover:text-primary-700'
              }`}
            >
              Каталог
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Catalog selector */}
          {catalogs.length > 1 && (
            <select
              value={selectedCatalogId ?? ''}
              onChange={(e) => selectCatalog(e.target.value)}
              className="text-xs border border-primary-200 rounded-md px-2 py-1 bg-white text-primary-700"
            >
              {catalogs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.moduleCount})
                </option>
              ))}
            </select>
          )}

          {/* Score badge */}
          {page === 'planner' && plan && (
            <>
              <span className="text-xs text-primary-400">
                {plan.wallPlans.reduce(
                  (sum, wp) => sum + wp.segments.reduce((s, seg) => s + seg.modules.length, 0),
                  0,
                )}{' '}
                модулей
              </span>
              <span
                className={`text-sm font-bold px-2.5 py-0.5 rounded-full ring-1 ${
                  plan.overallScore >= 80
                    ? 'bg-green-50 text-green-700 ring-green-200'
                    : plan.overallScore >= 50
                      ? 'bg-amber-50 text-amber-700 ring-amber-200'
                      : 'bg-red-50 text-red-700 ring-red-200'
                }`}
              >
                {plan.overallScore}
              </span>
            </>
          )}
          <Link
            to="/admin"
            className="text-xs text-primary-400 hover:text-primary-600 transition-colors ml-2"
          >
            Админ
          </Link>
        </div>
      </header>

      {/* ─── Catalog page ─── */}
      {page === 'catalog' && (
        <main className="flex-1 overflow-auto p-6 max-w-7xl mx-auto w-full">
          <ErrorBoundary>
            <CatalogBrowser />
          </ErrorBoundary>
        </main>
      )}

      {/* ─── Planner page ─── */}
      {page === 'planner' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel: Controls */}
          <aside className="w-72 flex-shrink-0 border-r border-primary-200 bg-white overflow-y-auto p-4 space-y-5">
            <LayoutSelector />
            <WallInput />
          </aside>

          {/* Main area: Visualization */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* View tabs + export */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-2 flex-shrink-0">
              {(
                [
                  { id: '3d', label: '3D вид' },
                  { id: 'diagram', label: 'Схема' },
                  { id: 'modules', label: 'Модули' },
                  { id: 'debug', label: 'Отладка' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setViewTab(t.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    viewTab === t.id
                      ? 'bg-accent-600 text-white shadow-sm'
                      : 'text-primary-500 hover:bg-primary-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}

              {/* Export buttons */}
              {plan && (
                <div className="ml-auto flex gap-1">
                  {viewTab === '3d' && (
                    <button
                      onClick={handleExportScreenshot}
                      className="px-2.5 py-1.5 text-xs text-primary-400 hover:bg-primary-100 rounded-md transition-colors"
                      title="Сохранить скриншот"
                    >
                      PNG
                    </button>
                  )}
                  <button
                    onClick={handleExportJSON}
                    className="px-2.5 py-1.5 text-xs text-primary-400 hover:bg-primary-100 rounded-md transition-colors"
                    title="Экспорт плана"
                  >
                    JSON
                  </button>
                </div>
              )}
            </div>

            {/* Content area */}
            <div className="flex-1 px-4 pb-4 overflow-auto">
              {/* Loading state */}
              {loading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary-200 border-t-accent-600 rounded-full animate-spin mx-auto mb-3" />
                    <span className="text-sm text-primary-400">Загрузка модулей...</span>
                  </div>
                </div>
              )}

              {/* Error state */}
              {!loading && error && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-sm">
                    <div className="text-3xl mb-3">!</div>
                    <p className="text-sm text-red-600 font-medium mb-1">Ошибка загрузки</p>
                    <p className="text-xs text-primary-400 mb-3">{error}</p>
                    <button
                      onClick={() => fetchCatalogs()}
                      className="text-xs px-3 py-1.5 bg-accent-600 text-white rounded-md hover:bg-accent-700 transition-colors"
                    >
                      Повторить
                    </button>
                  </div>
                </div>
              )}

              {!loading && !error && plan && (
                <ErrorBoundary>
                  {viewTab === '3d' && (
                    <KitchenViewer
                      plan={plan}
                      canvasRef={viewerRef}
                      onSceneReady={({ forceRender }) => {
                        forceRenderRef.current = forceRender;
                      }}
                    />
                  )}

                  {viewTab === 'diagram' && (
                    <div className="space-y-6 py-2">
                      <ScoreCard plan={plan} />
                      {plan.wallPlans.map((wp) => (
                        <WallDiagram key={wp.wallId} plan={wp} />
                      ))}
                    </div>
                  )}

                  {viewTab === 'modules' && (
                    <div className="space-y-6 py-2">
                      {plan.wallPlans.map((wp) => (
                        <div key={wp.wallId}>
                          <h3 className="text-sm font-medium text-primary-700 mb-3">
                            {wp.wallId === 'wall-a' ? 'Стена A' : 'Стена B'} — {wp.wallLength} мм
                          </h3>
                          <ModuleList plan={wp} />
                        </div>
                      ))}
                    </div>
                  )}

                  {viewTab === 'debug' && (
                    <div className="space-y-4 py-2">
                      <GoldenTableEditor />
                      <AlgorithmDebug plan={plan} />
                    </div>
                  )}
                </ErrorBoundary>
              )}
            </div>
          </main>
        </div>
      )}

      {/* ─── AI Generation Modal ─── */}
      {genState !== 'idle' && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && genState !== 'loading') handleCloseModal();
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100">
              <h2 className="text-sm font-bold text-primary-900">
                {genState === 'loading' && 'Generating Photorealistic Kitchen...'}
                {genState === 'done' && 'Photorealistic Kitchen'}
                {genState === 'error' && 'Generation Failed'}
              </h2>
              {genState !== 'loading' && (
                <button
                  onClick={handleCloseModal}
                  className="text-primary-400 hover:text-primary-700 text-lg leading-none"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
              {genState === 'loading' && (
                <div className="text-center py-16">
                  <div className="w-12 h-12 border-3 border-primary-200 border-t-accent-600 rounded-full animate-spin mx-auto mb-5" />
                  <p className="text-sm text-primary-600 font-medium mb-1">
                    AI is transforming your kitchen...
                  </p>
                  <p className="text-xs text-primary-400">
                    This may take 15–30 seconds
                  </p>
                </div>
              )}

              {genState === 'done' && genImageUrl && (
                <img
                  src={genImageUrl}
                  alt="AI-generated photorealistic kitchen"
                  className="max-w-full max-h-[65vh] rounded-lg shadow-lg object-contain"
                />
              )}

              {genState === 'error' && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">!</div>
                  <p className="text-sm text-red-600 font-medium mb-2">
                    {genError || 'Something went wrong'}
                  </p>
                  <p className="text-xs text-primary-400 mb-4">
                    Please try again
                  </p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            {genState !== 'loading' && (
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-primary-100">
                {genState === 'error' && (
                  <button
                    onClick={handleExportScreenshot}
                    className="px-4 py-2 text-xs font-semibold bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
                  >
                    Retry
                  </button>
                )}
                {genState === 'done' && (
                  <button
                    onClick={handleDownloadGenerated}
                    className="px-4 py-2 text-xs font-semibold bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
                  >
                    Download PNG
                  </button>
                )}
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-primary-500 hover:bg-primary-100 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
