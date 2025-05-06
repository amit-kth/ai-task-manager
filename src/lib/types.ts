export interface SubTask {
    id: string;
    title: string;
    completed: boolean;
}

export interface Task {
    id: string
    title: string;
    status: "pending" | "running" | "completed";
    subtasks: SubTask[];
}

// response that is coming from the ai model, here task can be empty array.
export interface TaskResponse {
    isTask: boolean;
    task: Task[],
    actions: unknown;
    message: string;
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    parsedResponse: TaskResponse | string;
    mentionedTasks?: Task[];
}


