import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Format a date according to the specified format
 * @param date The date to format
 * @param format The format string (dd-MM-yy, MM/dd/yyyy, etc.)
 * @returns Formatted date string
 */
export function formatDate(date: Date, format: string): string {
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear().toString()
  const shortYear = year.slice(2)

  return format.replace("dd", day).replace("MM", month).replace("yyyy", year).replace("yy", shortYear)
}