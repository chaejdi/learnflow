'use client';

// 시간 선택 (오전/오후 · 시 1~12 · 분 0~59 드롭다운). value/onChange 는 24시간 "HH:MM"
export default function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hStr, mStr] = value.split(':');
  const h24 = parseInt(hStr || '0', 10);
  const minute = parseInt(mStr || '0', 10);
  const period: 'AM' | 'PM' = h24 < 12 ? 'AM' : 'PM';
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;

  const emit = (p: 'AM' | 'PM', h12: number, min: number) => {
    let h = h12 % 12; // 12 → 0
    if (p === 'PM') h += 12;
    onChange(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  };

  const sel = 'h-10 px-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="flex gap-2">
      <select className={sel} value={period} onChange={(e) => emit(e.target.value as 'AM' | 'PM', hour12, minute)}>
        <option value="AM">오전</option>
        <option value="PM">오후</option>
      </select>
      <select className={`${sel} flex-1`} value={hour12} onChange={(e) => emit(period, Number(e.target.value), minute)}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>{h}시</option>
        ))}
      </select>
      <select className={`${sel} flex-1`} value={minute} onChange={(e) => emit(period, hour12, Number(e.target.value))}>
        {Array.from({ length: 60 }, (_, i) => i).map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, '0')}분</option>
        ))}
      </select>
    </div>
  );
}
