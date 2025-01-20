<script>
	// @ts-nocheck
	import { enhance } from '$app/forms';
	import { Button, Select, Modal, FloatingLabelInput } from 'flowbite-svelte';
	import { yearLvl, yrlvlChoices } from '$lib/constants/index.js';
	import { InputHelper } from '$lib/components/elements/index.js';

	export let open;
	export let handler;
	export let items;
	export let student;

	let rowNum, prevID, prevFName, prevMName, prevLName, prevYrLvl, prevCourse;

	$: if (student) {
		rowNum = student[0]?.id;
		const fullName = student[0]?.student_name.split(' ');

		// find the index of the middle name, the part that has a length of 2 and has a period
		const prevMIndex = fullName.findIndex((part) => part.length === 2 && part.includes('.'));

		prevID = student[0]?.student_id;
		
		// check if a middle name was found
		if (prevMIndex !== -1) {
			prevFName = fullName.slice(0, prevMIndex).join(' ');
			prevMName = fullName[prevMIndex].slice(0, -1);
			prevLName = fullName.slice(prevMIndex + 1).join(' ');
		} else { // if not
			prevFName = fullName.slice(0, -1).join(' ');
			prevMName = '';
			prevLName = fullName[fullName.length - 1];
		}
		prevYrLvl = student[0]?.year_level_id;
		prevCourse = student[0]?.course_id;
	}

</script>

<Modal title="Edit Student Data" bind:open size="xs" class="max-w-xl">
	<form class="flex flex-col" method="POST" action="?/editStudent" use:enhance>
		{#if handler?.errors?.length > 0}
			{#each handler?.errors as error}
				<InputHelper color="red" msg={error.error} />
				<p class="hidden">{ setTimeout(() => { error.error = ''; }, 2500) }</p>
			{/each}
		{/if}

		<input type="text" class="hidden" id="studentRow" name="studentRow" bind:value={rowNum} />
		<div class="mb-2">
			<FloatingLabelInput
				size="small"
				style="outlined"
				name="editID"
				type="text"
				value={prevID}
				label="Student ID"
				minlength="10"
				maxlength="10"
				required
			/>
		</div>

		<div class="my-2">
			<FloatingLabelInput
				size="small"
				style="outlined"
				name="editFName"
				type="text"
				value={prevFName}
				label="First Name"
				minlength="3"
				required
			/>
		</div>

		<div class="my-2 space-x-4 flex justify-start">
			<div class="w-fit">
				<FloatingLabelInput
					size="small"
					style="outlined"
					name="editMName"
					type="text"
					value={prevMName}
					label="Middle Initial"
					maxlength="1"
				/>
			</div>
			<div class="w-full">
				<FloatingLabelInput
					size="small"
					style="outlined"
					name="editLName"
					type="text"
					value={prevLName}
					label="Last Name"
					minlength="2"
					required
				/>
			</div>
		</div>

		<Select
			size="sm"
			{items}
			class="my-2"
			placeholder="Select Course"
			value={prevCourse}
			name="editCourse"
			required
		/>

		<div class="flex flex-row my-2 items-center space-x-2 justify-between">
			<p class="text-sm">
				Previous Year Level: <span class="font-semibold text-orange-500">{yearLvl[prevYrLvl]}</span>
			</p>
	
			<Select size="sm" items={yrlvlChoices} class="w-fit" 
				placeholder="Select New Role" 
				value={String(prevYrLvl)} name="editYrLvl" required />
		</div>

		<Button type="submit" class="w-full mt-3">Update Student</Button>
	</form>
</Modal>
