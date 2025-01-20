<script>
	// @ts-nocheck
	import '../app.postcss';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import _ from 'lodash';
	import dayjs from 'dayjs';
	import {
		Alert,
		Avatar,
		Navbar,
		NavBrand,
		NavLi,
		NavUl,
		Button,
		Dropdown,
		DropdownDivider,
		DropdownHeader,
		DropdownItem,
		Indicator,
		Listgroup,
		Toast
	} from 'flowbite-svelte';
	import {
		ChevronDownOutline,
		BellRingSolid,
		CloseSolid,
		InboxSolid,
		FireOutline
	} from 'flowbite-svelte-icons';
	import { consistentLowMoods, focusTable, newRequest } from '$lib/stores/index.js';
	import { requestTypes, requestStatus, mood, reason } from '$lib/constants/index.js';
	import {
		//logoOg,
		moodTrailOG
	} from '$lib/img/index.js';

	export let data;

	const navDivClass = 'flex items-center justify-between container z-50 relative !px-0';
	const activeClass = 'text-blue-700 font-semibold';
	const chevronClass = 'w-3 h-3 ml-2 text-primary-800 dark:text-white inline focus:outline-0';
	const avatarClass = 'cursor-pointer fixed';

	const students = [];

	let consistentStreaksInfo = new Map();

	let newLowMoodData = false;
	let currStudentIDNotif = '';
	let notifText = '';

	let currentUser = {
		email: '',
		username: '',
		role: ''
	};

	let mainDivClass = '';

	$: ({ supabase, session } = data);
	$: activeUrl = $page.url.pathname;
	$: requestsData = data.requests;
	$: pendingReqs = data.pendingRequests;
	$: lowMoods = data.lowMoods;

	$: mainDivClass = activeUrl === '/dashboard' ? 'pb-2 pt-2 bg-zinc-100' : 'pb-2 pt-2';

	const handleUserInfo = async () => {
		const { data: user, error } = await supabase
			.from('Users')
			.select('*')
			.eq('email', session.user.email)
			.single();

		if (user && !error) {
			currentUser = {
				email: session.user.email,
				username: user.username,
				role: user.role
			};
		}
	};

	const calculateLowMoods = () => {
		let formattedData = new Map();
		let consecutiveDaysMap = new Map();
		consistentLowMoods.set([]);

		// keep track of the maximum number of consecutive low mood days encountered
		let maxConsecutiveDays = 0;

		formattedData = lowMoods?.reduce(
			// extract the student id, mood score, created at, and reason score from each entry
			(students, { student_id, mood_score, created_at, reason_score }) => {
				if (!created_at) {
					// if created_at is null
					return students; // skip this entry
				}

				// get the date of the entry in YYYY/MM/DD format
				const dateKey = new Date(created_at).toLocaleDateString('en-US', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit'
				});

				// get the student's data or create a new map()
				const studentData = students.get(student_id) || new Map();

				// get the reason label from the reason score using reason object
				const reason_label = Object.keys(reason).find((key) => reason[key] === reason_score);

				// add the moods and reasons to the student's data based on the corresponding date
				studentData.set(dateKey, {
					// moodScores & reasonLabels are arrays of mood and reason scores for the day
					moodScores: [...(studentData.get(dateKey)?.moodScores || []), mood_score],
					reasonLabels: [...(studentData.get(dateKey)?.reasonLabels || []), reason_label]
				});

				return students.set(student_id, studentData); // update the student's data
			},
			new Map()
		);

		for (const [studentId, studentEntry] of formattedData) {
			// variable to be used for tracking consecutive low mood days
			let consecutiveDays = 0;

			// variable to be used for checking if the current date is the next day of the previous date
			let previousDate = null;

			// variable to be used for storing the current streak data
			let currentStreakData = null;

			// for each date of mood data for a student,
			// calculate the consecutive low mood days
			for (const [dateKey, moodData] of studentEntry) {
				const currentDate = dayjs(dateKey);

				// if the current date is the next day of the previous date,
				// then increment the consecutive days
				if (previousDate === null || currentDate.diff(previousDate, 'day') === 1) {
					consecutiveDays++;
				} else {
					// else, reset the consecutive days to 1
					consecutiveDays = 1;
				}

				// if the consecutive days is >= to 4,
				// then check if the previous date is the day before the current date
				if (consecutiveDays >= 4) {
					// get the last record of the student's streaks
					// which is the last element of the array
					const lastRecord = (consecutiveDaysMap?.get(studentId) || []).slice(-1)[0];

					// if the last record's end date is the day before the current date,
					// then update the last record
					if (
						lastRecord &&
						lastRecord.endDate === currentDate.subtract(1, 'day').format('MM/DD/YYYY')
					) {
						lastRecord.endDate = currentDate.format('MM/DD/YYYY'); // update the end date
						lastRecord.moodScores.push(...moodData.moodScores); // add the mood scores
						lastRecord.reasonLabels.push(...moodData.reasonLabels); // and reason labels
					} else {
						// else, create a new record

						// update the maximum consecutive days
						maxConsecutiveDays = Math.max(maxConsecutiveDays, consecutiveDays);

						// create a new record with the start date, end date, mood scores, and reason labels
						currentStreakData = {
							startDate: currentDate.subtract(consecutiveDays - 1, 'day').format('MM/DD/YYYY'),
							endDate: currentDate.format('MM/DD/YYYY'),
							moodScores: [],
							reasonLabels: []
						};

						// loop through the consecutive days and get the mood scores and reason labels
						for (let i = 0; i < consecutiveDays; i++) {
							// get the date of the streak
							const streakDate = currentDate
								.subtract(consecutiveDays - 1 - i, 'day')
								.format('MM/DD/YYYY');

							// get the mood scores and reason labels of the streak date
							const streakMoodData = studentEntry.get(streakDate);

							// if there is mood data for the streak date,
							// then add the mood scores and reason labels to the current streak data
							if (streakMoodData) {
								currentStreakData.moodScores.push(...streakMoodData.moodScores);
								currentStreakData.reasonLabels.push(...streakMoodData.reasonLabels);
							}
						}

						// add the current streak data to the consecutive days map
						consecutiveDaysMap?.set(
							studentId,
							(consecutiveDaysMap?.get(studentId) || []).concat(currentStreakData)
						);
					}
				}
				previousDate = currentDate; // update the previous date
			}
		}

		//update the consistent low moods store when the consecutive days map is updated
		consecutiveDaysMap?.forEach((streakData, studentId) => {
			const studentStreaks = streakData?.map((streak) => ({
				startDate: streak.startDate,
				endDate: streak.endDate,
				moodScores: streak.moodScores,
				reasonLabels: streak.reasonLabels
			}));

			newLowMoodData = true;
			// `moods` is the current value of the store
			// add a new entry for a student’s streaks to the consistentLowMoods store.
			consistentLowMoods?.update((moods) => [...moods, { studentId, streaks: studentStreaks }]);
		});
	};

	const updateConsistentLowMoods = () => {
		consistentLowMoods.subscribe((updatedMoods) => {
			updatedMoods.forEach((moodEntry) => {
				const studentId = moodEntry.studentId;
				currStudentIDNotif = studentId;
				const streaksLength = moodEntry.streaks.length;

				// checks if the studentId is already in the students array
				// if not, add the studentId to the array
				if (!students.includes(studentId)) {
					students.push(studentId);
				}

				// checks if the studentId is in the consistentStreaksInfo map
				if (consistentStreaksInfo.has(studentId)) {
					// checks if the streaksLength is different from the streaksLength in the map
					if (streaksLength !== consistentStreaksInfo.get(studentId).streaksLength) {
						// basically, if the streaksLength is different, it means that the student has a new streak
						newLowMoodData = true;
						notifText = ` has a new low mood streak, `;
						consistentStreaksInfo.set(studentId, { streaksLength }); // updates the streaksLength in the map
					}
				} else {
					// if the studentId is not in the map, add the studentId and streaksLength to the map
					// basically means that a new student has been added to the consistentLowMoods store
					newLowMoodData = true;
					notifText = ` has been added to the consistent low moods table, `;
					consistentStreaksInfo.set(studentId, { streaksLength }); // adds the streaksLength to the map
				}
			});
		});
	};

	$: {
		if (session) {
			handleUserInfo();
		}
	}

	$: if (lowMoods) {
		calculateLowMoods();
	}

	$: if (consistentLowMoods) {
		updateConsistentLowMoods();
	}

	onMount(async () => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		const reqChann = supabase
			.channel('reqChann')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'Request'
				},
				(payload) => {
					if (payload.eventType === 'INSERT') {
						newRequest.update(() => true);
						requestsData = _.cloneDeep([payload.new, ...requestsData]);
						pendingReqs = requestsData.filter((req) => req.iscompleted === false);
						//console.log(requestsData.length, pendingReqs.length)
					} else if (payload.eventType === 'UPDATE') {
						const updatedIndex = requestsData.findIndex((req) => req.id === payload.old.id);

						if (updatedIndex !== -1) {
							requestsData.splice(updatedIndex, 1);
						}

						requestsData = _.cloneDeep(requestsData);
					}
				}
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'StudentMoodEntries'
				},
				(payload) => {
					if (payload.eventType === 'INSERT') {
						lowMoods = _.cloneDeep([...lowMoods, payload.new]);
						lowMoods = lowMoods.filter((student) => student.mood_score < 0);
						lowMoods.sort((currentElem, nextElem) => {
							// sort by date (asc)
							const currentDate = new Date(currentElem.created_at);
							const nextDate = new Date(nextElem.created_at);
							return currentDate - nextDate;
						});
					} else if (payload.eventType === 'UPDATE') {
						const updatedIndex = lowMoods.findIndex((student) => student.id === payload.old.id);

						if (updatedIndex !== -1) {
							lowMoods[updatedIndex] = payload.new;
						}

						lowMoods = _.cloneDeep(lowMoods);
					} else if (payload.eventType === 'DELETE') {
						const updatedlowMoods = lowMoods.filter((student) => student.id !== payload.old.id);
						lowMoods = updatedlowMoods;
					}
				}
			)
			.subscribe(); // (status) => console.log(activeUrl,status));

		return () => {
			subscription.unsubscribe();
			reqChann.unsubscribe();
		};
	});
</script>

<Navbar
	class="!px-0 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-700 divide-gray-100 dark:divide-gray-700 drop-shadow-sm w-full relative z-20 print:hidden flex justify-center py-2.5"
	{navDivClass}
>
	{#if session}
		<div class="flex flex-row space-x-3">
			<NavBrand tabindex="-1" href="/dashboard">
				<img src={moodTrailOG} alt="Placeholder Logo" class="w-32 h-fit" />
			</NavBrand>

			{#if activeUrl != '/requests'}
				<div>
					<label for="notification-menu">
						<Button class="relative focus:ring-2" size="sm" id="notification-menu">
							<InboxSolid class="outline-none text-white dark:text-white" />
							<span class="sr-only">Notifications</span>
							<Indicator
								color="blue"
								border
								size="xl"
								placement="top-right"
								class="text-xs font-bold"
							>
								{pendingReqs.length ?? 0}
							</Indicator>
						</Button>
					</label>
					<Dropdown
						class="relative z-50 shadow-md rounded shadow-slate-300"
						placement="bottom"
						triggeredBy="#notification-menu"
					>
						<div class="flex flex-col flex-wrap outline-red-500 max-w-fit rounded-lg space-y-2 p-3">
							<div class="flex justify-between items-center mb-4">
								<h5 class="text-base font-semibold leading-none text-gray-900">Pending Requests</h5>
								<a
									href="/requests"
									class="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500"
								>
									View all
								</a>
							</div>
							{#if pendingReqs}
								<Listgroup
									items={pendingReqs.slice(0, 4)}
									let:item
									class="border-0 dark:!bg-transparent"
								>
									<div class="flex items-center space-x-4 rtl:space-x-reverse">
										<div class="flex-1 min-w-0">
											<p class="text-sm font-medium text-gray-900 truncate dark:text-white">
												{item.contact_num}
											</p>
											<p class="text-xs text-gray-500 truncate dark:text-gray-400">
												{requestTypes[item.request_type]}
											</p>
										</div>
										<div class="inline-flex items-center text-sm font-bold text-gray-900">
											{dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
										</div>
									</div>
								</Listgroup>
							{:else}
								<div class="flex items-center space-x-4 rtl:space-x-reverse">
									<p>No pending requests found.</p>
								</div>
							{/if}
						</div>
					</Dropdown>
				</div>
			{/if}
		</div>

		<div>
			<NavUl>
				<NavLi href="/dashboard" active={activeUrl === '/dashboard'} {activeClass}>Dashboard</NavLi>
				<NavLi href="/requests" active={activeUrl === '/requests'} {activeClass}>Requests</NavLi>
				<NavLi id="student-menu" class="cursor-pointer">
					Students<ChevronDownOutline class={chevronClass} />
				</NavLi>
				<Dropdown triggeredBy="#student-menu" dropdownClass="w-36 items-center relative z-20">
					<DropdownItem href="/students/list">List of Students</DropdownItem>
					<DropdownItem href="/students/mood-analytics">Mood Analytics</DropdownItem>
				</Dropdown>
			</NavUl>
		</div>

		<div class="flex space-x-3 items-center">
			<label for="avatar-menu">
				<Avatar class={avatarClass} id="avatar-menu" alt="User Profile Pic" border />
			</label>
			<Dropdown placement="left" triggeredBy="#avatar-menu" containerClass="mt-4">
				<DropdownHeader>
					{#if currentUser.username}
						<span class="block text-sm uppercase">{currentUser.username}</span>
					{/if}
					<span class="block truncate text-sm font-medium">{currentUser.email}</span>
				</DropdownHeader>
				<DropdownItem href="/settings/account">Account</DropdownItem>
				{#if currentUser.role && currentUser.role.toLowerCase() == 'admin'}
					<DropdownItem href="/settings/manage-users">Manage Users</DropdownItem>
				{/if}
				<DropdownDivider />
				<form method="POST" action="/logout">
					<DropdownItem type="submit">Log out</DropdownItem>
				</form>
			</Dropdown>
		</div>
	{:else}
		<NavBrand tabindex="-1" href="/">
			<img src={moodTrailOG} alt="Placeholder Logo" class="w-32 h-fit" />
		</NavBrand>

		{#if activeUrl != '/login/'}
			<Button href="/login" color="purple" class="mr-3 font-semibold tracking-wide">LOGIN</Button>
		{:else}
			<Button disabled color="purple" class="mr-3 font-semibold tracking-wide pointer-events-none"
				>LOGIN</Button
			>
		{/if}
	{/if}
</Navbar>

<main>
	<div class={mainDivClass}>
		{#if $newRequest}
			<Alert
				class="bg-blue-100 text-blue-900 flex justify-between items-center content-center mx-4 mt-4"
			>
				<BellRingSolid tabindex="-1" class="text-blue-700" />
				<div>
					<span class="font-bold text-blue-700">(NEW)</span> Help request received! Total of
					<span class="font-bold">{requestsData.length}</span> help requests.
				</div>
				<CloseSolid
					tabindex="-1"
					class="cursor-pointer w-4 h-4 text-blue-500 hover:text-blue-700 focus:outline-none"
					on:click={() => newRequest.update(() => false)}
				/>
			</Alert>
		{:else if newLowMoodData}
			<Alert
				class="bg-red-200 flex justify-between items-center content-center text-red-900 mx-4 mt-4"
			>
				<BellRingSolid tabindex="-1" class="text-red-700" />
				{#if activeUrl == '/dashboard'}
					<div class="text-center">
						<span class="font-semibold">[{currStudentIDNotif}]</span>{notifText} click
						<button
							on:click={() => focusTable.update(() => true)}
							class="font-semibold hover:underline hover:text-blue-700">here</button
						> to view.
					</div>
				{:else}
					<div class="text-center">
						Changes has been made to the consistent low moods table, please navigate to <a
							href="/dashboard"
							class="font-semibold hover:underline hover:text-blue-700">dashboard</a
						>.
					</div>
				{/if}
				<CloseSolid
					tabindex="-1"
					class="cursor-pointer w-4 h-4 text-red-500 hover:text-red-700 focus:outline-none"
					on:click={() => (newLowMoodData = false)}
				/>
			</Alert>
		{/if}
	</div>
	<slot />
</main>
