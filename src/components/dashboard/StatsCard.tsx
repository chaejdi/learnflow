import { type LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
}

export default function StatsCard({
  title,
  value,
  change,
  icon: Icon,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{title}</span>
        <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
          <Icon size={18} className="text-primary-500" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {change !== undefined && (
        <p
          className={`text-xs mt-1 font-medium ${
            change >= 0 ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {change >= 0 ? '+' : ''}
          {change}% 전월 대비
        </p>
      )}
    </div>
  );
}
