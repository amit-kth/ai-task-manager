"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus, ArrowLeft, CheckCircle2 } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import type { Task, SubTask } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore"
import { useAuth } from "@/context/AuthContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export default function AddTaskPage() {
  const [taskTitle, setTaskTitle] = useState("")
  const [status, setStatus] = useState<"pending" | "running" | "completed">("pending")
  const [subtasks, setSubtasks] = useState<SubTask[]>([{ id: uuidv4(), title: "", completed: false }])
  const router = useRouter()
  const { user } = useAuth()
  const db = getFirestore()

  const handleAddSubtask = () => {
    setSubtasks([...subtasks, { id: uuidv4(), title: "", completed: false }])
  }

  const handleRemoveSubtask = (id: string) => {
    if (subtasks.length > 1) {
      setSubtasks(subtasks.filter((subtask) => subtask.id !== id))
    } else {
      toast.error("Cannot remove", {
        description: "Task must have at least one subtask"
      })
    }
  }

  const handleSubtaskChange = (id: string, value: string) => {
    setSubtasks(subtasks.map((subtask) => (subtask.id === id ? { ...subtask, title: value } : subtask)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error("Authentication required", {
        description: "Please login to create tasks"
      })
      return
    }

    if (!taskTitle.trim()) {
      toast.error("Task title required", {
        description: "Please enter a title for your task"
      })
      return
    }

    const emptySubtasks = subtasks.filter((subtask) => !subtask.title.trim())
    if (emptySubtasks.length > 0) {
      toast.error("Empty subtasks", {
        description: "Please fill in all subtask titles or remove empty ones"
      })
      return
    }

    try {
      // Create new task
      const newTask: Task = {
        id: uuidv4(),
        title: taskTitle,
        status,
        subtasks,
      }

      // Get existing tasks from Firestore
      const tasksDoc = await getDoc(doc(db, 'tasks', user.uid))
      const existingTasks = tasksDoc.exists() ? tasksDoc.data().taskList : []

      // Update Firestore with new task
      await setDoc(doc(db, 'tasks', user.uid), {
        taskList: [...existingTasks, newTask]
      })

      toast.success("Task added", {
        description: "Your task has been added successfully"
      })

      router.push("/")
    } catch (error) {
      console.error('Error adding task:', error)
      toast.error("Error", {
        description: "Failed to add task. Please try again."
      })
    }
  }

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case "pending":
        return "bg-amber-50 border-amber-200"
      case "running":
        return "bg-blue-50 border-blue-200"
      case "completed":
        return "bg-green-50 border-green-200"
      default:
        return ""
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-6 flex items-center gap-2 hover:bg-white/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="w-full shadow-md border-gray-100 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-600 to-purple-600"></div>
            <CardHeader>
              <CardTitle className="text-2xl text-gray-800">Add New Task</CardTitle>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="taskTitle" className="text-gray-700">
                    Task Title
                  </Label>
                  <Input
                    id="taskTitle"
                    placeholder="Enter task title"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full border-gray-200 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-gray-700">
                    Status
                  </Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as "pending" | "running" | "completed")}
                  >
                    <SelectTrigger className={`w-full ${getStatusColor(status)}`}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-700">Subtasks</Label>
                    <Button
                      type="button"
                      onClick={handleAddSubtask}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Add Subtask
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {subtasks.map((subtask, index) => (
                      <motion.div
                        key={subtask.id}
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                          {index + 1}
                        </div>
                        <Input
                          placeholder={`Subtask ${index + 1}`}
                          value={subtask.title}
                          onChange={(e) => handleSubtaskChange(subtask.id, e.target.value)}
                          className="flex-1 border-gray-200 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition-all"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSubtask(subtask.id)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 border-t border-gray-100">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

