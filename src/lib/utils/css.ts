import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines clsx and tailwind-merge for better className handling
 * Allows conditional classes and resolves Tailwind conflicts
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
