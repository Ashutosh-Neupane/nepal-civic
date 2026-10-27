import type { Complaint } from '@/types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { Icon } from './Icon';
import { CATEGORY_META } from '@/lib/constants';
import { Button } from './Button';

interface ComplaintTableRowProps {
  complaint: Complaint;
  onReview?: (complaint: Complaint) => void;
  onAssign?: (complaint: Complaint) => void;
  isFirst?: boolean;
}

export function ComplaintTableRow({ complaint, onReview, onAssign, isFirst }: ComplaintTableRowProps) {
  const catMeta = CATEGORY_META[complaint.category];
  const isPending = complaint.status === 'pending';

  return (
    <tr className={`group hover:bg-surface-container-low/30 transition-colors ${
      isFirst ? '' : 'border-t border-surface-variant/50'
    }`}>
      <td className="py-5 px-8 font-label-md text-primary font-mono whitespace-nowrap">#{complaint.referenceId}</td>
      <td className="py-5 px-4">
        <div className="font-body-md text-on-surface font-medium truncate max-w-[300px]">{complaint.title}</div>
        <div className="font-caption text-caption text-on-surface-variant mt-1 flex items-center gap-1">
          <Icon name="location_on" size={14} />
          {complaint.wardLabel}
        </div>
      </td>
      <td className="py-5 px-4 font-body-md text-on-surface-variant">{catMeta.label}</td>
      <td className="py-5 px-4">
        <PriorityBadge priority={complaint.priority} />
      </td>
      <td className="py-5 px-4">
        <StatusBadge status={complaint.status} />
      </td>
      <td className="py-5 px-8 text-right">
        {isPending ? (
          <Button size="sm" onClick={() => onAssign?.(complaint)}>Assign</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onReview?.(complaint)}>Review</Button>
        )}
      </td>
    </tr>
  );
}
