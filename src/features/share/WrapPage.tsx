import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Download, Share2, X } from 'lucide-react';
import { goBack } from '../../app/nav';
import { useUI } from '../../app/store';
import ui from '../../components/Dialog/ui.module.css';
import { db } from '../../db/db';
import type { Visit } from '../../db/types';
import { useProfile } from '../profile/profile';
import { wrapData } from './cardData';
import { wrapAlt, wrapSlides, type WrapSlide } from './render';
import { canShareFiles, makeWrapSlide, shareOrDownload } from './share';
import styles from './WrapPage.module.css';

const LOADING: Visit[] = [];

/** 연말 결산 "My Euro Year": 옆으로 넘기는 5장, 장마다 이미지 저장 */
export function WrapPage({ year }: { year: number }) {
  const visits = useLiveQuery(() => db.visits.toArray(), [], LOADING);
  const loaded = useLiveQuery(() => db.visits.count().then(() => true), [], false);
  const profile = useProfile();
  const data = useMemo(() => wrapData(visits, year, profile), [visits, year, profile]);
  const slides = wrapSlides(data);
  const [images, setImages] = useState<Partial<Record<WrapSlide, { blob: Blob; url: string }>>>({});
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const canShare = canShareFiles();

  // 기록이 바뀌면 다시 만든다 (한 장씩 차례로)
  const key = `${loaded}|${year}|${profile.name}|${profile.homeCityId}|${visits.map((v) => v.id + v.date).join()}`;
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  });
  useEffect(() => {
    if (!loaded) return;
    let alive = true;
    const made: string[] = [];
    void (async () => {
      const d = dataRef.current;
      for (const slide of wrapSlides(d)) {
        const blob = await makeWrapSlide(slide, d).catch(() => null);
        if (!alive || !blob) continue;
        const url = URL.createObjectURL(blob);
        made.push(url);
        setImages((s) => ({ ...s, [slide]: { blob, url } }));
      }
    })();
    return () => {
      alive = false;
      for (const u of made) URL.revokeObjectURL(u);
    };
  }, [key, loaded]);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  const save = async () => {
    const slide = slides[index]!;
    const img = images[slide];
    if (!img) return;
    const how = await shareOrDownload(
      img.blob,
      `my-euro-year-${year}-${index + 1}.png`,
      `My Euro Year ${year}`,
    );
    if (how === 'downloaded') useUI.getState().showToast({ message: '이미지를 저장했어요' });
  };

  return (
    <motion.main
      className={styles.page}
      aria-label={`My Euro Year ${year}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.bar}>
        <button type="button" className={styles.icon} onClick={goBack} aria-label="닫기">
          <X aria-hidden />
        </button>
        <h1 className={styles.title}>My Euro Year {year}</h1>
      </div>

      <div
        ref={track}
        className={styles.track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {slides.map((slide, i) => {
          const img = images[slide];
          return (
            <section
              key={slide}
              className={styles.slide}
              aria-roledescription="장"
              aria-label={`${i + 1} / ${slides.length}`}
            >
              {img ? (
                <img src={img.url} alt={wrapAlt(slide, data)} />
              ) : (
                <span className={styles.loading}>만드는 중…</span>
              )}
            </section>
          );
        })}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.icon}
          onClick={() => go(index - 1)}
          disabled={index === 0}
          aria-label="이전 장"
        >
          <ChevronLeft aria-hidden />
        </button>
        <ol className={styles.dots} aria-hidden>
          {slides.map((s, i) => (
            <li key={s} data-on={i === index} />
          ))}
        </ol>
        <button
          type="button"
          className={styles.icon}
          onClick={() => go(index + 1)}
          disabled={index >= slides.length - 1}
          aria-label="다음 장"
        >
          <ChevronRight aria-hidden />
        </button>
      </div>
      <div className={styles.save}>
        <button
          type="button"
          className={ui.primary}
          onClick={() => void save()}
          disabled={!images[slides[index]!]}
        >
          {canShare ? <Share2 aria-hidden /> : <Download aria-hidden />}
          {canShare ? '이 장 공유' : '이 장 저장'}
        </button>
      </div>
    </motion.main>
  );
}
