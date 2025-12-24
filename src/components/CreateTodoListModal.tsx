import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface CreateTodoListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (title: string, items: { id: string, text: string, completed: boolean }[]) => void;
}

export default function CreateTodoListModal({ isOpen, onClose, onCreate }: CreateTodoListModalProps) {
    const [title, setTitle] = useState("");
    const [tasks, setTasks] = useState<{ id: string, text: string }[]>([{ id: uuidv4(), text: "" }]);

    useEffect(() => {
        if (isOpen) {
            setTitle("");
            setTasks([{ id: uuidv4(), text: "" }]);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleTaskChange = (id: string, text: string) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, text } : t));
    };

    const addTask = () => {
        if (tasks.length >= 30) return; // Limit as per screenshot suggestion "Can add 30 more tasks"
        setTasks([...tasks, { id: uuidv4(), text: "" }]);
    };

    const removeTask = (id: string) => {
        if (tasks.length === 1) return;
        setTasks(tasks.filter(t => t.id !== id));
    };

    const handleCreate = () => {
        if (!title.trim() && tasks.every(t => !t.text.trim())) return;
        
        const validTasks = tasks
            .filter(t => t.text.trim())
            .map(t => ({ id: t.id, text: t.text, completed: false }));
            
        if (validTasks.length === 0 && !title.trim()) return;

        onCreate(title, validTasks);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#1c1c1e] w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-gray-800">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-white mb-6">New Task List</h2>
                    
                    <input
                        type="text"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-transparent text-xl font-medium text-white placeholder-gray-500 border-none outline-none mb-4"
                        autoFocus
                    />

                    <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar mb-4">
                        {tasks.map((task, index) => (
                            <div key={task.id} className="flex items-center gap-3 group">
                                <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Add a task..."
                                    value={task.text}
                                    onChange={(e) => handleTaskChange(task.id, e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addTask();
                                        }
                                    }}
                                    className="flex-1 bg-transparent text-white placeholder-gray-600 border-none outline-none"
                                />
                                <button 
                                    onClick={() => removeTask(task.id)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={addTask}
                        className="flex items-center gap-3 text-[var(--accent)] hover:opacity-80 transition-opacity w-full py-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add a task...</span>
                    </button>
                    
                    <div className="mt-2 text-xs text-gray-600 pl-8">
                        Can add {30 - tasks.length} more tasks.
                    </div>
                </div>

                <div className="flex justify-end gap-2 p-4 bg-[#1c1c1e] border-t border-gray-800">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-[var(--accent)] hover:bg-white/5 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleCreate}
                        className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg hover:opacity-90 transition-opacity font-bold"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}