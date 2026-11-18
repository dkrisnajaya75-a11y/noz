import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import {
  Club,
  ClubSettings,
  GenderMatchingMode,
  GenderStyle,
  MatchingMode,
  QueueMode,
} from '../types/badminton';

interface SettingsViewProps {
  clubs: Club[];
  activeClub: Club;
  onUpdateSettings: (updates: Partial<ClubSettings>) => void;
  onSetCourtCount: (count: number) => void;
  onCreateClub: (name: string, courtCount: number) => void;
  onRenameClub: (clubId: string, newName: string) => void;
  onDeleteClub: (clubId: string) => void;
}

export function SettingsView({
  clubs,
  activeClub,
  onUpdateSettings,
  onSetCourtCount,
  onCreateClub,
  onRenameClub,
  onDeleteClub,
}: SettingsViewProps) {
  const [clubNameDraft, setClubNameDraft] = useState(activeClub.name);
  const [newClubName, setNewClubName] = useState('');
  const [newClubCourts, setNewClubCourts] = useState(2);
  const [confirmDeleteClub, setConfirmDeleteClub] = useState(false);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = clubNameDraft.trim();
    if (!trimmed) return;
    onRenameClub(activeClub.id, trimmed);
  };

  const handleCreateClub = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClubName.trim();
    if (!trimmed) return;
    onCreateClub(trimmed, newClubCourts);
    setNewClubName('');
    setNewClubCourts(2);
  };

  const matchingOptions: Array<{
    id: MatchingMode;
    title: string;
    desc: string;
  }> = [
    {
      id: 'balanced',
      title: 'Seimbang',
      desc: 'Menyeimbangkan pemerataan jumlah main, variasi rekan/lawan, dan kesetaraan level antar tim.',
    },
    {
      id: 'fairness',
      title: 'Adil Utama',
      desc: 'Mengutamakan pemain yang paling lama menunggu dan paling sedikit bermain, meski selisih level lebih lebar.',
    },
    {
      id: 'level',
      title: 'Level Utama',
      desc: 'Mengutamakan pertandingan seimbang berdasarkan level kemampuan pemain sambil tetap menjaga rotasi.',
    },
  ];

  const genderMatchingOptions: Array<{
    id: GenderMatchingMode;
    title: string;
    desc: string;
  }> = [
    {
      id: 'free',
      title: 'Bebas (Tidak Melihat Gender)',
      desc: 'Saran otomatis bebas menggabungkan pemain putra dan putri tanpa aturan komposisi gender.',
    },
    {
      id: 'same_or_mixed',
      title: 'Satu Gender atau Mix Gender',
      desc: 'Hanya menyarankan format satu gender saja (4 Putra atau 4 Putri) atau ganda campuran (1L + 1P melawan 1L + 1P).',
    },
  ];

  const queueOptions: Array<{
    id: QueueMode;
    title: string;
    desc: string;
  }> = [
    {
      id: 'shared',
      title: 'Antrean Bersama',
      desc: 'Satu daftar tunggu terpusat untuk semua lapangan. Lapangan yang kosong mengambil 4 pemain terbaik berikutnya.',
    },
    {
      id: 'split',
      title: 'Antrean Per Lapangan',
      desc: 'Pisahkan daftar tunggu ke masing-masing lapangan (misal: pemula di Lapangan 1, mahir di Lapangan 2).',
    },
  ];

  const genderStyleOptions: Array<{
    id: GenderStyle;
    title: string;
    desc: string;
  }> = [
    {
      id: 'soft_bg',
      title: 'Latar Lembut',
      desc: 'Kartu pemain memakai warna latar biru/merah muda lembut (label L/P tetap tampil).',
    },
    {
      id: 'thin_edge',
      title: 'Garis Tepi Tipis',
      desc: 'Kartu netral dengan garis tipis berwarna di tepi kiri (label L/P tetap tampil).',
    },
    {
      id: 'none',
      title: 'Tanpa Warna',
      desc: 'Tampilan bersih tanpa warna gender, hanya mengandalkan label kecil L/P.',
    },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Pengaturan Klub &amp; Penjadwalan
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Sesuaikan jumlah lapangan, prioritas rotasi pemain, mode antrean, tampilan gender, dan daftar klub yang Anda kelola.
        </p>
      </div>

      {/* Matching Priority */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Prioritas Penjadwalan (Keseimbangan vs Level)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Menentukan bagaimana sistem menyarankan 4 pemain setiap kali lapangan terbuka.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {matchingOptions.map((opt) => {
            const active = activeClub.settings.matchingMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateSettings({ matchingMode: opt.id })}
                aria-pressed={active}
                className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-600'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-bold text-slate-900">
                  {opt.title}
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Gender Matching Mode */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Aturan Gender Saran Otomatis
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tentukan apakah saran otomatis lapangan bebas gender atau mengikuti format ganda sejenis dan ganda campuran.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {genderMatchingOptions.map((opt) => {
            const active =
              (activeClub.settings.genderMatching ?? 'free') === opt.id;
            const samePct = activeClub.settings.sameGenderPercent ?? 50;
            const mixedPct = 100 - samePct;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateSettings({ genderMatching: opt.id })}
                aria-pressed={active}
                className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-600'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-900">
                    {opt.title}
                  </div>
                  {opt.id === 'same_or_mixed' && (
                    <span className="text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded tabular-nums shrink-0">
                      {samePct}% / {mixedPct}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>

        {(activeClub.settings.genderMatching ?? 'free') === 'same_or_mixed' && (() => {
          const samePct = activeClub.settings.sameGenderPercent ?? 50;
          const mixedPct = 100 - samePct;
          const updateSamePct = (val: number) => {
            const clamped = Number.isFinite(val)
              ? Math.max(0, Math.min(100, Math.round(val)))
              : 50;
            onUpdateSettings({ sameGenderPercent: clamped });
          };
          const presets = [
            { label: '50% / 50%', same: 50 },
            { label: '70% / 30%', same: 70 },
            { label: '30% / 70%', same: 30 },
            { label: '100% Satu Gender', same: 100 },
            { label: '100% Campuran', same: 0 },
          ];

          return (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Porsi Satu Gender vs Ganda Campuran
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Isi persentase target saran otomatis (total otomatis 100%).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => updateSamePct(p.same)}
                      aria-pressed={samePct === p.same}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer tabular-nums ${
                        samePct === p.same
                          ? 'bg-emerald-700 border-emerald-700 text-white'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <label
                    htmlFor="same-gender-percent-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Porsi Satu Gender (4L / 4P)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="same-gender-percent-input"
                      type="number"
                      min={0}
                      max={100}
                      value={samePct}
                      onChange={(e) => updateSamePct(Number(e.target.value))}
                      className="w-24 font-mono text-sm font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <span className="text-sm font-mono font-semibold text-slate-600">
                      %
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <label
                    htmlFor="mixed-gender-percent-input"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Porsi Ganda Campuran (1L+1P vs 1L+1P)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="mixed-gender-percent-input"
                      type="number"
                      min={0}
                      max={100}
                      value={mixedPct}
                      onChange={(e) =>
                        updateSamePct(100 - Number(e.target.value))
                      }
                      className="w-24 font-mono text-sm font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <span className="text-sm font-mono font-semibold text-slate-600">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={samePct}
                  onChange={(e) => updateSamePct(Number(e.target.value))}
                  aria-label="Atur persentase porsi satu gender"
                  className="w-full accent-emerald-700 cursor-pointer"
                />
                <div
                  aria-hidden="true"
                  className="h-2 w-full rounded-full overflow-hidden bg-amber-200 flex"
                >
                  <div
                    className="bg-emerald-600 transition-all"
                    style={{ width: `${samePct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 tabular-nums">
                  <span>Satu Gender: {samePct}%</span>
                  <span>Ganda Campuran: {mixedPct}%</span>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Queue Mode */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Mode Daftar Tunggu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pilih satu daftar tunggu bersama atau bagi antrean khusus per lapangan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {queueOptions.map((opt) => {
            const active = activeClub.settings.queueMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateSettings({ queueMode: opt.id })}
                aria-pressed={active}
                className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-600'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-bold text-slate-900">
                  {opt.title}
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Gender Visual Indicator */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Penanda Warna Gender (Lapangan &amp; Antrean)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Label kecil L/P selalu ditampilkan di samping nama pemain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {genderStyleOptions.map((opt) => {
            const active = activeClub.settings.genderStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateSettings({ genderStyle: opt.id })}
                aria-pressed={active}
                className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-600'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-bold text-slate-900">
                  {opt.title}
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Courts Count (1-12) */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Jumlah Lapangan ({activeClub.name})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur jumlah lapangan aktif antara 1 hingga 12 lapangan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSetCourtCount(activeClub.courts.length - 1)}
            disabled={activeClub.courts.length <= 1}
            aria-label="Kurangi jumlah lapangan"
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-lg font-bold font-mono tabular-nums text-slate-900 w-16 text-center">
            {activeClub.courts.length} / 12
          </span>
          <button
            type="button"
            onClick={() => onSetCourtCount(activeClub.courts.length + 1)}
            disabled={activeClub.courts.length >= 12}
            aria-label="Tambah jumlah lapangan"
            className="p-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Club Management */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Kelola Klub ({clubs.length} Klub Tersimpan)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap klub memiliki daftar pemain, lapangan, dan catatan pertandingannya sendiri.
          </p>
        </div>

        {/* Rename or Delete Active Club */}
        <form
          onSubmit={handleRenameSubmit}
          className="flex flex-wrap items-end gap-3 pb-4 border-b border-slate-100"
        >
          <div className="flex-1 min-w-[220px]">
            <label
              htmlFor="rename-club-input"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Nama Klub Aktif
            </label>
            <input
              id="rename-club-input"
              type="text"
              value={clubNameDraft}
              onChange={(e) => setClubNameDraft(e.target.value)}
              className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <button
            type="submit"
            disabled={!clubNameDraft.trim() || clubNameDraft.trim() === activeClub.name}
            className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors cursor-pointer"
          >
            Simpan Nama
          </button>

          {clubs.length > 1 && !confirmDeleteClub && (
            <button
              type="button"
              onClick={() => setConfirmDeleteClub(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>Hapus Klub Ini</span>
            </button>
          )}

          {confirmDeleteClub && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-medium text-rose-900">
                Yakin hapus {activeClub.name}?
              </span>
              <button
                type="button"
                onClick={() => {
                  onDeleteClub(activeClub.id);
                  setConfirmDeleteClub(false);
                }}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded cursor-pointer"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteClub(false)}
                className="px-2 py-1 text-xs font-medium text-slate-700 hover:underline cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}
        </form>

        {/* Create New Club */}
        <form
          onSubmit={handleCreateClub}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
        >
          <div className="sm:col-span-6">
            <label
              htmlFor="new-club-name"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Buat Klub Baru
            </label>
            <input
              id="new-club-name"
              type="text"
              value={newClubName}
              onChange={(e) => setNewClubName(e.target.value)}
              placeholder="Contoh: PB Bintang Timur"
              className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="new-club-courts"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Lapangan Awal
            </label>
            <select
              id="new-club-courts"
              value={newClubCourts}
              onChange={(e) => setNewClubCourts(Number(e.target.value))}
              className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} Lapangan
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={!newClubName.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Buat Klub</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
