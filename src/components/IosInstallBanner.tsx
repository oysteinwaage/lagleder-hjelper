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
          <p className="text-[13px] font-semibold text-slate-100 leading-tight">
            iPhone-tips: Legg til som app på Hjem-skjerm
          </p>
          <ol className="text-[12px] text-slate-400 mt-1 leading-snug space-y-0.5 list-none p-0 m-0">
            <li><span className="font-medium text-slate-200">1.</span> Trykk <span className="font-medium text-slate-200">«···»</span> nederst til høyre i Safari</li>
            <li><span className="font-medium text-slate-200">2.</span> Velg <span className="font-medium text-slate-200">Del</span> <Share className="h-3 w-3 inline align-middle -translate-y-[2px] mx-0.5" strokeWidth={2.5} /></li>
            <li><span className="font-medium text-slate-200">3.</span> Scroll ned og trykk <PlusSquare className="h-3 w-3 inline align-middle -translate-y-[2px] mx-0.5" strokeWidth={2.5} /><span className="font-medium text-slate-200">«Legg til på Hjem-skjerm»</span></li>
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
