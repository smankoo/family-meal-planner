import React, { useState } from 'react';
import { FamilyMember, FamilyPreferences } from '../types';
import { Plus, Trash2, ThumbsUp, ThumbsDown, ArrowRight, Sparkles, Loader2 } from 'lucide-react';

interface FamilySetupProps {
  family: FamilyMember[];
  preferences: FamilyPreferences;
  onSave: (family: FamilyMember[], preferences: FamilyPreferences) => void;
  isFirstRun: boolean;
  isLoading?: boolean;
}

const FamilySetup: React.FC<FamilySetupProps> = ({ 
  family: initialFamily, 
  preferences: initialPreferences, 
  onSave,
  isFirstRun,
  isLoading = false
}) => {
  const [members, setMembers] = useState<FamilyMember[]>(initialFamily);
  const [prefs, setPrefs] = useState<FamilyPreferences>(initialPreferences);

  const addMember = () => {
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: '',
      age: 30,
      role: 'Adult',
      likes: [],
      dislikes: [],
      notes: ''
    };
    setMembers([...members, newMember]);
  };

  const removeMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const updateMember = (id: string, updates: Partial<FamilyMember>) => {
    setMembers(members.map(m => {
      if (m.id !== id) return m;
      const updated = { ...m, ...updates };
      
      // Automatically infer role from Age if age is being updated
      if (updates.age !== undefined) {
        const age = updates.age;
        if (age >= 18) updated.role = 'Adult';
        else if (age >= 4) updated.role = 'Child';
        else if (age >= 1) updated.role = 'Toddler';
        else updated.role = 'Baby';
      }
      return updated;
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pb-20 animate-fade-in pt-6">
      <style>{`
        /* Hide native number input spinners for a cleaner, "Apple-like" aesthetic */
        .no-spinners::-webkit-outer-spin-button,
        .no-spinners::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinners {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Introduction */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-4">
          {isFirstRun ? "Welcome Home." : "Household Settings"}
        </h1>
        <p className="text-zinc-500 max-w-lg mx-auto leading-relaxed">
          {isFirstRun 
            ? "Tell us who's eating. We'll handle the planning, prep, and shopping."
            : "Update your family details and preferences. Changes apply to the next generated plan."}
        </p>
      </div>

      <div className="space-y-16">
        
        {/* Family Section */}
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Family Members</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            {members.map((member) => {
              return (
                <div key={member.id} className="relative bg-white rounded-3xl p-8 shadow-sm border border-zinc-100 group transition-all hover:shadow-lg hover:border-zinc-200">
                  
                  {/* Hover Delete */}
                  <button 
                    onClick={() => removeMember(member.id)}
                    className="absolute top-6 right-6 p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 z-20"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                    
                    {/* Left: Identity */}
                    <div className="md:col-span-4 space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase ml-1">Name</label>
                        <input 
                          type="text" 
                          value={member.name}
                          onChange={e => updateMember(member.id, { name: e.target.value })}
                          className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-lg font-semibold text-zinc-800 placeholder-zinc-300 focus:ring-2 focus:ring-zinc-100 focus:bg-white transition-all"
                          placeholder="First Name"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-400 uppercase ml-1">Age</label>
                        <div className="flex items-center gap-4">
                            <input 
                              type="number" 
                              min="0"
                              max="120"
                              value={member.age}
                              onChange={e => updateMember(member.id, { age: parseInt(e.target.value) || 0 })}
                              className="no-spinners w-24 bg-zinc-50 border-none rounded-2xl px-5 py-4 text-lg font-semibold text-zinc-800 placeholder-zinc-300 focus:ring-2 focus:ring-zinc-100 focus:bg-white transition-all text-center"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-zinc-900">{member.role}</span>
                                <span className="text-xs text-zinc-400">Inferred from age</span>
                            </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Preferences */}
                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      {/* Likes */}
                      <div className="flex flex-col h-full bg-zinc-50/50 rounded-2xl p-1">
                         <div className="flex items-center gap-2 px-4 py-3">
                            <ThumbsUp size={14} className="text-zinc-400" />
                            <span className="text-xs font-bold text-zinc-500 uppercase">Likes</span>
                         </div>
                         <textarea
                            value={member.likes.join(', ')}
                            onChange={e => updateMember(member.id, { likes: e.target.value.split(',').map(s=>s.trim()) })}
                            className="flex-1 w-full bg-transparent border-none p-4 text-sm text-zinc-700 leading-relaxed focus:ring-0 resize-none placeholder-zinc-300 min-h-[100px]"
                            placeholder="e.g. Avocado, Pasta, Crunchy textures..."
                         />
                      </div>

                      {/* Dislikes */}
                      <div className="flex flex-col h-full bg-zinc-50/50 rounded-2xl p-1">
                         <div className="flex items-center gap-2 px-4 py-3">
                            <ThumbsDown size={14} className="text-zinc-400" />
                            <span className="text-xs font-bold text-zinc-500 uppercase">Avoids</span>
                         </div>
                         <textarea
                            value={member.dislikes.join(', ')}
                            onChange={e => updateMember(member.id, { dislikes: e.target.value.split(',').map(s=>s.trim()) })}
                            className="flex-1 w-full bg-transparent border-none p-4 text-sm text-zinc-700 leading-relaxed focus:ring-0 resize-none placeholder-zinc-300 min-h-[100px]"
                            placeholder="e.g. Mushrooms, Spicy food..."
                         />
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
            
            <button 
              onClick={addMember}
              className="w-full py-6 rounded-3xl border-2 border-dashed border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-all font-semibold flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Add Another Member
            </button>
          </div>
        </section>

        {/* Global Config Section */}
        <section>
          <div className="flex justify-between items-baseline mb-6">
             <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Global Preferences</h2>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-zinc-100 space-y-12">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                   <label className="block text-sm font-bold text-zinc-700 mb-4">Cuisines & Styles</label>
                   <input 
                      type="text" 
                      value={prefs.cuisines.join(', ')}
                      onChange={(e) => setPrefs({ ...prefs, cuisines: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-800 font-medium focus:ring-2 focus:ring-zinc-100 placeholder-zinc-400 transition-colors"
                      placeholder="e.g. Italian, Mediterranean, Thai..."
                   />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-zinc-700 mb-4">Weekend Effort</label>
                   <div className="grid grid-cols-3 gap-3">
                      {['Low', 'Medium', 'High'].map((level) => (
                         <button
                            key={level}
                            onClick={() => setPrefs({ ...prefs, weekendEffort: level as any })}
                            className={`
                              py-4 rounded-2xl text-sm font-bold transition-all duration-200
                              ${prefs.weekendEffort === level 
                                ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10' 
                                : 'bg-zinc-50 text-zinc-400 hover:bg-zinc-100'}
                            `}
                         >
                            {level}
                         </button>
                      ))}
                   </div>
                </div>
             </div>

             {/* New General Constraints Field */}
             <div>
                 <label className="block text-sm font-bold text-zinc-700 mb-4">
                    General Constraints & Lifestyle 
                    <span className="ml-2 font-normal text-zinc-400 normal-case">(e.g., "Breakfasts must be ready-to-eat", "Lunchbox friendly", "No peanuts")</span>
                 </label>
                 <textarea 
                    value={prefs.generalNotes || ''}
                    onChange={(e) => setPrefs({ ...prefs, generalNotes: e.target.value })}
                    className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-zinc-800 font-medium focus:ring-2 focus:ring-zinc-100 placeholder-zinc-400 transition-colors min-h-[120px] resize-none leading-relaxed"
                    placeholder="Tell us about your schedule or specific needs for the whole family..."
                 />
             </div>
          </div>
        </section>

        {/* Floating Save Action */}
        <div className="flex justify-center pt-8">
          <button
            onClick={() => onSave(members, prefs)}
            disabled={members.length === 0 || isLoading}
            className="shadow-2xl shadow-zinc-900/30 bg-zinc-900 text-white pl-10 pr-12 py-5 rounded-full font-bold text-lg flex items-center gap-3 hover:scale-105 hover:bg-black transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-wait"
          >
            {isLoading ? (
                <>
                   <Loader2 size={24} className="animate-spin text-zinc-400" />
                   <span>Generating...</span>
                </>
            ) : (
                <>
                    {isFirstRun ? <Sparkles size={20} className="text-zinc-300" /> : <ArrowRight size={20} />}
                    {isFirstRun ? "Generate First Plan" : "Save Changes"}
                </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default FamilySetup;