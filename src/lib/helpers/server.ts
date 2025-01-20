export function createError (input, message, reqBody = {}) {
	return {
		errorInput: input,
		error: message,
		body: reqBody,
	}
};

export function validateStudentID (editID) {
	const idErrors = [];
	if (/[^0-9]/.test(editID)) {
		idErrors.push(createError('NonNumericID', 'Valid ID number (e.g 2020303123), please exit and try again.'));
	} else if (editID?.slice(0, 3) !== '202') {
		idErrors.push(createError('InvalidIDNum', 'Valid ID number (e.g 2020303123), please exit and try again.'));
	}
	return idErrors;
};