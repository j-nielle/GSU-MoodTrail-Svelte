<script>
	// @ts-nocheck
	import { enhance } from '$app/forms';
	import { Select, Button, FloatingLabelInput } from 'flowbite-svelte';
	import { roleChoices } from '$lib/constants/index.js';
	import { addNewUser } from '$lib/stores/index.js';

	let selectedRole = '';

	const cardClass = "p-4 h-max w-max space-y-3 rounded bg-white self-start ring-1"
	const btnClass = "w-full font-bold leading-relaxed"
</script>

{#if $addNewUser}
	<div class={cardClass}>
		<h3 class="font-bold text-slate-950 text-center text-lg my-3">Add New User</h3>
		<form class="space-y-5" action="?/newUser" method="POST" use:enhance>
			<FloatingLabelInput size="small" style="outlined" id="addName" name="addName" type="text"
				label="Username" minlength="3" maxlength="23" required
			/>
			<FloatingLabelInput size="small" style="outlined" id="addEmail" name="addEmail" type="email" 
				label="Email Address"
				required
			/>
			<FloatingLabelInput size="small" style="outlined" id="addPassword" name="addPassword" type="password"
				label="Password"
				autocomplete
				required
			/>
			<Select size="sm" items={roleChoices} class="my-2" placeholder="Select User Role" value={selectedRole} name="addRole" required />
			<div class="flex space-x-3 justify-between">
				<Button size="sm" shadow type="submit" color="green" class={btnClass}>SAVE</Button>
				<Button size="sm" shadow color="red" class={btnClass} on:click={() =>  addNewUser.update(() => false)}>CANCEL</Button>
			</div>
		</form>
	</div>
{/if}