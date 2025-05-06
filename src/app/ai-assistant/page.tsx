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
import { useAuth } from "@/context/AuthContext"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/components/firebase/firebase"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"

export default function AIAssistantPage() {
    const [input, setInput] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
    const [isTyping, setIsTyping] = useState(false)
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [mentionPopoverOpen, setMentionPopoverOpen] = useState(false)
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const router = useRouter()
    const { user } = useAuth()

    // Auto-scroll to bottom when chat history updates
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [chatHistory])

    // Add this function to extract mentioned tasks
    const extractMentionedTasks = (input: string): Task[] => {
        const mentionedTasks: Task[] = [];
        const mentions = input.match(/@([^@\s]+)/g) || [];
        
        mentions.forEach(mention => {
            const taskTitle = mention.slice(1); // Remove @ symbol
            const task = tasks.find(t => t.title === taskTitle);
            if (task) {
                mentionedTasks.push(task);
            }
        });
        
        return mentionedTasks;
    }
    
    // Modify handleSubmit to include task details
    const handleSubmit = async () => {
        if (!input.trim()) return
    
        try {
            setIsProcessing(true)
            const mentionedTasks = extractMentionedTasks(input);
            
            // Create context with mentioned task details
            let aiContext = input;
            if (mentionedTasks.length > 0) {
                aiContext += "\n\nReferenced Tasks:\n" + mentionedTasks.map(task => 
                    JSON.stringify({
                        id: task.id,
                        title: task.title,
                        status: task.status,
                        subtasks: task.subtasks
                    }, null, 2)
                ).join("\n");
            }
    
            const userMessage: ChatMessage = { 
                role: "user", 
                content: input,
                parsedResponse: input,
                mentionedTasks // Add this to track mentioned tasks
            }
            setChatHistory((prev) => [...prev, userMessage])
            setInput("")
    
            setIsTyping(true)
    
            // Send the context-enriched prompt to AI
            const result = await geminiModel.generateContent(aiContext)
            setIsTyping(false)
    
            try {
                // Parse AI response and execute actions
                const aiResponse = result as TaskResponse;
                if (aiResponse.actions) {
                    // await handleAIActions(aiResponse.actions, mentionedTasks);
                }
    
                const aiMessage: ChatMessage = {
                    role: "assistant",
                    content: result.message,
                    parsedResponse: aiResponse,
                    
                }
                setChatHistory((prev) => [...prev, aiMessage])
            } catch (error) {
                const aiMessage: ChatMessage = {
                    role: "assistant",
                    content: `${result.message} & ${error}`,
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

    //fetching tasks
    useEffect(() => {
        const fetchTasks = async () => {
            if (!user) return;
            try {
                const tasksDoc = await getDoc(doc(db, 'tasks', user.uid));
                if (tasksDoc.exists()) {
                    setTasks(tasksDoc.data().taskList || []);
                }
            } catch (error) { toast.error(`${error}`) }
        };
        fetchTasks();
    }, [user, db]);


    // Add this function to handle task selection
    const handleTaskSelect = (task: Task) => {
        setMentionPopoverOpen(false)
        const taskMention = `@${task.title}`
        setInput((prev) => {
            const beforeAt = prev.substring(0, prev.lastIndexOf('@'))
            return `${beforeAt}${taskMention} `
        })
        // Focus back on textarea
        textareaRef.current?.focus()
    }

    // Modify the textarea onChange handler
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        setInput(value)

        // Check for @ symbol
        if (value.endsWith('@')) {
            const rect = e.target.getBoundingClientRect()
            const lineHeight = parseInt(getComputedStyle(e.target).lineHeight)
            const lines = value.split('\n').length
            console.log("@ detected");


            setMentionPosition({
                top: -(rect.top + (lines * lineHeight)),
                left: rect.left
            })
            setMentionPopoverOpen(true)
        }
    }

    console.log(mentionPopoverOpen, mentionPosition);


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
                                        <div className="relative flex-1">
                                            <Textarea
                                                ref={textareaRef}
                                                placeholder="Describe your tasks or ask for help... (Type @ to mention a task)"
                                                value={input}
                                                onChange={handleInputChange}
                                                onKeyDownCapture={handleKeyDown}
                                                className="flex-1 min-h-[60px] max-h-[120px] border-gray-200 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition-all resize-none"
                                            />
                                            <Popover open={mentionPopoverOpen} onOpenChange={setMentionPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <div className="w-0 h-0" />
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-[300px] p-0"
                                                    style={{
                                                        position: 'absolute',
                                                        top: `${mentionPosition.top}px`,
                                                        left: `${mentionPosition.left}px`,
                                                    }}
                                                >
                                                    <Command>
                                                        <CommandInput placeholder="Search tasks..." />
                                                        <CommandEmpty>No tasks found.</CommandEmpty>
                                                        <CommandGroup heading="Your Tasks">
                                                            {tasks.map((task) => (
                                                                <CommandItem
                                                                    key={task.id}
                                                                    onSelect={() => handleTaskSelect(task)}
                                                                    className="flex items-center gap-2 cursor-pointer"
                                                                >
                                                                    <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-green-500' :
                                                                        task.status === 'running' ? 'bg-blue-500' :
                                                                            'bg-amber-500'
                                                                        }`} />
                                                                    <span>{task.title}</span>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
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
                                        Press Enter to send, Shift+Enter for new line, @ to mention a task
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

// Add function to handle AI actions
// const handleAIActions = async (actions: unknown, mentionedTasks: Task[]) => {
//     for (const action of actions) {
//         switch (action.type) {
//             case 'ADD_SUBTASK':
//                 // await handleAddSubtask(action.taskId, action.subtask);
//                 break;
//             case 'DELETE_TASK':
//                 // await handleDeleteTask(action.taskId);
//                 break;
//             case 'MERGE_TASKS':
//                 // await handleMergeTasks(action.taskIds, action.newTask);
//                 break;
//             case 'MOVE_SUBTASK':
//                 // await handleMoveSubtask(action.fromTaskId, action.toTaskId, action.subtaskId);
//                 break;
//             case 'UPDATE_TASK':
//                 // await handleUpdateTask(action.taskId, action.updates);
//                 break;
//         }
//     }
// }

// Implement the action handlers
// const handleMergeTasks = async (taskIds: string[], newTask: Task) => {
//     try {
//         const mergedSubtasks = taskIds
//             .map(id => tasks.find(t => t.id === id))
//             .flatMap(task => task?.subtasks || []);

//         const mergedTask = {
//             ...newTask,
//             subtasks: mergedSubtasks,
//         };

//         // Delete old tasks and add merged task
//         const updatedTasks = tasks
//             .filter(task => !taskIds.includes(task.id))
//             .concat(mergedTask);

//         if (user) {
//             await setDoc(doc(db, 'tasks', user.uid), {
//                 taskList: updatedTasks
//             });
//             setTasks(updatedTasks);
//             toast.success("Tasks merged successfully");
//         }
//     } catch (error) {
//         toast.error("Failed to merge tasks");
//     }
// }

// const handleMoveSubtask = async (fromTaskId: string, toTaskId: string, subtaskId: string) => {
//     try {
//         const updatedTasks = tasks.map(task => {
//             if (task.id === fromTaskId) {
//                 return {
//                     ...task,
//                     subtasks: task.subtasks.filter(st => st.id !== subtaskId)
//                 };
//             }
//             if (task.id === toTaskId) {
//                 const subtask = tasks
//                     .find(t => t.id === fromTaskId)
//                     ?.subtasks.find(st => st.id === subtaskId);
//                 if (subtask) {
//                     return {
//                         ...task,
//                         subtasks: [...task.subtasks, subtask]
//                     };
//                 }
//             }
//             return task;
//         });

//         if (user) {
//             await setDoc(doc(db, 'tasks', user.uid), {
//                 taskList: updatedTasks
//             });
//             setTasks(updatedTasks);
//             toast.success("Subtask moved successfully");
//         }
//     } catch (error) {
//         toast.error("Failed to move subtask");
//     }
// }

// const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
//     try {
//         const updatedTasks = tasks.map(task => 
//             task.id === taskId ? { ...task, ...updates } : task
//         );

//         if (user) {
//             await setDoc(doc(db, 'tasks', user.uid), {
//                 taskList: updatedTasks
//             });
//             setTasks(updatedTasks);
//             toast.success("Task updated successfully");
//         }
//     } catch (error) {
//         toast.error("Failed to update task");
//     }
// }
