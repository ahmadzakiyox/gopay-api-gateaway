export const TRANSACTION_STATUSES = [
  { key: 'paid', label: 'Sukses', color: '#285846' },
  { key: 'pending', label: 'Pending', color: '#d49b35' },
  { key: 'cancelled', label: 'Cancelled', color: '#ea580c' },
  { key: 'expired', label: 'Expired', color: '#c96b61' },
];

export function getStatusDistribution(summary) {
  const items = TRANSACTION_STATUSES.map((status) => ({
    ...status,
    count: Number(summary[status.key] || 0),
  }));
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const percentages = items.map((item) => total === 0 ? 0 : Math.floor(item.count / total * 100));
  let remaining = total === 0 ? 0 : 100 - percentages.reduce((sum, percentage) => sum + percentage, 0);
  const remainderOrder = items
    .map((item, index) => ({ index, remainder: total === 0 ? 0 : item.count / total * 100 - percentages[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; i < remaining; i += 1) percentages[remainderOrder[i].index] += 1;
  return {
    total,
    items: items.map((item, index) => ({ ...item, percentage: percentages[index] })),
  };
}
