import { useEffect, useRef, useState } from 'react';
import { Pause, Play, VolumeX } from 'lucide-react';

export default function MotionPreviewCard({ item, index = 0 }) {
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [manualPlay, setManualPlay] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '140px 0px', threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const shouldAutoPlay = visible && !reducedMotion && !manualPause;
  const shouldLoad = visible && !failed && (shouldAutoPlay || manualPlay);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!shouldLoad) {
      video.pause();
      setPlaying(false);
      return;
    }
    if (shouldAutoPlay || manualPlay) {
      const attempt = video.play();
      attempt?.then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  }, [shouldLoad, shouldAutoPlay, manualPlay]);

  function togglePlayback() {
    if (playing) {
      setManualPause(true);
      setManualPlay(false);
      videoRef.current?.pause();
      setPlaying(false);
      return;
    }
    setManualPause(false);
    setManualPlay(true);
    if (videoRef.current?.readyState >= 2) {
      videoRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  return (
    <article ref={rootRef} className="forge-preview-card group">
      <div className="forge-preview-media">
        <div className="forge-preview-wash" aria-hidden="true" />
        {!failed ? (
          <video
            ref={videoRef}
            className="forge-preview-video"
            src={shouldLoad ? item.video : undefined}
            poster={item.poster}
            muted
            loop
            playsInline
            preload="none"
            autoPlay={shouldAutoPlay}
            disablePictureInPicture
            aria-label={`معاينة فيديو: ${item.title}`}
            onPlaying={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setFailed(true)}
          />
        ) : (
          <img className="forge-preview-poster" src={item.poster} alt={`معاينة ${item.title}`} loading="lazy" />
        )}
        <div className="forge-preview-topline">
          <span className="forge-preview-index">{String(index + 1).padStart(2, '0')} / 03</span>
          <span className="forge-preview-live"><span /> VIDEO STUDY</span>
        </div>
        <div className="forge-preview-bottomline">
          <span className="forge-preview-caption">{item.caption}</span>
          <button
            type="button"
            className="forge-preview-play"
            onClick={togglePlayback}
            aria-label={playing ? 'إيقاف المعاينة' : 'تشغيل المعاينة'}
            title={playing ? 'إيقاف' : 'تشغيل'}
          >
            {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
        </div>
        {reducedMotion && !manualPlay && (
          <span className="forge-motion-note"><VolumeX size={11} /> الحركة متوقفة حسب إعداد النظام</span>
        )}
        {failed && <span className="forge-video-fallback">تم عرض الصورة الثابتة للمعاينة</span>}
      </div>
      <div className="forge-preview-meta">
        <div className="min-w-0">
          <p className="forge-preview-title">{item.title}</p>
          <p className="forge-preview-type">{item.type}</p>
        </div>
        <span className="forge-preview-arrow" aria-hidden="true">↗</span>
      </div>
      <p className="forge-preview-description">{item.description}</p>
    </article>
  );
}
