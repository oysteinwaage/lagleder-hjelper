import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { MatchSettings, PresetKey } from '@/types';

const PRESETS: { key: PresetKey; label: string; values: MatchSettings }[] = [
  {
    key: '3er',
    label: '3\'er',
    values: { playersOnField: 3, numberOfHalves: 1, halfDuration: 25, firstSubTime: 2, subInterval: 3 },
  },
  {
    key: '5er',
    label: '5\'er',
    values: { playersOnField: 5, numberOfHalves: 2, halfDuration: 25, firstSubTime: 3, subInterval: 4 },
  },
];

interface Props {
  settings: MatchSettings;
  selectedPreset?: PresetKey;
  onSave: (s: Partial<MatchSettings>, preset?: PresetKey) => void;
}

export function AdminSettings({ settings, selectedPreset, onSave }: Props) {
  const [local, setLocal] = useState(settings);
  const [inputValues, setInputValues] = useState<Record<keyof MatchSettings, string>>(
    () => Object.fromEntries(
      (Object.keys(settings) as (keyof MatchSettings)[]).map((k) => [k, String(settings[k])])
    ) as Record<keyof MatchSettings, string>
  );
  const [activePreset, setActivePreset] = useState<PresetKey | ''>(selectedPreset ?? '');
  const [saved, setSaved] = useState(false);

  function handleChange(key: keyof MatchSettings, val: string) {
    setInputValues((s) => ({ ...s, [key]: val }));
  }

  function handleBlur(key: keyof MatchSettings, min: number, max: number) {
    const raw = inputValues[key];
    const parsed = parseInt(raw);
    if (raw === '' || isNaN(parsed)) {
      setInputValues((s) => ({ ...s, [key]: String(local[key]) }));
    } else {
      const clamped = Math.min(Math.max(parsed, min), max);
      setLocal((s) => ({ ...s, [key]: clamped }));
      setInputValues((s) => ({ ...s, [key]: String(clamped) }));
    }
  }

  function save() {
    onSave(local, activePreset || undefined);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const fields: { key: keyof MatchSettings; label: string; unit?: string; min: number; max: number }[] = [
    { key: 'playersOnField', label: 'Spillere på banen', min: 1, max: 11 },
    { key: 'numberOfHalves', label: 'Antall omganger', min: 1, max: 4 },
    { key: 'halfDuration', label: 'Lengde per omgang', unit: 'min', min: 1, max: 90 },
    { key: 'firstSubTime', label: 'Første bytte etter', unit: 'min', min: 0, max: 90 },
    { key: 'subInterval', label: 'Bytte-intervall (etter alle har vært inne)', unit: 'min', min: 1, max: 30 },
  ];

  function applyPreset(key: PresetKey, values: MatchSettings) {
    setActivePreset(key);
    setLocal(values);
    setInputValues(
      Object.fromEntries(
        (Object.keys(values) as (keyof MatchSettings)[]).map((k) => [k, String(values[k])])
      ) as Record<keyof MatchSettings, string>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="text-emerald-400" size={20} />
          Standard kampinnstillinger
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <label className="text-xs text-slate-400 mb-1.5 block">Forhåndsvalgte oppsett</label>
          <select
            className="w-[150px] bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={activePreset}
            onChange={(e) => {
              const preset = PRESETS.find((p) => p.key === e.target.value);
              if (preset) applyPreset(preset.key, preset.values);
            }}
          >
            <option value="" disabled>Velg oppsett…</option>
            {PRESETS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          {fields.map(({ key, label, unit, min, max }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="flex-1 text-sm text-slate-300">{label}</label>
              <div className="flex items-center gap-1.5 w-28 shrink-0">
                <Input
                  type="number"
                  value={inputValues[key]}
                  min={min}
                  max={max}
                  onChange={(e) => handleChange(key, e.target.value)}
                  onBlur={() => handleBlur(key, min, max)}
                  className="w-20 text-center"
                />
                <span className="text-slate-500 text-sm w-7">{unit ?? ''}</span>
              </div>
            </div>
          ))}
        </div>
        <Button
          onClick={save}
          className="mt-5 w-full"
          variant={saved ? 'success' : 'default'}
        >
          {saved ? 'Lagret!' : 'Lagre innstillinger'}
        </Button>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Endringer gjelder nye og ikke-påstartede kamper
        </p>
      </CardContent>
    </Card>
  );
}
