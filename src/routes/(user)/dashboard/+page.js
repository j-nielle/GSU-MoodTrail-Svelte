// @ts-nocheck
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ parent }) {
	const { supabase, session } = await parent();
	if (!session) {
		throw redirect(303, '/login');
	}

	const { data: studentMood } = await supabase
		.from('StudentMoodEntries')
		.select()
		.order('created_at', { ascending: true });
		
	const { data: anonMood } = await supabase
		.from('AnonMood')
		.select()
		.order('created_at', { ascending: true });

	const { data: guestMood } = await supabase
		.from('GuestMood')
		.select()
		.order('created_at', { ascending: true });
	
	const { data: requests } = await supabase
		.from('Request')
		.select()
		.order('created_at', { ascending: false });

	const { data: { user } } = await supabase.auth.getUser();

	return {
		studentMood: studentMood || [],
		anonMood: anonMood || [],
		requests: requests || [],
		guestMood: guestMood || [],
		session: session,
		user: user,
	};
}

/** @type {import('@sveltejs/adapter-vercel').Config} */
export const config = {
	runtime: 'nodejs18.x'
};