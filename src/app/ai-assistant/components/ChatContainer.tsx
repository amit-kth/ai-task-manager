"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Bot, User, Clock } from "lucide-react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { ChatMessage, Task } from "@/lib/types"
import { AiDetectedTasksList } from "./ai-detected-tasklist"
import { WelcomeScreen } from "./WelcomeScreen"
import { TypingIndicator } from "./TypingIndicator"

interface ChatContainerProps {
    chatHistory: ChatMessage[]
    isTyping: boolean
    chatContainerRef: React.RefObject<HTMLDivElement>
    handleEditTask: (task: Task) => void
    handleDeleteTask: (index: number) => void
    handleAddAllTasks: (tasks: Task[]) => void
    setExamplePrompt: (prompt: string) => void
}

export const ChatContainer = ({
    chatHistory,
    isTyping,
    chatContainerRef,
    handleEditTask,
    handleDeleteTask,
    handleAddAllTasks,
    setExamplePrompt
}: ChatContainerProps) => {
    return (
        <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
            {chatHistory.length === 0 ? (
                <WelcomeScreen setExamplePrompt={setExamplePrompt} />
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
                            <div className={`flex max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
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

                                <div className="flex flex-col">
                                    <div
                                        className={`p-4 rounded-2xl ${message.role === "user"
                                                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-none"
                                                : "bg-white border border-gray-200 shadow-sm rounded-tl-none"
                                            }`}
                                        style={{ wordBreak: "break-word" }}
                                    >
                                        <div
                                            className={message.role === "user" ? "text-white" : "text-gray-800"}
                                            style={{ fontSize: "0.9375rem", lineHeight: "1.5" }}
                                        >
                                            <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                                        </div>
                                    </div>

                                    {message.timestamp && (
                                        <div
                                            className={`text-xs text-gray-400 mt-1 flex items-center ${message.role === "user" ? "justify-end" : "justify-start"
                                                }`}
                                        >
                                            <Clock className="h-3 w-3 mr-1" />
                                            {new Date(message.timestamp).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    )}

                                    {typeof message.parsedResponse === "object" && message.parsedResponse.isTask && (
                                        <div className="mt-3">
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

                    {isTyping && <TypingIndicator />}
                </AnimatePresence>
            )}
        </div>
    )
}