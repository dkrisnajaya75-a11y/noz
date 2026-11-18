import { useMemo, useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseRosterText } from '../utils/rosterParser';
import { Gender } from '../types/badminton';
import {
  getGenderShortLabel,
  LEVEL_LABELS,
  LEVEL_OPTIONS,
} from '../utils/genderStyle';

interface BulkPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingNames: string[];
  onImportPlayers: (
    players: Array<{ name: string; gender: Gender; level: number }>
  ) => void;
}

const SAMPLE_TEXT = `Andi Wijaya, L, 3
Sari Dewi, P, 2
Bima Pratama, L, Pemula
Rina Kusuma\tP\tMahir`;

export function BulkPasteModal({
  isOpen,
  onClose,
  existingNames,
  onImportPlayers,
}: BulkPasteModalProps) {
  const [text, setText] = useState('');

  const parsedLines = useMemo(() => parseRosterText(text), [text]);
  const existingSet = useMemo(
    () => new Set(existingNames.map((n) => n.trim().toLowerCase())),
    [existingNames]
  );

  const validPlayers = useMemo(() => {
    const seenInBatch = new Set<string>();
    return parsedLines
      .filter((line) => line.valid)
      .map((line) => {
        const lower = line.name.toLowerCase();
        const isDuplicate = existingSet.has(lower) || seenInBatch.has(lower);
        seenInBatch.add(lower);
        return { ...line, isDuplicate };
      });
  }, [parsedLines, existingSet]);

  const newPlayersToImport = validPlayers.filter((p) => !p.isDuplicate);
  const errorLines = parsedLines.filter((l) => !l.valid);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (newPlayersToImport.length === 0) return;
    onImportPlayers(
      newPlayersToImport.map((p) => ({
        name: p.name,
        gender: p.gender,
        level: p.level,
      }))
    );
    setText('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-import-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2
              id="bulk-import-title"
              className="text-lg font-bold text-slate-900"
            >
              Tempel Daftar Pemain
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Salin dari catatan WhatsApp atau spreadsheet (satu pemain per baris: nama, gender, level)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela impor"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="bulk-roster-textarea"
              className="text-xs font-semibold text-slate-700"
            >
              Format: Nama, Gender (L/P atau M/F), Level (1–3 atau Pemula/Menengah/Mahir)
            </label>
            <button
              type="button"
              onClick={() => setText(SAMPLE_TEXT)}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
            >
              Isi Contoh Daftar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {LEVEL_OPTIONS.map((opt) => (
              <div
                key={opt.level}
                className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-[11px]"
              >
                <span className="font-semibold text-slate-800">
                  {opt.level} - {opt.label}:
                </span>{' '}
                <span className="text-slate-600">{opt.description}</span>
              </div>
            ))}
          </div>

          <textarea
            id="bulk-roster-textarea"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Contoh:\n1. Budi Santoso, L, 3\n2. Dewi Anggraini, P, 2\nRaka Putra\tM\tPemula`}
            className="w-full font-mono text-sm bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
          />

          {parsedLines.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Pratinjau:{' '}
                  <strong className="text-emerald-700 tabular-nums">
                    {newPlayersToImport.length} pemain baru
                  </strong>
                  {validPlayers.length - newPlayersToImport.length > 0 && (
                    <span className="text-amber-700 ml-2 tabular-nums">
                      · {validPlayers.length - newPlayersToImport.length} duplikat dilewati
                    </span>
                  )}
                  {errorLines.length > 0 && (
                    <span className="text-rose-700 ml-2 tabular-nums">
                      · {errorLines.length} baris perlu dicek
                    </span>
                  )}
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Baris</th>
                      <th className="py-2 px-3 font-semibold">Nama</th>
                      <th className="py-2 px-3 font-semibold">Gender</th>
                      <th className="py-2 px-3 font-semibold">Level</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedLines.map((line) => {
                      const matchedValid = validPlayers.find(
                        (v) => v.lineNumber === line.lineNumber
                      );
                      return (
                        <tr key={line.lineNumber} className="bg-white">
                          <td className="py-2 px-3 font-mono text-slate-400 tabular-nums">
                            {line.lineNumber}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {line.name || '—'}
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {line.valid ? getGenderShortLabel(line.gender) : '—'}
                          </td>
                          <td className="py-2 px-3 tabular-nums">
                            {line.valid
                              ? `Lv.${line.level} (${LEVEL_LABELS[line.level]})`
                              : '—'}
                          </td>
                          <td className="py-2 px-3">
                            {!line.valid ? (
                              <span className="inline-flex items-center gap-1 text-rose-700">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{line.error}</span>
                              </span>
                            ) : matchedValid?.isDuplicate ? (
                              <span className="text-amber-700">
                                Sudah ada di daftar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Siap diimpor</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={newPlayersToImport.length === 0}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-45 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            Tambahkan {newPlayersToImport.length} Pemain
          </button>
        </div>
      </div>
    </div>
  );
}
