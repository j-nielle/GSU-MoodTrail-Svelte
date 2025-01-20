// @ts-nocheck
import { fail, redirect } from '@sveltejs/kit';
import { createError } from '$lib/helpers/server';
import { constructName } from '$lib/helpers/name';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals: { supabase, getSession } }) {
	const session = await getSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	const { data: students } = await supabase
		.from('Student')
		.select()
		.order('student_name', { ascending: true });

	const { data: courses } = await supabase
		.from('Course')
		.select()
		.order('course', { ascending: true });

	return {
		students: students || [],
		session: session,
		courses: courses || []
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	addStudent: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();

		const newID = formData.get('addID');
		const newFName = formData.get('addFName');
		const newMName = formData.get('addMName');
		const newLName = formData.get('addLName');
		const newCourse = formData.get('addCourse');
		const newYearLevel = formData.get('addYrLvl');

		let newName = '';

		let errors = [];

		if (newMName === null || newMName === undefined || newMName === '') {
			newName = `${newFName} ${newLName}`.trim().toUpperCase();
		}
		else if (newMName.startsWith('.')) {
			errors.push({
				errorInput: 'InvalidMiddleInitial',
				error: 'Invalid middle initial, please exit and try again.'
			});
		}
		else {
			newName = `${newFName} ${newMName}. ${newLName}`.trim().toUpperCase();
		}

		if ((/[^0-9]/.test(newID))) {
			errors.push({
				errorInput: 'NonNumericID',
				error: 'Valid ID number (e.g 2020303123), please exit and try again.'
			});
		}
		else if (newID?.slice(0, 3) != '202') {
			errors.push({
				errorInput: 'InvalidIDNum',
				error: 'Valid ID number (e.g 2020303123), please exit and try again.'
			});
		}
		else if (newName?.length < 5 || /\d/.test(newName)) {
			errors.push({
				errorInput: 'InvalidName',
				error: 'Invalid name, please exit and try again.'
			});
		}
		else {
			try {
				const { data: { user }, error } = await supabase.auth.getUser();
				const currentUserId = user?.id;

				const { data: existingStudent, error: searchStudentError } = await supabase
					.from('Student')
					.select('*')
					.eq('student_id', newID)
					.eq('student_name', newName)
					.eq('year_level_id', newYearLevel)
					.eq('course_id', newCourse);

				if (searchStudentError) throw searchStudentError;
				if (error) throw error;
				if (existingStudent.length > 0) {
					errors.push({
						errorInput: 'existingStudent',
						error: 'Student already exists, please exit and try again.'
					});
				}
				else {
					const { error: insertStudentError } = await supabase
						.from('Student')
						.insert([
							{
								student_id: newID,
								student_name: newName,
								year_level_id: newYearLevel,
								course_id: newCourse,
								edited_by: currentUserId
							}
						])
						.select();
					if (insertStudentError) {
						if (insertStudentError.message == 'duplicate key value violates unique constraint "student_id_key"') {
							errors.push({
								errorInput: 'duplicateID',
								error: 'Student ID already exists, please exit and try again.'
							});
						}
						else if (insertStudentError.message == 'duplicate key value violates unique constraint "Student_name_key"'
							|| insertStudentError.message == 'duplicate key value violates unique constraint "name_unique"') {
							errors.push({
								errorInput: 'duplicateName',
								error: 'Student name already exists, please exit and try again.'
							});
						}
						else throw insertStudentError;
					}
				}
			} catch (error) {
				console.error("ERROR:", error.message)
				errors.push({
					errorInput: 'error',
					error: error.message
				});
			}
		}

		if (errors?.length > 0) {
			return {
				errors: errors
			};
		} else {
			return {
				errors: [],
				success: true
			};
		}
	},

	editStudent: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const studentRow = formData.get('studentRow');
		const editID = formData.get('editID');
		const editFName = formData.get('editFName');
		let editMName = formData.get('editMName');
		const editLName = formData.get('editLName');
		const editCourse = formData.get('editCourse');
		const editYearLevel = formData.get('editYrLvl');

		let errors = [];

		let editName = '';

		editName = constructName(editFName, editMName, editLName);

		const reqBody = {
			student_id: editID,
			student_name: editName,
			year_level_id: editYearLevel,
			course_id: editCourse,
		};

		if (/[0-9]/.test(editMName)) {
			errors.push(createError('NumericMiddleInitial', 'Invalid middle initial, please try again.', reqBody));
			editMName = '';
		} else if (editMName?.startsWith('.')) {
			errors.push(createError('InvalidMiddleInitial', 'Invalid middle initial, please try again.', reqBody));
			editMName = '';
		}

		if (/[^0-9]/.test(editID) || editID?.slice(0, 3) != '202') {
			errors.push(createError('InvalidIDNum', 'Valid ID number (e.g 2020303123), please exit and try again.', reqBody));
		}
		else if (editName?.length < 5 || /\d/.test(editName)) {
			errors.push(createError('InvalidName', 'Entered invalid name, please exit and try again.', reqBody));
		}
		else {
			try {
				const { data: { user }, error } = await supabase.auth.getUser();
				const currentUserId = user?.id;

				const { data: prevStudentData, error: searchStudentError } = await supabase
					.from('Student')
					.select('*')
					.eq('student_id', editID)
					.eq('student_name', editName)
					.eq('year_level_id', editYearLevel)
					.eq('course_id', editCourse);

				if (searchStudentError) throw searchStudentError;
				if (error) throw error;
				if (prevStudentData?.length > 0) {
					errors.push(createError('prevStudentData', 'No changes made. Please exit and try again.', reqBody));
				}
				else {
					const { error: updateStudentError } = await supabase
						.from('Student')
						.update({
							student_id: editID,
							student_name: editName,
							year_level_id: editYearLevel,
							course_id: editCourse,
							edited_by: currentUserId
						})
						.eq('student_id', studentRow)
						.select();
					if (updateStudentError) throw updateStudentError;
				}
			} catch (error) {
				console.error("ERROR:", error.message);
				errors.push(createError('error', error.message, reqBody));
			}
		}

		if (errors?.length > 0) {
			return {
				errors: errors,
				success: false
			};
		} else {
			return {
				errors: [],
				success: true
			};
		}
	},

	removeStudent: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const studentID = formData?.get('studentID');

		try {
			const { error: deleteStudentError } = await supabase.from('Student').delete().eq('student_id', studentID);

			if (deleteStudentError) {
				return fail(400, {
					error: deleteStudentError.message,
					success: false
				});
			};

			return {
				success: true,
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
};
