"use client"

import { useState } from "react"
import type { Task } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"

interface TaskListProps {
  title: string
  tasks: Task[]
  onStatusChange: (taskId: string, newStatus: "pending" | "running" | "completed") => void
  onSubtaskToggle: (taskId: string, subtaskId: string) => void
  statusColor: string
}

export default function TaskList({ title, tasks, onStatusChange, onSubtaskToggle, statusColor }: TaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<string[]>([])

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${statusColor} mr-2`}></div>
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-sm"
            >
              <div className="flex items-center justify-between p-4 bg-card">
                <div className="flex items-center gap-3 flex-1">
                  <h3 className="font-medium">{task.title}</h3>
                  <div className="text-xs text-muted-foreground">
                    {task.subtasks.filter((st) => st.completed).length} of {task.subtasks.length} completed
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Select
                    value={task.status}
                    onValueChange={(value) => onStatusChange(task.id, value as "pending" | "running" | "completed")}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="ghost" size="sm" onClick={() => toggleTaskExpansion(task.id)} className="ml-2">
                    {expandedTasks.includes(task.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {expandedTasks.includes(task.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 border-t bg-muted/30">
                      <div className="space-y-2 pt-3">
                        {task.subtasks.map((subtask) => (
                          <div
                            key={subtask.id}
                            className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 transition-colors"
                          >
                            <Checkbox
                              id={`${task.id}-${subtask.id}`}
                              checked={subtask.completed}
                              onCheckedChange={() => onSubtaskToggle(task.id, subtask.id)}
                            />
                            <label
                              htmlFor={`${task.id}-${subtask.id}`}
                              className={`flex-1 cursor-pointer ${
                                subtask.completed ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {subtask.title}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

