import { fail, redirect } from '@sveltejs/kit';

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
		.order('student_name', { ascending: true });

	const { data: courses } = await supabase
		.from('Course')
		.select()
		.order('id', { ascending: true });

	const { data: colleges } = await supabase
		.from('College')
		.select()
		.order('id', { ascending: true });

	const { data: year_levels } = await supabase
		.from('YearLevel')
		.select()
		.order('id', { ascending: true });

	return {
		studentMood,
		students,
		courses,
		colleges,
		year_levels,
		session
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	addMoodEntry: async ({ request, locals: { supabase, getSession } }) => {
		const formData = await request.formData();

		const student_id = formData?.get('studentID');
		const mood_id = formData?.get('addMood');
		const reason_id = formData?.get('addReason');

		try {
			const { user } = await getSession();
			const created_by = user?.user_metadata.role; 

			const { error: insertError } = await supabase
				.from('StudentMood')
				.insert([
					{
						student_id,
						mood_id,
						reason_id,
						created_by
					},
				])
				.select()

			if (insertError) {
				throw insertError;
			}
			return {
				success: true,
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
};
