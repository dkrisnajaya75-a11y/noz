import { Plus, UserPlus } from 'lucide-react';
import { ActiveTab, Club } from '../types/badminton';

interface TopNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  clubs: Club[];
  activeClub: Club;
  onSelectClub: (clubId: string) => void;
  onAddCourt: () => void;
  onOpenBulkImport: () => void;
  onNavigateToNewClub: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'courts', label: 'Lapangan' },
  { id: 'roster', label: 'Pemain' },
  { id: 'records', label: 'Catatan' },
  { id: 'settings', label: 'Pengaturan' },
];

const MODE_LABEL: Record<string, string> = {
  balanced: 'Seimbang',
  fairness: 'Adil Utama',
  level: 'Level Utama',
};

export function TopNav({
  activeTab,
  onSelectTab,
  clubs,
  activeClub,
  onSelectClub,
  onAddCourt,
  onOpenBulkImport,
  onNavigateToNewClub,
}: TopNavProps) {
  const activePlayersCount = activeClub.players.filter((p) => p.isActive).length;
  const playingCourtsCount = activeClub.courts.filter(
    (c) => c.status === 'playing'
  ).length;

  return (
    <div className="bg-white border-b border-slate-200">
      {/* Top Bar Contract: Zone 1 Brand - Zone 2 Nav Links - Zone 3 Primary Action */}
      <header className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        <a
          href="#lapangan"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('courts');
          }}
          className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Noz
        </a>

        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-sm ${
                  isActive
                    ? 'text-emerald-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenBulkImport}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>Impor Pemain</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Strip */}
      <nav
        aria-label="Navigasi utama mobile"
        className="md:hidden border-t border-slate-100 px-2 grid grid-cols-4"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative py-2.5 text-xs font-medium text-center transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'text-emerald-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 bottom-0 h-0.5 bg-emerald-700"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Workspace Sub-Toolbar: Club Switcher + Quick Context */}
      <div className="bg-slate-50/80 border-t border-slate-200/80">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="club-selector" className="text-xs font-medium text-slate-500">
              Klub Aktif
            </label>
            <select
              id="club-selector"
              value={activeClub.id}
              onChange={(e) => onSelectClub(e.target.value)}
              className="text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 cursor-pointer"
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.players.length} pemain)
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onNavigateToNewClub}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline whitespace-nowrap shrink-0 cursor-pointer py-1 px-1.5"
            >
              + Klub Baru
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2 tabular-nums">
              <span>
                <strong className="text-slate-900">{activeClub.courts.length}</strong>/12 Lapangan
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>
                <strong className="text-slate-900">{playingCourtsCount}</strong> Sedang Main
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>
                <strong className="text-slate-900">{activePlayersCount}</strong> Pemain Siap
              </span>
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">
                ·
              </span>
              <span className="hidden sm:inline">
                Mode: <strong className="text-slate-900">{MODE_LABEL[activeClub.settings.matchingMode]}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-300 hidden md:inline">
                ·
              </span>
              <span className="hidden md:inline">
                {activeClub.settings.queueMode === 'shared'
                  ? 'Antrean Bersama'
                  : 'Antrean Per Lapangan'}
              </span>
              <span aria-hidden="true" className="text-slate-300 hidden lg:inline">
                ·
              </span>
              <span className="hidden lg:inline">
                Gender:{' '}
                <strong className="text-slate-900 tabular-nums">
                  {(activeClub.settings.genderMatching ?? 'free') === 'same_or_mixed'
                    ? `Sejenis ${activeClub.settings.sameGenderPercent ?? 50}% / Mix ${100 - (activeClub.settings.sameGenderPercent ?? 50)}%`
                    : 'Bebas'}
                </strong>
              </span>
            </div>

            {activeTab === 'courts' && (
              <button
                type="button"
                onClick={onAddCourt}
                disabled={activeClub.courts.length >= 12}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tambah Lapangan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
