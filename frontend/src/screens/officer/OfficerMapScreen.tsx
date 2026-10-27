import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { InteractiveMapView } from '@/components/map/InteractiveMapView';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { getComplaints, subscribeToComplaints } from '@/lib/complaintService';
import { localizeDigits } from '@/lib/dateUtils';
import { isValidNepalCoordinate } from '@/lib/geoUtils';
import type { Complaint, ComplaintCategory, ComplaintStatus } from '@/types';

export function OfficerMapScreen() {
  const { user } = useAuth();
  const { pick, language } = useLanguage();
  const [complaints, setComplaints] = useState<Complaint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ComplaintCategory | 'all'>('all');
  const [status, setStatus] = useState<ComplaintStatus | 'critical' | 'all'>('all');

  const load = useCallback(async () => {
    try {
      setComplaints(await getComplaints({ limit: 500 }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    load();
    return subscribeToComplaints(load);
  }, [load]);

  const mapped = useMemo(
    () => (complaints || []).filter((c) => isValidNepalCoordinate(c.location?.lat, c.location?.lng)).length,
    [complaints]
  );
  const unmapped = (complaints?.length || 0) - mapped;

  return (
    <DashboardLayout
      title={pick('Grievance map', 'गुनासो नक्सा')}
      subtitle={pick(
        `${mapped} grievances with a map pin${unmapped ? ` · ${unmapped} without a pin` : ''}`,
        `नक्सामा ${localizeDigits(mapped, language)} गुनासो${unmapped ? ` · ${localizeDigits(unmapped, language)} बिना स्थान` : ''}`
      )}
    >
      {error && !complaints ? (
        <ErrorState title={pick('Could not load the map', 'नक्सा लोड हुन सकेन')} description={error} onRetry={load} />
      ) : !complaints ? (
        <LoadingState type="card" />
      ) : (
        <div className="h-[calc(100vh-11rem)] min-h-[420px] rounded-2xl overflow-hidden border border-outline-variant shadow-card">
          <InteractiveMapView
            complaints={complaints}
            portalType={user?.role}
            activeCategoryFilter={category}
            onFilterChange={setCategory}
            activeStatusFilter={status}
            onStatusFilterChange={setStatus}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
