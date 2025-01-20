export function extractNames(fullName: string) {
	const nameParts = fullName.split(' ') || [];
	const prevMIndex = nameParts.findIndex((part) => part.length === 2 && part.includes('.'));

	const firstName =
		prevMIndex !== -1
			? nameParts.slice(0, prevMIndex).join(' ')
			: nameParts.slice(0, -1).join(' ');
	const middleName = prevMIndex !== -1 ? nameParts[prevMIndex].slice(0, -1) : '';
	const lastName =
		prevMIndex !== -1
			? nameParts.slice(prevMIndex + 1).join(' ')
			: nameParts[nameParts.length - 1];

	return { firstName, middleName, lastName };
}

export function constructName(firstName, middleName, lastName) {
	if (middleName?.trim()) {
		return `${firstName} ${middleName.trim()}. ${lastName}`.toUpperCase();
	}
	return `${firstName} ${lastName}`.toUpperCase();
};