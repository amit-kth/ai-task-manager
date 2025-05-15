export interface SubTask {
  id: string
  title: string
  completed: boolean
}

export interface Task {
  id: string
  title: string
  status: "pending" | "running" | "completed"
  subtasks: SubTask[]
  createdAt?: string // ISO string timestamp
}

export interface TaskResponse {
  isTask: boolean
  message: string
  task: Task[]
  actions?: string[]
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  parsedResponse: string | TaskResponse
  mentionedTasks?: Task[]
  timestamp?: string
}

export type AIAction = 
    | {
        type: "ADD_SUBTASK"
        taskId: string
        subtask: {
            title: string
        }
    }
    | {
        type: "UPDATE_TASK"
        taskId: string
        updates: Task
    }