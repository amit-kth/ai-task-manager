"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { CardHeader, CardTitle } from "@/components/ui/card"

export const AIHeader = () => {
    const router = useRouter()
    return (
        <>
            <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ duration: 0.3 }}
            >
                <Button
                    variant="ghost"
                    onClick={() => router.push("/")}
                    className="mb-6 flex items-center gap-2 hover:bg-white/80"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tasks
                </Button>
            </motion.div>

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
        </>
    )
}