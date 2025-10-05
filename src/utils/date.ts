export const formatRelativeDate = (dateString: string) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);

  const thresholds: { limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    { limit: 60, divisor: 1, unit: 'second' },
    { limit: 3600, divisor: 60, unit: 'minute' },
    { limit: 86400, divisor: 3600, unit: 'hour' },
    { limit: 604800, divisor: 86400, unit: 'day' },
    { limit: 2592000, divisor: 604800, unit: 'week' },
    { limit: 31536000, divisor: 2592000, unit: 'month' },
  ];

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const diffAbs = Math.abs(diffSec);

  for (const { limit, divisor, unit } of thresholds) {
    if (diffAbs < limit) {
      const value = Math.round(diffSec / divisor);
      return rtf.format(value, unit);
    }
  }

  const years = Math.round(diffSec / 31536000);
  if (Math.abs(years) < 5) {
    return rtf.format(years, 'year');
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};
