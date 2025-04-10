import { useState } from 'react';
import { Task, SubTask } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Plus, Save, X } from 'lucide-react';

interface TaskCardProps {
    task: Task;
    onSave: (updatedTask: Task) => void;
    onDelete: () => void;
}

export function TaskCard({ task: initialTask, onSave, onDelete }: TaskCardProps) {
    const [task, setTask] = useState(initialTask);
    const [isEditing, setIsEditing] = useState(false);
    const [editingTitle, setEditingTitle] = useState(task.title);

    const handleSaveTitle = () => {
        setTask({ ...task, title: editingTitle });
        setIsEditing(false);
    };

    const handleUpdateSubtask = (id: string, newTitle: string) => {
        setTask({
            ...task,
            subtasks: task.subtasks.map(st =>
                st.id === id ? { ...st, title: newTitle } : st
            )
        });
    };

    const handleDeleteSubtask = (id: string) => {
        setTask({
            ...task,
            subtasks: task.subtasks.filter(st => st.id !== id)
        });
    };

    const handleAddSubtask = () => {
        setTask({
            ...task,
            subtasks: [
                ...task.subtasks,
                { id: `new-${Date.now()}`, title: "New subtask", completed: false }
            ]
        });
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
                {isEditing ? (
                    <>
                        <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-1"
                        />
                        <Button size="sm" variant="ghost" onClick={handleSaveTitle}>
                            <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </>
                ) : (
                    <>
                        <h3 className="font-medium text-gray-800 flex-1">{task.title}</h3>
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={onDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </div>

            <ul className="space-y-2">
                {task.subtasks.map(subtask => (
                    <SubtaskItem
                        key={subtask.id}
                        subtask={subtask}
                        onUpdate={(title: string) => handleUpdateSubtask(subtask.id, title)}
                        onDelete={() => handleDeleteSubtask(subtask.id)}
                    />
                ))}
            </ul>

            <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={handleAddSubtask}>
                    <Plus className="h-4 w-4 mr-2" /> Add Subtask
                </Button>
                <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                    onClick={() => onSave(task)}
                >
                    Save to Tasks
                </Button>
            </div>
        </div>
    );
}

function SubtaskItem({ subtask, onUpdate, onDelete }: { subtask: SubTask, onUpdate: (title: string) => void, onDelete: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editingTitle, setEditingTitle] = useState(subtask.title);

    const handleSave = () => {
        onUpdate(editingTitle);
        setIsEditing(false);
    };

    return (
        <li className="flex items-center gap-2">
            {isEditing ? (
                <>
                    <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="flex-1"
                    />
                    <Button size="sm" variant="ghost" onClick={handleSave}>
                        <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </>
            ) : (
                <>
                    <span className="flex-1">{subtask.title}</span>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </>
            )}
        </li>
    );
}