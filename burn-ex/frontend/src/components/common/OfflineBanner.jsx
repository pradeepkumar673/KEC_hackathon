import React from 'react';
import { useOnlineStatus } from '../../utils/useOnlineStatus';

const OfflineBanner = () => {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="bg-yellow-600 text-black text-sm text-center py-1.5 px-2 sticky top-0 z-50">
      You're offline — some features may not update until you reconnect.
    </div>
  );
};

export default OfflineBanner;
