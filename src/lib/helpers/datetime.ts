export function displayTime(datetime: string){
	const formattedDate = new Date(datetime);
	return formattedDate.toISOString().split('T')[0] + ' ' + formattedDate.toTimeString().split(' ')[0];
}