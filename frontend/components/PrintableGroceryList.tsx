import React from 'react';
import { GroceryItem } from '../types';

interface PrintableGroceryListProps {
  items: GroceryItem[];
  filterLabel?: string;
}

/**
 * Print-only component: renders the grocery list grouped by category
 * as a compact checklist optimized for US Letter (8.5" x 11").
 * Hidden on screen, visible only via @media print rules in index.css.
 */
const PrintableGroceryList: React.FC<PrintableGroceryListProps> = ({ items, filterLabel }) => {
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  const sortedCategories = Object.keys(grouped).sort();

  return (
    <div className="print-container">
      <h1 className="print-title">Shopping List</h1>
      {filterLabel && <p className="print-subtitle">{filterLabel}</p>}
      <div className="print-grocery-columns">
        {sortedCategories.map((category) => (
          <div key={category} className="print-grocery-category">
            <h2 className="print-grocery-category-title">{category}</h2>
            <ul className="print-grocery-items">
              {grouped[category].map((item) => (
                <li key={item.id} className="print-grocery-item">
                  <span className={`print-grocery-checkbox ${item.checked ? 'print-grocery-checkbox-checked' : ''}`} />
                  <span className={`print-grocery-name ${item.checked ? 'print-grocery-name-checked' : ''}`}>
                    {item.name}
                  </span>
                  {item.quantity && (
                    <span className="print-grocery-qty">{item.quantity}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrintableGroceryList;
