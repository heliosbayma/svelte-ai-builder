<script lang="ts">
	import { Label } from '$lib/shared/ui/label';

	interface Props {
		mode: 'local' | 'session';
		onModeChange: (mode: 'local' | 'session') => void;
	}

	let { mode, onModeChange }: Props = $props();
</script>

<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-7">
	<Label class="text-sm">Storage mode</Label>
	<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
		<label class="flex items-center gap-2 text-xs leading-tight">
			<input
				type="radio"
				name="storage"
				value="local"
				checked={mode === 'local'}
				onchange={() => onModeChange('local')}
				class="h-3.5 w-3.5"
			/>
			<span>Local (persists across tabs)</span>
		</label>
		<label class="flex items-center gap-2 text-xs leading-tight">
			<input
				type="radio"
				name="storage"
				value="session"
				checked={mode === 'session'}
				onchange={() => onModeChange('session')}
				class="h-3.5 w-3.5"
			/>
			<span>Session-only</span>
		</label>
	</div>
</div>
