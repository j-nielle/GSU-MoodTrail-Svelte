<script>
 // @ts-nocheck
	import { page } from '$app/stores';
	import { 
		Sidebar, 
		SidebarGroup, 
		SidebarItem, 
		SidebarWrapper } from 'flowbite-svelte';
	import {
		DatabaseSolid,
		UserEditOutline,
		EnvelopeSolid
	} from 'flowbite-svelte-icons';

	export let data;

	$: ({ session } = data);

	let activeClass = 'flex items-center p-2 text-base text-white bg-blue-600 rounded-lg hover:bg-blue-700';

	$: activeUrl = $page.url.pathname;
</script>

<div class="p-4 flex space-x-3 overflow-x-hidden z-10">
	<Sidebar class="w-fit">
		<SidebarWrapper class="bg-white drop-shadow-lg ring-1 h-fit w-fit flex p-3 rounded">
			<SidebarGroup>
				<SidebarItem class="text-sm rounded" label="Account" href="/settings/account" {activeClass}
					active={activeUrl === '/settings/account'}>
					<svelte:fragment slot="icon">
						<UserEditOutline class="focus:outline-0" />
					</svelte:fragment>
				</SidebarItem>
				{#if session?.user.user_metadata.role === 'admin'}
					<SidebarItem class="text-sm rounded" label="Users" href="/settings/manage-users" {activeClass}
						active={activeUrl === '/settings/manage-users'}>
						<svelte:fragment slot="icon">
							<DatabaseSolid class="focus:outline-0" />
						</svelte:fragment>
					</SidebarItem>
				{/if}
			</SidebarGroup>
		</SidebarWrapper>
	</Sidebar>
	<slot />
</div>
