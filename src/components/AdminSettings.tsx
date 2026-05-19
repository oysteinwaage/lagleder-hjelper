import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { MatchSettings } from '@/types';

interface Props {
  settings: MatchSettings;
  onSave: (s: Partial<MatchSettings>) => void;
}

export function AdminSettings({ settings, onSave }: Props) {
  const [local, setLocal] = useState(settings);
  const [saved, setSaved] = useState(false);

  function handle(key: keyof MatchSettings, val: string) {
    setLocal((s) => ({ ...s, [key]: parseInt(val) || 0 }));
  }

  function save() {
    onSave(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const fields: { key: keyof MatchSettings; label: string; unit?: string; min: number; max: number }[] = [
    { key: 'playersOnField', label: 'Spillere på banen', min: 1, max: 11 },
    { key: 'numberOfHalves', label: 'Antall omganger', min: 1, max: 4 },
    { key: 'halfDuration', label: 'Lengde per omgang', unit: 'min', min: 1, max: 90 },
    { key: 'subInterval', label: 'Bytte-intervall', unit: 'min', min: 1, max: 30 },
  ];

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="text-emerald-400" size={20} />
          Standard kampinnstillinger
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {fields.map(({ key, label, unit, min, max }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="flex-1 text-sm text-slate-300">{label}</label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={local[key]}
                  min={min}
                  max={max}
                  onChange={(e) => handle(key, e.target.value)}
                  className="w-20 text-center"
                />
                {unit && <span className="text-slate-500 text-sm">{unit}</span>}
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
          Endringer gjelder kun for nye kamper
        </p>
      </CardContent>
    </Card>
  );
}
