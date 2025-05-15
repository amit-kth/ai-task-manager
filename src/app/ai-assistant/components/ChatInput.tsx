"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import type { ChatMessage, Task } from "@/lib/types"

interface ChatInputProps {
    input: string
    isProcessing: boolean
    textareaRef: React.RefObject<HTMLTextAreaElement>
    mentionPopoverOpen: boolean
    setMentionPopoverOpen: (open: boolean) => void
    mentionFilter: string
    setMentionFilter: (filter: string) => void
    filteredTasks: Task[]
    handleSubmit: () => void
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    handleKeyDown: (e: React.KeyboardEvent) => void
    handleTaskSelect: (task: Task) => void
    handleClearChat: () => void
    chatHistory: ChatMessage[]
}

export const ChatInput = ({
    input,
    isProcessing,
    textareaRef,
    mentionPopoverOpen,
    setMentionPopoverOpen,
    mentionFilter,
    setMentionFilter,
    filteredTasks,
    handleSubmit,
    handleInputChange,
    handleKeyDown,
    handleTaskSelect,
    handleClearChat,
    chatHistory
}: ChatInputProps) => {
    return (
        <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Textarea
                        ref={textareaRef}
                        placeholder="Describe your tasks or ask for help... (Type @ to mention a task)"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        className="flex-1 border-gray-200 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition-all resize-none"
                    />

                    <Popover open={mentionPopoverOpen} onOpenChange={setMentionPopoverOpen}>
                        <PopoverTrigger asChild>
                            <div className="w-0 h-0" />
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput
                                    placeholder="Search tasks..."
                                    value={mentionFilter}
                                    onValueChange={setMentionFilter}
                                />
                                <CommandList>
                                    <CommandEmpty>No tasks found.</CommandEmpty>
                                    <CommandGroup heading="Your Tasks">
                                        {filteredTasks.map((task: Task) => (
                                            <CommandItem
                                                key={task.id}
                                                onSelect={() => handleTaskSelect(task)}
                                                className="flex items-center gap-2 cursor-pointer"
                                            >
                                                <div
                                                    className={`w-2 h-2 rounded-full ${task.status === "completed"
                                                        ? "bg-green-500"
                                                        : task.status === "running"
                                                            ? "bg-blue-500"
                                                            : "bg-amber-500"
                                                        }`}
                                                />
                                                <span>{task.title}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
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

            <div className="mt-2 flex justify-between items-center">
                <div className="text-xs text-gray-400">
                    Press Enter to send, Shift+Enter for new line, @ to mention a task
                </div>

                {chatHistory.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearChat}
                        className="text-xs text-gray-400 hover:text-gray-600"
                    >
                        Clear Chat
                    </Button>
                )}
            </div>
        </div>
    )
}