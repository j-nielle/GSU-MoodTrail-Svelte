<script>
	// @ts-nocheck
	import { enhance } from '$app/forms';
	import _ from 'lodash';
	import dayjs from 'dayjs';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	// import relativeTime from 'dayjs/plugin/relativeTime';
	// dayjs.extend(relativeTime);
	import { onMount } from 'svelte';
	import { DownloadSolid, RocketOutline } from 'flowbite-svelte-icons';
	import {
		P,
		Tooltip,
		Card,
		Button,
		ButtonGroup,
		Select,
		Avatar,
		Modal,
		Alert,
		Table,
		Badge,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { LineChart, SimpleBarChart, PieChart } from '$lib/components/charts/index.js';
	import {
		yearLvl,
		mood,
		reason,
		moodChoices,
		reasonChoices,
		getWeekNumberString,
		roleColor
	} from '$lib/constants/index.js';
	import { exportStudentData } from '$lib/stores/index.js';
	import FileSaver from 'file-saver';
	import * as XLSX from 'xlsx';

	export let data;
	export let form;

	$: studentMoodData = data.studentMood;
	$: students = data.students;
	$: colleges = data.colleges;
	$: courses = data.courses;
	$: year_levels = data.year_levels;

	$: ({ supabase } = data);

	let course = [],
		college = [],
		yearLevel = [],
		student = [];
	let searchTerm = '';
	let selectedCollege = '';
	let selectedCourse = '';
	let selectedYearLevel = '';
	let selectedStudent = '';

	let result = {};
	let urlResult = {};
	let hasEntry;

	let mostFrequentMood, leastFrequentMood;

	let selectedLineChart = 'today';
	let today = dayjs().format('YYYY-MM-DD');

	let timestamps, todaysMoodScores;
	let overall, overallAverages;
	let weekly, weeklyAverages;
	let monthly, monthlyAverages;
	let yearly, yearlyAverages;

	let xDataMBC, yDataMBC;
	let xDataSBC, yDataSBC;
	let selectedReasonMarkType = 'average',
		sbcMarkType = '',
		sbcBtnColors = {};
	let pieChartData,
		lcBtnColors = {};

	let newMoodEntry = false;

	const divClass =
		'bg-white space-y-4 dark:bg-gray-800 dark:text-gray-400 rounded-lg border border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700 shadow-md p-4 sm:p-6 text-slate-950 flex flex-col';

	let currentStudentID;

	let exportModalState = false;

	let addedMoodEntryAlert = false;

	let loggedBy = '';

	onMount(() => {
		const studentChartChannel = supabase
			.channel('studentChartChannel')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'StudentMoodEntries'
				},
				(payload) => {
					if (payload.eventType === 'INSERT') {
						addedMoodEntryAlert = true;

						setTimeout(() => {
							addedMoodEntryAlert = false;
						}, 1000);

						studentMoodData = _.cloneDeep([...studentMoodData, payload.new]);
						studentMoodData.sort((currentElem, nextElem) => {
							// sort by date (asc)
							const currentDate = new Date(currentElem.created_at);
							const nextDate = new Date(nextElem.created_at);
							return currentDate - nextDate;
						});
					} else if (payload.eventType === 'UPDATE') {
						const updatedIndex = studentMoodData.findIndex(
							(student) => student.id === payload.old.id
						);

						if (updatedIndex !== -1) {
							studentMoodData[updatedIndex] = payload.new;
						}

						studentMoodData = _.cloneDeep(studentMoodData);
					} else if (payload.eventType === 'DELETE') {
						const updatedStudentMoodData = studentMoodData.filter(
							(student) => student.id !== payload.old.id
						);
						studentMoodData = updatedStudentMoodData;
					}
				}
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'Student'
				},
				(payload) => {
					if (payload.eventType === 'INSERT') {
						students = _.cloneDeep([payload.new, ...students]).sort((currentElem, nextElem) =>
							currentElem.student_name.localeCompare(nextElem.student_name)
						);
					} else if (payload.eventType === 'UPDATE') {
						const updatedIndex = students.findIndex((student) => student.id === payload.old.id);

						if (updatedIndex !== -1) {
							students[updatedIndex] = payload.new;
						}

						students = _.cloneDeep(students).sort((currentElem, nextElem) =>
							currentElem.student_name.localeCompare(nextElem.student_name)
						);
					} else if (payload.eventType === 'DELETE') {
						const updatedStudentsData = students.filter((student) => student.id !== payload.old.id);
						students = updatedStudentsData;
					}
				}
			)
			.subscribe();

		return () => {
			studentChartChannel.unsubscribe();
		};
	});

	$: {
		searchTerm = $page?.url?.searchParams?.get('search');

		if (selectedStudent) {
			searchTerm = selectedStudent;
		}

		hasEntry = studentMoodData?.find((student) => student.student_id == searchTerm);

		if (hasEntry) {
			urlResult = {};
			result = studentMoodData?.filter((student) => student?.student_id == searchTerm);
			currentStudentID = result[0]?.student_id;
		} else if (!hasEntry) {
			result = {};
			urlResult = students?.filter((student) => student?.student_id == searchTerm);
			//console.log(urlResult)
			currentStudentID = urlResult[0]?.student_id;
		}
	}

	$: if (students?.length > 0) {
		college = [...colleges].map(({ id, college }) => ({
			value: id,
			name: college
		}));

		course = [...courses]
			.filter((course) => course.college_id === selectedCollege)
			.map((course) => ({
				value: course.id,
				name: course.course
			}));

		yearLevel = [...year_levels].map(({ id, year_level }) => ({
			value: id,
			name: year_level
		}));

		student = [...students]
			.filter((student) => student.course_id === selectedCourse && yearLvl[student.year_level_id])
			.map(({ student_id, student_name }) => ({
				value: student_id,
				name: student_name
			}));

		// course = _.chain(studentMoodData)
		// 	.filter({ college: selectedCollege })
		// 	.map('course')
		// 	.uniq()
		// 	.sort()
		// 	.map((course) => ({ value: course, name: course }))
		// 	.value();

		// yearLevel = _.chain(studentMoodData)
		// 	.filter({ course: selectedCourse })
		// 	.map('year_level')
		// 	.uniq()
		// 	.sort()
		// 	.map((yearLevel) => ({ value: yearLevel, name: yearLevel.replace(' Level', '') }))
		// 	.value();

		// student = _.chain(studentMoodData)
		// 	.filter({ college: selectedCollege, course: selectedCourse, year_level: selectedYearLevel })
		// 	.map('student_id')
		// 	.uniq()
		// 	.map((studentId) => ({
		// 		value: studentId,
		// 		name: studentMoodData.find((student) => student.student_id === studentId).student_name
		// 	}))
		// 	.sort()
		// 	.value();
	}

	$: if (result?.length > 0) {
		//loggedBy = result?.slice(-1)[0]?.created_by?.role || '';

		const moodCount = {};
		const reasonCount = {};

		// moodCount logic
		result.forEach((item) => {
			const moodScore = item.mood_score;
			let moodLabel = null;

			// iterate over each key in the mood object
			for (const key in mood) {
				// if the value of the current key is equal to the moodScore
				if (mood[key] == moodScore) {
					moodLabel = key; // set the moodLabel to the current key
					break; // break out of the loop
				}
			}

			// and if the moodLabel is not null
			if (moodLabel) {
				// add the moodLabel to the moodCount object
				moodCount[moodLabel] = (moodCount[moodLabel] || 0) + 1;
			}
		});

		// sort moodCount in descending order
		const sortedMoodsArr = Object.keys(moodCount).sort(
			(currElem, nxtElem) => moodCount[nxtElem] - moodCount[currElem]
		);

		// FOR STUDENT CARD - get the m_counts of each mood which is the value of each key in the moodCount object
		const m_counts = Object.values(moodCount);

		if (m_counts === 1) {
			mostFrequentMood = 'Not enough data';
			leastFrequentMood = 'Not enough data';
		}
		// Check if all moods are equally frequent
		else if (m_counts.every((count) => count === m_counts[0])) {
			mostFrequentMood = 'Equal mood frequency';
			leastFrequentMood = 'Equal mood frequency';
		} else {
			// Get the mood(s) with the maximum count
			const maxCount = Math.max(...m_counts);
			const mostFrequentMoods = sortedMoodsArr.filter((mood) => moodCount[mood] === maxCount);

			// If there's a tie for the most frequent mood, set mostFrequentMood to 'A tie'
			mostFrequentMood = mostFrequentMoods.length > 1 ? 'A tie.' : mostFrequentMoods[0];

			// Get the mood(s) with the minimum count
			const minCount = Math.min(...m_counts);
			const leastFrequentMoods = sortedMoodsArr.filter((mood) => moodCount[mood] === minCount);

			// If there's a tie for the least frequent mood, set leastFrequentMood to 'A tie'
			leastFrequentMood = leastFrequentMoods.length > 1 ? 'A tie.' : leastFrequentMoods[0];
		}

		// FOR PIE CHART - Breakdown of Moods
		const sortedMoodObj = Object.fromEntries(
			Object.entries(moodCount).sort(([, currElem], [, nextElem]) => currElem - nextElem)
		);

		xDataMBC = _.keys(sortedMoodObj); // mood
		yDataMBC = _.values(sortedMoodObj); // frequency

		pieChartData = xDataMBC.map((label, index) => {
			return {
				value: yDataMBC[index],
				name: label
			};
		});

		// FOR SIMPLE BAR CHART - Associated Reason Frequency
		result.forEach((item) => {
			const reasonScore = item.reason_score;
			let reasonLabel = null;

			// iterate over each key in the reason object
			for (const key in reason) {
				// if the value of the current key is equal to the reasonScore
				if (reason[key] == reasonScore) {
					reasonLabel = key; // set the reasonLabel to the current key
					break; // break out of the loop
				}
			}

			// and if the reasonLabel is not null
			if (reasonLabel) {
				// add the reasonLabel to the reasonCount object
				reasonCount[reasonLabel] = (reasonCount[reasonLabel] || 0) + 1;
			}
		});

		//
		const sortedReasonObj = Object.fromEntries(
			Object.entries(reasonCount).sort(([, currElem], [, nextElem]) => currElem - nextElem)
		);

		xDataSBC = _.keys(sortedReasonObj); // reason
		yDataSBC = _.values(sortedReasonObj); // frequency

		lcBtnColors = {
			today: selectedLineChart === 'today' ? 'blue' : 'light',
			overall: selectedLineChart === 'overall' ? 'blue' : 'light',
			weekly: selectedLineChart === 'weekly' ? 'blue' : 'light',
			monthly: selectedLineChart === 'monthly' ? 'blue' : 'light',
			yearly: selectedLineChart === 'yearly' ? 'blue' : 'light'
		};

		// FOR LINE CHARTS
		if (selectedLineChart === 'today') {
			// filter the result object to get only the entries for today
			// it basically returns entries that are created today
			const todaysEntries = result.filter(
				(entry) => dayjs(entry.created_at).format('YYYY-MM-DD') === today
			);

			// Get the timestamps and mood scores for today's entries
			timestamps = todaysEntries.map((entry) => dayjs(entry.created_at).format('HH:mm:ss')) || [];
			todaysMoodScores = todaysEntries.map((entry) => entry.mood_score) || [];

			// example:
			// timestamps (x): [ '17:08:51', '17:09:12', '17:09:57', '17:10:10' ]
			// todaysMoodScores (y): [ '-3', '-2', '0', '-1' ]
		} else if (selectedLineChart === 'overall') {
			// group the result object by day
			/**
			 * example:
			 * {
			 		'2023-10-03': [ {...}, {...} ],
			 		'2023-10-09': [ {...}, {...}, {...}, {...}, {...} ],
					'2023-10-12': [ {...} ],
					'2023-10-13': [ {...} ],
					'2023-10-21': [ {...}, {...}, {...}, {...} ],
					...
			 * }
			*/
			const groupedByDay = _.groupBy(result, (entry) =>
				dayjs(entry.created_at).format('YYYY-MM-DD')
			);

			// sort the days in ascending order
			overall = _.sortBy(_.keys(groupedByDay)) || [];

			// calculate the average mood score for each day
			overallAverages =
				Object.values(groupedByDay).map((entries) => {
					const totalMoodScore = entries.reduce(
						(sum, entry) => sum + parseInt(entry.mood_score),
						0
					);
					const averageMoodScore = totalMoodScore / entries.length;
					return averageMoodScore;
				}) || [];

			// example:
			// overall (x): [ '2023-10-03', '2023-10-09', '2023-10-12', '2023-10-13' ]
			// overallAverages (y): [ -2, 1, -3, -4 ]
		} else if (selectedLineChart === 'weekly') {
			// group the result object by week using the getWeekNumberString() function
			/**
			 * example:
			 * {
			 		'Week 10': [ {...}, {...} ],
			 		'Week 11': [ {...}, {...}, {...} ],
					'Week 12': [ {...} ],
					...
			 * }
			*/
			const groupedByWeek = _.groupBy(result, (entry) =>
				getWeekNumberString(dayjs(entry.created_at))
			);

			// sort the weeks in ascending order
			weekly =
				_.sortBy(_.keys(groupedByWeek), (week) => {
					const weekNumber = parseInt(week.replace('Week ', ''));
					return weekNumber;
				}) || [];

			// calculate the average mood score for each week
			weeklyAverages =
				Object.values(groupedByWeek).map((entries) => {
					const totalMoodScore = entries.reduce(
						(sum, entry) => sum + parseInt(entry.mood_score),
						0
					);
					const averageMoodScore = totalMoodScore / entries.length;
					return averageMoodScore;
				}) || [];

			// example:
			// weekly (x): [ 'Week 10', 'Week 11', 'Week 12' ]
			// weeklyAverages (y): [ -2, -0.125, -1.5 ]
		} else if (selectedLineChart === 'monthly') {
			// group the result object by month
			/**
			 * example:
			 * {
			 		'2023-10': [ {...}, {...} ],
			 		'2023-11': [ {...}, {...}, {...} ],
					'2023-12': [ {...} ],
					...
			 * }
			*/
			const groupedByMonth = _.groupBy(result, (entry) =>
				dayjs(entry.created_at).format('YYYY-MM')
			);

			// sort the months in ascending order
			monthly = _.sortBy(_.keys(groupedByMonth)) || [];

			// calculate the average mood score for each month
			monthlyAverages =
				Object.values(groupedByMonth).map((entries) => {
					const totalMoodScore = entries.reduce(
						(sum, entry) => sum + parseInt(entry.mood_score),
						0
					);
					const averageMoodScore = totalMoodScore / entries.length;
					return averageMoodScore;
				}) || [];

			// example:
			// monthly (x): [ '2023-10', '2023-11', '2023-12' ]
			// monthlyAverages (y): [ -1, -2, -3.3333333333333335 ]
		} else if (selectedLineChart === 'yearly') {
			// group the result object by year
			/**
			 * example:
			 * {
			 		'2023': [ {...}, {...}, { ... }, ... ],
			 * }
			*/
			const groupedByYear = _.groupBy(result, (entry) => dayjs(entry.created_at).format('YYYY'));

			// sort the year in ascending order
			yearly = _.sortBy(_.keys(groupedByYear)) || [];

			// calculate the average mood score for each year
			yearlyAverages =
				Object.values(groupedByYear).map((entries) => {
					const totalMoodScore = entries.reduce(
						(sum, entry) => sum + parseInt(entry.mood_score),
						0
					);
					const averageMoodScore = totalMoodScore / entries.length;
					return averageMoodScore;
				}) || [];

			// example:
			// yearly (x): [ '2023' ]
			// yearlyAverages (y): [ -1.7037037037037037 ]
		}

		sbcBtnColors = {
			min: selectedReasonMarkType === 'min' ? 'blue' : 'light',
			max: selectedReasonMarkType === 'max' ? 'blue' : 'light',
			average: selectedReasonMarkType === 'average' ? 'blue' : 'light'
		};

		if (selectedReasonMarkType === 'average') {
			sbcMarkType = 'average';
		} else if (selectedReasonMarkType === 'min') {
			sbcMarkType = 'min';
		} else if (selectedReasonMarkType === 'max') {
			sbcMarkType = 'max';
		}
	}

	$: if (exportModalState) {
		// get all property names (keys) of the first object in the `result` array and storing them in the keys array.
		let keys = Object.keys(result[0]);
		keys[keys.indexOf('mood_score')] = 'mood'; // rename `mood_score` with `mood`
		keys[keys.indexOf('reason_score')] = 'reason'; // rename `reason_score` with `reason`
		keys.splice(keys.indexOf('created_at'), 1, 'date', 'time'); // rename `created_at` with `date` and `time`

		let values = result?.map((obj) => {
			let newObj = { ...obj }; // clone the object

			// replace the `mood_score` and `reason_score` values with their corresponding keys
			// e.g. 1 -> 'Calm', -4 -> 'Sad', etc.
			// e.g. 1 -> 'Family', 6 -> 'Unwilling to specify', etc.
			newObj.mood = Object.keys(mood).find((key) => mood[key] === Number(obj.mood_score));
			newObj.reason = Object.keys(reason).find((key) => reason[key] === Number(obj.reason_score));

			let createdAt = new Date(obj.created_at); // create a new Date object from the `created_at` value
			newObj.date = createdAt.toISOString().split('T')[0]; // get the date
			newObj.time = createdAt.toTimeString().split(' ')[0]; // get the time

			delete newObj.created_at; // delete the `created_at` property
			delete newObj.mood_score; // delete the `mood_score` property
			delete newObj.reason_score; // delete the `reason_score` property

			// create an empty object for the new object
			let orderedObj = {};

			// iterate over each key in the keys array so that the properties are added in the correct order
			for (let key of keys) {
				// add each key-value pair to the new object
				// in simpler terms, this is just a reordering of the properties of the object
				orderedObj[key] = newObj[key];
			}

			// now orderedObj is the new object that has the properties in the correct order
			newObj = orderedObj;

			return Object.values(newObj); // return the values of the new object
		});

		exportStudentData.update(() => [keys, ...values]); // update the exportStudentData store with the new data
	}

	async function handleExport() {
		let data = $exportStudentData;
		const fileType =
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
		const fileExtension = '.xlsx';
		const fileName = currentStudentID + '_MoodEntries';

		const workSheet = XLSX.utils.aoa_to_sheet(data);
		const workBook = {
			Sheets: { data: workSheet, cols: [] },
			SheetNames: ['data']
		};
		const excelBuffer = await XLSX.write(workBook, { bookType: 'xlsx', type: 'array' });
		const fileData = new Blob([excelBuffer], { type: fileType });
		FileSaver.saveAs(fileData, fileName + fileExtension);
	}

	function toggleChart(chart) {
		selectedLineChart = chart;
	}

	function selectReasonMarkType(reasonMarkType) {
		selectedReasonMarkType = reasonMarkType;
	}
</script>

<svelte:head>
	<title>Student Mood Information</title>
</svelte:head>

<div class="p-4 flex flex-col space-y-3.5">
	<div class="flex flex-row max-w-full justify-center gap-2">
		{#if urlResult?.length > 0}
			<div class="space-x-2">
				<Button class="h-11 w-fit" size="sm" color="dark" on:click={() => goto('/students/list')}>
					Back to Student List
				</Button>
				<Button
					class="h-11 w-fit"
					size="sm"
					color="green"
					on:click={() => {
						newMoodEntry = true;
					}}
				>
					Add Mood Entry
				</Button>
			</div>
		{:else if students?.length > 0}
			<Select
				placeholder="College"
				class="font-normal w-max h-11 bg-white"
				items={college}
				bind:value={selectedCollege}
				on:change={(e) => {
					selectedCourse = '';
					selectedYearLevel = '';
					selectedStudent = '';
				}}
			/>
			<Select
				placeholder="Course"
				class="font-normal w-max h-11 bg-white"
				items={course}
				bind:value={selectedCourse}
				on:change={(e) => {
					selectedYearLevel = '';
					selectedStudent = '';
				}}
			/>
			<Select
				placeholder="Year Level"
				class="font-normal w-max h-11 bg-white"
				items={yearLevel}
				bind:value={selectedYearLevel}
				on:change={(e) => {
					selectedStudent = '';
				}}
			/>
			<Select
				placeholder="Student"
				class="font-normal w-max h-11 bg-white"
				items={student}
				bind:value={selectedStudent}
			/>
		{/if}
		{#if result?.length > 0}
			<Tooltip
				placement="top"
				class="fixed z-50 overflow-hidden"
				triggeredBy="#exportStudentData"
				on:hover={(e) => e.preventDefault()}
			>
				Export [{selectedStudent || currentStudentID}]'s entries to spreadsheet (.xlsx)
			</Tooltip>
			<Tooltip
				placement="top"
				class="fixed z-50 overflow-hidden"
				triggeredBy="#resetStudentFilter"
				on:hover={(e) => e.preventDefault()}
			>
				Reset filter
			</Tooltip>
			<Button
				class="h-11 w-fit"
				size="sm"
				color="green"
				on:click={() => {
					newMoodEntry = true;
				}}
			>
				<svg
					class="w-4 h-4 text-white mr-2"
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 18 18"
				>
					<path
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 1v16M1 9h16"
					/>
				</svg>
				Add Mood Entry
			</Button>
			<Button
				id="resetStudentFilter"
				class="h-11 w-fit"
				size="sm"
				color="red"
				on:click={() => {
					searchTerm = '';
					selectedCollege = '';
					selectedCourse = '';
					selectedYearLevel = '';
					selectedStudent = '';
					selectedLineChart = 'today';
				}}
			>
				<svg
					class="w-5 h-5 text-white"
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 16 14"
				>
					<path
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 7 1 4l3-3m0 12h6.5a4.5 4.5 0 1 0 0-9H2"
					/>
				</svg>
			</Button>
			<Button
				id="exportStudentData"
				class="h-11 shadow-md p-4 items-center"
				on:click={() => (exportModalState = true)}
			>
				<DownloadSolid tabindex="-1" class="text-white focus:outline-none" />
			</Button>
		{/if}
	</div>

	<div class={divClass}>
		<div class="flex space-x-6 justify-between">
			<div class="flex flex-col">
				{#if addedMoodEntryAlert}
					<Alert color="green" class="mb-2"
						><span class="font-medium">Mood entry added succesfully!</span></Alert
					>
					<p class="hidden">
						{setTimeout(() => {
							addedMoodEntryAlert = false;
						}, 3000)}
					</p>
				{:else if form?.error}
					<Alert color="red" class="mb-2"><span class="font-medium">{form?.error}</span></Alert>
				{/if}
				{#if urlResult?.length > 0}
					<Card class="max-w-full">
						<div class="flex flex-row space-x-8">
							<div class="self-start">
								<Avatar size="lg" src="" border rounded />
							</div>
							<div class="flex flex-col">
								<h5 class="text-xl font-medium text-zinc-800 max-w-sm">
									{urlResult[0]?.student_name}
								</h5>
								<span class="text-sm text-gray-500 dark:text-gray-400"
									>{urlResult[0]?.student_id}</span
								>
								<div class="flex mt-5 space-x-10">
									<div class="flex flex-col">
										<p class="text-sm font-semibold text-zinc-800">COURSE</p>
										<p class="text-sm">{urlResult[0]?.course_id}</p>
									</div>
									<div class="flex flex-col">
										<p class="text-sm font-semibold text-zinc-800">YEAR LEVEL</p>
										<p class="text-sm">{yearLvl[urlResult[0]?.year_level_id]}</p>
									</div>
								</div>
							</div>
						</div>
					</Card>
					<p class="italic mt-4 text-sm">*This student have does not have mood entries yet.</p>
				{:else if result?.length > 0}
					<Card class="max-w-full">
						<div class="flex flex-row space-x-8">
							<div class="self-start">
								<Avatar size="lg" src="" border rounded />
							</div>
							<div class="flex flex-col">
								<h5 class="text-xl font-medium text-zinc-800 max-w-sm">
									{result[0]?.student_name}
								</h5>
								<span class="text-sm text-gray-500 dark:text-gray-400">{result[0].student_id}</span>
								<div class="flex mt-5">
									<div class="flex flex-col">
										<p class="text-sm font-semibold text-zinc-800">COLLEGE</p>
										<p class="text-sm">{result[0]?.college}</p>
									</div>
								</div>
								<div class="flex mt-5 space-x-10">
									<div class="flex flex-col">
										<p class="text-sm font-semibold text-zinc-800">COURSE</p>
										<p class="text-sm">{result[0]?.course}</p>
									</div>
									<div class="flex flex-col">
										<p class="text-sm font-semibold text-zinc-800">YEAR LEVEL</p>
										<p class="text-sm">{yearLvl[parseInt(result[0].year_level)]}</p>
									</div>
								</div>
								<div class="flex flex-col mt-5 space-y-3">
									<div class="flex flex-col">
										<p class="text-sm">
											<span class="text-sm font-semibold text-zinc-800">Latest Mood:</span>
											{Object.keys(mood).find(
												(key) => mood[key] == result[result?.length - 1].mood_score
											)}
											[{Object.keys(reason).find(
												(key) => reason[key] == result[result?.length - 1].reason_score
											)}]
										</p>
										<p class="text-sm space-x-1">
											<span class="text-sm font-semibold text-zinc-800">Latest Log Time:</span>
											{result.slice(-1)[0].created_at.replace('T', ' ').substring(0, 19)}
											{#if result.slice(-1)[0]?.created_by != null}
												<Badge border color="purple">
													{result.slice(-1)[0].created_by}
												</Badge>
											{:else}
												<Badge border color="blue">KIOSK</Badge>
											{/if}
										</p>
										<p class="text-sm">
											<span class="text-sm font-semibold text-zinc-800">Most Frequent:</span>
											{mostFrequentMood}
										</p>
										<p class="text-sm">
											<span class="text-sm font-semibold text-zinc-800">Least Frequent:</span>
											{leastFrequentMood}
										</p>
									</div>
								</div>
							</div>
						</div>
					</Card>
				{:else}
					<P>Student not found.</P>
				{/if}
			</div>

			{#if result?.length > 0}
				<div class="flex flex-col">
					<div class="flex justify-end h-fit">
						<ButtonGroup>
							<Button color={lcBtnColors.today} on:click={() => toggleChart('today')}>Today</Button>
							<Button color={lcBtnColors.weekly} on:click={() => toggleChart('weekly')}>
								Weekly
							</Button>
							<Button color={lcBtnColors.monthly} on:click={() => toggleChart('monthly')}>
								Monthly
							</Button>
							<Button color={lcBtnColors.yearly} on:click={() => toggleChart('yearly')}>
								Yearly
							</Button>
							<Button color={lcBtnColors.overall} on:click={() => toggleChart('overall')}>
								Overall
							</Button>
						</ButtonGroup>
					</div>

					{#if selectedLineChart === 'today'}
						<LineChart
							bind:xData={timestamps}
							bind:yData={todaysMoodScores}
							elementID={'IndTLC'}
							style="width:700px; height:320px;"
						/>
					{:else if selectedLineChart === 'overall'}
						<LineChart
							bind:xData={overall}
							bind:yData={overallAverages}
							elementID={'IndDLC'}
							style="width:700px; height:320px;"
						/>
					{:else if selectedLineChart === 'weekly'}
						<LineChart
							bind:xData={weekly}
							bind:yData={weeklyAverages}
							elementID={'IndWLC'}
							style="width:700px; height:320px;"
						/>
					{:else if selectedLineChart === 'monthly'}
						<LineChart
							bind:xData={monthly}
							bind:yData={monthlyAverages}
							elementID={'IndMLC'}
							style="width:700px; height:320px;"
						/>
					{:else if selectedLineChart === 'yearly'}
						<LineChart
							bind:xData={yearly}
							bind:yData={yearlyAverages}
							elementID={'IndYLC'}
							style="width:700px; height:320px;"
						/>
					{/if}
				</div>
			{/if}
		</div>

		<div class="flex flex-row space-x-3 justify-between">
			{#if result?.length > 0}
				<div class="flex space-x-6 justify-between">
					<PieChart title="Breakdown of Moods" bind:data={pieChartData} elementID={'studentPC'} />
				</div>

				<div class="flex space-x-6">
					<div class="flex flex-col">
						{#if result?.length > 0}
							<div class="flex justify-between">
								<div class="flex flex-col">
									<p class="text-lg font-bold ml-1">Associated Reason Frequency</p>
								</div>
								<ButtonGroup class="mb-3">
									<Button
										color={sbcBtnColors.average}
										on:click={() => selectReasonMarkType('average')}
									>
										Average
									</Button>
									<Button color={sbcBtnColors.max} on:click={() => selectReasonMarkType('max')}>
										Max
									</Button>
									<Button color={sbcBtnColors.min} on:click={() => selectReasonMarkType('min')}>
										Min
									</Button>
								</ButtonGroup>
							</div>
							<div class="mt-3 items-center">
								<SimpleBarChart
									xData={xDataSBC}
									yType="value"
									yName="Frequency"
									yAxisRotate="90"
									yData={yDataSBC}
									xType="category"
									xName="Reason"
									title=""
									fontSize="18"
									markType={sbcMarkType}
									elementID="reasonSBC"
									style="width:695px; height:320px;"
								/>
							</div>
						{:else}
							<div
								class="flex flex-col justify-center items-center space-y-5"
								style="width:645px; height:320px;"
							>
								<RocketOutline class="h-20 w-20" />
								<p class="text-sm text-slate-500">Data currently <strong>unavailable</strong>.</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<Modal title="Add New Mood Entry" size="xs" bind:open={newMoodEntry} class="w-full">
	<form class="flex flex-col" method="POST" action="?/addMoodEntry" use:enhance>
		<p class="text-sm mb-3"><strong>Student ID:</strong> {currentStudentID}</p>
		<input type="hidden" id="studentID" name="studentID" bind:value={currentStudentID} />

		<div class="flex flex-row space-x-3">
			<Select
				size="sm"
				class="my-2"
				items={moodChoices}
				placeholder="Select Mood"
				name="addMood"
				required
			/>
			<Select
				size="sm"
				class="my-2"
				items={reasonChoices}
				placeholder="Select Reason"
				name="addReason"
				required
			/>
		</div>

		<Button type="submit" class="w-full mt-3" on:click={() => (newMoodEntry = false)}
			>SAVE MOOD ENTRY</Button
		>
	</form>
</Modal>

<Modal
	title="Export to Microsoft Excel spreadsheet (.xlsx)"
	size="lg"
	bind:open={exportModalState}
	class="max-w-full"
>
	<p class="text-sm text-black uppercase font-semibold">First row (preview):</p>
	<Table class="w-fit">
		<TableHead class="bg-zinc-100 border border-t border-zinc-300 top-0 sticky text-center">
			<TableHeadCell class="text-center">#</TableHeadCell>
			<TableHeadCell class="text-center">Student ID</TableHeadCell>
			<TableHeadCell class="text-center">Name</TableHeadCell>
			<TableHeadCell class="text-center">Course</TableHeadCell>
			<TableHeadCell class="text-center">Year Level</TableHeadCell>
			<TableHeadCell class="text-center">College</TableHeadCell>
			<TableHeadCell class="text-center">Mood</TableHeadCell>
			<TableHeadCell class="text-center">Reason</TableHeadCell>
			<TableHeadCell class="text-center">Date</TableHeadCell>
			<TableHeadCell class="text-center">Time</TableHeadCell>
			<TableHeadCell class="text-center">Recorded By</TableHeadCell>
		</TableHead>
		<TableBody tableBodyClass="divide-y bg-white">
			{#if $exportStudentData?.length === 0}
				<TableBodyRow class="border border-zinc-300 text-center">
					<TableBodyCell>No data</TableBodyCell>
					<TableBodyCell>No data</TableBodyCell>
					<TableBodyCell>No data</TableBodyCell>
					<TableBodyCell>No data</TableBodyCell>
					<TableBodyCell>No data</TableBodyCell>
					<TableBodyCell>No data</TableBodyCell>
					<TableBodyCell>No data</TableBodyCell>
					<TableBodyCell>No data</TableBodyCell>
					<TableBodyCell>No data</TableBodyCell>
					<TableBodyCell>No data</TableBodyCell>
				</TableBodyRow>
			{:else}
				{#each $exportStudentData?.slice(1, 2) as student}
					<TableBodyRow>
						{#each student as data}
							<TableBodyCell>{data}</TableBodyCell>
						{/each}
					</TableBodyRow>
				{/each}
			{/if}
		</TableBody>
	</Table>
	<div class="flex flex-row space-x-3">
		<Button class="w-full mt-3" on:click={handleExport}>CONFIRM EXPORT</Button>
		<Button color="red" class="w-full mt-3" on:click={() => (exportModalState = false)}
			>CANCEL</Button
		>
	</div>
</Modal>
