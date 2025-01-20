<script>
	// @ts-nocheck
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
	import { timeout } from '$lib/helpers/alert.ts';

	export let data;
	export let form;

	$: ({ supabase } = data);

	$: students = data.students;
	$: courses = data.courses;

	$: courseSelect = courses?.map((item) => ({
		value: item.id,
		name: item.course
	}));

	let searchTerm = '';
	let filteredItems;
	let currentPage = 1;
	let limit = 5;
	let maxPage, startIndex, endIndex, paginatedItems;

	let studentToEdit;

	let alertState = {
		type: 'INSERT',
		color: 'green',
		text: '',
		state: false
	};

	let modalState = {
		add: false,
		edit: false,
		delete: false
	};

	let alertCounter = 2;

	let studentToDelete;

	$: if (students || searchTerm) {
		handleFilterStudents();
	}

	const handleEvent = (eventType, payload) => {
		switch (eventType) {
			case 'INSERT':
				modalState.add = false;
				alertState = {
					type: 'INSERT',
					color: 'green',
					text: `Student ${payload.new.student_id} has been added`,
					state: true
				};

				break;
			case 'UPDATE':
				modalState.edit = false;
				alertState = {
					type: eventType,
					color: 'purple',
					text: `Student ${payload.old.student_id} has been updated`,
					state: true
				};
				break;
			case 'DELETE':
				modalState.delete = false;
				alertState = {
					type: eventType,
					color: 'red',
					text: `Student ${payload.old.student_id} has been deleted`,
					state: true
				};
				break;
			default:
				break;
		}
		timeout(alertCounter, () => {
			alertState.state = false;
		});
	};

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

	const changePage = (newPage) => {
		if (newPage >= 1 && newPage <= maxPage) {
			currentPage = newPage;
		}
	};

	const handleRemove = async (student_id) => {
		modalState.delete = true;
		studentToDelete = student_id;
	};

	const handleUpdate = (student_id) => {
		modalState.edit = true;
		studentToEdit = students.filter((student) => student.student_id == student_id);
	};

	onMount(() => {
		const studentsData = supabase
			.channel('studentsData')
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
			studentsData.unsubscribe();
		};
	});
</script>

<svelte:head>
	<title>Student List</title>
</svelte:head>

<div class="bg-white space-y-3 mt-5">
	{#if alertState.state}
		<Alert color={alertState.color} class="mx-8 mb-4">
			<span class="font-medium">{alertState.text}</span>
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
				modalState.add = true;
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
				{#if paginatedItems.length}
					<TableHeadCell>Edit</TableHeadCell>
					<TableHeadCell>Remove</TableHeadCell>
				{/if}
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
									href="/students/mood-analytics?search={student.student_id}"
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

<AddStudent bind:open={modalState.add} bind:handler={form} bind:items={courseSelect} />
<EditStudent
	bind:open={modalState.edit}
	bind:handler={form}
	bind:items={courseSelect}
	student={studentToEdit}
/>

<Modal title="Confirm Delete?" bind:open={modalState.delete} size="xs" class="max-w-xs">
	<form class="flex flex-col" method="POST" action="?/removeStudent" use:enhance>
		<input type="hidden" id="studentID" name="studentID" bind:value={studentToDelete} />

		<Button
			type="submit"
			color="red"
			class="w-full mt-3"
			on:click={() => (modalState.delete = false)}>CONFIRM DELETE</Button
		>
	</form>
</Modal>
