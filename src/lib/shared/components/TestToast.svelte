<script>
	import { success, error, warning, info } from '$lib/core/stores/toast';

	function testAll() {
		success('Successfully completed the task!');
		warning('This is a warning message', { title: 'Warning' });
		info('Here is some helpful information', {
			title: 'Info',
			action: { label: 'Learn More', handler: () => {} }
		});
		error('Something went wrong', {
			title: 'Error',
			duration: 0,
			action: { label: 'Retry', handler: () => {} }
		});
	}
</script>

<button onclick={testAll}>Test All Toast Types</button>
