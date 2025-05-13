"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileDown, IterationCcw, Trash, X } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Task } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"

import { saveAs } from 'file-saver'
import { Document, Paragraph, TextRun, AlignmentType, Packer, ImageRun } from "docx"
import { COMPANY_LOGO } from "@/lib/variables"
import { useAuth } from "@/context/AuthContext"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/components/firebase/firebase"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface MonthlyReportAnswers {
    tasksCompleted: string
    reasonIfNo: string
    newLearnings: string
    lastMonthTarget: string
    suggestions: string
}

export default function MonthlyReportPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [answers, setAnswers] = useState<MonthlyReportAnswers>({
        tasksCompleted: "",
        reasonIfNo: "",
        newLearnings: "",
        lastMonthTarget: "",
        suggestions: ""
    })
    const router = useRouter()
    const { user, userData } = useAuth()
    const userName = userData?.name || "User"

    // Get current month and year
    const currentDate = new Date()
    const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate)

    // Add this interface at the top with other interfaces
    interface ReportTask {
        id: string;
        title: string;
        status: "pending" | "running" | "completed";
        subtasks: {
            id: string;
            title: string;
            status: "pending" | "running" | "completed";
        }[];
    }

    // Modify the state definition
    const [selectedTasks, setSelectedTasks] = useState<ReportTask[]>([])

    function getClonedSubtaskStatus(taskStatus: string, subtaskStatus: boolean): "pending" | "running" | "completed" {
        if (taskStatus === "pending") {
            if (subtaskStatus) { return "completed" }
            else { return "pending" }
        }
        else if (taskStatus === "running") {
            if (subtaskStatus) { return "completed" }
            else { return "running" }
        }
        else {
            return "completed"
        }
    }

    // making the clone of the tasklist from the firebse
    const transformTasks = (tasks: Task[]) => {
        return tasks.map(task => ({
            ...task,
            status: task.status,
            subtasks: task.subtasks.map(subtask => ({
                ...subtask,
                status: getClonedSubtaskStatus(task.status, subtask.completed)
            }))
        }))
    }

    // Update the useEffect fetch function
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
                    const transformedTasks = transformTasks(allTasks)
                    setTasks(allTasks)
                    setSelectedTasks(transformedTasks)
                }
            } catch (error) {
                console.error("Error fetching tasks:", error)
                toast.error("Failed to load tasks")
            }
        }

        fetchTasks()
    }, [user, router,transformTasks])

    console.log(tasks);


    // Modify the status handling functions
    const getStatusColor = (status: "pending" | "running" | "completed") => {
        switch (status) {
            case "completed":
                return "text-green-600";
            case "running":
                return "text-blue-600";
            default:
                return "text-gray-800";
        }
    }

    const toggleTaskStatus = (taskId: string, subtaskId: string) => {
        setSelectedTasks(prevTasks =>
            prevTasks.map(task => {
                if (task.id === taskId) {
                    return {
                        ...task,
                        subtasks: task.subtasks.map(subtask => {
                            if (subtask.id === subtaskId) {
                                // Get the next status in the cycle
                                const nextStatus = getNextStatus(subtask.status) as "pending" | "running" | "completed";
                                return { ...subtask, status: nextStatus }
                            }
                            return subtask
                        })
                    }
                }
                return task
            })
        )
    }


    const getNextStatus = (currentStatus: string) => {
        const statuses = ["pending", "running", "completed"]
        const currentIndex = statuses.indexOf(currentStatus)
        return statuses[(currentIndex + 1) % statuses.length]
    }

    // function for removing a complete rtaks
    const removeTask = (taskId: string) => {
        setSelectedTasks(prev => prev.filter(task => task.id !== taskId))
        toast.success("Task removed from report")
    }

    const removeSubtask = (taskId: string, subtaskId: string) => {
        setSelectedTasks(prevTasks =>
            prevTasks.map(task => {
                if (task.id === taskId) {
                    return {
                        ...task,
                        subtasks: task.subtasks.filter(subtask => subtask.id !== subtaskId)
                    }
                }
                return task
            })
        )
        toast.success("Subtask removed from report")
    }

    const generateReport = async () => {
        try {
            setIsGenerating(true);

            // Convert base64 logo to binary
            const logoData = COMPANY_LOGO.split(',')[1];
            const logoImage = Buffer.from(logoData, 'base64');

            const doc = new Document({
                sections: [{
                    properties: {
                        page: {
                            margin: {
                                top: 1440, // 1 inch (1440 twips)
                                bottom: 1440,
                                left: 1800, // 1.25 inch
                                right: 1800
                            }
                        }
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
                                    type: "png"
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
                        ...selectedTasks.flatMap(task => [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `${task.title}`,
                                        bold: true,
                                        size: 28,
                                        font: "Calibri",
                                        color: "2F2F2F",
                                    })
                                ],
                                spacing: { before: 360, after: 240, line: 360 },
                            }),
                            ...task.subtasks.map(subtask =>
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `• ${subtask.title}`,
                                            size: 24,
                                            font: "Calibri",
                                            color: subtask.status === "completed" ? "217346" :
                                                subtask.status === "running" ? "2B579A" : "404040",
                                        }),
                                    ],
                                    spacing: { before: 120, line: 360 },
                                    indent: { left: 720, hanging: 180 },
                                })
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
                        ...(answers.tasksCompleted.toLowerCase() === 'no' ? [
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
                        ] : []),
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
                }],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${userName} - Monthly Report - ${monthYear}.docx`);

            toast.success("Report generated successfully");
        } catch (error) {
            console.error("Error generating report:", error);
            toast.error("Failed to generate report");
        } finally {
            setIsGenerating(false);
        }
    };
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="container mx-auto max-w-4xl">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/")}
                    className="mb-6 flex items-center gap-2 hover:bg-white/80"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tasks
                </Button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Card className="w-full shadow-md border-gray-100 overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardHeader>
                                <CardTitle className="text-2xl text-gray-800 text-nowrap">Generate Monthly Report</CardTitle>
                            </CardHeader>
                            {/* <Button
                                onClick={generateReport}
                                disabled={isGenerating || selectedTasks.length === 0}
                                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <FileDown className="h-4 w-4" />
                                        Download Report
                                    </>
                                )}
                            </Button> */}
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Tasks List */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-gray-800">Tasks for {monthYear}</h3>
                                <AnimatePresence>
                                    {selectedTasks.map((task) => (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="border rounded-lg p-4 bg-white"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-gray-800">{task.title}</h4>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeTask(task.id)}
                                                    className="text-gray-500 hover:text-red-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="mt-3 pl-6 space-y-2">
                                                {task.subtasks.map((subtask) => (
                                                    <div
                                                        key={subtask.id}
                                                        className="flex items-center justify-between gap-2 p-2 hover:bg-gray-50 rounded-md"
                                                    >
                                                        <span className={getStatusColor(subtask.status)}>
                                                            {subtask.title}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => toggleTaskStatus(task.id, subtask.id)}
                                                                className={` ${subtask.status === "completed" ? "bg-green-50 text-green-600 hover:bg-green-100" : subtask.status === "running" ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}  `}
                                                            >
                                                                <IterationCcw />
                                                                {subtask.status.charAt(0).toUpperCase() + subtask.status.slice(1)}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeSubtask(task.id, subtask.id)}
                                                                className="text-gray-500 hover:text-red-600"
                                                            >
                                                                <Trash className="h-4 w-4 text-red-300" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Questions Section */}
                            <div className="space-y-4 pt-10 border-t">
                                <h3 className="font-semibold text-lg text-gray-800">Monthly Review Questions</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-1">
                                            Have you completed all the tasks you got in this month? <span className="text-red-500">*</span>
                                        </label>
                                        <Select
                                            value={answers.tasksCompleted}
                                            onValueChange={(value) => setAnswers(prev => ({ ...prev, tasksCompleted: value }))}
                                        >
                                            <SelectTrigger className="max-w-xs">
                                                <SelectValue placeholder="Select Yes/No" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Yes">Yes</SelectItem>
                                                <SelectItem value="No">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {answers.tasksCompleted.toLowerCase() === 'no' && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 block mb-1">
                                                If no, what is the reason the task is not completed?
                                            </label>
                                            <Textarea
                                                value={answers.reasonIfNo}
                                                onChange={(e) => setAnswers(prev => ({ ...prev, reasonIfNo: e.target.value }))}
                                                placeholder="Enter your reason here..."
                                                className="min-h-[100px]"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-1">
                                            What new things did you learn this month? <span className="text-red-500">*</span>
                                        </label>
                                        <Textarea
                                            value={answers.newLearnings}
                                            onChange={(e) => setAnswers(prev => ({ ...prev, newLearnings: e.target.value }))}
                                            placeholder="Share your learnings about new tools, technology, skills..."
                                            className="min-h-[100px]"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-1">
                                            {`How much % of last month's target did you achieve? `}<span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="number"
                                            value={answers.lastMonthTarget}
                                            onChange={(e) => setAnswers(prev => ({ ...prev, lastMonthTarget: e.target.value }))}
                                            placeholder="Enter percentage"
                                            className="max-w-xs"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-1">
                                            Any suggestions for new tools or technology? <span className="text-red-500">*</span>
                                        </label>
                                        <Textarea
                                            value={answers.suggestions}
                                            onChange={(e) => setAnswers(prev => ({ ...prev, suggestions: e.target.value }))}
                                            placeholder="Share your suggestions..."
                                            className="min-h-[100px]"
                                            required
                                        />
                                    </div>

                                    {/* Add Generate Report button at the bottom */}
                                    <div className="pt-6">
                                        <Button
                                            onClick={generateReport}
                                            disabled={isGenerating ||
                                                selectedTasks.length === 0 ||
                                                !answers.tasksCompleted ||
                                                !answers.newLearnings ||
                                                !answers.lastMonthTarget ||
                                                !answers.suggestions ||
                                                (answers.tasksCompleted.toLowerCase() === 'no' && !answers.reasonIfNo)
                                            }
                                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <FileDown className="h-4 w-4" />
                                                    Generate Monthly Report
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    )
}