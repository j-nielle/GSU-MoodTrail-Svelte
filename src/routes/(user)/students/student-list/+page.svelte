<script lang="ts">
	import _ from 'lodash';
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import {
		Alert,
		Button,
		P,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Search,
		Modal
	} from 'flowbite-svelte';
	import { yearLvl } from '$lib/constants/index.js';
	import { AddStudent, EditStudent } from '$lib/components/forms/index.js';
	import {
		ChevronLeftSolid,
		ChevronRightSolid,
		EditOutline,
		TrashBinSolid
	} from 'flowbite-svelte-icons';
	import { invalidate, invalidateAll } from '$app/navigation';

	export let data;
	export let form;

	$: ({ supabase } = data);

	let students = data.students;
	let courses = data.courses;

	let eventType = '';

	let successAlerts = {
		add: false,
		edit: false,
		delete: false
	};

	let searchTerm = '';
	let filteredItems;
	let currentPage = 1;
	let limit = 5;
	let maxPage, startIndex, endIndex, paginatedItems;

	let selectCourse = courses?.map((item) => ({
		value: item.course_id,
		name: item.course
	}));

	let rowToUpdate;

	let addStudentModal = false;
	let editStudentModal = false;
	let removeStudentModal = false;

	let addAlert = false,
		updateAlert = false,
		deleteAlert = false;

	let studentToDelete;

	$: {
		console.log(data);
	}

	onMount(() => {
		const studentsDataChannel = supabase
			.channel('studentsDataChannel')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'Student'
				},
				(payload) => {
					handleEvent(payload.eventType, payload);
				}
			)
			.subscribe();

		return () => {
			studentsDataChannel.unsubscribe();
		};
	});

	const handleEvent = (eventType: string, payload) => {
		switch (eventType) {
			case 'INSERT':
				addAlert = true;

				setTimeout(() => {
					addAlert = false;
				}, 1500);
				students = _.cloneDeep([payload.new, ...students]).sort((currentElem, nextElem) =>
					currentElem.student_name.localeCompare(nextElem.student_name)
				);
				break;
			case 'UPDATE':
				updateAlert = true;

				setTimeout(() => {
					updateAlert = false;
				}, 1500);
				const updatedIndex = students.findIndex((student) => student.id === payload.old.id);

				if (updatedIndex !== -1) {
					students[updatedIndex] = payload.new;
				}

				students = _.cloneDeep(students).sort((currentElem, nextElem) =>
					currentElem.student_name.localeCompare(nextElem.student_name)
				);
				break;
			case 'DELETE':
				console.log('DELETE', payload, students);

				deleteAlert = true;

				setTimeout(() => {
					deleteAlert = false;
				}, 1500);

				/**
				 * {
    "schema": "public",
    "table": "Student",
    "commit_timestamp": "2025-01-20T11:05:25.052Z",
    "eventType": "DELETE",
    "new": {},
    "old": {
        "student_id": 2020301353
    },
    "errors": null
}
				*/
				eventType = 'asfaf'
				students = students.filter(({ id }) => id !== payload.old.student_id);
				break;
			default:
				break;
		}
	};

	$: {
		console.log(eventType)
	}

	const handleFilterStudents = () => {
		filteredItems = students?.filter((req) => {
			const idMatch = req.student_id.toString().includes(searchTerm);
			const nameMatch = req.student_name.toLowerCase().includes(searchTerm.toLowerCase());
			const courseMatch = req.course_id.toLowerCase().includes(searchTerm.toLowerCase());
			const yearLevelMatch = yearLvl[req.year_level_id]
				.toLowerCase()
				.includes(searchTerm.toLowerCase());

			return searchTerm !== '' ? idMatch || nameMatch || courseMatch || yearLevelMatch : true;
		});

		startIndex = (currentPage - 1) * limit; // Calculate the starting index for the current page.
		endIndex = startIndex + limit; // Calculate the ending index for the current page.
		maxPage = Math.ceil(filteredItems?.length / limit); // Calculate the maximum number of pages.

		// If the current page number exceeds the maximum number of pages
		if (currentPage > maxPage) {
			currentPage = 1; // set the current page to be the last page.

			// recalculate the starting and ending indices for the last page
			startIndex = (currentPage - 1) * limit;
			endIndex = startIndex + limit;
		}

		// Get only those items from 'filteredItems' that belong to the current page.
		paginatedItems = filteredItems?.slice(startIndex, endIndex);
	};

	$: {
		console.log(filteredItems);
	}

	$: if (students) {
		console.log('students');
		handleFilterStudents();
	}

	$: {
		if (deleteAlert) removeStudentModal = false;
		else if (addAlert) addStudentModal = false;
		else if (updateAlert) editStudentModal = false;
	}

	function changePage(newPage) {
		if (newPage >= 1 && newPage <= maxPage) {
			currentPage = newPage;
		}
	}

	async function handleRemove(student_id) {
		removeStudentModal = true;
		studentToDelete = student_id;
	}

	function handleUpdate(student_id) {
		editStudentModal = true;
		rowToUpdate = students.filter((student) => student.student_id == student_id);
	}
</script>

<svelte:head>
	<title>Student List</title>
</svelte:head>

<div class="bg-white space-y-3 mt-5">
	{#if deleteAlert}
		<Alert color="red" class="mx-8 mb-4">
			<span class="font-medium">Student has been removed!</span>
		</Alert>
	{:else if addAlert}
		<Alert color="green" class="mx-8 mb-4">
			<span class="font-medium">New Student added!</span>
		</Alert>
	{:else if updateAlert}
		<Alert color="purple" class="mx-8 mb-4">
			<span class="font-medium">Student data updated!</span>
		</Alert>
	{/if}
	<div class="flex justify-between">
		<div class="space-x-3 flex flex-row">
			<div class="flex gap-2 ml-8">
				<Search
					size="md"
					class="w-96 h-11 bg-white"
					placeholder="Search by ID, Name, Year Level, Course"
					bind:value={searchTerm}
				/>
			</div>
		</div>
		<Button
			class="h-11 mr-7"
			size="sm"
			color="green"
			on:click={() => {
				addStudentModal = true;
			}}
		>
			Add New Student
		</Button>
	</div>

	<div class="ml-4-6 ml-4 mb-7 mr-11">
		<div class="flex justify-between ml-4">
			<P
				class="text-lg mt-3 font-bold text-left text-gray-900 bg-white dark:text-white dark:bg-gray-800 mb-6"
			>
				List of Students
				<p class="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
					Click the [<span class="font-bold">ID Number</span>] to view more about their student and
					mood information.
				</p>
			</P>
			{#if maxPage > 1}
				<div class="flex flex-row items-center justify-center space-x-2">
					<div class="flex text-sm text-center text-gray-700 dark:text-gray-400">
						<span class="font-semibold text-gray-900 dark:text-white"
							>{currentPage} <span class="font-normal">of</span> {maxPage}</span
						>
					</div>
					<div class="flex space-x-2">
						<ChevronLeftSolid
							class="cursor-pointer focus:outline-0"
							on:click={() => changePage(currentPage - 1)}
						/>
						<ChevronRightSolid
							class="cursor-pointer focus:outline-0"
							on:click={() => changePage(currentPage + 1)}
						/>
					</div>
				</div>
			{/if}
		</div>

		<Table divClass="w-full text-left text-sm text-gray-500 dark:text-gray-400 ml-4">
			<TableHead class="border border-zinc-300 text-center">
				<TableHeadCell>ID Number</TableHeadCell>
				<TableHeadCell>Full Name</TableHeadCell>
				<TableHeadCell>Year Level</TableHeadCell>
				<TableHeadCell>Course</TableHeadCell>
				<TableHeadCell>Edit</TableHeadCell>
				<TableHeadCell>Remove</TableHeadCell>
			</TableHead>
			<TableBody tableBodyClass="divide-y border border-zinc-300 max-h-40 overflow-y-auto">
				{#if paginatedItems === undefined || paginatedItems?.length === 0}
					<TableBodyRow class="text-center">
						<TableBodyCell>No data</TableBodyCell>
						<TableBodyCell>No data</TableBodyCell>
						<TableBodyCell>No data</TableBodyCell>
						<TableBodyCell>No data</TableBodyCell>
					</TableBodyRow>
				{:else}
					{#each paginatedItems as student}
						<TableBodyRow class="text-center">
							<TableBodyCell>
								<a
									class="hover:underline"
									href="/students/student-mood-information?search={student.student_id}"
									rel="noopener noreferrer"
								>
									{student.student_id}
								</a>
							</TableBodyCell>
							<TableBodyCell>{student.student_name}</TableBodyCell>
							<TableBodyCell>{yearLvl[student.year_level_id]}</TableBodyCell>
							<TableBodyCell>{student.course_id}</TableBodyCell>
							<TableBodyCell>
								<div class="flex justify-center cursor-pointer">
									<EditOutline
										class="text-purple-600 focus:outline-none hover:text-green-700"
										on:click={() => handleUpdate(student.student_id)}
									/>
								</div>
							</TableBodyCell>
							<TableBodyCell>
								<div class="flex justify-center cursor-pointer">
									<TrashBinSolid
										class="text-red-600 focus:outline-none hover:text-red-700"
										on:click={() => handleRemove(student.student_id)}
									/>
								</div>
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				{/if}
			</TableBody>
		</Table>
	</div>
</div>

<AddStudent bind:open={addStudentModal} bind:handler={form} bind:items={selectCourse} />
<EditStudent
	bind:open={editStudentModal}
	bind:handler={form}
	bind:items={selectCourse}
	student={rowToUpdate}
/>

<Modal title="Confirm Delete?" bind:open={removeStudentModal} size="xs" class="max-w-xs">
	<form class="flex flex-col" method="POST" action="?/removeStudent" use:enhance>
		<input type="hidden" id="studentID" name="studentID" bind:value={studentToDelete} />

		<Button
			type="submit"
			color="red"
			class="w-full mt-3"
			on:click={() => (removeStudentModal = false)}>CONFIRM DELETE</Button
		>
	</form>
</Modal>
