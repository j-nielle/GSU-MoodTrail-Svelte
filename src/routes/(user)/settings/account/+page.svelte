<script>
	// @ts-nocheck
	import { 
		Alert, 
		Card, 
		Button, 
		Input 
	} from 'flowbite-svelte';
	import { ShieldSolid } from 'flowbite-svelte-icons';
	import { enhance } from '$app/forms';

	export let data;
	export let form;

	$: user = data.user;
	$: role = user.user_metadata.role;
	$: username = user?.user_metadata?.username;
	$: id = user?.id;

	let changeUsername = false;
	let changePass = false;
	let changeEmail = false;
</script>

<svelte:head>
	<title>Account Settings</title>
</svelte:head>

<div class="p-8 ring-1 h-fit w-1/3 bg-white shadow-md drop-shadow-md rounded relative z-10">
	{#if form?.success}
		<div class="mb-4">
			<Alert color="green" class="text-center">
				<span class="font-medium">Updated succesfully!</span>
			</Alert>
		</div>
		<p class="hidden">{ setTimeout(() => { form.success = false; }, 2500) }</p>
	{:else if form?.error}
		<div class="mb-4">
			<Alert color="red" class="text-center">
				<span class="font-medium">{form?.error}.</span> Please try again later.
			</Alert>
		</div>
	{/if}
	<div class="flex flex-col justify-between space-y-4 rounded">
		<div class="flex flex-row justify-between space-x-4 items-center">
			<div class="flex flex-col">
				<p class="text-xs uppercase font-bold text-black">display name</p>
				<p class="text-xs text-black">{username}</p>
			</div>
			<Button color="dark" class="text-white" on:click={() => { changeUsername = true; changeEmail = false; changePass= false; }}>
				Edit
			</Button>
		</div>
		<div class="flex flex-row justify-between space-x-4 items-center">
			<div class="flex flex-col">
				<p class="text-xs uppercase font-bold text-black">email address</p>
				<p class="text-xs text-black">{user?.email}</p>
			</div>
			<Button color="dark" class="text-white" on:click={() => { changeUsername = false; changeEmail = true; changePass= false }}>
				Edit
			</Button>
		</div>
		<div class="flex flex-row justify-between space-x-4 items-center">
			<div class="flex flex-col">
				<p class="text-xs uppercase font-bold text-black">password</p>
				<p class="text-xs uppercase text-black">*********</p>
			</div>
			<Button color="dark" class="text-white" on:click={() => { changeUsername = false; changeEmail = false; changePass= true; }}>
				Edit
			</Button>
		</div>
		<div class="flex flex-row justify-between space-x-4 items-center">
			<div class="flex flex-col">
				<p class="text-xs uppercase font-bold text-black">user role</p>
				<p class="text-xs uppercase text-black">{role}</p>
			</div>
		</div>
	</div>
</div>

{#if changePass}
	<form class="flex flex-col space-y-3 p-4 bg-white rounded ring-1 justify-center h-fit" action="?/resetPassword" method="POST" use:enhance>
		<p class="text-sm uppercase text-black font-semibold">Edit Password:</p>
		<Input type="password" id="newPass" name="newPass" placeholder="••••••••••••" required autocomplete>
			<svelte:fragment slot="left">
				<ShieldSolid tabindex="-1" size="xs" class="ml-1" />
			</svelte:fragment>
		</Input>
		<div class="flex flex-row space-x-3 justify-between mt-4">
			<Button color="green" type="submit" class="w-full">RESET</Button>
			<Button class="w-full" color="red" on:click={() => {changePass = false}}>CANCEL</Button>
		</div>
	</form>
{:else if changeUsername}
	<form class="flex flex-col space-y-3 p-4 bg-white rounded ring-1 justify-center h-fit" action="?/resetUsername" method="POST" use:enhance>
		<p class="text-sm uppercase text-black font-semibold">Edit Username:</p>
		<Input type="text" id="newUsername" name="newUsername" placeholder={username || 'USER'} required autocomplete>
			<svelte:fragment slot="left">
				<ShieldSolid tabindex="-1" size="xs" class="ml-1" />
			</svelte:fragment>
		</Input>
		<div class="flex flex-row space-x-3 justify-between mt-4">
			<Button color="green" type="submit" class="w-full">RESET</Button>
			<Button class="w-full" color="red" on:click={() => {changeUsername = false}}>CANCEL</Button>
		</div>
	</form>
{:else if changeEmail}
	<form class="flex flex-col space-y-3 p-4 bg-white rounded ring-1 justify-center h-fit" action="?/resetEmail" method="POST" use:enhance>
		<p class="text-sm uppercase text-black font-semibold">Edit Email:</p>
		<input type="hidden" id="userID" name="userID" bind:value={id} />
		<Input type="email" id="newEmail" name="newEmail" placeholder={user?.email} required autocomplete>
			<svelte:fragment slot="left">
				<ShieldSolid tabindex="-1" size="xs" class="ml-1" />
			</svelte:fragment>
		</Input>
		<div class="flex flex-row space-x-3 justify-between mt-4">
			<Button color="green" type="submit" class="w-full">RESET</Button>
			<Button class="w-full" color="red" on:click={() => {changeEmail = false}}>CANCEL</Button>
		</div>
	</form>
{/if}