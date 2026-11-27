import { HardDrive, Info, Lock, ShieldCheck, SlidersHorizontal, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const LIMITS = [
  {
    icon: Lock,
    title: 'أصل معزول تماماً',
    text: 'يعمل التطبيق داخل إطار sandbox بأصل مستقل: لا وصول إلى حسابك أو جلسة الاستوديو أو ملفاتك أو DOM الصفحة.',
  },
  {
    icon: HardDrive,
    title: 'تخزين مؤقت في الذاكرة',
    text: 'localStorage وsessionStorage يُستبدلان بمخزن في الذاكرة يُصفَّر عند كل تحديث أو إعادة بناء للمعاينة.',
  },
  {
    icon: Ban,
    title: 'لا كوكيز ولا IndexedDB',
    text: 'الكوكيز وIndexedDB وCache API معطّلة في هذا الأصل، ولن تعمل مكتبات تعتمد عليها.',
  },
  {
    icon: Ban,
    title: 'الشبكة الخارجية محجوبة افتراضياً',
    text: 'تُحجب الصور والخطوط والسكريبتات والطلبات الخارجية افتراضياً. يمكنك تفعيل HTTPS من شريط المعاينة عند الحاجة؛ لا تدخل أسراراً أو بيانات شخصية بعد التفعيل.',
  },
  {
    icon: SlidersHorizontal,
    title: 'لا إرسال نماذج أو نوافذ منبثقة',
    text: 'التنقل عبر النماذج والنوافذ المنبثقة والتنقل خارج الإطار محجوب. تظل التفاعلات التي يعالجها JavaScript داخل الصفحة متاحة.',
  },
  {
    icon: ShieldCheck,
    title: 'أجهزة وحافظة محجوبة',
    text: 'الكاميرا والميكروفون والموقع والإشعارات وتنزيل الملفات غير متاحة داخل المعاينة.',
  },
];

export default function SandboxNotes({ networkEnabled = false }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1.5 text-[10.5px] text-primary transition-colors hover:bg-primary/15"
          title="حدود المعاينة"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          معاينة معزولة
          <Info className="h-3 w-3 opacity-70" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg border-border/80 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <ShieldCheck className="h-4 w-4 text-primary" />
            بيئة معاينة معزولة
          </DialogTitle>
          <DialogDescription className="text-[11.5px] leading-relaxed text-muted-foreground">
            الكود المولَّد يُنفَّذ داخل إطار معزول لا يصل إلى الاستوديو ولا إلى بياناتك. هذه الحدود مقصودة،
            وقد تختلف بعض سلوكيات التطبيق عن نشره الحقيقي.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 space-y-3">
          {LIMITS.map((l) => {
            const Icon = l.icon;
            return (
              <div key={l.title} className="flex gap-2.5">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border/70 bg-background/60">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </span>
                <div>
                  <p className="text-[12px] font-medium leading-tight">{l.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{l.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-background/50 px-3 py-2.5">
          <p className="text-[10.5px] font-medium text-foreground">
            {networkEnabled ? 'اتصالات HTTPS الخارجية مفعّلة لهذه المعاينة.' : 'اتصالات الشبكة الخارجية محجوبة لهذه المعاينة.'}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            عند تفعيل الشبكة، يستطيع الكود المولّد طلب موارد وخدمات HTTPS. لا تلصق مفاتيح API أو كلمات مرور أو بيانات شخصية في المعاينة.
          </p>
        </div>
        <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground">
          هذه معاينة أمامية وليست بيئة Node.js أو npm معزولة؛ المشاريع التي تحتاج خادماً أو اعتماديات بناء لا تعمل هنا بعد.
        </p>
      </DialogContent>
    </Dialog>
  );
}