<script>
	// @ts-nocheck
	import { enhance } from '$app/forms';
	import { Button, Select, Modal, FloatingLabelInput } from 'flowbite-svelte';
	import { yearLvl, yrlvlChoices } from '$lib/constants/index.js';
	import { InputHelper } from '$lib/components/elements/index.js';
	import { onMount, tick } from 'svelte';
	import { extractNames } from '$lib/helpers/name';

	export let open;
	export let handler;
	export let items;
	export let student;

	let rowNum;

	let prevID, prevFName, prevMName, prevLName, prevYrLvl, prevCourse;

	// TODO: improve err handling

	$: if (!open && handler) {
		student = undefined;
		handler.errors = [];
	}

	$: if (handler && handler.errors.length > 0) {
		handleResetForm();
	}

	$: {
		if (student) {
			setStudent();
		}
	}

	const setStudent = () => {
		const { firstName, middleName, lastName } = extractNames(student.student_name || '');

		prevID = student.student_id;
		prevFName = firstName;
		prevMName = middleName;
		prevLName = lastName;
		prevYrLvl = student.year_level_id;
		prevCourse = student.course_id;
	};

	const handleResetForm = () => {
		const body = handler.errors[0].body;
		student.student_id = body.student_id;
		student.student_name = body.student_name;
		student.year_level_id = body.year_level_id;
		student.course_id = body.course_id;
	};
</script>

<Modal title="Edit Student Data" bind:open size="xs" class="max-w-xl">
	<form class="flex flex-col" method="POST" action="?/editStudent" use:enhance>
		{#if handler?.errors?.length > 0}
			{#each handler?.errors as error}
				<InputHelper color="red" msg={error.error} />
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
		<!-- prevFName supposed to update if there's an update in student but no change  -->
		<div class="my-2">
			<FloatingLabelInput
				size="small"
				style="outlined"
				name="editFName"
				type="text"
				value={prevFName || name.first}
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
					value={prevMName || name.middle}
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
					value={prevLName || name.last}
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

			<Select
				size="sm"
				items={yrlvlChoices}
				class="w-fit"
				placeholder="Select New Role"
				value={String(prevYrLvl)}
				name="editYrLvl"
				required
			/>
		</div>

		<Button type="submit" class="w-full mt-3">Update Student</Button>
	</form>
</Modal>
