import { Loader2, MonitorSmartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PreviewFrame({ doc, device, nonce, busy }) {
  if (!doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border/70 bg-card/60">
          <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-[13px] font-medium">لا شيء للمعاينة بعد</p>
        <p className="max-w-[280px] text-[11.5px] leading-relaxed text-muted-foreground">
          أرسل وصفاً في المحادثة، وسيظهر تطبيقك هنا مباشرة مع الكود الخاص به.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full justify-center overflow-hidden bg-[#0c0c0f] p-0 sm:p-3">
      <div
        className={cn(
          'relative h-full overflow-hidden bg-white transition-all duration-300',
          device === 'mobile'
            ? 'w-[390px] max-w-full rounded-2xl border border-border/60 shadow-2xl'
            : 'w-full rounded-none sm:rounded-xl sm:border sm:border-border/60',
        )}
      >
        {/* Only scripts are enabled. The opaque origin and CSP block host access,
            network by default, form navigation, popups and device permissions. */}
        <iframe
          key={nonce}
          title="معاينة التطبيق"
          srcDoc={doc}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          allow=""
          className="h-full w-full border-0 bg-white"
        />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-2 text-[12px] text-muted-foreground shadow-xl">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              جارٍ إعادة البناء…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}