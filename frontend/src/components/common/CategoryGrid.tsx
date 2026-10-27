import { CATEGORY_META } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ComplaintCategory } from '@/types';
import { Icon } from './Icon';

interface CategoryGridProps {
  onSelect?: (category: ComplaintCategory) => void;
  selectedCategory?: ComplaintCategory;
  columns?: 2 | 3 | 4;
}

const DISPLAYED_CATEGORIES: ComplaintCategory[] = [
  'roads', 'water', 'drainage', 'sanitation', 'electricity', 'parks', 'public_safety', 'other',
];

export function CategoryGrid({ onSelect, selectedCategory, columns = 2 }: CategoryGridProps) {
  const { t } = useLanguage();

  return (
    <div className={`grid gap-3 ${
      columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-4'
    }`}>
      {DISPLAYED_CATEGORIES.map((cat, idx) => {
        const meta = CATEGORY_META[cat];
        const isSelected = selectedCategory === cat;
        const staggerClass = idx < 6 ? `stagger-${idx + 1}` : '';

        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelect?.(cat)}
            className={`
              relative flex flex-col items-center justify-center p-4 min-h-[110px] rounded-2xl border-2
              transition-all duration-200 cursor-pointer active:scale-[0.98] hover:-translate-y-1 hover:shadow-card-hover
              animate-slide-up ${staggerClass}
              ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                  : 'border-transparent bg-surface-container hover:bg-surface-container-high'
              }
            `}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 transition-transform group-hover:scale-110">
              <Icon name={meta?.icon || 'category'} size={26} />
            </div>
            <span className="text-sm font-bold text-on-surface text-center leading-tight">
              {t(cat) || meta?.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
