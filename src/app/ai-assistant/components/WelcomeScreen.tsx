"use client"

import { motion } from "framer-motion"
import { Bot, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WelcomeScreenProps {
    setExamplePrompt: (prompt: string) => void
}

export const WelcomeScreen = ({ setExamplePrompt }: WelcomeScreenProps) => {
    const examplePrompts = [
        "Create a task for my website project with subtasks for design, development, and testing",
        "I need to organize my study schedule with separate tasks for each subject",
        "Add a subtask to @Project Research for conducting user interviews",
        "What tasks do I have that are currently in progress?",
        "Help me break down my marketing campaign into manageable tasks",
    ]

    return (
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
            <p className="text-gray-500 max-w-md mb-6">
                Describe your tasks or ask for help with organizing your work. I can help create task lists and provide
                productivity tips.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {examplePrompts.slice(0, 4).map((prompt, index) => (
                    <Button
                        key={index}
                        variant="outline"
                        className="justify-start text-left h-auto py-2 text-sm"
                        onClick={() => setExamplePrompt(prompt)}
                    >
                        <Lightbulb className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                        <span className="truncate">{prompt}</span>
                    </Button>
                ))}
            </div>
        </motion.div>
    )
}