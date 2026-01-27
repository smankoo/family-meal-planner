import React, { useState } from 'react';
import { GroceryItem } from '../types';
import { Check, ShoppingBag, ArrowRight } from 'lucide-react';

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
        <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-400">
            <div className="animate-pulse flex flex-col items-center">
                <ShoppingBag size={48} strokeWidth={1} className="mb-4 text-indigo-300" />
                <p className="text-lg font-light">Organizing your list...</p>
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
    <div className="max-w-2xl mx-auto pt-24 pb-12 px-4 animate-fade-in">
      
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Shopping List</h2>
          <p className="text-zinc-500 mt-2 font-light">Sorted by aisle for speed.</p>
        </div>
        <button 
            onClick={onRegenerate}
            disabled={isLoading}
            className="px-4 py-2 rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600 hover:bg-zinc-200 transition-colors"
        >
            Regenerate
        </button>
      </div>

      <div className="space-y-10">
        {Object.entries(groupedItems).sort().map(([category, catItems]) => (
          <div key={category}>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 pl-2">
              {category}
            </h3>
            
            <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden">
              <div className="divide-y divide-zinc-50">
                {catItems.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => toggleItem(item.id)}
                    className={`
                        group px-6 py-4 flex items-center justify-between cursor-pointer transition-all duration-200
                        ${item.checked ? 'bg-zinc-50' : 'hover:bg-indigo-50/30'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                        ${item.checked 
                            ? 'bg-zinc-400 border-zinc-400 scale-90' 
                            : 'bg-transparent border-zinc-300 group-hover:border-indigo-400'}
                      `}>
                        {item.checked && <Check size={14} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className={`text-base font-medium transition-colors ${item.checked ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}>
                        {item.name}
                      </span>
                    </div>
                    {item.quantity && (
                      <span className={`text-sm font-medium ${item.checked ? 'text-zinc-300' : 'text-indigo-600/70'}`}>
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
      
      {items.length === 0 && !isLoading && (
         <div className="text-center py-20 bg-white rounded-3xl border border-zinc-100 shadow-sm">
            <p className="text-zinc-400 font-light mb-6">List is empty.</p>
            <button 
                onClick={onRegenerate}
                className="px-8 py-3 bg-zinc-900 text-white rounded-full font-semibold hover:bg-black transition-all"
            >
            Generate from Plan
            </button>
        </div>
      )}
    </div>
  );
};

export default GroceryListView;