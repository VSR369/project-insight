/**
 * Web Vitals Performance Monitoring (PERF-M05)
 *
 * Measures Core Web Vitals (LCP, FID, CLS, INP, TTFB).
 * In development: logs to console.
 * In production: can be extended to send to analytics endpoint.
 */

import type { Metric } from 'web-vitals';

function logMetric(metric: Metric): void {
  if (import.meta.env.DEV) {
    const color =
      metric.rating === 'good' ? 'green' :
      metric.rating === 'needs-improvement' ? 'orange' : 'red';

    console.log(
      `%c[Web Vitals] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`,
      `color: ${color}; font-weight: bold;`
    );
  }

  // Production: send to analytics endpoint
  // navigator.sendBeacon('/api/vitals', JSON.stringify(metric));
}

export async function reportWebVitals(): Promise<void> {
  const { onCLS, onLCP, onINP, onTTFB } = await import('web-vitals');

  onCLS(logMetric);
  onLCP(logMetric);
  onINP(logMetric);
  onTTFB(logMetric);
}
