<script>
	//@ts-nocheck
	import _ from 'lodash';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import {
		Modal,
		Badge,
		Alert,
		Button,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Search
	} from 'flowbite-svelte';
	import { roleColor } from '$lib/constants/index.js';
	import { addNewUser, editUser } from '$lib/stores/index.js';
	import { AddUser, EditUser } from '$lib/components/forms/index.js';
	import {
		ChevronLeftSolid,
		ChevronRightSolid,
		TrashBinSolid,
		EditOutline
	} from 'flowbite-svelte-icons';

	export let data;
	export let form;

	$: ({ supabase } = data);

	$: usersData = data.users;

	let searchTerm = '';
	let filteredItems = [];
	let currentPage = 1;
	let limit = 5;
	let maxPage, startIndex, endIndex, paginatedItems;

	let divClass = 'text-left text-sm w-full text-gray-500 border border-zinc-300 dark:text-gray-400';

	let userToUpdate;
	let userToDelete;
	let removeUserModal = false;

	onMount(() => {
		const usersChannel = supabase
			.channel('usersChannel')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'Users'
				},
				(payload) => {
					if (payload.eventType === 'INSERT') {
						usersData = _.cloneDeep([payload.new, ...usersData]).sort((currentElem, nextElem) =>
							currentElem.username.localeCompare(nextElem.username)
						);
					} else if (payload.eventType === 'UPDATE') {
						const updatedIndex = usersData.findIndex((user) => user.id === payload.old.id);

						if (updatedIndex !== -1) {
							usersData[updatedIndex] = payload.new;
						}

						usersData = _.cloneDeep(usersData).sort((currentElem, nextElem) =>
							currentElem.username.localeCompare(nextElem.username)
						);
					} else if (payload.eventType === 'DELETE') {
						const updatedUsersData = usersData.filter((user) => user.id !== payload.old.id);
						usersData = updatedUsersData;
					}
				}
			)
			.subscribe();

		return () => {
			usersChannel.unsubscribe();
		};
	});

	$: if (usersData) {
		filteredItems = usersData.filter((req) => {
			const usernameMatch = req?.username?.toLowerCase().includes(searchTerm.toLowerCase());
			const emailMatch = req?.email?.toLowerCase().includes(searchTerm.toLowerCase());
			const roleMatch = req?.role?.toLowerCase().includes(searchTerm.toLowerCase());

			return searchTerm !== '' ? usernameMatch || emailMatch || roleMatch : true;
		});

		startIndex = (currentPage - 1) * limit;
		endIndex = startIndex + limit;
		maxPage = Math.ceil(filteredItems?.length / limit);

		if (currentPage > maxPage) {
			currentPage = 1;

			startIndex = (currentPage - 1) * limit;
			endIndex = startIndex + limit;
		}

		paginatedItems = filteredItems?.slice(startIndex, endIndex);
	}

	function handleAddUser() {
		editUser.update(() => false);
		addNewUser.update(() => true);
	}

	function handleEditUser(email) {
		addNewUser.update(() => false);
		editUser.update(() => true);

		userToUpdate = usersData.filter((user) => user.email == email);
	}

	async function handleRemoveUser(userID) {
		removeUserModal = true;
		userToDelete = userID;
	}

	function changePage(newPage) {
		if (newPage >= 1 && newPage <= maxPage) {
			currentPage = newPage;
		}
	}

	$: {
		if (form?.success) {
			addNewUser.update(() => false);
			editUser.update(() => false);
			removeUserModal = false;
		}
	}
</script>

<svelte:head>
	<title>Manage Users</title>
</svelte:head>

<div
	class="p-8 ring-1 max-h-fit max-w-fit h-min w-max bg-white shadow-md drop-shadow-md rounded relative z-10"
>
	{#if form?.success}
		<div class="mb-4 text-center">
			<Alert color="green" class="text-center p-2">
				<span class="font-medium">{form?.successMsg}</span>
			</Alert>
		</div>
		<p class="hidden">
			{setTimeout(() => {
				form.success = false;
			}, 2500)}
		</p>
	{:else if form?.error}
		<div class="mb-4 text-center">
			<Alert color="red" class="text-center">
				<span class="font-medium">{form?.error}.</span>
			</Alert>
		</div>
	{/if}
	<div class="relative w-full flex items-center space-x-8 justify-between">
		<div>
			<Search
				size="md"
				class="w-72"
				placeholder="Search by name, email, or role"
				bind:value={searchTerm}
			/>
		</div>
		<div class="ml-4">
			<Button size="sm" shadow color="green" on:click={handleAddUser}>Add User</Button>
		</div>
	</div>
	<caption
		class="text-xl mb-3 mt-6 font-bold text-left w-max text-gray-900 dark:text-white dark:bg-gray-800"
	>
		List of Users
	</caption>
	<div class="w-full">
		<Table {divClass}>
			<TableHead class="bg-zinc-100 border border-t border-zinc-300 top-0 sticky">
				<TableHeadCell>Username</TableHeadCell>
				<TableHeadCell>Email Address</TableHeadCell>
				<TableHeadCell>User Role</TableHeadCell>
				<TableHeadCell />
				<TableHeadCell />
			</TableHead>
			<TableBody tableBodyClass="divide-y bg-white">
				{#if paginatedItems === undefined || paginatedItems?.length === 0}
					<TableBodyRow class="border border-zinc-300">
						<TableBodyCell>No data</TableBodyCell>
						<TableBodyCell>No data</TableBodyCell>
						<TableBodyCell>No data</TableBodyCell>
						<TableBodyCell />
						<TableBodyCell />
					</TableBodyRow>
				{:else}
					{#each paginatedItems as user}
						<TableBodyRow>
							<TableBodyCell>{user.username ?? 'N/A'}</TableBodyCell>
							<TableBodyCell>{user.email}</TableBodyCell>
							<TableBodyCell>
								<Badge border rounded color={roleColor[user.role]}>{user.role}</Badge>
							</TableBodyCell>
							<TableBodyCell class="cursor-pointer text-center hover:underline text-blue-700">
								<div class="flex justify-center cursor-pointer">
									<EditOutline
										class="text-purple-600 focus:outline-none hover:text-green-700"
										on:click={handleEditUser(user.email)}
									/>
								</div>
							</TableBodyCell>
							<TableBodyCell class="flex justify-center cursor-pointer ">
								<button
									class="flex justify-center cursor-pointer"
									on:click={handleRemoveUser(user.id)}
								>
									<TrashBinSolid class="text-red-600 focus:outline-none hover:text-red-700" />
								</button>
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				{/if}
			</TableBody>
		</Table>
		{#if maxPage > 1}
			<div class="flex flex-row items-center justify-start space-x-2 mt-4">
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
</div>

<AddUser />
<EditUser user={userToUpdate} />

<Modal title="Confirm Delete User?" bind:open={removeUserModal} size="xs" class="max-w-xs">
	<form class="flex flex-col" method="POST" action="?/removeUser" use:enhance>
		<input type="hidden" id="userID" name="userID" bind:value={userToDelete} />
		<Button type="submit" color="red" class="w-full mt-3" on:click={() => (removeUserModal = false)}
			>CONFIRM DELETE</Button
		>
	</form>
</Modal>
