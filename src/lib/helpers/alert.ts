export const timeout = (counter: number, onComplete: () => void) => {
	if (counter > 0) {
		setTimeout(() => timeout(counter - 1, onComplete), 1000);
	} else {
		onComplete();
	}
}