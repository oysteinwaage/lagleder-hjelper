import { X, Share, PlusSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'ios-install-banner-count';
const MAX_SHOW_COUNT = 5;

function isIosInSafari(): boolean {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (!isIOS) return false;
  const standalone = (window.navigator as { standalone?: boolean }).standalone;
  return standalone !== true;
}

function getShowCount(): number {
  return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
}

function incrementShowCount(): void {
  localStorage.setItem(STORAGE_KEY, String(getShowCount() + 1));
}

export function IosInstallBanner() {
  const [dismissed, setDismissed] = useState(false);
  const hasIncremented = useRef(false);

  const shouldShow = isIosInSafari() && getShowCount() < MAX_SHOW_COUNT;

  useEffect(() => {
    if (shouldShow && !hasIncremented.current) {
      hasIncremented.current = true;
      incrementShowCount();
    }
  }, [shouldShow]);

  if (!shouldShow || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50 pointer-events-none">
      <div className="pointer-events-auto bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 flex items-start gap-3 shadow-xl">
        {/* App icon */}
        <img
          src="/fotball-logo-1.png"
          alt="Lagleder"
          className="w-9 h-9 rounded-lg shrink-0 mt-0.5"
        />

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-100 leading-snug">
            iPhone-tips: Legg til som app på Hjem-skjerm
          </p>
          <ol className="mt-1 space-y-0.5 list-none p-0 m-0">
            <li className="text-xs text-slate-400 leading-snug">
              <span className="font-semibold text-slate-300">1. </span>
              Trykk <strong className="text-slate-200">Del</strong>{' '}
              <Share size={11} className="inline mb-0.5 text-slate-300" />
              {' '}nederst i Safari
            </li>
            <li className="text-xs text-slate-400 leading-snug">
              <span className="font-semibold text-slate-300">2. </span>
              Scroll ned og trykk{' '}
              <PlusSquare size={11} className="inline mb-0.5 text-slate-300" />{' '}
              <strong className="text-slate-200">«Legg til på Hjem-skjerm»</strong>
            </li>
          </ol>
        </div>

        {/* Close button */}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Lukk"
          className="shrink-0 -mt-1 -mr-1 p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
