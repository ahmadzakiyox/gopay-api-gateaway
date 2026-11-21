export const TRANSACTION_STATUSES = [
  { key: 'paid', label: 'Sukses', color: '#285846' },
  { key: 'pending', label: 'Pending', color: '#d49b35' },
  { key: 'expired', label: 'Expired', color: '#c96b61' },
];

export function getStatusDistribution(summary) {
  const items = TRANSACTION_STATUSES.map((status) => ({
    ...status,
    count: Number(summary[status.key] || 0),
  }));
  const total = items.reduce((sum, item) => sum + item.count, 0);
  let allocated = 0;
  return {
    total,
    items: items.map((item, index) => {
      const percentage = total === 0 ? 0 : index === items.length - 1
        ? 100 - allocated
        : Math.round(item.count / total * 100);
      allocated += percentage;
      return { ...item, percentage };
    }),
  };
}
