import { CivicMap } from './CivicMap';
import type { Complaint, ComplaintCategory, ComplaintStatus, Role } from '@/types';

interface InteractiveMapViewProps {
  complaints: Complaint[];
  selectedComplaintId?: string;
  onSelectComplaint?: (complaint: Complaint) => void;
  portalType?: Role | 'palika' | 'district' | 'province';
  height?: string;
  showControls?: boolean;
  activeCategoryFilter?: ComplaintCategory | 'all';
  onFilterChange?: (cat: ComplaintCategory | 'all') => void;
  activeStatusFilter?: ComplaintStatus | 'critical' | 'all';
  onStatusFilterChange?: (st: ComplaintStatus | 'critical' | 'all') => void;
  searchQuery?: string;
}

export function InteractiveMapView({
  complaints,
  selectedComplaintId,
  onSelectComplaint,
  portalType = 'palika',
  height = '100%',
  activeCategoryFilter,
  onFilterChange,
  activeStatusFilter,
  onStatusFilterChange,
  searchQuery,
}: InteractiveMapViewProps) {
  return (
    <CivicMap
      mode="view"
      complaints={complaints}
      selectedComplaintId={selectedComplaintId}
      onSelectComplaint={onSelectComplaint}
      portalType={portalType}
      height={height}
      showFilters={true}
      showLegend={true}
      activeCategoryFilter={activeCategoryFilter}
      onFilterChange={onFilterChange}
      activeStatusFilter={activeStatusFilter}
      onStatusFilterChange={onStatusFilterChange}
      searchQuery={searchQuery}
    />
  );
}
