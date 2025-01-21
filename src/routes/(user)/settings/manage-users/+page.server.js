// @ts-nocheck
import { redirect, fail } from '@sveltejs/kit';
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
		const { data, error: getUsersError } = await supabase
			.from('Users')
			.select('*')
			.order('username', { ascending: true });

		if (getUsersError) throw getUsersError;

		const { data: { user: currentAdmin }, error: getUserError } = await supabase.auth.getUser();

		if (getUserError) throw getUserError;

		// return all users except the current admin
		const users = data.filter((user) => { return user.id != currentAdmin.id });

		return {
			users,
			session
		};
	} catch (error) {
		console.error(error)
	}
}

export const actions = {
	newUser: async ({ request }) => {
		const supabaseAdminClient = createClient(PUBLIC_SUPABASE_URL, SECRET_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});

		const adminAuthClient = supabaseAdminClient.auth.admin;

		const formData = await request.formData();
		const username = formData?.get('addName');
		const role = formData?.get('addRole');
		const email = formData?.get('addEmail');
		const password = formData?.get('addPassword');

		if (!username || !role || !email || !password) {
			return {
				error: "Missing fields. Please try again later.",
				success: false
			};
		}
		else {
			try {
				const { error: createUserError } = await adminAuthClient.createUser({
					email: email,
					password: password,
					user_metadata: { username: username, role: role },
					role: role,
					email_confirm: true
				});

				if (createUserError) throw createUserError;

				return {
					success: true,
					successMsg: username + "'s account added successfully!",
					error: false
				}
			} catch (error) {
				console.error("ERROR:", error.message)
				return fail(400, {
					error: error.message,
					success: false
				});
			}
		}
	},

	editUser: async ({ request, locals: { supabase } }) => {
		const supabaseAdminClient = createClient(PUBLIC_SUPABASE_URL, SECRET_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});

		const { data: { user } } = await supabase.auth.getUser();
		const adminAuthClient = supabaseAdminClient.auth.admin;

		const formData = await request.formData();
		const userID = formData?.get('userID');
		const newUsername = formData?.get('editUsername');
		const newRole = formData?.get('editRole');
		const newEmail = formData?.get('editEmail');

		if (userID == user.id) { // just in case
			if (newRole != user.role) {
				return {
					error: "Unable to change current user's role.",
					success: false
				};
			}
		}
		else if (!userID || !newEmail || !newRole || !newUsername) {
			return {
				error: "Missing fields. Please try again later.",
				success: false
			};
		}
		else {
			try {
				const { error: getUserByIdError } = await adminAuthClient.getUserById(userID);

				if (getUserByIdError) throw getUserByIdError;

				const { error: updateUserByIdError } = await adminAuthClient.updateUserById(userID, {
					email: newEmail,
					user_metadata: {
						username: newUsername,
						role: newRole
					},
					role: newRole
				});
				if (updateUserByIdError) throw updateUserByIdError;

				return {
					success: true,
					successMsg: "Successfully updated user",
					error: false
				}
			} catch (error) {
				console.error("ERROR:", error.message)
				return fail(400, {
					error: error.message,
					success: false
				});
			}
		}
	},

	removeUser: async ({ request, locals: { supabase } }) => {
		const supabaseAdminClient = createClient(PUBLIC_SUPABASE_URL, SECRET_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});
		const { data: { user } } = await supabase.auth.getUser();
		const adminAuthClient = supabaseAdminClient.auth.admin;

		const formData = await request.formData();
		const userID = formData?.get('userID');

		if (userID == user.id) { // just in case
			return {
				error: "Unable to delete current user.",
				success: false
			};
		}
		else {
			try {
				const { error: deleteUserError } = await adminAuthClient.deleteUser(userID);

				if (deleteUserError) throw deleteUserError;

				return {
					success: true,
					successMsg: 'User has been deleted successfully.',
					error: false
				};
			} catch (error) {
				console.error("ERROR:", error.message)
				return fail(400, {
					error: error.message,
					success: false
				});
			}
		}
	}
};
