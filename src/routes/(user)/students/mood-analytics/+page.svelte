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
	import { displayTime } from '$lib/helpers/datetime.ts';

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

	let addMoodModalOpen = false;

	const divClass =
		'bg-white space-y-4 dark:bg-gray-800 dark:text-gray-400 rounded-lg border border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700 shadow-md p-4 sm:p-6 text-slate-950 flex flex-col';

	let currentStudentID;

	let exportModalOpen = false;

	let newEntryAlert = false;

	let hasMoodEntries = false;
	let entries = [];

	$: searchTerm = $page?.url?.searchParams?.get('search');

	$: selected = selectedCollege && selectedCourse && selectedYearLevel && selectedStudent;

	onMount(() => {
		const moodAnalytics = supabase.channel('moodAnalytics').on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'StudentMoodEntries'
			},
			async (payload) => {
				if (payload.eventType === 'INSERT') {
					newEntryAlert = true;

					setTimeout(() => {
						newEntryAlert = false;
					}, 1000);
					
				}
			}
		);

		return () => {
			moodAnalytics.unsubscribe();
		};
	});

	$: searchTerm = selectedStudent ? selectedStudent : searchTerm;

	$: {
		hasEntry = studentMoodData?.findLast((student) => student.student_id == searchTerm);
		hasMoodEntries = hasEntry ? true : false;

		if (!hasEntry) {
			result = { ...students?.find((student) => student?.student_id == searchTerm) };
		} else {
			entries = studentMoodData?.filter((student) => student.student_id == searchTerm);
			result = { ...hasEntry };
		}
		currentStudentID = result?.student_id;
	}

	$: if (students?.length > 0) {
		college = [...colleges].map(({ id, college }) => ({
			value: id,
			name: id
		}));

		course = [...courses]
			.filter((course) => course.college_id === selectedCollege)
			.map((course) => ({
				value: course.id,
				name: course.id
			}));

		yearLevel = [...year_levels].map(({ id, year_level }) => ({
			value: id,
			name: year_level
		}));

		student = [...students]
			.filter((student) => student.course_id === selectedCourse && yearLvl[student.year_level_id])
			.map(({ student_id, student_name }) => ({
				value: student_id,
				name: student_id
			}));
	}

	$: if (entries?.length > 0) {
		const moodCount = {};
		const reasonCount = {};

		entries.forEach((item) => {
			const moodScore = item.mood_score;
			let moodLabel = null;

			for (const key in mood) {
				if (mood[key] == moodScore) {
					moodLabel = key;
					break;
				}
			}

			if (moodLabel) {
				moodCount[moodLabel] = (moodCount[moodLabel] || 0) + 1;
			}
		});

		entries.forEach((item) => {
			const reasonScore = item.reason_score;
			let reasonLabel = null;

			for (const key in reason) {
				if (reason[key] == reasonScore) {
					reasonLabel = key;
					break;
				}
			}

			if (reasonLabel) {
				reasonCount[reasonLabel] = (reasonCount[reasonLabel] || 0) + 1;
			}
		});

		const sortedMoodsArr = Object.keys(moodCount).sort(
			(currElem, nxtElem) => moodCount[nxtElem] - moodCount[currElem]
		);

		const m_counts = Object.values(moodCount);

		if (m_counts === 1) {
			mostFrequentMood = 'Not enough data';
			leastFrequentMood = 'Not enough data';
		} else if (m_counts.every((count) => count === m_counts[0])) {
			mostFrequentMood = 'Equal mood frequency';
			leastFrequentMood = 'Equal mood frequency';
		} else {
			const maxCount = Math.max(...m_counts);
			const mostFrequentMoods = sortedMoodsArr.filter((mood) => moodCount[mood] === maxCount);

			mostFrequentMood = mostFrequentMoods.length > 1 ? 'A tie.' : mostFrequentMoods[0];

			const minCount = Math.min(...m_counts);
			const leastFrequentMoods = sortedMoodsArr.filter((mood) => moodCount[mood] === minCount);

			leastFrequentMood = leastFrequentMoods.length > 1 ? 'A tie.' : leastFrequentMoods[0];
		}

		xDataMBC = Object.keys(moodCount);
		yDataMBC = m_counts;

		pieChartData = xDataMBC.map((label, index) => {
			return {
				value: yDataMBC[index],
				name: label
			};
		});

		const sortedReasonObj = Object.fromEntries(
			Object.entries(reasonCount).sort(([, currElem], [, nextElem]) => currElem - nextElem)
		);

		xDataSBC = _.keys(sortedReasonObj);
		yDataSBC = _.values(sortedReasonObj);

		lcBtnColors = {
			today: selectedLineChart === 'today' ? 'blue' : 'light',
			overall: selectedLineChart === 'overall' ? 'blue' : 'light',
			weekly: selectedLineChart === 'weekly' ? 'blue' : 'light',
			monthly: selectedLineChart === 'monthly' ? 'blue' : 'light',
			yearly: selectedLineChart === 'yearly' ? 'blue' : 'light'
		};

		if (selectedLineChart === 'today') {
			const todaysEntries = entries.filter(
				(entry) => dayjs(entry.created_at).format('YYYY-MM-DD') === today
			);

			// Get the timestamps and mood scores for today's entries
			timestamps = todaysEntries.map((entry) => dayjs(entry.created_at).format('HH:mm:ss')) || [];
			todaysMoodScores = todaysEntries.map((entry) => entry.mood_score) || [];

			// example:
			// timestamps (x): [ '17:08:51', '17:09:12', '17:09:57', '17:10:10' ]
			// todaysMoodScores (y): [ '-3', '-2', '0', '-1' ]
		} else if (selectedLineChart === 'overall') {
			const groupedByDay = _.groupBy(entries, (entry) =>
				dayjs(entry.created_at).format('YYYY-MM-DD')
			);

			// sort the days in ascending order
			overall = _.sortBy(_.keys(groupedByDay)) || [];

			// calculate the average mood score for each day
			overallAverages =
				Object.values(groupedByDay).map((days) => {
					const totalMoodScore = days.reduce((sum, day) => sum + parseInt(day.mood_score), 0);
					const averageMoodScore = totalMoodScore / days.length;
					return averageMoodScore;
				}) || [];

			// example:
			// overall (x): [ '2023-10-03', '2023-10-09', '2023-10-12', '2023-10-13' ]
			// overallAverages (y): [ -2, 1, -3, -4 ]
		} else if (selectedLineChart === 'weekly') {
			const groupedByWeek = _.groupBy(entries, (entry) =>
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
			const groupedByMonth = _.groupBy(entries, (entry) =>
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
			const groupedByYear = _.groupBy(entries, (entry) => dayjs(entry.created_at).format('YYYY'));

			yearly = _.sortBy(_.keys(groupedByYear)) || [];

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

	$: if (exportModalOpen) {
		let keys = Object.keys(result);

		keys[keys.indexOf('mood_score')] = 'mood';
		keys[keys.indexOf('reason_score')] = 'reason';
		keys[keys.indexOf('created_at')] = 'datetime';

		let newObj = { ...result };

		newObj.mood = Object.keys(mood).find((key) => mood[key] === Number(result.mood_score));
		newObj.reason = Object.keys(reason).find((key) => reason[key] === Number(result.reason_score));

		newObj.datetime = displayTime(result.created_at);

		delete newObj.created_at;
		delete newObj.mood_score;
		delete newObj.reason_score;

		let orderedObj = {};

		for (let key of keys) {
			orderedObj[key] = newObj[key];
		}

		newObj = orderedObj;

		const values = Object.values(newObj);
		exportStudentData.update(() => [keys, values]);
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
		{#if result}
			<Button
				class="h-11 w-fit"
				size="sm"
				color="green"
				on:click={() => {
					addMoodModalOpen = true;
				}}
			>
				Add Mood Entry
			</Button>
		{/if}
		{#if entries.length}
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
				on:click={() => (exportModalOpen = true)}
			>
				<DownloadSolid tabindex="-1" class="text-white focus:outline-none" />
			</Button>
		{/if}
	</div>

	<div class={divClass}>
		<div class="flex space-x-6 justify-between">
			<div class="flex flex-col">
				{#if newEntryAlert}
					<Alert color="green" class="mb-2"
						><span class="font-medium">Mood entry added succesfully!</span></Alert
					>
					<p class="hidden">
						{setTimeout(() => {
							newEntryAlert = false;
						}, 3000)}
					</p>
				{:else if form?.error}
					<Alert color="red" class="mb-2"><span class="font-medium">{form?.error}</span></Alert>
				{/if}
				{#if currentStudentID && result && !hasMoodEntries}
					<Card class="max-w-full">
						<div class="flex flex-row space-x-8">
							<div class="self-start">
								<Avatar size="lg" src="" border rounded />
							</div>
							<div class="flex flex-col">
								<h5 class="text-xl font-medium text-zinc-800 max-w-sm">
									{result.student_name}
								</h5>
								<span class="text-sm text-gray-500 dark:text-gray-400">{result.student_id}</span>
								<div class="flex mt-5 space-x-10">
									<div class="flex flex-col">
										<p class="text-sm font-semibold text-zinc-800">COURSE</p>
										<p class="text-sm">{result.course_id}</p>
									</div>
									<div class="flex flex-col">
										<p class="text-sm font-semibold text-zinc-800">YEAR LEVEL</p>
										<p class="text-sm">{yearLvl[result.year_level_id]}</p>
									</div>
								</div>
							</div>
						</div>
					</Card>
					<p class="italic mt-4 text-sm">*This student have does not have mood entries yet.</p>
				{:else if hasMoodEntries && result}
					<Card class="max-w-full">
						<div class="flex flex-row space-x-8">
							<div class="self-start">
								<Avatar size="lg" src="" border rounded />
							</div>
							<div class="flex flex-col">
								<h5 class="text-xl font-medium text-zinc-800 max-w-sm">
									{result?.student_name}
								</h5>
								<span class="text-sm text-gray-500 dark:text-gray-400">{result.student_id}</span>
								<div class="flex mt-5">
									<div class="flex flex-col">
										<p class="text-sm font-semibold text-zinc-800">COLLEGE</p>
										<p class="text-sm">{result.college}</p>
									</div>
								</div>
								<div class="flex mt-5 space-x-10">
									<div class="flex flex-col">
										<p class="text-sm font-semibold text-zinc-800">COURSE</p>
										<p class="text-sm">{result.course}</p>
									</div>
									<div class="flex flex-col">
										<p class="text-sm font-semibold text-zinc-800">YEAR LEVEL</p>
										<p class="text-sm">{yearLvl[parseInt(result.year_level)]}</p>
									</div>
								</div>
								<div class="flex flex-col mt-5 space-y-3">
									<div class="flex flex-col">
										<p class="text-sm">
											<span class="text-sm font-semibold text-zinc-800">Latest Mood:</span>
											{Object.keys(mood).find((key) => mood[key] == result.mood_score)}
											[{Object.keys(reason).find((key) => reason[key] == result.reason_score)}]
										</p>
										<p class="text-sm space-x-1">
											<span class="text-sm font-semibold text-zinc-800">Latest Log Time:</span>
											{displayTime(result.created_at)}
											{#if result.created_by != null}
												<Badge border color="purple">
													{result.created_by}
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
					<P>No student found.</P>
				{/if}
			</div>

			{#if hasMoodEntries && result}
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
			{#if hasMoodEntries && result}
				<div class="flex space-x-6 justify-between">
					<PieChart title="Breakdown of Moods" bind:data={pieChartData} elementID={'studentPC'} />
				</div>

				<div class="flex space-x-6">
					<div class="flex flex-col">
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
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<Modal title="Add New Mood Entry" size="xs" bind:open={addMoodModalOpen} class="w-full">
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

		<Button type="submit" class="w-full mt-3" on:click={() => (addMoodModalOpen = false)}
			>SAVE MOOD ENTRY</Button
		>
	</form>
</Modal>

<Modal
	title="Export to Microsoft Excel spreadsheet (.xlsx)"
	size="lg"
	bind:open={exportModalOpen}
	class="max-w-lg"
>
	<p class="text-sm text-black uppercase font-semibold">First row (preview):</p>
	<Table class="w-fit">
		<TableHead
			class="bg-zinc-100 border border-t border-zinc-300 *:text-cente top-0 sticky text-center"
		>
			<TableHeadCell>#</TableHeadCell>
			<TableHeadCell>Student ID</TableHeadCell>
			<TableHeadCell>Name</TableHeadCell>
			<TableHeadCell>Course</TableHeadCell>
			<TableHeadCell>Year Level</TableHeadCell>
			<TableHeadCell>College</TableHeadCell>
			<TableHeadCell>Mood</TableHeadCell>
			<TableHeadCell>Reason</TableHeadCell>
			<TableHeadCell>Datetime</TableHeadCell>
			<TableHeadCell>Created By</TableHeadCell>
		</TableHead>
		<TableBody tableBodyClass="divide-y bg-white">
			{#if $exportStudentData?.length === 0}
				<TableBodyRow class="border border-zinc-300 text-center">
					{#each Array(10) as _, i (i)}
						<TableBodyCell>No data</TableBodyCell>
					{/each}
				</TableBodyRow>
			{:else}
				{#each $exportStudentData.slice(1) as student}
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
		<Button color="red" class="w-full mt-3" on:click={() => (exportModalOpen = false)}
			>CANCEL</Button
		>
	</div>
</Modal>
