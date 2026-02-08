import React from 'react';

const MealGridSkeleton: React.FC = () => {
  const mealTimes = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const MobileSkeleton = () => (
    <div className="md:hidden flex flex-col pb-20 animate-pulse">
      {days.map((day) => (
        <div key={day} className="mb-8">
          <div className="sticky-header-mobile">
            <div className="h-6 skeleton-block rounded-lg w-24"></div>
          </div>
          <div className="space-y-3 px-4">
            {mealTimes.map((time) => (
              <div key={time} className="card rounded-2xl p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-3 skeleton-block w-16"></div>
                </div>
                <div className="h-5 skeleton-block rounded-lg w-3/4 mb-2"></div>
                <div className="h-4 skeleton-block-light rounded w-full mb-1"></div>
                <div className="h-4 skeleton-block-light rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const DesktopSkeleton = () => (
    <div className="hidden md:flex flex-col gap-10 animate-pulse">
      {mealTimes.map((time) => (
        <div key={time} className="w-full">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-4 skeleton-block rounded w-20"></div>
            <div className="h-[1px] flex-1" style={{ backgroundColor: 'var(--border-primary)' }}></div>
          </div>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 2xl:grid-cols-7">
            {days.map((day) => (
              <div
                key={`${day}-${time}`}
                className="p-4 xl:p-5 rounded-2xl min-h-[140px] xl:min-h-[160px]"
                style={{
                  backgroundColor: 'var(--surface-primary)',
                  border: '1px solid var(--border-primary)',
                  boxShadow: 'var(--shadow-subtle)',
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="h-3 skeleton-block w-8"></div>
                </div>
                <div className="flex-1">
                  <div className="h-4 skeleton-block rounded-lg w-3/4 mb-2"></div>
                  <div className="h-3 skeleton-block-light rounded w-full mb-1"></div>
                  <div className="h-3 skeleton-block-light rounded w-2/3"></div>
                </div>
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--surface-secondary)' }}>
                  <div className="h-3 skeleton-block-light rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full">
      <MobileSkeleton />
      <DesktopSkeleton />
    </div>
  );
};

export default MealGridSkeleton;
