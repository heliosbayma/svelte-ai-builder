/**
 * Browser-based encryption utilities for API keys
 * Uses Web Crypto API with AES-GCM encryption
 */

// Generate a key from password using PBKDF2
async function deriveKey(password: string, salt: BufferSource): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		{ name: 'PBKDF2' },
		false,
		['deriveKey']
	);

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt,
			iterations: 100000,
			hash: 'SHA-256'
		},
		keyMaterial,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

// Encrypt data
export async function encryptData(data: string, password: string): Promise<string> {
	const encoder = new TextEncoder();
	const dataBytes = encoder.encode(data);

	// Generate random salt and IV
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));

	const key = await deriveKey(password, salt);

	const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dataBytes);

	// Combine salt + iv + encrypted data
	const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
	combined.set(salt, 0);
	combined.set(iv, salt.length);
	combined.set(new Uint8Array(encrypted), salt.length + iv.length);

	// Return as base64
	return btoa(String.fromCharCode(...combined));
}

// Decrypt data
export async function decryptData(encryptedData: string, password: string): Promise<string> {
	try {
		// Decode from base64
		const combined = new Uint8Array(
			atob(encryptedData)
				.split('')
				.map((c) => c.charCodeAt(0))
		);

		// Extract salt, iv, and encrypted data
		const salt = combined.slice(0, 16);
		const iv = combined.slice(16, 28);
		const encrypted = combined.slice(28);

		const key = await deriveKey(password, salt);

		const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);

		const decoder = new TextDecoder();
		return decoder.decode(decrypted);
	} catch {
		throw new Error('Failed to decrypt data - invalid password or corrupted data');
	}
}

// Simple hash function for display/comparison (one-way)
export async function hashData(data: string): Promise<string> {
	const encoder = new TextEncoder();
	const dataBytes = encoder.encode(data);
	const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Generate a secure random password
export function generateSecurePassword(length: number = 32): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}
