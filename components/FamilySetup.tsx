import React, { useState } from 'react';
import { FamilyMember, FamilyPreferences } from '../types';
import { Plus, Trash2, ThumbsUp, ThumbsDown, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import UserProfile from './UserProfile';

interface FamilySetupProps {
  family: FamilyMember[];
  preferences: FamilyPreferences;
  onSave: (family: FamilyMember[], preferences: FamilyPreferences) => void;
  isFirstRun: boolean;
  isLoading?: boolean;
  activePlanId?: string;
  onLeaveFamily?: () => Promise<void>;
}

const FamilySetup: React.FC<FamilySetupProps> = ({
  family: initialFamily,
  preferences: initialPreferences,
  onSave,
  isFirstRun,
  isLoading = false,
  activePlanId,
  onLeaveFamily
}) => {
  const [members, setMembers] = useState<FamilyMember[]>(initialFamily);
  const [prefs, setPrefs] = useState<FamilyPreferences>(initialPreferences);

  const addMember = () => {
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: '',
      age: 30,
      role: 'Adult',
      likes: '',
      dislikes: '',
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
      {/* Introduction */}
      <div className="text-center mb-12">
        <h1 className="heading-page text-4xl mb-4">
          {isFirstRun ? "Welcome Home." : "Settings"}
        </h1>
        <p className="text-secondary max-w-lg mx-auto">
          {isFirstRun
            ? "Tell us who's eating. We'll handle the planning, prep, and shopping."
            : "Manage your account and household preferences."}
        </p>
      </div>

      <div className="space-y-16">

        {/* User Profile Section - Only show when not first run */}
        {!isFirstRun && (
          <section>
            <div className="flex justify-between items-center mb-8">
              <h2 className="label-section">Account</h2>
            </div>
            <UserProfile activePlanId={activePlanId} onLeaveFamily={onLeaveFamily} />
          </section>
        )}

        {/* Family Section */}
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="label-section">Family Members</h2>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {members.map((member) => {
              return (
                <div key={member.id} className="family-member-card group">

                  {/* Hover Delete */}
                  <button
                    onClick={() => removeMember(member.id)}
                    className="btn-delete-hover"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

                    {/* Left: Identity */}
                    <div className="md:col-span-4 space-y-6">
                      <div className="space-y-1.5">
                        <label className="label-section ml-1">Name</label>
                        <input
                          type="text"
                          value={member.name}
                          onChange={e => updateMember(member.id, { name: e.target.value })}
                          className="mobile-text-lg form-field-bold"
                          placeholder="First Name"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="label-section ml-1">Age</label>
                        <div className="flex items-center gap-4">
                            <input
                              type="number"
                              min="0"
                              max="120"
                              value={member.age}
                              onChange={e => updateMember(member.id, { age: parseInt(e.target.value) || 0 })}
                              className="no-spinners w-24 form-field-bold text-center"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-primary-900">{member.role}</span>
                                <span className="text-xs text-primary-400">Inferred from age</span>
                            </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Preferences */}
                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">

                      {/* Likes */}
                      <div className="form-textarea-wrapper">
                         <div className="flex items-center gap-2 px-4 py-3">
                            <ThumbsUp size={14} className="text-primary-400" />
                            <span className="label-section">Likes</span>
                         </div>
                         <textarea
                            value={member.likes || ''}
                            onChange={e => updateMember(member.id, { likes: e.target.value })}
                            className="mobile-text-sm form-textarea"
                            placeholder="e.g. Avocado, Pasta, Crunchy textures..."
                         />
                      </div>

                      {/* Dislikes */}
                      <div className="form-textarea-wrapper">
                         <div className="flex items-center gap-2 px-4 py-3">
                            <ThumbsDown size={14} className="text-primary-400" />
                            <span className="label-section">Avoids</span>
                         </div>
                         <textarea
                            value={member.dislikes || ''}
                            onChange={e => updateMember(member.id, { dislikes: e.target.value })}
                            className="mobile-text-sm form-textarea"
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
              className="w-full py-6 rounded-3xl border-2 border-dashed font-semibold flex items-center justify-center gap-2 transition-all"
              style={{
                borderColor: 'var(--border-primary)',
                color: 'var(--text-tertiary)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-primary-300)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-primary)';
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Plus size={20} /> Add Another Member
            </button>
          </div>
        </section>

        {/* Global Config Section */}
        <section>
          <div className="flex justify-between items-baseline mb-6">
             <h2 className="label-section">Global Preferences</h2>
          </div>

          <div className="preferences-card">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                   <label className="block text-sm font-bold text-primary-700 mb-4">Cuisines & Styles</label>
                   <input
                      type="text"
                      value={prefs.cuisines || ''}
                      onChange={(e) => setPrefs({ ...prefs, cuisines: e.target.value })}
                      className="mobile-text-lg form-field"
                      placeholder="e.g. Italian, Mediterranean, Thai..."
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-primary-700 mb-4">Weekend Effort</label>
                   <div className="grid grid-cols-3 gap-3">
                      {['Low', 'Medium', 'High'].map((level) => (
                         <button
                            key={level}
                            onClick={() => setPrefs({ ...prefs, weekendEffort: level as any })}
                            className={`effort-toggle ${prefs.weekendEffort === level ? 'effort-toggle-active' : 'effort-toggle-inactive'}`}
                         >
                            {level}
                         </button>
                      ))}
                   </div>
                </div>
             </div>

             {/* New General Constraints Field */}
             <div>
                 <label className="block text-sm font-bold text-primary-700 mb-4">
                    General Constraints & Lifestyle
                    <span className="ml-2 font-normal text-primary-400 normal-case">(e.g., "Breakfasts must be ready-to-eat", "Lunchbox friendly", "No peanuts")</span>
                 </label>
                 <textarea
                    value={prefs.generalNotes || ''}
                    onChange={(e) => setPrefs({ ...prefs, generalNotes: e.target.value })}
                    className="mobile-text-sm form-field min-h-[120px] resize-none leading-relaxed"
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
            className="btn-save-floating"
          >
            {isLoading ? (
                <>
                   <Loader2 size={24} className="animate-spin text-primary-400" />
                   <span>Generating...</span>
                </>
            ) : (
                <>
                    {isFirstRun ? <Sparkles size={20} className="text-primary-300" /> : <ArrowRight size={20} />}
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
