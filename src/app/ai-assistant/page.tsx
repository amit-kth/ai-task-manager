"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, } from "@/components/ui/card"
import { HelpCircle } from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { geminiModel } from "@/lib/gemini"
import { toast } from "sonner"
import type { ChatMessage, Task, TaskResponse } from "@/lib/types"
import { useAuth } from "@/context/AuthContext"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/components/firebase/firebase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useSWR from "swr"
import { ChatContainer } from "./components/ChatContainer"
import { ChatInput } from "./components/ChatInput"
import { HelpContent } from "./components/HelpContent"

// Fetch tasks from Firestore
const fetchTasks = async (userId: string) => {
    if (!userId) return []

    try {
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

export default function AIAssistantPage() {
    const [input, setInput] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
    const [isTyping, setIsTyping] = useState(false)
    const [activeTab, setActiveTab] = useState("chat")
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const [mentionPopoverOpen, setMentionPopoverOpen] = useState(false)
    const [mentionFilter, setMentionFilter] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const router = useRouter()
    const { user } = useAuth()
    const [examplePrompt, setExamplePrompt] = useState<string | null>(null)
    const [internalPrompt, setInternalPrompt] = useState<string | null>(null)

    // Use SWR for data fetching with caching
    const {
        data: tasks = [],
        error,
        mutate,
    } = useSWR(user ? ["tasks", user.uid] : null, () => (user ? fetchTasks(user.uid) : []), {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60000, // 1 minute
    })

    // Auto-scroll to bottom when chat history updates
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [chatHistory])

    // Load chat history from localStorage
    useEffect(() => {
        const savedHistory = localStorage.getItem("chatHistory")
        if (savedHistory) {
            try {
                setChatHistory(JSON.parse(savedHistory))
            } catch (e) {
                console.error("Error loading chat history:", e)
            }
        }
    }, [])

    // Save chat history to localStorage
    useEffect(() => {
        if (chatHistory.length > 0) {
            localStorage.setItem("chatHistory", JSON.stringify(chatHistory))
        }
    }, [chatHistory])

    // Extract mentioned tasks
    const extractMentionedTasks = (input: string): Task[] => {
        const mentionedTasks: Task[] = []
        const mentions = input.match(/@([^@\s]+)/g) || []

        mentions.forEach((mention) => {
            const taskTitle = mention.slice(1) // Remove @ symbol
            const task = tasks.find((t: Task) => t.title.toLowerCase() === taskTitle.toLowerCase())
            if (task) {
                mentionedTasks.push(task)
            }
        })

        return mentionedTasks
    }

    // Handle form submission
    const handleSubmit = async () => {
        if (!input.trim()) return

        try {
            setIsProcessing(true)
            const mentionedTasks = extractMentionedTasks(input)

            // Create context with mentioned task details
            let aiContext = input
            if (mentionedTasks.length > 0) {
                aiContext +=
                    "\n\nReferenced Tasks:\n" +
                    mentionedTasks
                        .map((task) =>
                            JSON.stringify(
                                {
                                    id: task.id,
                                    title: task.title,
                                    status: task.status,
                                    subtasks: task.subtasks,
                                },
                                null,
                                2,
                            ),
                        )
                        .join("\n")
            }

            const userMessage: ChatMessage = {
                role: "user",
                content: input,
                parsedResponse: input,
                mentionedTasks,
                timestamp: new Date().toISOString(),
            }
            setChatHistory((prev) => [...prev, userMessage])
            setInput("")

            setIsTyping(true)

            // Send the context-enriched prompt to AI
            const result = await geminiModel.generateContent(aiContext)
            setIsTyping(false)

            try {
                // Parse AI response
                const aiResponse = result as TaskResponse
                // if (aiResponse.actions && aiResponse.actions.length > 0) {
                //     await handleAIActions(aiResponse.actions)
                // }

                const aiMessage: ChatMessage = {
                    role: "assistant",
                    content: result.message,
                    parsedResponse: aiResponse,
                    timestamp: new Date().toISOString(),
                }
                setChatHistory((prev) => [...prev, aiMessage])
            } catch (error) {
                console.error("Error processing AI response:", error)
                const aiMessage: ChatMessage = {
                    role: "assistant",
                    content: result.message,
                    parsedResponse: "Failed" as string,
                    timestamp: new Date().toISOString(),
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
        } else if (e.key === "@") {
            handleMentionKeyPressed()
        }
    }

    const handleMentionKeyPressed = () => {
        setMentionPopoverOpen(true)
        setMentionFilter("")
    }

    // Handle task editing
    const handleEditTask = (task: Task) => {
        // This is handled in the AiDetectedTasksList component
        console.log("Edit task:", task)
    }

    // Handle task deletion
    const handleDeleteTask = () => {
        // This is handled in the AiDetectedTasksList component
    }

    // Add all tasks to Firebase
    const handleAddAllTasks = async (tasksToAdd: Task[]) => {
        if (!user) {
            toast.error("Authentication required")
            return
        }

        try {
            // Get current tasks
            const tasksDoc = await getDoc(doc(db, "tasks", user.uid))
            const currentTasks = tasksDoc.exists() ? tasksDoc.data().taskList || [] : []

            // Add timestamp to each task
            const tasksWithTimestamp = tasksToAdd.map((task) => ({
                ...task,
                createdAt: new Date().toISOString(),
            }))

            // Add to tasks list
            const updatedTasks = [...currentTasks, ...tasksWithTimestamp]

            // Update Firestore
            await setDoc(doc(db, "tasks", user.uid), {
                taskList: updatedTasks,
                lastUpdated: serverTimestamp(),
            })

            // Update local cache
            mutate(updatedTasks, false)

            toast.success("All tasks added successfully!")
        } catch (error) {
            console.error("Error adding tasks:", error)
            toast.error("Failed to add tasks")
        }
    }

    // Handle task selection for mention
    const handleTaskSelect = (task: Task) => {
        setMentionPopoverOpen(false)
        const taskMention = `@${task.title}`

        // Insert the mention at cursor position
        if (textareaRef.current) {
            const cursorPos = textareaRef.current.selectionStart
            const textBefore = input.substring(0, cursorPos - 1) // Remove the @ that triggered this
            const textAfter = input.substring(cursorPos)
            setInput(`${textBefore}${taskMention} ${textAfter}`)

            // Focus back on textarea and set cursor position after the mention
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus()
                    const newCursorPos = textBefore.length + taskMention.length + 1
                    textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
                }
            }, 0)
        }
    }

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        setInput(value)

        // Check for @ symbol
        if (value.includes("@")) {
            const lastAtIndex = value.lastIndexOf("@")
            const textAfterAt = value.substring(lastAtIndex + 1).split(/\s/)[0]

            // Only open popover if @ is at the end or followed by text without spaces
            if (lastAtIndex === value.length - 1 || textAfterAt) {
                setMentionFilter(textAfterAt)
                setMentionPopoverOpen(true)
            } else {
                setMentionPopoverOpen(false)
            }
        } else {
            setMentionPopoverOpen(false)
        }
    }

    // Filter tasks for mention
    const filteredTasks = tasks.filter(
        (task: Task) => !mentionFilter || task.title.toLowerCase().includes(mentionFilter.toLowerCase()),
    )

    // Handle AI actions
    // const handleAIActions = async (actions: AIAction[]) => {
    //     if (!user || !actions || actions.length === 0) return
    //
    //     try {
    //         // Get current tasks
    //         const tasksDoc = await getDoc(doc(db, "tasks", user.uid))
    //         const currentTasks = tasksDoc.exists() ? tasksDoc.data().taskList || [] : []
    //         const updatedTasks = [...currentTasks]
    //         let actionsPerformed = false
    //
    //         for (const action of actions) {
    //             switch (action.type) {
    //                 case "ADD_SUBTASK":
    //                     if (action.taskId && action.subtask) {
    //                         const taskIndex = updatedTasks.findIndex((t) => t.id === action.taskId)
    //                         if (taskIndex !== -1) {
    //                             updatedTasks[taskIndex] = {
    //                                 ...updatedTasks[taskIndex],
    //                                 subtasks: [
    //                                     ...updatedTasks[taskIndex].subtasks,
    //                                     {
    //                                         id: Date.now().toString(),
    //                                         title: action.subtask.title,
    //                                         completed: false,
    //                                     },
    //                                 ],
    //                             }
    //                             actionsPerformed = true
    //                         }
    //                     }
    //                     break
    //
    //                 case "UPDATE_TASK":
    //                     if (action.taskId && action.updates) {
    //                         const taskIndex = updatedTasks.findIndex((t) => t.id === action.taskId)
    //                         if (taskIndex !== -1) {
    //                             updatedTasks[taskIndex] = {
    //                                 ...updatedTasks[taskIndex],
    //                                 ...action.updates,
    //                             }
    //                             actionsPerformed = true
    //                         }
    //                     }
    //                     break
    //
    //                 // Add more action handlers as needed
    //             }
    //         }
    //
    //         if (actionsPerformed) {
    //             // Update Firestore
    //             await setDoc(doc(db, "tasks", user.uid), {
    //                 taskList: updatedTasks,
    //                 lastUpdated: serverTimestamp(),
    //             })
    //
    //             // Update local cache
    //             mutate(updatedTasks, false)
    //
    //             toast.success("Tasks updated based on your request")
    //         }
    //     } catch (error) {
    //         console.error("Error handling AI actions:", error)
    //         toast.error("Failed to update tasks")
    //     }
    // }

    // Clear chat history
    const handleClearChat = () => {
        if (confirm("Are you sure you want to clear the chat history?")) {
            setChatHistory([])
            localStorage.removeItem("chatHistory")
            toast.success("Chat history cleared")
        }
    }

    // Remove the useExamplePrompt function and modify the logic
    const handleExamplePrompt = (prompt: string) => {
        setInput(prompt)
        textareaRef.current?.focus()
    }

    useEffect(() => {
        if (examplePrompt) {
            setInternalPrompt(examplePrompt)
            setExamplePrompt(null) // Reset the state
        }
    }, [examplePrompt])

    useEffect(() => {
        if (internalPrompt) {
            handleExamplePrompt(internalPrompt)
            setInternalPrompt(null)
        }
    }, [internalPrompt])

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
                    <div className="text-red-500 mb-4">
                        <HelpCircle className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">Error Loading Tasks</h3>
                    <p className="text-gray-600 mb-4">We couldn&apos;t load your tasks. Please try again later.</p>
                    <Button onClick={() => router.push("/")} className="bg-gradient-to-r from-blue-600 to-purple-600">
                        Return to Dashboard
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full fixed inset-0 overflow-hidden bg-gray-50 py-8 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="container absolute top-1/2 -translate-y-3/5 left-1/2 -translate-x-1/2 h-[80%]">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Card className="w-full shadow-lg border-gray-100 overflow-auto p-0">
                        {/* <AIHeader /> */}

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-2">
                            <TabsList className="cursor-pointer">
                                <TabsTrigger value="chat" className="cursor-pointer">Chat</TabsTrigger>
                                <TabsTrigger value="help" className="cursor-pointer">Help</TabsTrigger>
                            </TabsList>

                            <TabsContent value="chat" className="m-0 overflow-auto">
                                <div className="flex flex-col h-[600px]">
                                    <ChatContainer
                                        chatHistory={chatHistory}
                                        isTyping={isTyping}
                                        chatContainerRef={chatContainerRef as React.RefObject<HTMLDivElement>}
                                        handleEditTask={handleEditTask}
                                        handleDeleteTask={handleDeleteTask}
                                        handleAddAllTasks={handleAddAllTasks}
                                        setExamplePrompt={setExamplePrompt}
                                    />

                                    <ChatInput
                                        input={input}
                                        isProcessing={isProcessing}
                                        textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
                                        mentionPopoverOpen={mentionPopoverOpen}
                                        setMentionPopoverOpen={setMentionPopoverOpen}
                                        mentionFilter={mentionFilter}
                                        setMentionFilter={setMentionFilter}
                                        filteredTasks={filteredTasks}
                                        handleSubmit={handleSubmit}
                                        handleInputChange={handleInputChange}
                                        handleKeyDown={handleKeyDown}
                                        handleTaskSelect={handleTaskSelect}
                                        handleClearChat={handleClearChat}
                                        chatHistory={chatHistory}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="help" className="m-0 p-6 overflow-auto">
                                <HelpContent setExamplePrompt={setExamplePrompt} />
                            </TabsContent>
                        </Tabs>
                    </Card>
                </motion.div>
            </div>
        </div>
    )
}
