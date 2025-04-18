"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import TaskItem from "@/components/task-item"
import type { Task, SubTask } from "@/lib/types"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

// Add these imports at the top
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner"
import Header from "@/components/header"

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { user } = useAuth()
  const db = getFirestore()

  // Replace localStorage useEffect with Firestore fetch
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;
      try {
        const tasksDoc = await getDoc(doc(db, 'tasks', user.uid));
        if (tasksDoc.exists()) {
          setTasks(tasksDoc.data().taskList || []);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast.error("Failed to fetch tasks");
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [user, db]);

  // Replace localStorage update with Firestore update
  useEffect(() => {
    const updateFirestore = async () => {
      if (!user || isLoading) return;
      try {
        await setDoc(doc(db, 'tasks', user.uid), {
          taskList: tasks
        });
      } catch (error) {
        console.error('Error updating tasks:', error);
        toast.error("Failed to save tasks")
      }
    };

    updateFirestore();
  }, [tasks, user, isLoading, db]);

  // Update task status change handler
  const handleTaskStatusChange = async (taskId: string, newStatus: "pending" | "running" | "completed") => {
    setTasks((prevTasks) => {
      const updatedTasks = prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      );
      return updatedTasks;
    });
  };

  // Update subtask toggle handler
  const handleSubtaskToggle = async (taskId: string, subtaskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          const updatedSubtasks = task.subtasks.map((subtask) =>
            subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
          );
          const allCompleted = updatedSubtasks.every((subtask) => subtask.completed);
          return {
            ...task,
            subtasks: updatedSubtasks,
            status: allCompleted ? "completed" : task.status,
          };
        }
        return task;
      }),
    );
  };

  const handleAddSubtask = (taskId: string, newSubtask: SubTask) => {
    setTasks((prevTasks) =>
      prevTasks.map((task: Task) => {
        if (task.id === taskId) {
          return {
            ...task,
            subtasks: [...task.subtasks, newSubtask],
          }
        }
        return task
      }),
    )
  }

  const moveTaskUp = (taskId: string, status: "pending" | "running" | "completed") => {
    setTasks((prevTasks) => {
      const taskIndex = prevTasks.findIndex((task) => task.id === taskId)
      if (taskIndex <= 0) return prevTasks // Already at the top

      // Find the previous task with the same status
      let prevTaskIndex = taskIndex - 1
      while (prevTaskIndex >= 0 && prevTasks[prevTaskIndex].status !== status) {
        prevTaskIndex--
      }

      if (prevTaskIndex < 0) return prevTasks // No previous task with same status

      const newTasks = [...prevTasks]
      const temp = newTasks[taskIndex]
      newTasks[taskIndex] = newTasks[prevTaskIndex]
      newTasks[prevTaskIndex] = temp

      toast.success("Task moved up", {
        description: "Task priority has been updated"
      })

      return newTasks
    })
  }

  const moveTaskDown = (taskId: string, status: "pending" | "running" | "completed") => {
    setTasks((prevTasks) => {
      const taskIndex = prevTasks.findIndex((task) => task.id === taskId)
      if (taskIndex === -1 || taskIndex === prevTasks.length - 1) return prevTasks // Not found or already at bottom

      // Find the next task with the same status
      let nextTaskIndex = taskIndex + 1
      while (nextTaskIndex < prevTasks.length && prevTasks[nextTaskIndex].status !== status) {
        nextTaskIndex++
      }

      if (nextTaskIndex >= prevTasks.length) return prevTasks // No next task with same status

      const newTasks = [...prevTasks]
      const temp = newTasks[taskIndex]
      newTasks[taskIndex] = newTasks[nextTaskIndex]
      newTasks[nextTaskIndex] = temp

      toast.success("Task moved down", {
        description: "Task priority has been updated"
      })

      return newTasks
    })
  }

  const pendingTasks = tasks.filter((task) => task.status === "pending")
  const runningTasks = tasks.filter((task) => task.status === "running")
  const completedTasks = tasks.filter((task) => task.status === "completed")


  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId),
          }
        }
        return task
      }),
    )

    toast.success("Subtask deleted", {
      description: "The subtask has been removed successfully"
    })
  }


  // function for deleting the complete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));

      // Update Firestore
      if (user) {
        const updatedTasks = tasks.filter((task) => task.id !== taskId);
        await setDoc(doc(db, 'tasks', user.uid), {
          taskList: updatedTasks
        });
        toast.success("Task deleted", {
          description: "Task and all its subtasks have been deleted successfully"
        });
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error("Failed to delete task");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 max-w-5xl">
        <Header />

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {tasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <PlusCircle className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-700">No tasks yet</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                  Add your first task to start organizing your work efficiently
                </p>
                <Button
                  onClick={() => router.push("/add-task")}
                  className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
                >
                  Add Your First Task
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {runningTasks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                      <h2 className="text-lg font-semibold text-gray-800">Running Tasks</h2>
                      <div className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {runningTasks.length}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {runningTasks.map((task, index) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onStatusChange={handleTaskStatusChange}
                          onSubtaskToggle={handleSubtaskToggle}
                          onAddSubtask={handleAddSubtask}
                          onDeleteSubtask={handleDeleteSubtask}
                          onDeleteTask={handleDeleteTask}
                          statusColor="bg-blue-500"
                          statusBg="bg-blue-50"
                          index={index}
                          onMoveUp={() => moveTaskUp(task.id, "running")}
                          onMoveDown={() => moveTaskDown(task.id, "running")}
                          isFirst={index === 0}
                          isLast={index === runningTasks.length - 1}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {pendingTasks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-3 h-3 rounded-full bg-amber-400 mr-2"></div>
                      <h2 className="text-lg font-semibold text-gray-800">Pending Tasks</h2>
                      <div className="ml-2 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                        {pendingTasks.length}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {pendingTasks.map((task, index) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onStatusChange={handleTaskStatusChange}
                          onSubtaskToggle={handleSubtaskToggle}
                          onAddSubtask={handleAddSubtask}
                          onDeleteSubtask={handleDeleteSubtask}
                          onDeleteTask={handleDeleteTask}
                          statusColor="bg-amber-400"
                          statusBg="bg-amber-50"
                          index={index}
                          onMoveUp={() => moveTaskUp(task.id, "pending")}
                          onMoveDown={() => moveTaskDown(task.id, "pending")}
                          isFirst={index === 0}
                          isLast={index === pendingTasks.length - 1}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {completedTasks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <h2 className="text-lg font-semibold text-gray-800">Completed Tasks</h2>
                      <div className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        {completedTasks.length}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {completedTasks.map((task, index) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onStatusChange={handleTaskStatusChange}
                          onDeleteSubtask={handleDeleteSubtask}
                          onSubtaskToggle={handleSubtaskToggle}
                          onDeleteTask={handleDeleteTask}
                          statusColor="bg-green-500"
                          statusBg="bg-green-50"
                          index={index}
                          disablePriority={true}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

