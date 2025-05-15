"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileDown, IterationCcw, Trash, X, AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Task } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { saveAs } from "file-saver"
import { Document, Paragraph, TextRun, AlignmentType, Packer, ImageRun } from "docx"
import { COMPANY_LOGO } from "@/lib/variables"
import { useAuth } from "@/context/AuthContext"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/components/firebase/firebase"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import useSWR from "swr"

interface MonthlyReportAnswers {
  tasksCompleted: string
  reasonIfNo: string
  newLearnings: string
  lastMonthTarget: string
  suggestions: string
}

interface ReportTask {
  id: string
  title: string
  status: "pending" | "running" | "completed"
  subtasks: {
    id: string
    title: string
    status: "pending" | "running" | "completed"
  }[]
}

// Fetch tasks from Firestore
const fetchTasks = async (userId: string) => {
  if (!userId) return []

  const tasksDoc = await getDoc(doc(db, "tasks", userId))
  if (tasksDoc.exists()) {
    return tasksDoc.data().taskList || []
  }
  return []
}

export default function MonthlyReportPage() {
  const router = useRouter()
  const { user, userData } = useAuth()
  const userName = userData?.name || "User"
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<ReportTask[]>([])
  const [answers, setAnswers] = useState<MonthlyReportAnswers>({
    tasksCompleted: "",
    reasonIfNo: "",
    newLearnings: "",
    lastMonthTarget: "",
    suggestions: "",
  })

  // Get current month and year
  const currentDate = new Date()
  const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(currentDate)

  // Use SWR for data fetching with caching
  const {
    data: tasks,
    error,
    isLoading,
  } = useSWR(user ? ["tasks", user.uid] : null, () => (user ? fetchTasks(user.uid) : []), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1 minute
  })

  // Transform tasks function
  const transformTasks = useMemo(
    () => (tasks: Task[]) => {
      return tasks.map((task) => ({
        ...task,
        status: task.status,
        subtasks: task.subtasks.map((subtask) => ({
          ...subtask,
          status: getClonedSubtaskStatus(task.status, subtask.completed),
        })),
      }))
    },
    [],
  )

  // Set selected tasks when tasks data changes
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const transformedTasks = transformTasks(tasks)
      setSelectedTasks(transformedTasks)
    }
  }, [tasks, transformTasks])

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !isLoading) {
      router.push("/login")
    }
  }, [user, router, isLoading])

  function getClonedSubtaskStatus(taskStatus: string, subtaskStatus: boolean): "pending" | "running" | "completed" {
    if (taskStatus === "pending") {
      if (subtaskStatus) {
        return "completed"
      } else {
        return "pending"
      }
    } else if (taskStatus === "running") {
      if (subtaskStatus) {
        return "completed"
      } else {
        return "running"
      }
    } else {
      return "completed"
    }
  }

  // Calculate completion statistics
  const stats = useMemo(() => {
    if (!selectedTasks.length) return { total: 0, completed: 0, running: 0, pending: 0, percentage: 0 }

    let totalSubtasks = 0
    let completedSubtasks = 0
    let runningSubtasks = 0
    let pendingSubtasks = 0

    selectedTasks.forEach((task) => {
      task.subtasks.forEach((subtask) => {
        totalSubtasks++
        if (subtask.status === "completed") completedSubtasks++
        else if (subtask.status === "running") runningSubtasks++
        else pendingSubtasks++
      })
    })

    return {
      total: totalSubtasks,
      completed: completedSubtasks,
      running: runningSubtasks,
      pending: pendingSubtasks,
      percentage: totalSubtasks ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0,
    }
  }, [selectedTasks])

  const getStatusColor = (status: "pending" | "running" | "completed") => {
    switch (status) {
      case "completed":
        return "text-green-600"
      case "running":
        return "text-blue-600"
      default:
        return "text-gray-800"
    }
  }

  const getStatusBadge = (status: "pending" | "running" | "completed") => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            Completed
          </Badge>
        )
      case "running":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            Running
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
            Pending
          </Badge>
        )
    }
  }

  const toggleTaskStatus = (taskId: string, subtaskId: string) => {
    setSelectedTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            subtasks: task.subtasks.map((subtask) => {
              if (subtask.id === subtaskId) {
                // Get the next status in the cycle
                const nextStatus = getNextStatus(subtask.status) as "pending" | "running" | "completed"
                return { ...subtask, status: nextStatus }
              }
              return subtask
            }),
          }
        }
        return task
      }),
    )
  }

  const getNextStatus = (currentStatus: string) => {
    const statuses = ["pending", "running", "completed"]
    const currentIndex = statuses.indexOf(currentStatus)
    return statuses[(currentIndex + 1) % statuses.length]
  }

  const removeTask = (taskId: string) => {
    setSelectedTasks((prev) => prev.filter((task) => task.id !== taskId))
    toast.success("Task removed from report")
  }

  const removeSubtask = (taskId: string, subtaskId: string) => {
    setSelectedTasks((prevTasks) =>
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
    toast.success("Subtask removed from report")
  }

  const generateReport = async () => {
    try {
      setIsGenerating(true)

      // Convert base64 logo to binary
      const logoData = COMPANY_LOGO.split(",")[1]
      const logoImage = Buffer.from(logoData, "base64")

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440, // 1 inch (1440 twips)
                  bottom: 1440,
                  left: 1800, // 1.25 inch
                  right: 1800,
                },
              },
            },
            children: [
              // Logo
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: logoImage,
                    transformation: {
                      width: 300,
                      height: 75,
                    },
                    type: "png",
                  }),
                ],
                spacing: { after: 400 },
              }),
              // User Name
              new Paragraph({
                children: [
                  new TextRun({
                    text: userName,
                    bold: true,
                    size: 36,
                    font: "Calibri",
                    color: "2B579A",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 240 },
              }),
              // Report Title
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Monthly Report - ${monthYear}`,
                    bold: true,
                    size: 32,
                    font: "Calibri",
                    color: "2B579A",
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 480, line: 360 },
              }),
              // Tasks Section
              ...selectedTasks.flatMap((task) => [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${task.title}`,
                      bold: true,
                      size: 28,
                      font: "Calibri",
                      color: "2F2F2F",
                    }),
                  ],
                  spacing: { before: 360, after: 240, line: 360 },
                }),
                ...task.subtasks.map(
                  (subtask) =>
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `• ${subtask.title}`,
                          size: 24,
                          font: "Calibri",
                          color:
                            subtask.status === "completed"
                              ? "217346"
                              : subtask.status === "running"
                                ? "2B579A"
                                : "404040",
                        }),
                      ],
                      spacing: { before: 120, line: 360 },
                      indent: { left: 720, hanging: 180 },
                    }),
                ),
              ]),
              // Monthly Review Section
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Monthly Review",
                    bold: true,
                    size: 32,
                    font: "Calibri",
                    color: "2B579A",
                  }),
                ],
                spacing: { before: 480, after: 240, line: 360 },
              }),
              // Questions
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Have you completed all the tasks you got in this month?",
                    bold: true,
                    size: 24,
                    font: "Calibri",
                    color: "2F2F2F",
                  }),
                  new TextRun({
                    text: `\n${answers.tasksCompleted}`,
                    size: 24,
                    font: "Calibri",
                    color: "404040",
                  }),
                ],
                spacing: { before: 240, after: 240, line: 360 },
              }),
              ...(answers.tasksCompleted.toLowerCase() === "no"
                ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Reason for incomplete tasks:",
                        bold: true,
                        size: 24,
                        font: "Calibri",
                        color: "2F2F2F",
                      }),
                      new TextRun({
                        text: `\n${answers.reasonIfNo}`,
                        size: 24,
                        font: "Calibri",
                        color: "404040",
                      }),
                    ],
                    spacing: { before: 240, after: 240, line: 360 },
                  }),
                ]
                : []),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "New learnings this month:",
                    bold: true,
                    size: 24,
                    font: "Calibri",
                    color: "2F2F2F",
                  }),
                  new TextRun({
                    text: `\n${answers.newLearnings}`,
                    size: 24,
                    font: "Calibri",
                    color: "404040",
                  }),
                ],
                spacing: { before: 240, after: 240, line: 360 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Last month's target achievement:",
                    bold: true,
                    size: 24,
                    font: "Calibri",
                    color: "2F2F2F",
                  }),
                  new TextRun({
                    text: `\n${answers.lastMonthTarget}%`,
                    size: 24,
                    font: "Calibri",
                    color: "404040",
                  }),
                ],
                spacing: { before: 240, after: 240, line: 360 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Suggestions for improvement:",
                    bold: true,
                    size: 24,
                    font: "Calibri",
                    color: "2F2F2F",
                  }),
                  new TextRun({
                    text: `\n${answers.suggestions}`,
                    size: 24,
                    font: "Calibri",
                    color: "404040",
                  }),
                ],
                spacing: { before: 240, after: 240, line: 360 },
              }),
            ],
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      saveAs(blob, `${userName} - Monthly Report - ${monthYear}.docx`)

      toast.success("Report generated successfully")
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error("Failed to generate report")
    } finally {
      setIsGenerating(false)
    }
  }

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return (
      selectedTasks.length > 0 &&
      answers.tasksCompleted &&
      answers.newLearnings &&
      answers.lastMonthTarget &&
      answers.suggestions &&
      (answers.tasksCompleted.toLowerCase() !== "no" || answers.reasonIfNo)
    )
  }, [selectedTasks, answers])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-800 mb-2">Error Loading Tasks</h3>
          <p className="text-gray-600 mb-4">{`We couldn't load your tasks. Please try again later.`}</p>
          <Button onClick={() => router.push("/")} className="bg-gradient-to-r from-blue-600 to-purple-600">
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="mb-6 flex items-center gap-2 hover:bg-white/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tasks
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="w-full shadow-lg border-gray-100 overflow-hidden mb-6">
            <div className="h-2 bg-gradient-to-r from-blue-600 to-purple-600"></div>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl text-gray-800">Monthly Report</CardTitle>
                  <CardDescription className="text-gray-500">
                    Generate your performance report for {monthYear}
                  </CardDescription>
                </div>

                <div className="flex flex-col items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-500">Completion:</span>
                    <span className="font-medium text-gray-800">{stats.percentage}%</span>
                  </div>
                  <Progress value={stats.percentage} className="h-2 w-32" />
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="text-green-600">{stats.completed} done</span>
                    <span className="text-blue-600">{stats.running} in progress</span>
                    <span className="text-amber-600">{stats.pending} pending</span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tasks List */}
            <div className="md:col-span-2">
              <Card className="w-full shadow-md border-gray-100 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-gray-800">Tasks for {monthYear}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedTasks.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-700 mb-1">No Tasks Available</h3>
                      <p className="text-gray-500 max-w-md mx-auto mb-4">
                        There are no tasks available for your monthly report.
                      </p>
                      <Button
                        onClick={() => router.push("/add-task")}
                        className="bg-gradient-to-r from-blue-600 to-purple-600"
                      >
                        Add New Task
                      </Button>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {selectedTasks.map((task) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                          transition={{ duration: 0.2 }}
                          className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow transition-all"
                        >
                          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                            <h4 className="font-medium text-gray-800">{task.title}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTask(task.id)}
                              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="p-4">
                            <div className="space-y-2">
                              {task.subtasks.map((subtask) => (
                                <motion.div
                                  key={subtask.id}
                                  initial={{ opacity: 0, x: -5 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex items-center justify-between gap-2 p-2 hover:bg-gray-50 rounded-md border border-gray-100"
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-2 h-2 rounded-full ${subtask.status === "completed"
                                          ? "bg-green-500"
                                          : subtask.status === "running"
                                            ? "bg-blue-500"
                                            : "bg-amber-500"
                                        }`}
                                    ></div>
                                    <span className={getStatusColor(subtask.status)}>{subtask.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getStatusBadge(subtask.status)}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleTaskStatus(task.id, subtask.id)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <IterationCcw className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeSubtask(task.id, subtask.id)}
                                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                    >
                                      <Trash className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Questions Section */}
            <div className="md:col-span-1">
              <Card className="w-full shadow-md border-gray-100 overflow-hidden sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-gray-800">Monthly Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Completed all tasks? <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={answers.tasksCompleted}
                      onValueChange={(value) => setAnswers((prev) => ({ ...prev, tasksCompleted: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Yes/No" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <AnimatePresence>
                    {answers.tasksCompleted.toLowerCase() === "no" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                          Reason <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                          value={answers.reasonIfNo}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, reasonIfNo: e.target.value }))}
                          placeholder="Why weren't tasks completed?"
                          className="min-h-[80px] resize-none"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      New learnings <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={answers.newLearnings}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, newLearnings: e.target.value }))}
                      placeholder="What did you learn this month?"
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Target achievement % <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={answers.lastMonthTarget}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, lastMonthTarget: e.target.value }))}
                      placeholder="Enter percentage"
                      className="w-full"
                      min="0"
                      max="100"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Suggestions <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={answers.suggestions}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, suggestions: e.target.value }))}
                      placeholder="Any suggestions for improvement?"
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-4">
                    <Button
                      onClick={generateReport}
                      disabled={isGenerating || !isFormValid}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all py-6"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileDown className="h-5 w-5" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
