import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createSupabaseServerClient } from '@supabase/auth-helpers-sveltekit';
import { redirect } from '@sveltejs/kit';

export const handle = async ({ event, resolve }) => {
	// createSupabaseLoadClient caches the client when running in a
	// browser environment and therefore does not create a new client
	// for every time the load function run
	event.locals.supabase = createSupabaseServerClient({
		supabaseUrl: PUBLIC_SUPABASE_URL,
		supabaseKey: PUBLIC_SUPABASE_ANON_KEY,
		event
	});

	event.locals.getSession = async () => {
		try {
			const { data: { session }, error: getSessionError } = await event.locals.supabase.auth.getSession();

			if (getSessionError) throw getSessionError;
			
			return session;
		} catch (error) {
			console.error(error);
		}
	};

	const userNotAllowed = ['/login', '/'];
	const session = await event.locals.getSession();
	if (userNotAllowed.includes(event.url.pathname) && session) {
		throw redirect(303, '/dashboard');
	}

	const adminPath = '/settings/manage-users';
	if ( event.url.pathname === adminPath || (event.url.pathname === adminPath && event.request.method === 'POST')) {
		if (session?.user.user_metadata.role != 'admin') {
			throw redirect(303, '/settings/account');
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range';
		}
	});
};
