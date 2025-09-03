/**
 * English translations - Base language
 */
export const en = {
	// Common actions
	actions: {
		send: 'Send',
		cancel: 'Cancel',
		build: 'Build',
		save: 'Save',
		clear: 'Clear',
		copy: 'Copy',
		hide: 'Hide',
		show: 'Show',
		close: 'Close',
		undo: 'Undo',
		redo: 'Redo',
		refine: 'Refine',
		export: 'Export',
		import: 'Import',
		getKey: 'Get key →',
		jumpToLatest: 'Jump to latest',
		useCode: 'Use code',
		clearAll: 'Clear All',
		saveKeys: 'Save Keys'
	},

	// Chat interface
	chat: {
		placeholder: 'Describe the component you want to create...',
		sendOnEnter: '↵ to send',
		sendWithCmd: '⌘↵ to send',
		generating: 'Generating...',
		buildFromPlan: 'Build from plan',
		autoModel: 'Auto model',
		emptyState: 'Start a conversation to generate Svelte components',
		emptySubtext:
			'Try: "Build a SaaS dashboard with sidebar navigation, KPI cards, a searchable & paginated table, and a settings drawer"',
		conversationLabel: 'Chat conversation',
		inputLabel: 'Component description input',
		inputForm: 'Message input form',
		userMessage: 'User message',
		assistantMessage: 'Assistant message',
		messageActions: 'Message actions',
		modelOverride: 'Model override'
	},

	// API Keys & Settings
	settings: {
		title: 'API Key Settings',
		description: 'Your keys are encrypted and stored locally, never sent to any server.',
		keyboardHint: 'Press ⌘+Enter to save, Esc to close',
		storageMode: 'Storage mode',
		storageLocal: 'Local (persists across tabs)',
		storageSession: 'Session-only',
		apiKeyRequired: 'API key is required'
	},

	// Validation messages
	validation: {
		promptRequired: 'Please enter a prompt',
		promptTooShort: 'Prompt too short (minimum {min} characters)',
		promptTooLong: 'Prompt too long (maximum {max} characters)',
		apiKeyInvalidOpenai: 'OpenAI API key should start with "sk-" and be at least {min} characters',
		apiKeyInvalidAnthropic:
			'Anthropic API key should start with "sk-ant-" and be at least {min} characters',
		apiKeyInvalidGemini: 'Gemini API key should be at least {min} characters',
		apiKeyMinRequired: 'Add at least one API key',
		invalidApiKeyFormat: 'Invalid API key format'
	},

	// Error messages
	errors: {
		noApiKeys: 'Please configure your API keys in Settings before starting a conversation.',
		noApiKeysConfigured: 'No API keys configured',
		planFailedRetry: 'Plan failed with selected model. Retrying with default model…',
		planFailed: 'Plan failed. Please try again or pick another model.',
		buildFailedRetry: 'Build failed with selected model. Retrying with default model…',
		buildFailed: 'Build failed. Please try again or pick another model.',
		generationFailed: 'Generation failed. Please try again.',
		networkError: 'Network error. Please check your connection.',
		unknownError: 'Unknown error occurred',
		mountError: 'Failed to mount component in preview'
	},

	// Loading messages
	loading: {
		default: 'Synthesizing pixels from daydreams… brewing your component in zero‑G ☕️🛰️',
		generating: 'Generating component...',
		compiling: 'Compiling code...',
		mounting: 'Mounting preview...',
		welcome: 'Awaiting your first creation',
		welcomeLong: 'Awaiting your first creation… send a prompt to start.',
		undoing: 'Winding time… reweaving the last reality.',
		redoing: 'Leaping forward… syncing with your future self.',
		assemblingLatest: 'Assembling your latest creation…',
		warmingPreview: 'Warming up the preview engine…',
		teleporting: 'Teleporting to that moment in your build…'
	},

	// Headers and navigation
	header: {
		title: 'AI Svelte Builder',
		undoTooltip: 'Undo (⌘Z)',
		redoTooltip: 'Redo (⌘⇧Z)',
		historyTooltip: 'History',
		codeTooltip: 'Show Code',
		hideCodeTooltip: 'Hide Code',
		sessionTooltip: 'Session',
		current: 'Current'
	},

	// History panel
	history: {
		title: 'History',
		noVersions: 'No versions yet.',
		currentVersion: 'Current version',
		revertToVersion: 'Revert to version',
		renameVersion: 'Rename version',
		labelVersion: 'Label this version:',
		repairedSuffix: '(repaired)'
	},

	// Session menu
	session: {
		exportSession: 'Export Session',
		importSession: 'Import Session',
		apiKeys: 'API Keys',
		toggleTheme: 'Toggle Theme',
		clearApiKeys: 'Clear API Keys',
		clearSession: 'Clear Session',
		clearApiKeysConfirm: 'Clear API keys from this browser?',
		clearSessionConfirm: 'Clear session? This will remove chat, history and UI state.',
		removeAllKeysConfirm: 'Remove all API keys? This cannot be undone.',
		importSuccess: 'Imported session: {versions} versions, {messages} messages. Reloading…'
	},

	// Metrics panel
	metrics: {
		title: 'Metrics',
		runs: 'runs',
		avgMs: 'avg ms',
		tokens: 'tokens',
		provider: 'provider',
		errors: 'errors',
		when: 'when',
		purpose: 'purpose',
		model: 'model'
	},

	// Preview panel
	preview: {
		title: 'Component Preview',
		refreshing: 'Refreshing preview...',
		openInNewTab: 'Open in new tab'
	},

	// Accessibility labels
	a11y: {
		undoLastChange: 'Undo last change',
		redoLastChange: 'Redo last undone change',
		openHistory: 'Open history',
		closeHistory: 'Close history',
		closeModal: 'Close modal',
		closeSessionMenu: 'Close session menu',
		toggleSendOnEnter: 'Toggle send on Enter',
		cancelGeneration: 'Cancel generation',
		buildFromPlan: 'Build from existing plan',
		useCodeInEditor: 'Use this generated code in the editor',
		copyCode: 'Copy code',
		refineComponent: 'Refine this generated component',
		hideCode: 'Hide code',
		showCode: 'Show code'
	},

	// Model names for display
	models: {
		autoModel: 'Auto model',
		openai: {
			'gpt-4o': 'GPT-4o',
			'gpt-4o-mini': 'GPT-4o mini'
		},
		anthropic: {
			'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
			'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku'
		},
		gemini: {
			'gemini-1_5-pro-latest': 'Gemini 1.5 Pro',
			'gemini-1_5-flash-latest': 'Gemini 1.5 Flash'
		}
	},

	// Provider names for display
	providers: {
		openai: 'OpenAI',
		anthropic: 'Anthropic',
		gemini: 'Gemini'
	}
} as const;

export type TranslationKeys = typeof en;
