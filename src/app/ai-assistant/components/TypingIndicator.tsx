"use client"

import { motion } from "framer-motion"
import { Bot } from "lucide-react"

export const TypingIndicator = () => {
    return (
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
    )
}