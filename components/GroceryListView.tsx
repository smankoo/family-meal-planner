import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { GroceryItem, WeekPlan } from '../types';
import { Check, ShoppingBag, Loader2, ArrowRight, Apple, Milk, Beef, Wheat, Package } from 'lucide-react';
import InvalidationBanner from './InvalidationBanner';
import RegenerateButton from './RegenerateButton';
import ProgressBar from './ProgressBar';
import CompletionFilter, { FilterMode } from './CompletionFilter';
import { useDelayedFilter } from '../hooks/useDelayedFilter';
import { resolveMealName } from '../utils/mealResolver';

// Category icon mapping - using filled Lucide icons with subtle color tints for distinction
const categoryIcons: Record<string, React.ReactNode> = {
  'Produce': <Apple size={16} strokeWidth={2} fill="currentColor" className="text-[#10b981]" />,
  'Dairy': <Milk size={16} strokeWidth={2} fill="currentColor" className="text-[#6366f1]" />,
  'Meat': <Beef size={16} strokeWidth={2} fill="currentColor" className="text-[#ef4444]" />,
  'Bakery': <Wheat size={16} strokeWidth={2} fill="currentColor" className="text-[#f59e0b]" />,
  'Pantry': <Package size={16} strokeWidth={2} fill="currentColor" className="text-[#8b5cf6]" />,
  'Seafood': <Package size={16} strokeWidth={2} fill="currentColor" className="text-[#06b6d4]" />,
  'Frozen': <Package size={16} strokeWidth={2} fill="currentColor" className="text-[#3b82f6]" />,
  'Beverages': <Package size={16} strokeWidth={2} fill="currentColor" className="text-[#ec4899]" />,
  'Snacks': <Package size={16} strokeWidth={2} fill="currentColor" className="text-[#f97316]" />,
};

interface GroceryListViewProps {
  items: GroceryItem[];
  mealPlan?: WeekPlan; // Add meal plan to resolve meal names
  onRegenerate: () => void;
  onGenerate: () => void;
  onNavigateToMealPlan: () => void;
  isLoading: boolean;
  hasMealPlan: boolean;
  newlyReceivedItems?: Set<string>;
  isInvalidated?: boolean; // New prop to show invalidation banner
  onItemsChange?: (items: GroceryItem[]) => void; // Callback to persist changes
  isLocked?: boolean;
  lockToggle?: React.ReactNode;
}

const GroceryListView: React.FC<GroceryListViewProps> = ({
  items: initialItems,
  mealPlan,
  onRegenerate,
  onGenerate,
  onNavigateToMealPlan,
  isLoading,
  hasMealPlan,
  newlyReceivedItems = new Set(),
  isInvalidated = false,
  onItemsChange,
  isLocked = false,
  lockToggle,
}) => {
  const [items, setItems] = useState<GroceryItem[]>(initialItems);

  // Use ref to track which items have already been animated
  const animatedItemsRef = useRef<Set<string>>(new Set());
  const itemRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Handle new items that should animate using direct DOM manipulation
  useLayoutEffect(() => {
    newlyReceivedItems.forEach(itemKey => {
      if (!animatedItemsRef.current.has(itemKey)) {
        animatedItemsRef.current.add(itemKey);

        // Find the item element and animate it directly
        const itemElement = itemRefsRef.current.get(itemKey);
        if (itemElement) {
          // Remove any existing animation classes
          itemElement.classList.remove('animate-fade-in-up', 'animate-stream-in');

          // Force a reflow to ensure the class removal takes effect
          itemElement.offsetHeight;

          // Add the animation class
          itemElement.classList.add('animate-stream-in');

          // Remove the animation class after it completes to prevent re-triggering
          setTimeout(() => {
            itemElement.classList.remove('animate-stream-in');
          }, 600); // Match animation duration
        }
      }
    });
  }, [newlyReceivedItems]);

  // Helper function to register item refs
  const registerItemRef = (itemKey: string, element: HTMLDivElement | null) => {
    if (element) {
      itemRefsRef.current.set(itemKey, element);
    } else {
      itemRefsRef.current.delete(itemKey);
    }
  };

  const toggleItem = (id: string) => {
    if (isLocked) return;
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(updatedItems);

    // Propagate changes to parent for persistence
    if (onItemsChange) {
      onItemsChange(updatedItems);
    }
  };

  // Completion filter state
  const [filterMode, setFilterMode] = useState<FilterMode>('incomplete');

  // Delayed filter: items linger briefly after toggle, then fade out
  const getItemChecked = useCallback((item: GroceryItem) => item.checked, []);
  const getItemId = useCallback((item: GroceryItem) => item.id, []);
  const { getFilteredItems, isFadingOut, isLingering } = useDelayedFilter(
    items, filterMode, getItemChecked, getItemId,
  );
  const filteredItems = getFilteredItems();

  // Skeleton component for loading states
  const ItemSkeleton: React.FC<{ isLoading?: boolean }> = ({ isLoading = false }) => (
    <div className={`
      group px-6 py-4 flex items-center justify-between cursor-pointer transition-all duration-200
    `}>
      <div className="flex items-center gap-4 flex-1">
        <div className="w-5 h-5 rounded-full skeleton-shimmer"></div>
        <div className="w-32 h-4 skeleton-shimmer rounded"></div>
      </div>
      <div className="w-16 h-3 skeleton-shimmer rounded"></div>
      {isLoading && <Loader2 size={14} className="text-primary-300 animate-spin ml-2" />}
    </div>
  );

  if (isLoading && items.length === 0) {
    return (
      <div className="animate-fade-in">
        {/* Header - Desktop Only */}
        <div className="hidden md:flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 max-w-4xl mx-auto px-4 md:px-8">
          <h2 className="text-xl md:text-2xl font-bold text-primary-900">Shopping List</h2>
        </div>

        {/* Skeleton Loading State - Mobile */}
        <div className="md:hidden flex flex-col pb-20">
          <div className="mb-8">
            <div className="sticky-header-mobile">
              <h3 className="text-xl font-bold text-primary-900 tracking-tight">Produce</h3>
            </div>
            <div className="space-y-3 px-4">
              <div className="card rounded-2xl p-5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full skeleton-block"></div>
                    <div className="w-24 h-4 skeleton-block rounded"></div>
                  </div>
                  <div className="w-12 h-3 skeleton-block-light rounded"></div>
                </div>
              </div>
              <div className="card rounded-2xl p-5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full skeleton-block"></div>
                    <div className="w-32 h-4 skeleton-block rounded"></div>
                  </div>
                  <div className="w-16 h-3 skeleton-block-light rounded"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-8">
            <div className="sticky-header-mobile">
              <h3 className="text-xl font-bold text-primary-900 tracking-tight">Dairy</h3>
            </div>
            <div className="space-y-3 px-4">
              <div className="card rounded-2xl p-5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full skeleton-block"></div>
                    <div className="w-20 h-4 skeleton-block rounded"></div>
                  </div>
                  <div className="w-14 h-3 skeleton-block-light rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Skeleton */}
        <div className="hidden md:block pb-20 max-w-4xl mx-auto px-4 md:px-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="label-section">Produce</span>
              <div className="section-divider"></div>
            </div>
            <div className="card rounded-2xl overflow-hidden">
              <div className="divide-y" style={{ borderColor: 'var(--surface-secondary)' }}>
                <ItemSkeleton isLoading={true} />
                <ItemSkeleton isLoading={true} />
              </div>
            </div>
          </div>
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="label-section">Dairy</span>
              <div className="section-divider"></div>
            </div>
            <div className="card rounded-2xl overflow-hidden">
              <div className="divide-y" style={{ borderColor: 'var(--surface-secondary)' }}>
                <ItemSkeleton isLoading={true} />
              </div>
            </div>
          </div>
        </div>

        {/* Loading Message */}
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2">
          <div className="loading-pill">
            <ShoppingBag size={16} className="text-primary-400 animate-pulse" />
            <span className="text-sm text-primary-600 font-medium">Organizing your list...</span>
          </div>
        </div>
      </div>
    );
  }

  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  return (
    <div className="animate-fade-in">

      {/* Header - Desktop Only */}
      <div className="hidden md:flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 max-w-4xl mx-auto px-4 md:px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-primary-900">Shopping List</h2>
          {items.length > 0 && (
            <CompletionFilter value={filterMode} onChange={setFilterMode} />
          )}
        </div>
        {items.length > 0 && !isInvalidated && (
          <div className="flex items-center gap-3">
            {lockToggle}
            {!isLocked && <RegenerateButton onRegenerate={onRegenerate} isLoading={isLoading} showText={true} />}
          </div>
        )}
      </div>

      {/* Mobile: Filter + Regenerate row */}
      {items.length > 0 && (
        <div className="md:hidden flex items-center justify-between mb-4 px-4">
          <CompletionFilter value={filterMode} onChange={setFilterMode} />
          <div className="flex items-center gap-2">
            {lockToggle}
            {!isInvalidated && !isLocked && (
              <RegenerateButton onRegenerate={onRegenerate} isLoading={isLoading} showText={false} />
            )}
          </div>
        </div>
      )}

      {/* Progress Bar - Sticky below tab menu on mobile, dynamically positioned */}
      {items.length > 0 && (
        <div data-sticky-progress="grocery" className="md:hidden sticky z-[15] px-4 pb-2 backdrop-blur-xl" style={{ top: 'var(--tab-header-height, 62px)', backgroundColor: 'var(--surface-bg)' }}>
          <ProgressBar
            completed={items.filter(i => i.checked).length}
            total={items.length}
          />
        </div>
      )}

      {/* Progress Bar - Static on desktop */}
      {items.length > 0 && (
        <div className="hidden md:block max-w-4xl mx-auto px-4 md:px-8 mb-6">
          <ProgressBar
            completed={items.filter(i => i.checked).length}
            total={items.length}
          />
        </div>
      )}

      {/* Invalidation Banner */}
      {isInvalidated && items.length > 0 && (
        <div className="px-4 md:px-8 max-w-4xl mx-auto mb-0 md:mb-6">
          <InvalidationBanner
            type="grocery"
            onRegenerate={onRegenerate}
            isLoading={isLoading}
            className="animate-fade-in"
          />
        </div>
      )}

      {items.length === 0 && !isLoading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center px-4">
          <div className="empty-state-icon-wrapper">
            <ShoppingBag size={32} className="text-primary-400" />
          </div>

          {!hasMealPlan ? (
            <>
              <h3 className="empty-state-heading">Create Your Meal Plan First</h3>
              <p className="empty-state-text">
                Your shopping list is generated from your weekly meal plan. Start by creating your meals for the week.
              </p>
              <button
                onClick={onNavigateToMealPlan}
                className="btn-empty-state"
              >
                <ArrowRight size={16} />
                Go to Meal Planning
              </button>
            </>
          ) : (
            <>
              <h3 className="empty-state-heading">No Shopping List Yet</h3>
              <p className="empty-state-text">
                Generate a personalized shopping list based on your meal plan to make grocery shopping effortless.
              </p>
              <button
                onClick={onGenerate}
                disabled={isLoading}
                className="btn-empty-state"
              >
                <ShoppingBag size={16} />
                Generate Shopping List
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Filtered empty state */}
          {filteredItems.length === 0 && items.length > 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
              <p className="text-secondary text-center">
                {filterMode === 'complete' ? 'Nothing checked off yet.' : 'All done — nice work.'}
              </p>
            </div>
          )}
          {/* Mobile View */}
          <div className="md:hidden flex flex-col pb-20 px-4">
            {Object.entries(groupedItems).sort().map(([category, catItems]) => (
              <div key={category} className="mb-8">

                {/* Category Header - Apple-style section header */}
                <div className="sticky-header-mobile sticky-header-below-progress">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-primary-900 tracking-tight">
                      {category}
                    </h3>
                  </div>
                </div>

                {/* Items for that category */}
                <div className="space-y-3">
                  {catItems.map((item, itemIdx) => {
                    const itemKey = `${item.category}-${item.name}-${item.id}`;
                    return (
                    <div
                      key={item.id}
                      ref={(el) => registerItemRef(itemKey, el)}
                      onClick={() => toggleItem(item.id)}
                      className={`
                        ${isFadingOut(item.id) || isLingering(item.id) ? '' : 'stagger-item'} relative rounded-2xl p-5 shadow-sm border transition-all active:scale-[0.98] ${isLocked ? 'cursor-default' : 'cursor-pointer'}
                        ${item.checked ? 'border-emerald-200/50' : 'border-primary-100'}
                        ${isFadingOut(item.id) ? 'animate-fade-out-down' : ''}
                      `}
                      style={{ animationDelay: `${itemIdx * 40}ms`, backgroundColor: 'var(--surface-primary)' }}
                    >
                      <div className="flex gap-4">
                        <div className="mt-1">
                          <div className={`
                            checkbox-enhanced
                            ${item.checked ? 'checkbox-checked' : 'checkbox-unchecked'}
                            ${isLocked ? 'opacity-60' : ''}
                          `}>
                            {item.checked && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-lg font-semibold leading-snug transition-all duration-300 ${item.checked ? 'text-primary-400 line-through decoration-emerald-400' : 'text-primary-900'}`}>
                              {item.name}
                            </span>
                            {item.quantity && (
                              <span className={`text-sm font-medium ml-3 ${item.checked ? 'text-primary-300' : 'text-primary-500'}`}>
                                {item.quantity}
                              </span>
                            )}
                          </div>

                          {item.relatedMeals && Array.isArray(item.relatedMeals) && item.relatedMeals.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {item.relatedMeals.map((meal, idx) => {
                                const resolvedMealName = resolveMealName(meal, mealPlan);
                                return (
                                  <span key={idx} className={item.checked ? 'related-meal-pill-checked' : 'related-meal-pill'}>
                                    <ArrowRight size={10} className="text-primary-400" />
                                    <span className={`text-[10px] font-medium ${item.checked ? 'text-primary-400' : 'text-primary-500'}`}>{resolvedMealName}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View - Grouped layout optimized for shopping lists */}
          <div className="hidden md:block pb-20 max-w-4xl mx-auto px-4 md:px-8">
            {Object.entries(groupedItems).sort().map(([category, catItems]) => (
              <div key={category} className="mb-8">

                {/* Category Header - Sticky */}
                <div className="sticky-header-mobile">
                  <div className="flex items-center gap-4">
                    <span className="label-section">{category}</span>
                  </div>
                </div>

                {/* Grouped items in a clean card */}
                <div className="card rounded-2xl overflow-hidden">
                  <div className="divide-y" style={{ borderColor: 'var(--surface-secondary)' }}>
                    {catItems.map((item, itemIdx) => {
                      const itemKey = `${item.category}-${item.name}-${item.id}`;
                      return (
                      <div
                        key={item.id}
                        ref={(el) => registerItemRef(itemKey, el)}
                        onClick={() => toggleItem(item.id)}
                        className={`
                          ${isFadingOut(item.id) || isLingering(item.id) ? '' : 'stagger-item'} group px-6 py-4 ${isLocked ? 'cursor-default' : 'cursor-pointer'} transition-all duration-200
                          ${item.checked ? '' : 'hover:bg-primary-50/50'}
                          ${isFadingOut(item.id) ? 'animate-fade-out-down' : ''}
                        `}
                        style={{ animationDelay: `${itemIdx * 40}ms`, backgroundColor: item.checked ? 'var(--surface-secondary)' : undefined }}
                      >
                        <div className="flex gap-4">
                          <div className="mt-1">
                            <div className={`
                              checkbox-enhanced
                              ${item.checked ? 'checkbox-checked' : 'checkbox-unchecked'}
                              ${isLocked ? 'opacity-60' : ''}
                            `}>
                              {item.checked && <Check size={12} className="text-white" strokeWidth={3} />}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-base font-medium transition-all duration-300 ${item.checked ? 'text-primary-400 line-through decoration-emerald-400' : 'text-primary-900'}`}>
                                {item.name}
                              </span>
                              {item.quantity && (
                                <span className={`text-sm font-medium ml-3 ${item.checked ? 'text-primary-300' : 'text-primary-500'}`}>
                                  {item.quantity}
                                </span>
                              )}
                            </div>

                            {item.relatedMeals && Array.isArray(item.relatedMeals) && item.relatedMeals.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {item.relatedMeals.map((meal, idx) => {
                                  const resolvedMealName = resolveMealName(meal, mealPlan);
                                  return (
                                    <span key={idx} className={item.checked ? 'related-meal-pill-checked' : 'related-meal-pill'}>
                                      <ArrowRight size={10} className="text-primary-400" />
                                      <span className={`text-[10px] font-medium ${item.checked ? 'text-primary-400' : 'text-primary-500'}`}>{resolvedMealName}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default GroceryListView;
