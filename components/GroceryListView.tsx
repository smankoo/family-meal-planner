import React, { useState } from 'react';
import { GroceryItem } from '../types';
import { Check, ShoppingBag, RotateCcw } from 'lucide-react';

interface GroceryListViewProps {
  items: GroceryItem[];
  onRegenerate: () => void;
  isLoading: boolean;
}

const GroceryListView: React.FC<GroceryListViewProps> = ({ items: initialItems, onRegenerate, isLoading }) => {
  const [items, setItems] = useState<GroceryItem[]>(initialItems);

  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-400">
        <div className="animate-pulse flex flex-col items-center">
          <ShoppingBag size={48} strokeWidth={1} className="mb-4 text-zinc-300" />
          <p className="text-zinc-400 font-medium">Organizing your list...</p>
        </div>
      </div>
    );
  }

  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  return (
    <div className="animate-fade-in">
      
      {/* Header - Desktop Only */}
      <div className="hidden md:flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 max-w-4xl mx-auto px-4 md:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-zinc-900">Shopping List</h2>
        <div className="flex gap-3">
          <button 
            onClick={onRegenerate}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-zinc-100 text-zinc-600 rounded-full text-xs md:text-sm font-semibold hover:bg-zinc-200 transition-colors"
          >
            <RotateCcw size={12} className="md:w-[14px] md:h-[14px]" /> Regenerate
          </button>
        </div>
      </div>

      {/* Mobile Header - Removed regenerate button since it's now in the main stepper area */}
      <div className="md:hidden mb-6 px-4">
        {/* Mobile header content if needed in future */}
      </div>

      {items.length === 0 && !isLoading ? (
        <div className="h-[50vh] flex flex-col items-center justify-center">
          <ShoppingBag className="animate-bounce mb-4 text-zinc-300" size={48} />
          <p className="text-zinc-400 font-medium">No shopping list generated yet.</p>
        </div>
      ) : (
        <>
          {/* Mobile View */}
          <div className="md:hidden flex flex-col pb-20">
            {Object.entries(groupedItems).sort().map(([category, catItems]) => (
              <div key={category} className="mb-8">
                
                {/* Category Header - Apple-style section header */}
                <div className="sticky top-0 z-20 mb-4 px-4 py-3 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200/30">
                  <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                    {category}
                  </h3>
                </div>

                {/* Items for that category */}
                <div className="space-y-3 px-4">
                  {catItems.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`
                        relative bg-white rounded-2xl p-5 shadow-sm border transition-all active:scale-[0.98] cursor-pointer
                        ${item.checked ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-100'}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300
                            ${item.checked 
                                ? 'bg-zinc-400 border-zinc-400' 
                                : 'bg-transparent border-zinc-300'}
                          `}>
                            {item.checked && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <span className={`text-lg font-semibold leading-snug transition-colors ${item.checked ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                            {item.name}
                          </span>
                        </div>
                        {item.quantity && (
                          <span className={`text-sm font-medium ${item.checked ? 'text-zinc-300' : 'text-zinc-500'}`}>
                            {item.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View - Grouped layout optimized for shopping lists */}
          <div className="hidden md:block pb-20 max-w-4xl mx-auto px-4 md:px-8">
            {Object.entries(groupedItems).sort().map(([category, catItems]) => (
              <div key={category} className="mb-8">
                
                {/* Category Header */}
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{category}</span>
                  <div className="h-[1px] flex-1 bg-zinc-100"></div>
                </div>

                {/* Grouped items in a clean card */}
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                  <div className="divide-y divide-zinc-50">
                    {catItems.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`
                          group px-6 py-4 flex items-center justify-between cursor-pointer transition-all duration-200
                          ${item.checked ? 'bg-zinc-50' : 'hover:bg-zinc-50/50'}
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300
                            ${item.checked 
                                ? 'bg-zinc-400 border-zinc-400' 
                                : 'bg-transparent border-zinc-300 group-hover:border-zinc-400'}
                          `}>
                            {item.checked && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <span className={`text-base font-medium transition-colors ${item.checked ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                            {item.name}
                          </span>
                        </div>
                        {item.quantity && (
                          <span className={`text-sm font-medium ${item.checked ? 'text-zinc-300' : 'text-zinc-500'}`}>
                            {item.quantity}
                          </span>
                        )}
                      </div>
                    ))}
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