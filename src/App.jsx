import React, { useState, useEffect } from 'react';
import { Plus, Inbox, List, CheckCircle2, Circle, ArrowRight, Clock, Lightbulb, Trash2, BookOpen } from 'lucide-react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [view, setView] = useState('inbox');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [detailsTitle, setDetailsTitle] = useState('');
  const [detailsDescription, setDetailsDescription] = useState('');

  // Add this new state for tracking if we're transitioning
  const [isTransitioning, setIsTransitioning] = useState(false);

  const SWIPE_ACTIONS = {
    UP: { action: 'trash', color: 'bg-red-500', label: 'Trash' },
    RIGHT: { action: 'next', color: 'bg-green-500', label: 'Next Action' },
    DOWN: { action: 'waiting', color: 'bg-amber-500', label: 'Waiting' },
    LEFT: { action: 'someday', color: 'bg-purple-500', label: 'Someday' },
    'UP_RIGHT': { action: 'reference', color: 'bg-blue-500', label: 'Reference' }  // Add diagonal direction
  };

  const [currentSwipeDirection, setCurrentSwipeDirection] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session);
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      setSession(session);
      if (!session) {
        setItems([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Separate useEffect for loading data when session changes
  useEffect(() => {
    if (session?.user) {
      console.log('Loading data for user:', session.user.id);
      loadData(session);
    }
  }, [session]);

  useEffect(() => {
    saveData();
  }, [items]);

  const loadData = async (currentSession) => {
    const sessionToUse = currentSession || session;
    console.log('LoadData called with session:', sessionToUse);
    if (!sessionToUse?.user?.id) {
      console.log('No user ID available, skipping load');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching items for user:', sessionToUse.user.id);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', sessionToUse.user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.log('Loaded items:', data);
      setItems(data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveData = () => {
    try {
      localStorage.setItem('dumpr-items', JSON.stringify(items));
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const completeItem = async (itemId) => {
    if (!session?.user?.id) return;
    
    try {
      const { error } = await supabase
        .from('items')
        .update({ completed: true })
        .eq('id', itemId)
        .eq('user_id', session.user.id);

      if (error) throw error;
      
      setItems(items.map(item =>
        item.id === itemId ? { ...item, completed: true } : item
      ));
    } catch (error) {
      console.error('Error completing item:', error);
    }
  };

  const addItem = async () => {
    if (!newItem.trim() || !session?.user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('items')
        .insert([{
          text: newItem.trim(),
          status: 'inbox',
          completed: false,
          user_id: session.user.id
        }])
        .select();

      if (error) throw error;
      setItems([...items, data[0]]);
      setNewItem('');
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const inboxItems = items.filter(item => item.status === 'inbox' && !item.completed);
  console.log('Filtered inbox items:', inboxItems);
  const currentItem = inboxItems[currentIndex];
  console.log('Current item:', currentItem);

  const swipeCard = async (status) => {
    if (!currentItem || !session?.user?.id) return;
    
    try {
      if (status === 'trash') {
        const { error } = await supabase
          .from('items')
          .delete()
          .eq('id', currentItem.id)
          .eq('user_id', session.user.id);

        if (error) throw error;
        setItems(items.filter(item => item.id !== currentItem.id));
        setCurrentIndex(0);
        setDragOffset({ x: 0, y: 0 });
      } else {
        setPendingStatus(status);
        setDetailsTitle(currentItem.text);
        setDetailsDescription('');
        setShowDetailsModal(true);
        setDragOffset({ x: 0, y: 0 });
      }
    } catch (error) {
      console.error('Error processing item:', error);
    }
  };

  const confirmDetails = async () => {
    if (!currentItem || !session?.user?.id) return;
    
    try {
      const { error } = await supabase
        .from('items')
        .update({
          status: pendingStatus,
          title: detailsTitle,
          description: detailsDescription
        })
        .eq('id', currentItem.id)
        .eq('user_id', session.user.id);

      if (error) throw error;
      
      setItems(items.map(item =>
        item.id === currentItem.id ? {
          ...item,
          status: pendingStatus,
          title: detailsTitle,
          description: detailsDescription
        } : item
      ));
      setShowDetailsModal(false);
      setPendingStatus(null);
      setDetailsTitle('');
      setDetailsDescription('');
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const skipDetails = () => {
    if (!currentItem) return;
    setItems(items.map(item =>
      item.id === currentItem.id ? {
        ...item,
        status: pendingStatus,
        title: currentItem.text
      } : item
    ));
    setShowDetailsModal(false);
    setPendingStatus(null);
    setDetailsTitle('');
    setDetailsDescription('');
    setCurrentIndex(0);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);
  const handleTouchMove = (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY);

  // Replace the handleMove function
  const handleMove = (x, y) => {
    if (!isDragging || !dragStart || isTransitioning) return;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });

    // Determine swipe direction including diagonals
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const threshold = 50;

    if (absX > threshold || absY > threshold) {
      if (absX > threshold && absY > threshold) {
        // Diagonal swipes
        if (deltaY < 0) { // Moving up
          setCurrentSwipeDirection(deltaX > 0 ? 'UP_RIGHT' : 'UP_LEFT');
        }
      } else if (absX > absY) {
        setCurrentSwipeDirection(deltaX > 0 ? 'RIGHT' : 'LEFT');
      } else {
        setCurrentSwipeDirection(deltaY > 0 ? 'DOWN' : 'UP');
      }
    } else {
      setCurrentSwipeDirection(null);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    const absX = Math.abs(dragOffset.x);
    const absY = Math.abs(dragOffset.y);
    
    const isSignificantDrag = 
      (absX > threshold && absY < threshold) || 
      (absY > threshold && absX < threshold) || 
      (absY > threshold/2 && absX > threshold/2); // Adjusted for diagonal

    if (isSignificantDrag) {
      setIsTransitioning(true);
      if (dragOffset.y < -threshold/2 && dragOffset.x > threshold/2) {
        swipeCard('reference');  // Up-right diagonal
      } else if (dragOffset.y > threshold && absX < threshold) {
        swipeCard('waiting');    // Down
      } else if (dragOffset.y < -threshold && absX < threshold) {
        swipeCard('trash');      // Up
      } else if (dragOffset.x > threshold && absY < threshold) {
        swipeCard('next');       // Right
      } else if (dragOffset.x < -threshold && absY < threshold) {
        swipeCard('someday');    // Left
      }
    }

    // Reset all drag-related state
    setIsDragging(false);
    setDragStart(null);
    setCurrentSwipeDirection(null);
    
    // Add a slight delay before resetting position
    setTimeout(() => {
      setDragOffset({ x: 0, y: 0 });
      setIsTransitioning(false);
    }, 50);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  // Replace getCardStyle
  const getCardStyle = () => {
    const rotation = dragOffset.x * 0.08;
    return {
      transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
      transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      touchAction: 'none',
      userSelect: 'none',
    };
  };

  // Add this function to prevent default events
  const preventDefault = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const getSwipeHintOpacity = () => {
    const threshold = 120;
    return Math.min(Math.abs(dragOffset.x) / threshold, 1);
  };

  const getStatusLabel = (status) => {
    const labels = {
      next: 'Next Action',
      waiting: 'Waiting For',
      someday: 'Someday/Maybe',
      reference: 'Reference'
    };
    return labels[status] || status;
  };

  const allItems = items.filter(item => !item.completed);
  const byStatus = {
    next: allItems.filter(i => i.status === 'next'),
    waiting: allItems.filter(i => i.status === 'waiting'),
    someday: allItems.filter(i => i.status === 'someday'),
    reference: allItems.filter(i => i.status === 'reference')
  };

  // LISTS VIEW
  if (view === 'lists') {
    const listsMeta = [
      { status: 'next', label: 'Next Actions', icon: ArrowRight, color: 'green' },
      { status: 'waiting', label: 'Waiting For', icon: Clock, color: 'amber' },
      { status: 'someday', label: 'Someday/Maybe', icon: Lightbulb, color: 'purple' },
      { status: 'reference', label: 'Reference', icon: BookOpen, color: 'blue' }
    ];

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">All Lists</h1>
          <button onClick={() => setView('inbox')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Inbox size={16} /> Back to Inbox
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {listsMeta.map(({ status, label, icon: Icon }) => (
            <div key={status} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <div>
                    <div className="font-semibold">{label}</div>
                    <div className="text-sm text-slate-500">{byStatus[status].length} items</div>
                  </div>
                </div>
                <div>
                  {byStatus[status].length === 0 ? (
                    <div className="text-sm text-slate-400">No items</div>
                  ) : (
                    <div className="space-y-2">
                      {byStatus[status].map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{item.title || item.text}</div>
                            {item.description && <div className="text-sm text-slate-500">{item.description}</div>}
                          </div>
                          <button
                            onClick={() => completeItem(item.id)}
                            className="ml-4 text-slate-400 hover:text-green-600 transition-colors"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // INBOX VIEW
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="p-6">
      {/* Sign out button */}
      <button
        onClick={() => supabase.auth.signOut()}
        className="absolute top-4 right-4 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
      >
        Sign out
      </button>

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4">Add Details - {getStatusLabel(pendingStatus)}</h2>

            <label className="block mb-2 font-medium">Title</label>
            <input
              type="text"
              value={detailsTitle}
              onChange={(e) => setDetailsTitle(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 mb-4"
              placeholder="Short title..."
            />

            <label className="block mb-2 font-medium">Description (optional)</label>
            <textarea
              value={detailsDescription}
              onChange={(e) => setDetailsDescription(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 h-32 resize-none mb-4"
              placeholder="Add more details, notes, or context..."
            />

            <div className="flex gap-3 justify-end">
              <button onClick={skipDetails} className="px-4 py-2 bg-slate-200 rounded-lg">Skip Details</button>
              <button onClick={confirmDetails} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setView('lists')} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors inline-flex items-center gap-2">
            <List size={16} /> View All Lists
          </button>
        </div>
      </div>

      <p className="mb-4 text-slate-600">Capture and process your thoughts</p>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addItem()}
          placeholder="What's on your mind?"
          className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-lg"
        />
        <button onClick={addItem} className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
          <Plus size={16} />
        </button>
      </div>

      {inboxItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-xl font-semibold">Inbox Zero! 🎉</div>
          <button onClick={() => setView('lists')} className="mt-4 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors">
            View All Lists
          </button>
        </div>
      ) : (
        <div>
          {/* Remove the preview stack and just show current card */}
          {currentItem && (
            <div className="relative">
              {/* Swipe direction indicator */}
              {currentSwipeDirection && SWIPE_ACTIONS[currentSwipeDirection] && (
                <div className={`absolute inset-0 ${SWIPE_ACTIONS[currentSwipeDirection].color} bg-opacity-20 rounded-2xl flex items-center justify-center`}>
                  <div className="text-xl font-bold text-white drop-shadow">
                    {SWIPE_ACTIONS[currentSwipeDirection].label}
                  </div>
                </div>
              )}
              
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onDragStart={preventDefault}
                onSelect={preventDefault}
                style={getCardStyle()}
                className="relative p-6 bg-white border rounded-2xl shadow-lg max-w-xl mx-auto"
              >
                <div className="text-lg font-medium mb-2">{currentItem.text}</div>
                {currentItem.description && (
                  <div className="text-sm text-slate-500 mb-4">{currentItem.description}</div>
                )}

                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
                  <div className="text-4xl font-bold rotate-45">⟷</div>
                </div>

                <div className="mt-4 text-sm text-slate-500 flex justify-between items-center">
                  <div>{currentIndex + 1} of {inboxItems.length} items</div>
                  <div className="text-xs text-slate-400">
                    Swipe up or press Delete to trash
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;