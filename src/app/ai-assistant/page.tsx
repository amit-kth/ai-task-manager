"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Sparkles, Send, Bot, User, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Textarea } from "@/components/ui/textarea"
import { geminiModel } from "@/lib/gemini"
import { toast } from "sonner"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { ChatMessage, Task, TaskResponse } from "@/lib/types"
import { AiDetectedTasksList } from "./components/ai-detected-tasklist"

export default function AIAssistantPage() {
    const [input, setInput] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
    const [isTyping, setIsTyping] = useState(false)
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Auto-scroll to bottom when chat history updates
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [chatHistory])

    const handleSubmit = async () => {
        if (!input.trim()) return

        try {
            setIsProcessing(true)
            const userMessage: ChatMessage = { role: "user", content: input, parsedResponse: input }
            setChatHistory((prev) => [...prev, userMessage])
            setInput("")

            // Simulate typing indicator
            setIsTyping(true)

            // Complete response coming from the ai model
            const result = await geminiModel.generateContent(input)

            // Remove typing indicator
            setIsTyping(false)

            try {
                const aiMessage: ChatMessage = {
                    role: "assistant",
                    content: result.message,
                    parsedResponse: result as TaskResponse,
                }
                setChatHistory((prev) => [...prev, aiMessage])
            } catch {
                // Fallback for non-JSON responses
                const aiMessage: ChatMessage = {
                    role: "assistant",
                    content: result.message,
                    parsedResponse: "Failed" as string,
                }
                setChatHistory((prev) => [...prev, aiMessage])
            }
        } catch (error) {
            console.error("Error:", error)
            toast.error("Error", {
                description: "Failed to get AI response",
            })
            setIsTyping(false)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    const handleAddToFirebase = async (task: Task) => {
        try {
            console.log(task);

            // await addTaskToFirebase(task);
            toast.success("Task added successfully!")
        } catch (error) {
            toast.error("Failed to add task" + `${error}`)
        }
    }

    const handleEditTask = (task: Task) => {
        // TODO: Implement edit task functionality
        console.log("Edit task:", task)
    }

    const handleDeleteTask = () => {
        // Implementation preserved
    }

    const handleAddAllTasks = async (tasks: Task[]) => {
        try {
            for (const task of tasks) {
                await handleAddToFirebase(task)
            }
            toast.success("All tasks added successfully!")
        } catch (error) {
            toast.error("Failed to add tasks" + " " + `${error}`)
        }
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
                    <Card className="w-full shadow-lg border-gray-100 overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                        <CardHeader className="pb-3 border-b border-gray-100">
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                </div>
                                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    AI Task Assistant
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="flex flex-col h-[600px]">
                                <div
                                    ref={chatContainerRef}
                                    className="flex-1 p-6 space-y-6 overflow-y-auto"
                                    style={{ scrollbarWidth: "thin", scrollbarColor: "#d1d5db transparent" }}
                                >
                                    {chatHistory.length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="h-full flex flex-col items-center justify-center text-center p-6"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600/10 to-purple-600/10 flex items-center justify-center mb-4">
                                                <Bot className="h-8 w-8 text-purple-500" />
                                            </div>
                                            <h3 className="text-xl font-medium text-gray-700 mb-2">AI Task Assistant</h3>
                                            <p className="text-gray-500 max-w-md">
                                                Describe your tasks or ask for help with organizing your work. I can help create task lists and
                                                provide productivity tips.
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <AnimatePresence>
                                            {chatHistory.map((message, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-6`}
                                                >
                                                    <div className={`flex w-full ${message.role === "user" ? "flex-row-reverse" : ""}`}>

                                                        <div
                                                            className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${message.role === "user" ? "bg-blue-100 ml-3" : "bg-purple-100 mr-3"
                                                                }`}
                                                        >
                                                            {message.role === "user" ? (
                                                                <User className="h-4 w-4 text-blue-600" />
                                                            ) : (
                                                                <Bot className="h-4 w-4 text-purple-600" />
                                                            )}
                                                        </div>

                                                        <div className={` flex flex-col w-full ${message.role === "user" ? "items-end" : "items-start"} `}>
                                                            <div
                                                                className={`p-4 rounded-2xl w-fit ${message.role === "user"
                                                                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-none items-start"
                                                                    : "bg-white border border-gray-200 shadow-sm rounded-tl-none items-start"
                                                                    }`}
                                                                style={{
                                                                    wordBreak: "break-word",
                                                                }}
                                                            >
                                                                <div
                                                                    className={message.role === "user" ? "text-white" : "text-gray-800"}
                                                                    style={{
                                                                        fontSize: "0.9375rem",
                                                                        lineHeight: "1.5",
                                                                    }}
                                                                >
                                                                    <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                                                                </div>
                                                            </div>
                                                            {typeof message.parsedResponse === "object" && message.parsedResponse.isTask && (
                                                                <div className="w-full">
                                                                    <AiDetectedTasksList
                                                                        tasks={message.parsedResponse.task}
                                                                        onEditTask={handleEditTask}
                                                                        onDeleteTask={handleDeleteTask}
                                                                        onAddAllTasks={handleAddAllTasks}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}

                                            {/* Typing indicator */}
                                            {isTyping && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    className="flex justify-start mb-6"
                                                >
                                                    <div className="flex">
                                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                                                            <Bot className="h-4 w-4 text-purple-600" />
                                                        </div>
                                                        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm rounded-tl-none">
                                                            <div className="flex space-x-2">
                                                                <motion.div
                                                                    animate={{ y: [0, -5, 0] }}
                                                                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8, delay: 0 }}
                                                                    className="h-2 w-2 bg-purple-400 rounded-full"
                                                                />
                                                                <motion.div
                                                                    animate={{ y: [0, -5, 0] }}
                                                                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8, delay: 0.2 }}
                                                                    className="h-2 w-2 bg-purple-500 rounded-full"
                                                                />
                                                                <motion.div
                                                                    animate={{ y: [0, -5, 0] }}
                                                                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8, delay: 0.4 }}
                                                                    className="h-2 w-2 bg-purple-600 rounded-full"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    )}
                                </div>

                                <div className="p-4 border-t border-gray-100 bg-white">
                                    <div className="flex gap-3">
                                        <Textarea
                                            placeholder="Describe your tasks or ask for help..."
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className="flex-1 min-h-[60px] max-h-[120px] border-gray-200 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition-all resize-none"
                                        />
                                        <motion.div whileTap={{ scale: 0.95 }}>
                                            <Button
                                                onClick={handleSubmit}
                                                disabled={isProcessing || !input.trim()}
                                                className="self-end h-[60px] px-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
                                            >
                                                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                            </Button>
                                        </motion.div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 text-center">
                                        Press Enter to send, Shift+Enter for new line
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
