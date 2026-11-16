import React, { Suspense } from 'react';
import type { Props } from './SqlpadChart';
import SpinKitCube from './SpinKitCube';

// ECharts is only downloaded once a chart is shown
const SqlpadChart = React.lazy(() => import('./SqlpadChart'));

export default function LazySqlpadChart(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex-center h-100 w-100">
          <SpinKitCube />
        </div>
      }
    >
      <SqlpadChart {...props} />
    </Suspense>
  );
}
