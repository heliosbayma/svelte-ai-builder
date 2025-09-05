<script lang="ts">
	import { Label } from '$lib/shared/ui/label';

	interface Props {
		mode: 'local' | 'session';
		onModeChange: (mode: 'local' | 'session') => void;
	}

	let { mode, onModeChange }: Props = $props();
</script>

<div class="flex items-center justify-between">
	<Label class="text-sm">Storage mode</Label>
	<div class="flex items-center gap-2">
		<label class="flex items-center gap-1 text-xs">
			<input
				type="radio"
				name="storage"
				value="local"
				checked={mode === 'local'}
				onchange={() => onModeChange('local')}
			/>
			Local (persists across tabs)
		</label>
		<label class="flex items-center gap-1 text-xs">
			<input
				type="radio"
				name="storage"
				value="session"
				checked={mode === 'session'}
				onchange={() => onModeChange('session')}
			/>
			Session-only
		</label>
	</div>
</div>
