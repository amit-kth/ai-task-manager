"use client"

import { Button } from "@/components/ui/button"
import { Lightbulb } from "lucide-react"

interface HelpContentProps {
    setExamplePrompt: (prompt: string) => void
}

export const HelpContent = ({ setExamplePrompt }: HelpContentProps) => {
    const examplePrompts = [
        "Create a task for my website project with subtasks for design, development, and testing",
        "I need to organize my study schedule with separate tasks for each subject",
        "Add a subtask to @Project Research for conducting user interviews",
        "What tasks do I have that are currently in progress?",
        "Help me break down my marketing campaign into manageable tasks",
    ]

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">How to Use the AI Assistant</h3>
                <p className="text-gray-600 mb-4">
                    {`The AI Task Assistant helps you create and manage tasks through natural conversation. Here's how to get
                    the most out of it:`}
                </p>

                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h4 className="font-medium text-gray-700 mb-2">Creating Tasks</h4>
                        <p className="text-gray-600 mb-2">Simply describe your tasks in natural language:</p>
                        <div className="bg-white p-3 rounded border border-gray-200 text-sm text-gray-700">
                            {` "I need to create a marketing plan with research, content creation, and social media scheduling"`}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h4 className="font-medium text-gray-700 mb-2">Referencing Existing Tasks</h4>
                        <p className="text-gray-600 mb-2">Use @ to mention existing tasks:</p>
                        <div className="bg-white p-3 rounded border border-gray-200 text-sm text-gray-700">
                            {` "Add a subtask to @Website Project for optimizing images"`}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h4 className="font-medium text-gray-700 mb-2">Example Prompts</h4>
                        <ul className="space-y-2">
                            {examplePrompts.map((prompt, index) => (
                                <li key={index}>
                                    <Button
                                        variant="ghost"
                                        className="justify-start text-left h-auto py-2 text-sm w-full hover:bg-gray-100"
                                        onClick={() => setExamplePrompt(prompt)}
                                    >
                                        <Lightbulb className="h-3.5 w-3.5 mr-2 flex-shrink-0 text-purple-500" />
                                        <span>{prompt}</span>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Tips & Tricks</h3>
                <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                        <span className="bg-purple-100 text-purple-600 rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                            1
                        </span>
                        <span>Be specific about task details, deadlines, and priorities</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="bg-purple-100 text-purple-600 rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                            2
                        </span>
                        <span>Use @ mentions to reference and modify existing tasks</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="bg-purple-100 text-purple-600 rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                            3
                        </span>
                        <span>Ask for help organizing complex projects into manageable tasks</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="bg-purple-100 text-purple-600 rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                            4
                        </span>
                        <span>Review AI-detected tasks before adding them to your task list</span>
                    </li>
                </ul>
            </div>
        </div>
    )
}