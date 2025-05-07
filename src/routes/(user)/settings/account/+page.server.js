// @ts-nocheck
import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SECRET_SERVICE_ROLE_KEY } from '$env/static/private';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals: { supabase, getSession } }) {
	const session = await getSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	try {
		const { data: { user }, error } = await supabase.auth.getUser();
		console.log(user)
		if(error) throw error;
		return {
			user: user || []
		};
	} catch (error) {
		console.error(error)
	}
}

/** @type {import('./$types').Actions} */
export const actions = {
	resetUsername: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();

		const username = formData.get('newUsername');

		try {
			const { error } = await supabase.auth.updateUser({
				data: { username: username }
			})
			if (error) throw error;
			return {
				success: true,
				error: false
			};
		} catch (error) {
			console.error("ERROR:",error.message)
			return fail(400, {
				error: error.message,
				success: false
			});
		}
	},

	// using admin client here kay using supabase.auth.updateUser()
	// is not as straightforward as it seems
	// email column won't actually be updated, instead ang new email na gusto sa user kay
	// mabutang sa 'new_email' column so idk why they made it that way
	// as of oct 2 2023, i made a forum about this sa ilang official discord server
	// but so far, no one has replied yet
	// so i'm just gonna have to use this
	// eitherway, it's only for the reset email stuff so it's not that big of a deal
	resetEmail: async ({ request }) => {
		const formData = await request.formData();

		const newEmail = formData?.get('newEmail');
		const id = formData?.get('userID');

		const supabaseAdminClient = createClient(PUBLIC_SUPABASE_URL, SECRET_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});

		const adminAuthClient = supabaseAdminClient.auth.admin;

		try {
			const { error: getUserError } = await adminAuthClient.getUserById(id);
		
			if (getUserError) throw getUserError;
		
			const { error: updateUserError } = await adminAuthClient.updateUserById(id, {
				email: newEmail
			});
		
			if (updateUserError) throw updateUserError;
		
			return {
				success: true,
				error: false
			}
		} catch (error) {
			console.error("ERROR:",error.message)
			return fail(400, {
				error: error.message,
				success: false
			});
		}
	},

	resetPassword: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();

		const password = formData.get('newPass');

		const { data, error } = await supabase.auth.updateUser({password: password})
		
		if (error) {
			console.error("ERROR:",error.message)
			return fail(400, {
				error: error.message,
				success: false
			});
		}else{
			return {
				success: true,
				error: false
			};
		}
	},
};
