import { fail,redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals: { supabase, getSession } }) {
	const session = await getSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	const { data: studentMood } = await supabase
		.from('StudentMoodEntries')
		.select()
		.order('created_at', { ascending: true });

	const { data: students } = await supabase
		.from('Student')
		.select()
		.order('name', { ascending: true });

	return {
		studentMood: studentMood || [],
		students: students || [],
		session: session
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	addMoodEntry: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();

		const studentID = formData?.get('studentID');
		const addMood = formData?.get('addMood');
		const addReason = formData?.get('addReason');
		
		/**
		 *  user:{
					id: 'd5a331c2-811e-4dbf-9557-eae2394bdc17',
					role: 'admin',
					email: 'admin@test.com',
					user_metadata: { role: 'admin', username: 'admin test' }
				}
		 */

		try {
			const { data: { user }, error } = await supabase.auth.getUser();
			const currentUserId = user?.id;

			const { error: insertMoodEntryError } = await supabase
				.from('StudentMood')
				.insert([
					{ 
						student_id: studentID, mood_id: addMood, reason_id: addReason, 
						created_by: currentUserId
					},
				])
				.select()

			if(insertMoodEntryError) {
				// console.log(insertMoodEntryError)
				throw insertMoodEntryError;
			}
			if(error) throw error;
			
			return{
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
	}
};
