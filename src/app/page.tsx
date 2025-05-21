"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle, Search, Filter, X, Loader2, AlertCircle } from "lucide-react"
import TaskItem from "@/components/task-item"
import type { Task, SubTask } from "@/lib/types"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { doc, setDoc } from "firebase/firestore"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"
import Header from "@/components/header"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { db } from "@/components/firebase/firebase"
import useSWR from "swr"

// Fetch tasks from Firestore
const fetchTasks = async (userId: string) => {
  if (!userId) return []

  try {
    const { getDoc } = await import("firebase/firestore")
    const tasksDoc = await getDoc(doc(db, "tasks", userId))
    if (tasksDoc.exists()) {
      return tasksDoc.data().taskList || []
    }
    return []
  } catch (error) {
    console.error("Error fetching tasks:", error)
    throw new Error("Failed to fetch tasks")
  }
}

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [sortBy, setSortBy] = useState<"default" | "alphabetical" | "subtasks">("default")

  // Use SWR for data fetching with caching
  const {
    data: tasks = [],
    error,
    isLoading,
    mutate,
  } = useSWR(user ? ["tasks", user.uid] : null, () => (user ? fetchTasks(user.uid) : []), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1 minute
  })

  // Update Firestore when tasks change
  const updateFirestore = async (updatedTasks: Task[]) => {
    if (!user) return
    try {
      await setDoc(doc(db, "tasks", user.uid), {
        taskList: updatedTasks,
      })
      mutate(updatedTasks, false) // Update the cache without revalidating
    } catch (error) {
      console.error("Error updating tasks:", error)
      toast.error("Failed to save tasks")
    }
  }

  // Task handlers
  const handleTaskStatusChange = async (taskId: string, newStatus: "pending" | "running" | "completed") => {
    const updatedTasks = tasks.map((task: Task) => (task.id === taskId ? { ...task, status: newStatus } : task))
    await updateFirestore(updatedTasks)
  }

  const handleSubtaskToggle = async (taskId: string, subtaskId: string) => {
    const updatedTasks = tasks.map((task: Task) => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map((subtask) =>
          subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
        )
        const allCompleted = updatedSubtasks.every((subtask) => subtask.completed)
        return {
          ...task,
          subtasks: updatedSubtasks,
          status: allCompleted ? "completed" : task.status,
        }
      }
      return task
    })
    await updateFirestore(updatedTasks)
  }

  const handleAddSubtask = async (taskId: string, newSubtask: SubTask) => {
    const updatedTasks = tasks.map((task: Task) => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: [...task.subtasks, newSubtask],
        }
      }
      return task
    })
    await updateFirestore(updatedTasks)
  }

  const moveTaskUp = async (taskId: string, status: "pending" | "running" | "completed") => {
    const taskIndex = tasks.findIndex((task: Task) => task.id === taskId)
    if (taskIndex <= 0) return // Already at the top

    // Find the previous task with the same status
    let prevTaskIndex = taskIndex - 1
    while (prevTaskIndex >= 0 && tasks[prevTaskIndex].status !== status) {
      prevTaskIndex--
    }

    if (prevTaskIndex < 0) return // No previous task with same status

    const newTasks = [...tasks]
    const temp = newTasks[taskIndex]
    newTasks[taskIndex] = newTasks[prevTaskIndex]
    newTasks[prevTaskIndex] = temp

    await updateFirestore(newTasks)
    toast.success("Task moved up", {
      description: "Task priority has been updated",
    })
  }

  const moveTaskDown = async (taskId: string, status: "pending" | "running" | "completed") => {
    const taskIndex = tasks.findIndex((task: Task) => task.id === taskId)
    if (taskIndex === -1 || taskIndex === tasks.length - 1) return // Not found or already at bottom

    // Find the next task with the same status
    let nextTaskIndex = taskIndex + 1
    while (nextTaskIndex < tasks.length && tasks[nextTaskIndex].status !== status) {
      nextTaskIndex++
    }

    if (nextTaskIndex >= tasks.length) return // No next task with same status

    const newTasks = [...tasks]
    const temp = newTasks[taskIndex]
    newTasks[taskIndex] = newTasks[nextTaskIndex]
    newTasks[nextTaskIndex] = temp

    await updateFirestore(newTasks)
    toast.success("Task moved down", {
      description: "Task priority has been updated",
    })
  }

  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    // First, check if this is the last subtask of the task
    const task = tasks.find((t: Task) => t.id === taskId)
    const isLastSubtask = task?.subtasks.length === 1

    if (isLastSubtask) {
      // If it's the last subtask, remove the entire task
      const updatedTasks = tasks.filter((task: Task) => task.id !== taskId)
      await updateFirestore(updatedTasks)
      toast.success("Task deleted", {
        description: "The task has been removed as it had no remaining subtasks"
      })
    } else {
      // Otherwise, just remove the subtask
      const updatedTasks = tasks.map((task: Task) => {
        if (task.id === taskId) {
          return {
            ...task,
            subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId),
          }
        }
        return task
      })
      await updateFirestore(updatedTasks)
      toast.success("Subtask deleted", {
        description: "The subtask has been removed successfully"
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      const updatedTasks = tasks.filter((task: Task) => task.id !== taskId)
      await updateFirestore(updatedTasks)
      toast.success("Task deleted", {
        description: "Task and all its subtasks have been deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast.error("Failed to delete task")
    }
  }

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    // First filter by search query
    let filtered = tasks.filter((task: Task) => {
      const matchesTitle = task.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSubtasks = task.subtasks.some((subtask) =>
        subtask.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      return matchesTitle || matchesSubtasks
    })

    // Then filter by tab
    if (activeTab !== "all") {
      filtered = filtered.filter((task: Task) => task.status === activeTab)
    }

    // Then sort
    if (sortBy === "alphabetical") {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === "subtasks") {
      return [...filtered].sort((a, b) => b.subtasks.length - a.subtasks.length)
    }

    return filtered
  }, [tasks, searchQuery, activeTab, sortBy])

  // Group tasks by status
  const pendingTasks = useMemo(
    () => filteredAndSortedTasks.filter((task: Task) => task.status === "pending"),
    [filteredAndSortedTasks],
  )
  const runningTasks = useMemo(
    () => filteredAndSortedTasks.filter((task: Task) => task.status === "running"),
    [filteredAndSortedTasks],
  )
  const completedTasks = useMemo(
    () => filteredAndSortedTasks.filter((task: Task) => task.status === "completed"),
    [filteredAndSortedTasks],
  )

  // Calculate task statistics
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((task: Task) => task.status === "completed").length
    const running = tasks.filter((task: Task) => task.status === "running").length
    const pending = tasks.filter((task: Task) => task.status === "pending").length

    const totalSubtasks = tasks.reduce((acc: number, task: Task) => acc + task.subtasks.length, 0)
    const completedSubtasks = tasks.reduce(
      (acc: number, task: Task) => acc + task.subtasks.filter((subtask) => subtask.completed).length,
      0,
    )

    return {
      total,
      completed,
      running,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      subtaskCompletionRate: totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0,
    }
  }, [tasks])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-800 mb-2">Error Loading Tasks</h3>
          <p className="text-gray-600 mb-4">We couldn&apos;t load your tasks. Please try again later.</p>
          <Button onClick={() => mutate()} className="bg-gradient-to-r from-blue-600 to-purple-600">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 max-w-5xl">
        <Header />

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            {tasks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-gray-700">Total Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
                    <p className="text-sm text-gray-500 mt-1">Across all statuses</p>
                  </CardContent>
                </Card>
                <Card className="bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-blue-600">In Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{stats.running}</div>
                    <p className="text-sm text-gray-500 mt-1">Tasks being worked on</p>
                  </CardContent>
                </Card>
                <Card className="bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-amber-600">Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
                    <p className="text-sm text-gray-500 mt-1">Tasks not yet started</p>
                  </CardContent>
                </Card>
                <Card className="bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-green-600">Completed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                    <p className="text-sm text-gray-500 mt-1">{stats.completionRate}% completion rate</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Search and Filter */}
            {tasks.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative w-full sm:w-auto flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tasks and subtasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 border-gray-200 focus:border-blue-300"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Sort & Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        className={sortBy === "default" ? "bg-gray-100" : ""}
                        onClick={() => setSortBy("default")}
                      >
                        Default Order
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={sortBy === "alphabetical" ? "bg-gray-100" : ""}
                        onClick={() => setSortBy("alphabetical")}
                      >
                        Alphabetical (A-Z)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={sortBy === "subtasks" ? "bg-gray-100" : ""}
                        onClick={() => setSortBy("subtasks")}
                      >
                        Most Subtasks
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  onClick={() => router.push("/add-task")}
                  className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Task
                </Button>
              </div>
            )}

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
                {/* Tabs for filtering */}
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-4 mb-4">
                    <TabsTrigger value="all" className="relative">
                      All
                      <Badge className="ml-1 bg-gray-100 text-gray-700 hover:bg-gray-200">{tasks.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="running" className="relative">
                      Running
                      <Badge className="ml-1 bg-blue-100 text-blue-700 hover:bg-blue-200">{runningTasks.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="relative">
                      Pending
                      <Badge className="ml-1 bg-amber-100 text-amber-700 hover:bg-amber-200">
                        {pendingTasks.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="relative">
                      Completed
                      <Badge className="ml-1 bg-green-100 text-green-700 hover:bg-green-200">
                        {completedTasks.length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="space-y-6 mt-0">
                    {filteredAndSortedTasks.length === 0 && searchQuery && (
                      <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                          <Search className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-700">No matching tasks</h3>
                        <p className="text-gray-500 mt-2 max-w-md mx-auto">
                          {`No tasks match your search query "${searchQuery}"`}
                        </p>
                        <Button variant="outline" onClick={() => setSearchQuery("")} className="mt-4">
                          Clear Search
                        </Button>
                      </div>
                    )}

                    {runningTasks.length > 0 && (
                      <TaskSection
                        title="Running Tasks"
                        tasks={runningTasks}
                        statusColor="bg-blue-500"
                        statusBg="bg-blue-50"
                        onStatusChange={handleTaskStatusChange}
                        onSubtaskToggle={handleSubtaskToggle}
                        onAddSubtask={handleAddSubtask}
                        onDeleteSubtask={handleDeleteSubtask}
                        onDeleteTask={handleDeleteTask}
                        onMoveUp={moveTaskUp}
                        onMoveDown={moveTaskDown}
                      />
                    )}

                    {pendingTasks.length > 0 && (
                      <TaskSection
                        title="Pending Tasks"
                        tasks={pendingTasks}
                        statusColor="bg-amber-400"
                        statusBg="bg-amber-50"
                        onStatusChange={handleTaskStatusChange}
                        onSubtaskToggle={handleSubtaskToggle}
                        onAddSubtask={handleAddSubtask}
                        onDeleteSubtask={handleDeleteSubtask}
                        onDeleteTask={handleDeleteTask}
                        onMoveUp={moveTaskUp}
                        onMoveDown={moveTaskDown}
                      />
                    )}

                    {completedTasks.length > 0 && (
                      <TaskSection
                        title="Completed Tasks"
                        tasks={completedTasks}
                        statusColor="bg-green-500"
                        statusBg="bg-green-50"
                        onStatusChange={handleTaskStatusChange}
                        onSubtaskToggle={handleSubtaskToggle}
                        onDeleteSubtask={handleDeleteSubtask}
                        onDeleteTask={handleDeleteTask}
                        disablePriority={true}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="running" className="mt-0">
                    {runningTasks.length === 0 ? (
                      <EmptyStateMessage
                        title="No running tasks"
                        description={
                          searchQuery
                            ? `No running tasks match your search query "${searchQuery}"`
                            : "You don't have any tasks in progress"
                        }
                        buttonText={searchQuery ? "Clear Search" : "Add New Task"}
                        buttonAction={searchQuery ? () => setSearchQuery("") : () => router.push("/add-task")}
                      />
                    ) : (
                      <TaskSection
                        title="Running Tasks"
                        tasks={runningTasks}
                        statusColor="bg-blue-500"
                        statusBg="bg-blue-50"
                        onStatusChange={handleTaskStatusChange}
                        onSubtaskToggle={handleSubtaskToggle}
                        onAddSubtask={handleAddSubtask}
                        onDeleteSubtask={handleDeleteSubtask}
                        onDeleteTask={handleDeleteTask}
                        onMoveUp={moveTaskUp}
                        onMoveDown={moveTaskDown}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="pending" className="mt-0">
                    {pendingTasks.length === 0 ? (
                      <EmptyStateMessage
                        title="No pending tasks"
                        description={
                          searchQuery
                            ? `No pending tasks match your search query "${searchQuery}"`
                            : "You don't have any pending tasks"
                        }
                        buttonText={searchQuery ? "Clear Search" : "Add New Task"}
                        buttonAction={searchQuery ? () => setSearchQuery("") : () => router.push("/add-task")}
                      />
                    ) : (
                      <TaskSection
                        title="Pending Tasks"
                        tasks={pendingTasks}
                        statusColor="bg-amber-400"
                        statusBg="bg-amber-50"
                        onStatusChange={handleTaskStatusChange}
                        onSubtaskToggle={handleSubtaskToggle}
                        onAddSubtask={handleAddSubtask}
                        onDeleteSubtask={handleDeleteSubtask}
                        onDeleteTask={handleDeleteTask}
                        onMoveUp={moveTaskUp}
                        onMoveDown={moveTaskDown}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="completed" className="mt-0">
                    {completedTasks.length === 0 ? (
                      <EmptyStateMessage
                        title="No completed tasks"
                        description={
                          searchQuery
                            ? `No completed tasks match your search query "${searchQuery}"`
                            : "You haven't completed any tasks yet"
                        }
                        buttonText={searchQuery ? "Clear Search" : "View All Tasks"}
                        buttonAction={searchQuery ? () => setSearchQuery("") : () => setActiveTab("all")}
                      />
                    ) : (
                      <TaskSection
                        title="Completed Tasks"
                        tasks={completedTasks}
                        statusColor="bg-green-500"
                        statusBg="bg-green-50"
                        onStatusChange={handleTaskStatusChange}
                        onSubtaskToggle={handleSubtaskToggle}
                        onDeleteSubtask={handleDeleteSubtask}
                        onDeleteTask={handleDeleteTask}
                        disablePriority={true}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// Helper component for task sections
function TaskSection({
  title,
  tasks,
  statusColor,
  statusBg,
  onStatusChange,
  onSubtaskToggle,
  onAddSubtask,
  onDeleteSubtask,
  onDeleteTask,
  onMoveUp,
  onMoveDown,
  disablePriority = false,
}: {
  title: string
  tasks: Task[]
  statusColor: string
  statusBg: string
  onStatusChange: (taskId: string, newStatus: "pending" | "running" | "completed") => void
  onSubtaskToggle: (taskId: string, subtaskId: string) => void
  onAddSubtask?: (taskId: string, subtask: SubTask) => void
  onDeleteSubtask: (taskId: string, subtaskId: string) => void
  onDeleteTask: (taskId: string) => void
  onMoveUp?: (taskId: string, status: "pending" | "running" | "completed") => void
  onMoveDown?: (taskId: string, status: "pending" | "running" | "completed") => void
  disablePriority?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-center mb-4">
        <div className={`w-3 h-3 rounded-full ${statusColor} mr-2`}></div>
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <div className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
          {tasks.length}
        </div>
      </div>

      <AnimatePresence>
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <TaskItem
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onSubtaskToggle={onSubtaskToggle}
              onAddSubtask={onAddSubtask}
              onDeleteSubtask={onDeleteSubtask}
              onDeleteTask={onDeleteTask}
              statusColor={statusColor}
              statusBg={statusBg}
              index={index}
              onMoveUp={onMoveUp ? () => onMoveUp(task.id, task.status) : undefined}
              onMoveDown={onMoveDown ? () => onMoveDown(task.id, task.status) : undefined}
              isFirst={index === 0}
              isLast={index === tasks.length - 1}
              disablePriority={disablePriority}
            />
          ))}
        </div>
      </AnimatePresence>
    </motion.div>
  )
}

// Empty state component
function EmptyStateMessage({
  title,
  description,
  buttonText,
  buttonAction,
}: {
  title: string
  description: string
  buttonText: string
  buttonAction: () => void
}) {
  return (
    <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <AlertCircle className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-700">{title}</h3>
      <p className="text-gray-500 mt-2 max-w-md mx-auto">{description}</p>
      <Button
        onClick={buttonAction}
        className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      >
        {buttonText}
      </Button>
    </div>
  )
}
