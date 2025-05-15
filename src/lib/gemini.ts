import { GoogleGenerativeAI } from "@google/generative-ai"
import { apiKey } from "./variables"

const genAI = new GoogleGenerativeAI(apiKey)

export const geminiModel = {
  generateContent: async (userInput: string) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

      const prompt = `
      INSTRUCTIONS:
      You are an AI task analyzer for a task management application. Your role is to accurately identify and structure task-related input into JSON format.

      TASK DETECTION RULES:
      1. Multiple Main Tasks:
         - Each distinct project or category should be a separate main task
         - Look for clear separators between main tasks (new lines, numbers, project names)
         - Each main task should have its own subtasks

      2. Task Hierarchy:
         - Main tasks are independent projects or categories
         - Each main task must maintain its own set of subtasks
         - Never merge different main tasks into one

      3. Task Context Understanding:
         - Understand when the user is referring to existing tasks (mentioned with @ symbol)
         - Recognize when the user wants to modify existing tasks vs. create new ones
         - Identify task relationships and dependencies

      4. Natural Language Processing:
         - Extract tasks from conversational language
         - Identify deadlines, priorities, and status information
         - Convert vague descriptions into actionable tasks

      OUTPUT FORMAT:
      {
        "isTask": true,
        "tasks": [
          {
            "id": "unique-id-1",
            "title": "Task Title",
            "status": "pending",
            "subtasks": [
              {
                "id": "subtask-id-1",
                "title": "Subtask Description",
                "completed": false
              }
            ]
          }
        ],
        "message": "Confirmation message",
        "actions": [
          {
            "type": "ADD_SUBTASK",
            "taskId": "existing-task-id",
            "subtask": {
              "title": "New Subtask",
              "completed": false
            }
          }
        ]
      }

      IMPORTANT:
      - Always create separate main tasks for distinct projects
      - Never combine different projects into one task
      - Generate unique IDs for each subtask
      - Maintain the hierarchy of the original input
      - Always format the task and subtasks in professional English, with correct grammar and spelling
      - When tasks are mentioned with @ symbol, reference them correctly in your response
      - Provide clear, actionable tasks even from vague descriptions
      - Break down complex tasks into manageable subtasks
      - Suggest appropriate task status based on context (pending, running, completed)

      For normal conversation, return only this JSON:
      {
        "isTask": false,
        "message": "Your helpful conversational response here"
      }

      USER INPUT:
      ${userInput}

      RESPONSE (VALID JSON ONLY):
      `

      // Generate content
      const result = await model.generateContent(prompt)
      let responseText = result.response.text()

      // Clean the response text by removing markdown code block syntax
      responseText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()

      try {
        const parsedResponse = JSON.parse(responseText)

        console.log("Cleaned Response:", parsedResponse)

        return {
          isTask: parsedResponse.isTask,
          message: parsedResponse.message,
          task: parsedResponse.isTask ? parsedResponse.tasks : [],
          actions: parsedResponse.actions || [],
        }
      } catch (error) {
        console.error("Error parsing JSON response:", error)
        return {
          isTask: false,
          message: "I encountered an error processing your request. Please try rephrasing your input.",
          task: [],
        }
      }
    } catch (error) {
      console.error("Error generating content:", error)
      return {
        isTask: false,
        message: "I'm sorry, I encountered an error processing your request. Please try again.",
        task: [],
      }
    }
  },
}
