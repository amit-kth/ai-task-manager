"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Plus, CheckCircle2, ListTodo } from "lucide-react"
import type { Task } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EditTaskModal } from "./edit-task-modal"
import {  doc, getDoc, setDoc } from "firebase/firestore"
import { useAuth } from "@/context/AuthContext"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { db } from "@/components/firebase/firebase"

interface TasksListProps {
    tasks: Task[]
    onEditTask: (task: Task) => void
    onDeleteTask: (index: number) => void
    onAddAllTasks: (tasks: Task[]) => void
}

export function AiDetectedTasksList({ tasks: initialTasks, onDeleteTask, onAddAllTasks }: TasksListProps) {
    const [tasks, setTasks] = useState(initialTasks)
    const [hoveredTask, setHoveredTask] = useState<number | null>(null)
    const [editingTask, setEditingTask] = useState<Task | null>(null)
    const { user } = useAuth()

    const handleTaskEdit = (task: Task) => {
        setEditingTask(task)
    }

    const handleTaskDelete = (index: number) => {
        const updatedTasks = tasks.filter((_, i) => i !== index)
        setTasks(updatedTasks)
        onDeleteTask(index)
    }

    // Modify handleSaveTask function
    const handleSaveTask = async (updatedTask: Task) => {
        if (!user) {
            toast.error("Authentication required");
            return;
        }

        try {
            // Get current tasks from Firestore
            const tasksDoc = await getDoc(doc(db, 'tasks', user.uid));
            const currentTasks = tasksDoc.exists() ? tasksDoc.data().taskList : [];

            // Find if task exists in current tasks
            const existingTaskIndex = currentTasks.findIndex((t: Task) => t.id === updatedTask.id);

            if (existingTaskIndex !== -1) {
                // Update existing task
                currentTasks[existingTaskIndex] = {
                    ...currentTasks[existingTaskIndex],
                    ...updatedTask,
                    subtasks: updatedTask.subtasks.map(subtask => ({
                        ...subtask,
                        id: subtask.id || uuidv4()
                    }))
                };
            } else {
                // If task doesn't exist, add it with the same ID
                currentTasks.push({
                    ...updatedTask,
                    subtasks: updatedTask.subtasks.map(subtask => ({
                        ...subtask,
                        id: subtask.id || uuidv4()
                    }))
                });
            }

            // Update Firestore
            await setDoc(doc(db, 'tasks', user.uid), {
                taskList: currentTasks
            });

            // Update local state
            setTasks(prev => {
                const taskIndex = prev.findIndex(t => t.id === updatedTask.id);
                if (taskIndex === -1) return prev;
                const newTasks = [...prev];
                newTasks[taskIndex] = updatedTask;
                return newTasks;
            });

            toast.success("Task updated successfully");
            setEditingTask(null);
        } catch (error) {
            console.error('Error updating task:', error);
            toast.error("Failed to update task");
        }
    }

    // Modify handleAddAllTasks function
    const handleAddAllTasks = async () => {
        if (!user) {
            toast.error("Authentication required", {
                description: "Please login to add tasks"
            });
            return;
        }

        try {
            // Get existing tasks from Firestore
            const tasksDoc = await getDoc(doc(db, 'tasks', user.uid));
            const existingTasks = tasksDoc.exists() ? tasksDoc.data().taskList : [];

            // Process each task
            const updatedTasks = [...existingTasks];
            const newTasks = tasks.map(task => {
                // Check if task already exists
                const existingTaskIndex = existingTasks.findIndex((t: Task) => t.id === task.id);

                if (existingTaskIndex !== -1) {
                    // Update existing task
                    updatedTasks[existingTaskIndex] = {
                        ...task,
                        subtasks: task.subtasks.map(subtask => ({
                            ...subtask,
                            id: subtask.id || uuidv4(),
                        }))
                    };
                    return null; // Skip this task as it's already handled
                } else {
                    // Create new task
                    return {
                        ...task,
                        id: task.id || uuidv4(),
                        subtasks: task.subtasks.map(subtask => ({
                            ...subtask,
                            id: subtask.id || uuidv4(),
                        }))
                    };
                }
            }).filter(Boolean); // Remove null values (already updated tasks)

            // Add new tasks to the array
            const finalTasks = [...updatedTasks, ...newTasks];

            // Update Firestore
            await setDoc(doc(db, 'tasks', user.uid), {
                taskList: finalTasks
            });

            toast.success("Tasks updated", {
                description: "All tasks have been added or updated in your task list"
            });

            // Clear the AI detected tasks list
            setTasks([]);
            onAddAllTasks([]);
        } catch (error) {
            console.error('Error adding tasks:', error);
            toast.error("Error", {
                description: "Failed to update tasks. Please try again."
            });
        }
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-6"
            >
                {tasks.length > 0 && (
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                                <ListTodo className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-800">AI Detected Tasks</h2>
                            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                                {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                            </Badge>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <AnimatePresence>
                        {tasks.map((task, taskIndex) => (
                            <motion.div
                                key={taskIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, delay: taskIndex * 0.05 }}
                                onMouseEnter={() => setHoveredTask(taskIndex)}
                                onMouseLeave={() => setHoveredTask(null)}
                            >
                                <Card
                                    className={`overflow-hidden border transition-all duration-200 ${hoveredTask === taskIndex
                                            ? "border-blue-300 shadow-md ring-1 ring-blue-100"
                                            : "border-gray-200 shadow-sm"
                                        }`}
                                >
                                    <div
                                        className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform origin-left transition-all duration-300 ease-out scale-x-0"
                                        style={{ transform: hoveredTask === taskIndex ? "scaleX(1)" : "scaleX(0)" }}
                                    ></div>
                                    <CardContent className="p-0">
                                        <div className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                                                        {task.title}
                                                        {task.status === "completed" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                                    </h3>

                                                    {task.subtasks.length > 0 && (
                                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                                                            <div className="mt-3 space-y-2">
                                                                {task.subtasks.map((subtask, subtaskIndex) => (
                                                                    <motion.div
                                                                        key={subtask.id}
                                                                        initial={{ opacity: 0, x: -5 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: 0.1 + subtaskIndex * 0.05 }}
                                                                        className="flex items-center gap-3 text-gray-600 bg-gray-50 p-2.5 rounded-md border border-gray-100"
                                                                    >
                                                                        <span className="h-2 w-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></span>
                                                                        <span className="text-sm">{subtask.title}</span>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 ml-4">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleTaskEdit(task)}
                                                        className="h-8 border-blue-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleTaskDelete(taskIndex)}
                                                        className="h-8 border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {tasks.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="mt-8 flex justify-center"
                    >
                        <Button
                            size="lg"
                            onClick={handleAddAllTasks}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all px-8 py-6"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Add All Tasks to Task List
                        </Button>
                    </motion.div>
                )}
            </motion.div>

            <EditTaskModal
                isOpen={!!editingTask}
                onClose={() => setEditingTask(null)}
                initialTask={editingTask!}
                onSave={handleSaveTask}
            />
        </>
    )
}
