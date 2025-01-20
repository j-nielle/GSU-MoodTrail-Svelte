<script>
	// @ts-nocheck
	import { Tooltip } from 'flowbite-svelte';

	export let title;
	export let data;
	export let purpose;

	let time = '', month = '', day = '', year = '';

	$: if(purpose === 'time'){
		let dateObj = new Date(data);

		let options = { hour: '2-digit', minute: 'numeric', second: 'numeric', hour12: true };
		let monthOptions = { month: 'long' };

		time = dateObj?.toLocaleTimeString('en-US', options);
		day = dateObj?.getDate();
		month = dateObj?.toLocaleDateString('en-US', monthOptions);
		year = dateObj?.getFullYear();

    let suffix = ['th', 'st', 'nd', 'rd'];
    let v = day % 100; // e.g 11 - 11 = 0, 12 - 11 = 1, 13 - 11 = 2
    day += (suffix[(v-20) % 10] || suffix[v] || suffix[0]); // e.g 11 + th = 11th, 12 + nd = 12nd, 13 + rd = 13rd
	}
</script>

<Tooltip triggeredBy="#tooltip-recentStudent" class="z-50 relative">Most recent student who entered their mood entry.</Tooltip>

{#if purpose == 'time'}
	<div class='bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700 shadow-md p-4 sm:p-6 rounded w-fit justify-center md:flex md:flex-initial flex flex-auto h-auto flex-row items-center space-x-4'>
		<div class="bg-blue-700 p-2 rounded"></div>
		<div class="flex flex-col">
			<p class="font-bold text-black text-xs tracking-wide">{month.toUpperCase()} {day}, {year}</p>
			<p class="text-slate-900 text-xs">{time.slice(0,-2)}<span class="font-bold">{time.slice(-2)}</span></p>
		</div>
	</div>
{:else if purpose == 'recentStudent'}
	<div id="tooltip-recentStudent" class='bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700 shadow-md p-4 sm:p-6 rounded w-fit justify-center md:flex md:flex-initial flex flex-auto h-auto flex-row items-center space-x-4'>
		<div class="bg-blue-700 p-2 rounded"></div>
		<div class="flex flex-col">
			<p class="text-black text-xs font-bold uppercase">{title}</p>
			<a class="text-xs text-black hover:text-blue-700 hover:underline cursor-pointer tracking-wide" 
				href="/students/mood-analytics?search={data}" 
				rel="noopener noreferrer">
				{data || 'Unavailable'}
			</a>
		</div>
	</div>
{:else if purpose == ''}
	<div class='bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700 shadow-md p-4 sm:p-6 rounded w-fit justify-center md:flex md:flex-initial flex flex-auto h-auto flex-row items-center space-x-4'>
		<div class="bg-blue-700 p-2 rounded"></div>
		<div class="flex flex-col">
			<p class="text-black text-xs font-bold uppercase">
				{title}
			</p>
			<p class="text-xs text-black">{data || 'Unavailable'}</p>
		</div>
	</div>
{/if}