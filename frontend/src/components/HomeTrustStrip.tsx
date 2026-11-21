"use client";

import { useResource } from "@/lib/useResource";
import { buildTrustMetrics, type PublicStats } from "@/lib/home-stats";
import styles from "./home-preview.module.css";

export default function HomeTrustStrip() {
  const { data } = useResource<PublicStats>("/public/stats");
  const metrics = buildTrustMetrics(data);

  if (!metrics.length) return null;

  return (
    <section
      className={styles.trustStrip}
      aria-label="Ringkasan data platform"
    >
      {metrics.map((item) => (
        <div className={styles.trustItem} key={item.id}>
          <strong className={styles.trustValue}>{item.value}</strong>
          <span className={styles.trustLabel}>{item.label}</span>
        </div>
      ))}
    </section>
  );
}
