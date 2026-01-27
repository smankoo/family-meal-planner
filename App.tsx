import React, { useState, useEffect } from 'react';
import StageStepper from './components/StageStepper';
import MealGrid from './components/MealGrid';
import ChatInterface from './components/ChatInterface';
import MealPrepView from './components/MealPrepView';
import GroceryListView from './components/GroceryListView';
import FamilySetup from './components/FamilySetup';
import { 
  Stage, 
  WeekPlan, 
  ChatMessage, 
  PrepTask, 
  GroceryItem, 
  PlanHistory,
  FamilyMember,
  FamilyPreferences
} from './types';
import { 
  INITIAL_FAMILY, 
  INITIAL_PREFERENCES, 
  EMPTY_PLAN 
} from './constants';
import { 
  generateInitialMealPlan, 
  updateMealPlanWithAgent, 
  generateMealPrepPlan, 
  generateGroceryList 
} from './services/geminiService';
import { Undo2, Sparkles, ChefHat, Settings, ArrowLeft, ArrowRight, X, Loader2 } from 'lucide-react';

type ViewMode = 'planning' | 'household';

// --- Local Storage Helpers ---
const loadState = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (e) {
    console.error(`Failed to load ${key}`, e);
    return fallback;
  }
};

const saveState = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key}`, e);
  }
};

const App: React.FC = () => {
  // --- Initialization with Persistence ---
  
  const [family, setFamily] = useState<FamilyMember[]>(() => 
    loadState('fmp_family', INITIAL_FAMILY)
  );
  
  const [preferences, setPreferences] = useState<FamilyPreferences>(() => 
    loadState('fmp_preferences', INITIAL_PREFERENCES)
  );

  const [hasPlanGenerated, setHasPlanGenerated] = useState<boolean>(() => 
    loadState('fmp_has_plan', false)
  );

  const [viewMode, setViewMode] = useState<ViewMode>(() => 
     // If we have a plan generated, default to planning view
     loadState('fmp_has_plan', false) ? 'planning' : 'household'
  ); 

  const [currentStage, setCurrentStage] = useState<Stage>(() => 
    loadState('fmp_current_stage', Stage.MEAL_PLANNING)
  );
  
  const [maxStageReached, setMaxStageReached] = useState<Stage>(() => 
    loadState('fmp_max_stage', Stage.MEAL_PLANNING)
  );

  const [planHistory, setPlanHistory] = useState<PlanHistory>(() => 
    loadState('fmp_plan_history', {
      past: [],
      present: EMPTY_PLAN,
      future: []
    })
  );

  const [prepTasks, setPrepTasks] = useState<PrepTask[]>(() => 
    loadState('fmp_prep_tasks', [])
  );

  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(() => 
    loadState('fmp_grocery_items', [])
  );

  // Runtime UI state (not persisted)
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastDiffPlan, setLastDiffPlan] = useState<WeekPlan | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);


  // --- Persistence Effects ---

  useEffect(() => saveState('fmp_family', family), [family]);
  useEffect(() => saveState('fmp_preferences', preferences), [preferences]);
  useEffect(() => saveState('fmp_has_plan', hasPlanGenerated), [hasPlanGenerated]);
  useEffect(() => saveState('fmp_current_stage', currentStage), [currentStage]);
  useEffect(() => saveState('fmp_max_stage', maxStageReached), [maxStageReached]);
  useEffect(() => saveState('fmp_plan_history', planHistory), [planHistory]);
  useEffect(() => saveState('fmp_prep_tasks', prepTasks), [prepTasks]);
  useEffect(() => saveState('fmp_grocery_items', groceryItems), [groceryItems]);


  // --- Actions ---

  const handleGenerateInitialPlan = async (members: FamilyMember[], prefs: FamilyPreferences) => {
    setIsLoading(true);
    try {
      const plan = await generateInitialMealPlan(members, prefs);
      setPlanHistory({
        past: [],
        present: plan,
        future: []
      });
      setHasPlanGenerated(true);
      setViewMode('planning');
      setCurrentStage(Stage.MEAL_PLANNING);
      setMaxStageReached(Stage.MEAL_PLANNING);
    } catch (error) {
      console.error("Error generating plan:", error);
      alert(`Failed to generate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegeneratePlan = async () => {
    if (window.confirm("This will create a completely new plan based on your current settings, overwriting any changes. Continue?")) {
        setPrepTasks([]);
        setGroceryItems([]);
        setMaxStageReached(Stage.MEAL_PLANNING);
        await handleGenerateInitialPlan(family, preferences);
    }
  };

  const handleSaveSetup = (newFamily: FamilyMember[], newPrefs: FamilyPreferences) => {
    setFamily(newFamily);
    setPreferences(newPrefs);
    if (!hasPlanGenerated) {
        handleGenerateInitialPlan(newFamily, newPrefs);
    } else {
        setViewMode('planning');
    }
  };

  const handleCloseSetup = () => {
      if (hasPlanGenerated) {
          setViewMode('planning');
      }
  };

  const handlePlanUpdate = async (userMessage: string) => {
    setIsLoading(true);
    const newMsgId = Date.now().toString();
    const userMsg: ChatMessage = { id: newMsgId, role: 'user', content: userMessage, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { plan: newPlan, explanation } = await updateMealPlanWithAgent(
        planHistory.present,
        userMessage,
        family,
        preferences
      );

      setLastDiffPlan(planHistory.present); 
      setPlanHistory(prev => ({
        past: [...prev.past, prev.present],
        present: newPlan,
        future: []
      }));

      const botMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: explanation, 
        timestamp: Date.now(),
        relatedAction: 'Plan Updated'
      };
      setMessages(prev => [...prev, botMsg]);
      
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: "Sorry, I encountered an error updating the plan.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    if (planHistory.past.length === 0) return;
    const previous = planHistory.past[planHistory.past.length - 1];
    const newPast = planHistory.past.slice(0, -1);
    setLastDiffPlan(undefined);
    setPlanHistory({
      past: newPast,
      present: previous,
      future: [planHistory.present, ...planHistory.future]
    });
  };

  const handleProceedToPrep = async () => {
    if (prepTasks.length === 0) {
      setIsLoading(true);
      try {
        const tasks = await generateMealPrepPlan(planHistory.present);
        setPrepTasks(tasks);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }
    setCurrentStage(Stage.MEAL_PREP);
    if (maxStageReached < Stage.MEAL_PREP) setMaxStageReached(Stage.MEAL_PREP);
  };

  const handleProceedToGrocery = async () => {
    if (groceryItems.length === 0) {
       setIsLoading(true);
       try {
         const items = await generateGroceryList(planHistory.present, prepTasks);
         setGroceryItems(items);
       } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }
    setCurrentStage(Stage.GROCERY_LIST);
    if (maxStageReached < Stage.GROCERY_LIST) setMaxStageReached(Stage.GROCERY_LIST);
  };

  // --- Render ---

  return (
    <div className="flex flex-col h-full bg-zinc-50 font-sans">
      
      {/* Header - Apple-like frosted glass effect */}
      <header className="frosted-header fixed top-0 left-0 right-0 z-50 h-16 md:h-20 flex items-center justify-between px-4 md:px-6 lg:px-10 pointer-events-none">
        {/* Backdrop blur background */}
        <div className="absolute inset-0 bg-zinc-50/80 backdrop-blur-xl border-b border-zinc-200/50"></div>
        
        {/* Content layer */}
        <div className="relative w-full flex items-center justify-between">
          {/* Left: Brand - Cleaner, Apple-like */}
          <div className="pointer-events-auto flex items-center gap-2 md:gap-2.5">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-zinc-900 rounded-xl flex items-center justify-center shadow-md shadow-zinc-900/10">
                  <ChefHat size={16} className="md:w-[18px] md:h-[18px] text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-base md:text-lg font-semibold text-zinc-900 tracking-tight">Meal Planner</h1>
          </div>

          {/* Center: Stepper (Only visible in Planning Mode on larger screens) */}
          <div className="pointer-events-auto transition-opacity duration-300 hidden md:block" style={{ opacity: viewMode === 'planning' ? 1 : 0 }}>
               <StageStepper 
                  currentStage={currentStage} 
                  setStage={setCurrentStage} 
                  maxStageReached={maxStageReached} 
               />
          </div>

          {/* Right: Settings */}
          <div className="pointer-events-auto">
              {viewMode === 'planning' ? (
                  <button 
                      onClick={() => setViewMode('household')}
                      className="w-9 h-9 md:w-10 md:h-10 bg-white/60 backdrop-blur-sm shadow-sm border border-white/40 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-white/80 transition-all"
                      title="Household Settings"
                  >
                      <Settings size={18} className="md:w-5 md:h-5" />
                  </button>
              ) : hasPlanGenerated && (
                  <button 
                      onClick={handleCloseSetup}
                      className="w-9 h-9 md:w-10 md:h-10 bg-white/60 backdrop-blur-sm shadow-sm border border-white/40 rounded-full flex items-center justify-center text-zinc-500 hover:text-red-600 hover:bg-white/80 transition-all"
                      title="Close Settings"
                  >
                      <X size={18} className="md:w-5 md:h-5" />
                  </button>
              )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pt-16 md:pt-20">
        
        {viewMode === 'household' && (
           <FamilySetup 
             family={family} 
             preferences={preferences} 
             onSave={handleSaveSetup} 
             isFirstRun={!hasPlanGenerated}
             isLoading={isLoading}
           />
        )}

        {viewMode === 'planning' && (
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-10 pb-40 pt-6 md:pt-8">
             
             {/* Mobile Stepper (visible only on small screens when in planning mode) */}
             {viewMode === 'planning' && (
               <div className="md:hidden mb-6">
                 <StageStepper 
                    currentStage={currentStage} 
                    setStage={setCurrentStage} 
                    maxStageReached={maxStageReached} 
                 />
               </div>
             )}
             
             {/* Planning Stage Content */}
             {currentStage === Stage.MEAL_PLANNING && (
                <div className="animate-fade-in">
                   {/* Context Header - Desktop Only */}
                   <div className="hidden md:flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                      <h2 className="text-xl md:text-2xl font-bold text-zinc-900">Current Plan</h2>
                      <div className="flex gap-3">
                         {planHistory.past.length > 0 && (
                            <button onClick={handleUndo} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-full text-xs md:text-sm font-semibold hover:bg-zinc-50 transition-colors">
                                <Undo2 size={12} className="md:w-[14px] md:h-[14px]" /> Undo
                            </button>
                         )}
                         <button onClick={handleRegeneratePlan} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-zinc-100 text-zinc-600 rounded-full text-xs md:text-sm font-semibold hover:bg-zinc-200 transition-colors">
                            <Sparkles size={12} className="md:w-[14px] md:h-[14px]" /> Regenerate
                         </button>
                      </div>
                   </div>

                   {/* Mobile Header - Apple-style balanced layout */}
                   <div className="md:hidden flex justify-between items-center mb-6 px-4">
                      <div className="flex gap-2">
                         {planHistory.past.length > 0 && (
                            <button onClick={handleUndo} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 rounded-full text-xs font-semibold hover:bg-zinc-50 transition-colors">
                                <Undo2 size={12} /> Undo
                            </button>
                         )}
                      </div>
                      <button onClick={handleRegeneratePlan} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-500 rounded-full text-xs font-medium hover:bg-zinc-50 hover:text-zinc-700 transition-colors">
                         <Sparkles size={12} /> Regenerate
                      </button>
                   </div>

                   {isLoading && planHistory.present === EMPTY_PLAN ? (
                      <div className="h-[50vh] flex flex-col items-center justify-center">
                          <ChefHat className="animate-bounce mb-4 text-zinc-300" size={48} />
                          <p className="text-zinc-400 font-medium">Designing your week...</p>
                      </div>
                   ) : (
                      <MealGrid plan={planHistory.present} previousPlan={lastDiffPlan} />
                   )}
                </div>
             )}

             {currentStage === Stage.MEAL_PREP && (
               <MealPrepView 
                    tasks={prepTasks} 
                    onRegenerate={() => { setPrepTasks([]); handleProceedToPrep(); }}
                    isLoading={isLoading}
               />
             )}

             {currentStage === Stage.GROCERY_LIST && (
                <GroceryListView 
                    items={groceryItems} 
                    onRegenerate={() => { setGroceryItems([]); handleProceedToGrocery(); }}
                    isLoading={isLoading}
                />
             )}

          </div>
        )}

      </main>

      {/* 
        Bottom Floating Controls 
      */}
      {viewMode === 'planning' && (
          <div className="fixed bottom-8 w-full px-6 flex items-center justify-between pointer-events-none z-50 max-w-[1600px] mx-auto left-0 right-0">
             
             {/* Left: Back / Spacer */}
             <div className="pointer-events-auto">
                {currentStage !== Stage.MEAL_PLANNING ? (
                     <button 
                        onClick={() => setCurrentStage(currentStage - 1)}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-white/50 text-zinc-600 hover:bg-white hover:text-zinc-900 transition-all active:scale-95"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                ) : <div className="w-12" />} 
             </div>

             {/* Center: Primary Stage Action */}
             <div className="pointer-events-auto">
                {currentStage === Stage.MEAL_PLANNING && (
                    <button 
                        onClick={handleProceedToPrep}
                        disabled={isLoading}
                        className="group flex items-center gap-3 bg-zinc-900 text-white px-8 py-4 rounded-full shadow-xl shadow-zinc-900/20 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-80 disabled:hover:scale-100 disabled:cursor-wait"
                    >
                        {isLoading ? (
                            <Loader2 size={18} className="animate-spin text-zinc-400" />
                        ) : (
                            <>
                                <span className="font-bold text-sm tracking-wide">Prep Strategy</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                )}
                {currentStage === Stage.MEAL_PREP && (
                    <button 
                        onClick={handleProceedToGrocery}
                        disabled={isLoading}
                        className="group flex items-center gap-3 bg-zinc-900 text-white px-8 py-4 rounded-full shadow-xl shadow-zinc-900/20 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-80 disabled:hover:scale-100 disabled:cursor-wait"
                    >
                         {isLoading ? (
                            <Loader2 size={18} className="animate-spin text-zinc-400" />
                        ) : (
                            <>
                                <span className="font-bold text-sm tracking-wide">Shopping List</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                )}
                {currentStage === Stage.GROCERY_LIST && (
                    <div className="bg-zinc-100/80 backdrop-blur-md text-zinc-400 px-6 py-3 rounded-full font-bold text-xs tracking-widest border border-white/50 cursor-default">
                        ALL DONE
                    </div>
                )}
             </div>

             {/* Right: Assistant Toggle (Black Circle) */}
             <div className="pointer-events-auto">
                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={`
                        w-14 h-14 flex items-center justify-center rounded-full shadow-xl transition-all duration-300
                        ${isChatOpen 
                            ? 'bg-zinc-800 text-white shadow-inner scale-95 ring-4 ring-white/20' 
                            : 'bg-zinc-900 text-white hover:scale-110 active:scale-95 shadow-zinc-900/30'}
                    `}
                    title={isChatOpen ? "Minimize Assistant" : "Open Assistant"}
                >
                    <Sparkles size={20} className="fill-current" />
                </button>
             </div>
          </div>
      )}

      {/* Chat Window */}
      {viewMode === 'planning' && (
        <ChatInterface 
            messages={messages} 
            onSendMessage={handlePlanUpdate}
            isLoading={isLoading}
            isOpen={isChatOpen}
            onToggle={() => setIsChatOpen(!isChatOpen)}
        />
      )}

    </div>
  );
};

export default App;