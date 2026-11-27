import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Server-reported secret-presence state per provider. The backend returns
// booleans only — this does not validate the key or send a provider request.
// The credential itself never reaches the browser.
export default function useProviderStatus() {
  const [statuses, setStatuses] = useState({});
  const [loadingStatus, setLoadingStatus] = useState(true);

  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await base44.functions.invoke('aiKeyCheck', {});
      setStatuses(res?.data?.providers || {});
    } catch {
      setStatuses({});
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return { statuses, loadingStatus, refreshStatus };
}