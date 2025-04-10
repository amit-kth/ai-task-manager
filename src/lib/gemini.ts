import { GoogleGenerativeAI } from "@google/generative-ai";
import { apiKey } from "./variables";

const genAI = new GoogleGenerativeAI(apiKey);

export const geminiModel = {
  generateContent: async (userInput: string) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

      3. Input Format Examples:
         Project A
         1. subtask a1
         2. subtask a2

         Project B
         1. subtask b1
         2. subtask b2

      OUTPUT FORMAT:
      {
        "isTask": true,
        "tasks": [
          {
            "title": "Project A",
            "status": "pending",
            "subtasks": [
              {
                "id": "unique-id-1",
                "title": "subtask a1",
                "completed": false
              }
            ]
          },
          {
            "title": "Project B",
            "status": "pending",
            "subtasks": [
              {
                "id": "unique-id-2",
                "title": "subtask b1",
                "completed": false
              }
            ]
          }
        ],
        "message": "Confirmation message"
      }

      IMPORTANT:
      - Always create separate main tasks for distinct projects
      - Never combine different projects into one task
      - Generate unique IDs for each subtask
      - Maintain the hierarchy of the original input

    For normal conversation, return only this JSON:
      {
        "isTask": false,
        "message": "Your helpful conversational response here"
      }

      USER INPUT:
      ${userInput}

      RESPONSE (VALID JSON ONLY):
      `;

      // Generate content
      const result = await model.generateContent(prompt);
      let responseText = result.response.text();

      // Clean the response text by removing markdown code block syntax
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const parsedResponse = JSON.parse(responseText);

      console.log('Cleaned Response:', parsedResponse);

      return {
        isTask: parsedResponse.isTask,
        message: parsedResponse.message,
        task: parsedResponse.isTask ? parsedResponse.tasks : [],
      };
    }
    catch (error) {
      console.error("Error generating content:", error);
      return {
        isTask: false,
        message: "I'm sorry, I encountered an error processing your request. Please try again.",
        tasks: [],
      };
    }
  }
};