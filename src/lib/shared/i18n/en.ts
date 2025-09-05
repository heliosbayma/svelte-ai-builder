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
		saveKeys: 'Save Keys',
		shuffle: 'Shuffle',
		ideas: 'Ideas?',
		addKeys: 'Add Keys'
	},

	// Chat interface
	chat: {
		placeholder: 'Describe the application you want to create...',
		sendOnEnter: '↵ to send',
		sendWithCmd: '⌘↵ to send',
		generating: 'Generating...',
		buildFromPlan: 'Build from plan',
		autoModel: 'Auto model',
		emptyState: 'Start a conversation to generate Svelte applications.',
		emptySubtext:
			'Try: "Create an AI creative web app: immersive hero, subject-based photo gallery (fetch images by topics like robots, circuits, neon), a video spotlight, a prompt box that adds images to the gallery, and a Join Beta form. Premium dark theme, glass morphism, smooth hover/focus states, all client‑only."',
		newChatTitle: 'New chat — what should we build?',
		newChatSubtext: 'Tip: describe the UI, behavior, and theme. You can paste rough sketches, too.',
		conversationLabel: 'Chat conversation',
		inputLabel: 'Application description input',
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
		keyboardHint: 'Press ⌘+Enter to save, Esc to close.',
		storageMode: 'Storage mode',
		storageLocal: 'Local (persists across tabs)',
		storageSession: 'Session-only',
		apiKeyRequired: 'API key is required.'
	},

	// Validation messages
	validation: {
		promptRequired: 'Please enter a prompt.',
		promptTooShort: 'Prompt too short (minimum {min} characters)',
		promptTooLong: 'Prompt too long (maximum {max} characters)',
		apiKeyInvalidOpenai: 'OpenAI API key should start with "sk-" and be at least {min} characters',
		apiKeyInvalidAnthropic:
			'Anthropic API key should start with "sk-ant-" and be at least {min} characters',
		apiKeyInvalidGemini: 'Gemini API key should be at least {min} characters',
		apiKeyMinRequired: 'Please, add at least one key.',
		invalidApiKeyFormat: 'Invalid API key format.'
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
		unknownError: 'Unknown error occurred.',
		mountError: 'Failed to mount component in preview.'
	},

	// Loading messages
	loading: {
		default: 'Synthesizing pixels from daydreams… brewing your component in zero‑G ☕️🛰️',
		generating: 'Generating Application...',
		compiling: 'Compiling code...',
		mounting: 'Mounting preview...',
		welcome: 'Welcome to the',
		welcomeLong: 'Prompt. Preview. Iterate.',
		undoing: 'Winding time… reweaving the last reality.',
		redoing: 'Leaping forward… syncing with your future self.',
		assemblingLatest: 'Assembling your latest creation…',
		warmingPreview: 'Warming up the preview engine…',
		teleporting: 'Teleporting to that moment in your build…'
	},

	// Headers and navigation
	header: {
		title: 'AI Svelte Builder',
		titleTooltip: 'Welcome to the AI Svelte Builder',
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
		showCode: 'Show code',
		whyApiKeys: 'Why are API keys needed?'
	},

	tooltips: {
		apiKeysWhy:
			'Your keys let the app call your chosen AI models to generate code. Keys are encrypted and stored locally; they never leave this browser.'
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
	},

	// Welcome UI
	welcome: {
		ideasTitle: 'A little bit of inspiration'
	},

	// Welcome inspirations: prompts only
	inspirations: [
		'AI Creative App — Immersive hero, subject-based photo gallery (robots, circuits, neon), video spotlight, prompt box to add images, Join Beta form. Premium dark theme, glass morphism, smooth hover/focus states, client-only.',
		'SaaS Dashboard — Sidebar + topbar, KPI cards, line and bar charts, filterable table, settings drawer, dark theme.',
		'Marketing Landing — Hero with gradient rays, feature grid, testimonial carousel, pricing tiers, FAQ accordion, footer with links.',
		'Docs Site — Sidebar nav, markdown content area, sticky table of contents, search bar, light/dark switch.',
		'E‑commerce Grid — Filterable product grid, facet chips, quick-view modal, cart drawer, checkout form.',
		'Auth Screens — Login, signup, forgot password, magic link, email/password fields with validation and subtle animations.',
		'Chat App — Two-pane layout, conversations list, messages view, composer with attachments, typing indicator.',
		'Portfolio — Hero with headshot, project cards grid, about timeline, contact form, sticky header.',
		'Kanban Board — Columns, draggable cards, add/edit modal, labels, search, keyboard shortcuts.',
		'Calendar — Month/week/day views, event creation modal, drag to resize, timezone-aware, mini-calendar navigator.',
		'Music Player — Playlist sidebar, now-playing bar, waveform seek, volume control, keyboard shortcuts, visualizer.',
		'Recipe App — Search with filters, recipe detail with steps and timers, favorites collection, shopping list.',
		'Job Board — Search and filters, job cards, saved jobs, application form, company profiles.',
		'Finance Tracker — Transactions table, categories, add expense modal, charts by month, recurring rules.',
		'Fitness Planner — Weekly workout planner, exercise library, timers, progress charts, dark neon theme.',
		'Note App — Folders, note editor with markdown, tags, quick search, pin notes, trash.',
		'Video Gallery — Masonry thumbnails, lightbox player, tags, lazy-load, keyboard navigation.',
		'Event Page — Hero, speakers grid, schedule timeline, venue map, ticket CTA, FAQ.',
		'Support Center — Search bar, categories grid, article view, contact form, feedback widget.',
		'Real‑time Analytics — Live metrics, sparkline charts, filter toolbar, alerts panel, compact cards.',
		'Travel Planner — Itinerary timeline, map with markers, day cards, packing list, share link.',
		'Music Festival — Lineup grid, stage schedule, favorites, map, ticket CTA, neon dark theme.',
		'Book Library — Search, shelving categories, book detail modal with rating and notes, favorites.',
		'Newsletter — Hero, recent posts list, email subscribe form, social links, footer.',
		'Admin CRUD — List with pagination, create/edit drawer, form validation, toast notifications, optimistic updates.',
		'Weather App — City search, current weather card, hourly/weekly charts, animated icons.',
		'Photo Editor — Upload, filters sliders, crop/rotate, before/after compare, export.',
		'Marketplace — Category nav, product grid, seller profile, messaging, checkout drawer.',
		'Streaming Landing — Hero, trending carousel, genre chips, watchlist, CTA.'
	]
} as const;

export type TranslationKeys = typeof en;
