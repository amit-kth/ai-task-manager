"use client"

import { Button } from "@/components/ui/button"
import { PlusCircle, ClipboardCopy, LogOut, Sparkles, User, Settings } from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { logOut } from "./firebase/firebase"

export default function Header() {
    const router = useRouter()
    const { userData } = useAuth()

    const handleLogout = async () => {
        try {
            await logOut()
            router.push('/login')
            toast.success("Logged out successfully", {
                description: "You have been logged out of your account"
            })
        } catch (error) {
            toast.error("Error", {
                description: `Failed to log out : ${error}`,
            })
        }
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8"
        >
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {userData?.name + `'s Task Manager`}
                </h1>
                <p className="text-sm sm:text-base text-gray-500 mt-1">
                    {userData?.email}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                    variant="outline"
                    onClick={() => router.push("/todo-list")}
                    className="flex-1 sm:flex-none items-center gap-2 shadow-sm hover:shadow transition-all text-sm"
                >
                    <ClipboardCopy className="h-4 w-4" />
                    <span className="hidden sm:inline">Create Todo List</span>
                    <span className="sm:hidden">Todo List</span>
                </Button>

                <Button
                    variant="outline"
                    onClick={() => router.push("/ai-assistant")}
                    className="flex-1 sm:flex-none items-center gap-2 shadow-sm hover:shadow transition-all text-sm"
                >
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">AI Assistant</span>
                    <span className="sm:hidden">AI</span>
                </Button>

                <Button
                    onClick={() => router.push("/add-task")}
                    className="flex-1 sm:flex-none items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all text-sm"
                >
                    <PlusCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Add New Task</span>
                    <span className="sm:hidden">New Task</span>
                </Button>


                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 rounded-full">
                            <Avatar>
                                <AvatarFallback className="bg-gray-400 text-white">
                                    {userData?.name ? getInitials(userData.name) : 'U'}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push("/profile")} disabled>
                            <User className="mr-2 h-4 w-4" />
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push("/settings")} disabled>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                            <LogOut className="mr-2 h-4 w-4 text-red-600" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </motion.div>
    )
}