import React from 'react';

const MealGridSkeleton: React.FC = () => {
  const mealTimes = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Mobile skeleton
  const MobileSkeleton = () => (
    <div className="md:hidden flex flex-col pb-20 animate-pulse">
      {days.map((day, dayIdx) => (
        <div key={day} className="mb-8">
          {/* Day header skeleton */}
          <div className="sticky top-0 z-20 mb-4 px-4 py-3 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200/30">
            <div className="h-6 bg-zinc-200 rounded-lg w-24"></div>
          </div>

          {/* Meal cards skeleton */}
          <div className="space-y-3 px-4">
            {mealTimes.map((time) => (
              <div key={time} className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-3 bg-zinc-200 rounded w-16"></div>
                </div>
                <div className="h-5 bg-zinc-200 rounded-lg w-3/4 mb-2"></div>
                <div className="h-4 bg-zinc-100 rounded w-full mb-1"></div>
                <div className="h-4 bg-zinc-100 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Desktop skeleton
  const DesktopSkeleton = () => (
    <div className="hidden md:flex flex-col gap-10 animate-pulse">
      {mealTimes.map((time) => (
        <div key={time} className="w-full">
          {/* Row header skeleton */}
          <div className="flex items-center gap-4 mb-4">
            <div className="h-4 bg-zinc-200 rounded w-20"></div>
            <div className="h-[1px] flex-1 bg-zinc-100"></div>
          </div>

          {/* Grid skeleton */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 2xl:grid-cols-7">
            {days.map((day) => (
              <div
                key={`${day}-${time}`}
                className="p-4 xl:p-5 bg-white rounded-2xl border border-zinc-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] min-h-[140px] xl:min-h-[160px]"
              >
                {/* Day label skeleton */}
                <div className="flex justify-between items-start mb-2">
                  <div className="h-3 bg-zinc-200 rounded w-8"></div>
                </div>

                {/* Content skeleton */}
                <div className="flex-1">
                  <div className="h-4 bg-zinc-200 rounded-lg w-3/4 mb-2"></div>
                  <div className="h-3 bg-zinc-100 rounded w-full mb-1"></div>
                  <div className="h-3 bg-zinc-100 rounded w-2/3"></div>
                </div>

                {/* Notes skeleton */}
                <div className="mt-3 pt-3 border-t border-zinc-50">
                  <div className="h-3 bg-zinc-100 rounded w-1/2"></div>
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
