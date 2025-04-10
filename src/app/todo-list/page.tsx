"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, FileDown } from "lucide-react"
import { useRouter } from "next/navigation"
import type { SubTask, Task } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { formatDate } from "@/lib/utils"
import { saveAs } from 'file-saver';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, ImageRun } from "docx"
import { COMPANY_LOGO } from "@/lib/variables"
import { useAuth } from "@/context/AuthContext"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/components/firebase/firebase"
import { toast } from "sonner"


export default function TodoListPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedSubtasks, setSelectedSubtasks] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()
  const { user, userData } = useAuth()

  const userName = userData?.name || "User"

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        router.push('/login')
        return
      }

      try {
        const tasksDoc = await getDoc(doc(db, 'tasks', user.uid))
        if (tasksDoc.exists()) {
          const allTasks = tasksDoc.data().taskList || []
          // Filter out completed tasks
          const incompleteTasks = allTasks.filter((task: Task) => task.status !== "completed")
          setTasks(incompleteTasks)
        }
      } catch (error) {
        console.error("Error fetching tasks:", error)
        toast.error("Error", {
          description: "Failed to load tasks"
        })
      }
    }

    fetchTasks()
  }, [user, router])

  useEffect(() => {
    const storedTasks = localStorage.getItem("tasks")
    if (storedTasks) {
      const parsedTasks = JSON.parse(storedTasks)
      // Filter out completed tasks
      const incompleteTasks = parsedTasks.filter((task: Task) => task.status !== "completed")
      setTasks(incompleteTasks)
    }
  }, [])

  // const handleTaskSelect = (taskId: string) => {
  //   setSelectedTasks((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]))
  // }

  const handleSelectAll = () => {
    const allSubtaskIds = tasks.flatMap(task =>
      task.subtasks.map(subtask => subtask.id)
    )

    if (selectedSubtasks.length === allSubtaskIds.length) {
      setSelectedSubtasks([])
    } else {
      setSelectedSubtasks(allSubtaskIds)
    }
  }


  const handleSubtaskSelect = (subtaskId: string) => {
    setSelectedSubtasks((prev) =>
      prev.includes(subtaskId)
        ? prev.filter(id => id !== subtaskId)
        : [...prev, subtaskId]
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800"
      case "running":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const generateWordDocument = async () => {
    if (selectedSubtasks.length === 0) {
      toast.error("No subtasks selected", {
        description: "Please select at least one subtask to generate a todo list"
      })
      return
    }

    setIsGenerating(true)

    try {
      // const selectedTasksData = tasks.filter((task) => selectedTasks.includes(task.id))
      const selectedTasksMap = new Map()

      tasks.forEach(task => {
        const selectedSubtasksForTask = task.subtasks.filter(
          subtask => selectedSubtasks.includes(subtask.id)
        )

        if (selectedSubtasksForTask.length > 0) {
          selectedTasksMap.set(task, selectedSubtasksForTask)
        }
      })
      const today = new Date()
      const formattedDate = formatDate(today, "dd-MM-yy")
      const fileName = `${userName} - ${formattedDate} - To Do List.docx`
      // Convert base64 logo to binary
      const logoData = COMPANY_LOGO.split(',')[1]
      const logoImage = Buffer.from(logoData, 'base64')

      // document format for todolist
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: logoImage,
                  transformation: {
                    width: 320,
                    height: 80,
                  },
                  type: "png"
                }),
              ],
              spacing: { after: 300 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${userName} To Do List`,
                  bold: true,
                  color: "515151",
                  size: 32, // Size in half-points (32 = 16pt)

                }),
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 300 },
            }),
            new Paragraph({
              text: "Today's Tasks",
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            ...[...selectedTasksMap.entries()].flatMap(([task, selectedSubtasks]) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${task.title}`,
                    bold: true,
                    color: "515151",
                    size: 24,
                  }),
                ],
                spacing: { before: 300, after: 200 },
              }),
              ...selectedSubtasks.map(
                (subtask: SubTask) =>
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `    ○ ${subtask.title}`,
                        color: "515151",
                        size: 20,
                      }),
                    ],
                    spacing: { before: 100 },
                  }),
              ),
            ]),
          ],
        }],
      })

      const blob = await Packer.toBlob(doc)
      saveAs(blob, fileName)

      toast.success("Todo list downloaded", {
        description: `Your todo list has been downloaded as "${fileName}"`
      })
    } catch (error) {
      console.error("Error generating document:", error)
      toast.error("Error generating document", {
        description: "There was an error generating your todo list"
      })
    } finally {
      setIsGenerating(false)
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl text-gray-800">Create Todo List</CardTitle>
              <Button
                onClick={generateWordDocument}
                disabled={selectedSubtasks.length === 0 || isGenerating}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Download Todo List
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <FileDown className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4">No incomplete tasks found</p>
                  <Button
                    onClick={() => router.push("/add-task")}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
                  >
                    Add New Task
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                    <Checkbox
                      id="selectAll"
                      checked={selectedSubtasks.length === tasks.flatMap(t => t.subtasks).length}
                      onCheckedChange={handleSelectAll}
                      className={
                        selectedSubtasks.length === tasks.flatMap(t => t.subtasks).length
                          ? "bg-blue-600 border-blue-600"
                          : ""
                      }
                    />
                    <label htmlFor="selectAll" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-700">
                      {selectedSubtasks.length === tasks.flatMap(t => t.subtasks).length ? "Deselect All" : "Select All"}
                    </label>
                    <div className="ml-auto text-sm text-gray-500">
                      {selectedSubtasks.length} of {tasks.flatMap(t => t.subtasks).length} subtasks selected
                    </div>
                  </div>

                  <AnimatePresence>
                    {tasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="p-4 rounded-lg transition-all border bg-white border-gray-200 hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <label className="font-medium flex-1 text-gray-800">
                            {task.title}
                          </label>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                            {task.status === "pending" ? "Pending" : "Running"}
                          </span>
                        </div>

                        <div className="mt-3 pl-8 space-y-2">
                          {task.subtasks.map((subtask) => (
                            <motion.div
                              key={subtask.id}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-sm text-gray-600 flex items-center gap-2"
                            >
                              <Checkbox
                                id={subtask.id}
                                checked={selectedSubtasks.includes(subtask.id)}
                                onCheckedChange={() => handleSubtaskSelect(subtask.id)}
                                className={selectedSubtasks.includes(subtask.id) ? "bg-blue-600 border-blue-600" : ""}
                              />
                              <label htmlFor={subtask.id} className="cursor-pointer">
                                {subtask.title}
                              </label>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

