"use client"

import { useState } from "react"
import type { Task, SubTask } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"


interface TaskItemProps {
  task: Task
  onStatusChange: (taskId: string, newStatus: "pending" | "running" | "completed") => void
  onSubtaskToggle: (taskId: string, subtaskId: string) => void
  onAddSubtask?: (taskId: string, subtask: SubTask) => void
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  statusColor: string
  statusBg: string
  index: number
  disablePriority?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst?: boolean
  isLast?: boolean
}
// In the component props, add onDeleteTask
export default function TaskItem({
  task,
  onStatusChange,
  onSubtaskToggle,
  onAddSubtask,
  onDeleteSubtask,
  onDeleteTask,
  statusColor,
  statusBg,
  index,
  disablePriority = false,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)

  const toggleExpansion = () => {
    setExpanded(!expanded)
  }

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) {
      toast.error("Subtask title required", {
        description: "Please enter a title for your subtask"
      })
      return
    }

    const newSubtask: SubTask = {
      id: uuidv4(),
      title: newSubtaskTitle,
      completed: false,
    }

    onAddSubtask?.(task.id, newSubtask)
    setNewSubtaskTitle("")
    setIsAddingSubtask(false)

    toast.success("Subtask added", {
      description: "Your subtask has been added successfully"
    })
  }

  const completedSubtasks = task.subtasks.filter((st) => st.completed).length
  const totalSubtasks = task.subtasks.length
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending"
      case "running":
        return "Running"
      case "completed":
        return "Completed"
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800"
      case "running":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`rounded-lg overflow-hidden border shadow-sm hover:shadow transition-all ${expanded ? "border-gray-300" : "border-gray-200"}`}
    >
      <div className={`flex flex-col sm:flex-row items-start sm:items-center p-3 sm:p-4 ${statusBg}`}>
        <div className="flex-1 w-full sm:w-auto">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h3 className="font-medium text-gray-800 text-sm sm:text-base capitalize">{task.title}</h3>
            <div className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(task.status)}`}>
              {getStatusLabel(task.status)}
            </div>
          </div>

          <div className="mt-2 w-full">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>
                {completedSubtasks} of {totalSubtasks} subtasks
              </span>
            </div>
            <Progress value={progress} className="h-1.5 bg-white" indicatorClassName={statusColor.replace("bg-", "bg-")} />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4 w-full sm:w-auto">
          {!disablePriority && (
            <div className="flex sm:flex-col gap-1 mr-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onMoveUp}
                disabled={isFirst}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onMoveDown}
                disabled={isLast}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* confirmation alert dialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                <AlertDialogDescription>
                  Deleting <b>{task.title}</b> will also delete all of its subtasks. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDeleteTask(task.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Select
            value={task.status}
            onValueChange={(value) => onStatusChange(task.id, value as "pending" | "running" | "completed")}
          >
            <SelectTrigger className="w-[110px] sm:w-[130px] h-8 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={toggleExpansion} className="ml-auto sm:ml-2 h-8 w-8 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-3 sm:p-4 pt-0 border-t">
              <div className="space-y-1 pt-3">
                {task.subtasks.map((subtask) => (
                  <motion.div
                    key={subtask.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      id={`${task.id}-${subtask.id}`}
                      checked={subtask.completed}
                      onCheckedChange={() => onSubtaskToggle(task.id, subtask.id)}
                      className={`${subtask.completed ? "bg-green-500 border-green-500" : ""}`}
                    />
                    <label
                      htmlFor={`${task.id}-${subtask.id}`}
                      className={`flex-1 capitalize cursor-pointer text-xs sm:text-sm ${subtask.completed ? "line-through text-gray-400" : "text-gray-700"
                        }`}
                    >
                      {subtask.title}
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                      onClick={() => onDeleteSubtask(task.id, subtask.id)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-500" />
                    </Button>
                  </motion.div>
                ))}

                {/* Add new subtask section - only for pending and running tasks */}
                {task.status !== "completed" && (
                  <div className="mt-4">
                    {isAddingSubtask ? (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter subtask title"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            className="flex-1 text-sm h-8 border-gray-200 focus:border-blue-300"
                            onKeyDownCapture={(e) => {
                              if (e.key === "Enter") {
                                handleAddSubtask()
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsAddingSubtask(false)
                              setNewSubtaskTitle("")
                            }}
                            className="h-8"
                          >
                            Cancel
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingSubtask(true)}
                        className="w-full text-sm h-8 border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Subtask
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

