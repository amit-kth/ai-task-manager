"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Trash2, Plus, Save } from "lucide-react"
import type { Task, SubTask } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface EditTaskModalProps {
  isOpen: boolean
  onClose: () => void
  initialTask: Task | null
  onSave: (updatedTask: Task) => void
}

export function EditTaskModal({ isOpen, onClose, initialTask, onSave }: EditTaskModalProps) {
  const [task, setTask] = useState<Task>({
    id: "",
    title: "",
    status: "pending",
    subtasks: [],
  })
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("")
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)

  useEffect(() => {
    if (initialTask) {
      setTask(initialTask)
    }
  }, [initialTask, isOpen])

  const handleTitleChange = (newTitle: string) => {
    setTask((prev) => ({ ...prev, title: newTitle }))
  }

  const handleStatusChange = (newStatus: string) => {
    setTask((prev) => ({ ...prev, status: newStatus as "pending" | "running" | "completed" }))
  }

  const handleStartEditing = (subtask: SubTask) => {
    setEditingSubtaskId(subtask.id)
    setEditingSubtaskTitle(subtask.title)
  }

  const handleSubtaskEdit = (subtaskId: string, newTitle: string) => {
    if (!newTitle.trim()) return
    setTask((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) => (st.id === subtaskId ? { ...st, title: newTitle.trim() } : st)),
    }))
    setEditingSubtaskId(null)
    setEditingSubtaskTitle("")
  }

  const handleSubtaskDelete = (subtaskId: string) => {
    setTask((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((st) => st.id !== subtaskId),
    }))
  }

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return

    const newSubtask: SubTask = {
      id: Date.now().toString(),
      title: newSubtaskTitle.trim(),
      completed: false,
    }

    setTask((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, newSubtask],
    }))

    setNewSubtaskTitle("")
    setIsAddingSubtask(false)
  }

  const handleSave = () => {
    if (!task.title.trim()) return
    onSave(task)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            {isEditingTitle ? (
              <div className="flex-1 flex items-center gap-2">
                <Input
                  value={task.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-lg font-semibold"
                  autoFocus
                  placeholder="Task title"
                />
                <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <DialogTitle className="flex items-center gap-2 text-xl">
                {task.title || "Untitled Task"}
                <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTitle>
            )}
          </div>
        </DialogHeader>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Badge
              variant="outline"
              className={`${
                task.status === "completed"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : task.status === "running"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </Badge>
          </div>
        </div>

        <div className="mt-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Subtasks ({task.subtasks.length})</h3>
            {!isAddingSubtask && (
              <Button size="sm" variant="outline" onClick={() => setIsAddingSubtask(true)} className="text-blue-600">
                <Plus className="h-4 w-4 mr-1" />
                Add Subtask
              </Button>
            )}
          </div>

          {isAddingSubtask && (
            <div className="flex items-center gap-2">
              <Input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Enter subtask title"
                autoFocus
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSubtaskTitle.trim()) {
                    handleAddSubtask()
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingSubtask(false)
                  setNewSubtaskTitle("")
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {task.subtasks.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No subtasks yet. Add some using the button above.
              </div>
            ) : (
              task.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                >
                  {editingSubtaskId === subtask.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingSubtaskTitle}
                        onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                        className="text-sm"
                        autoFocus
                        onBlur={() => {
                          if (editingSubtaskTitle.trim()) {
                            handleSubtaskEdit(subtask.id, editingSubtaskTitle)
                          } else {
                            setEditingSubtaskId(null)
                            setEditingSubtaskTitle("")
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingSubtaskTitle.trim()) {
                            handleSubtaskEdit(subtask.id, editingSubtaskTitle)
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSubtaskEdit(subtask.id, editingSubtaskTitle)}
                        disabled={!editingSubtaskTitle.trim()}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-gray-700">{subtask.title}</span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEditing(subtask)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSubtaskDelete(subtask.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-blue-600 to-purple-600"
            disabled={!task.title.trim()}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
