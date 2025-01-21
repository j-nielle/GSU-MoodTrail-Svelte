<script>
	// @ts-nocheck
	import _ from 'lodash';
	import dayjs from 'dayjs';
	import { onMount } from 'svelte';
	import {
		//Card,
		Button,
		ButtonGroup,
		Select,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Tooltip,
		Modal,
		Checkbox,
		Label,
		Fileupload,
		Tabs,
		TabItem,
		Popover
	} from 'flowbite-svelte';
	import {
		RocketOutline,
		AdjustmentsVerticalSolid,
		ChartMixedOutline,
		ChartOutline,
		TableColumnOutline,
		FileImportSolid,
		QuestionCircleSolid,
		ChevronRightOutline
	} from 'flowbite-svelte-icons';
	import {
		RadarChart,
		LineChart,
		HorizontalMoodBarChart,
		HeatmapChart,
		NegativeBarChart,
		Histogram,
		SimpleBarChart,
		CalendarChart
	} from '$lib/components/charts/index.js';
	import { focusTable, consistentLowMoods, exportMoodsData } from '$lib/stores/index.js';
	import { CardInfo } from '$lib/components/elements/index.js';
	import {
		mood,
		reason,
		yearLvl,
		daysShort,
		moodChoices,
		reasonChoices,
		getWeekNumberString,
		requestTypes
	} from '$lib/constants/index.js';
	import { displayTime } from '$lib/helpers/datetime.ts';
	import FileSaver from 'file-saver';
	import * as XLSX from 'xlsx';
	import * as echarts from 'echarts';

	export let data;

	let studentMoodData = data.studentMood;
	let anonMoodData = data.anonMood;
	let requestsData = data.requests;
	let guestMoodData = data.guestMood;
	let dataType = {};

	let todaysEntries = [];
	let xDataMBC, yDataMBC;
	let heatmapData;

	let recentStudent;
	let topMoodReason = '';
	let infoCardTitle = '';

	let overall = [],
		overallAverages = [];
	let weekly = [],
		weeklyAverages = [];
	let monthly = [],
		monthlyAverages = [];
	let yearly = [],
		yearlyAverages = [];
	let timestamps = [],
		todaysMoodScores = [];

	let selectedLineChart = 'today',
		lineChartTitle = '';
	let selectedNHBarChart = 'course';

	let current = dayjs();
	const interval = 1000;

	let switchMoodData = {
		student: true,
		anon: false,
		guest: false
	};

	let lcBtnColors = {};
	let nhbcBtnColors = {};
	let sbcBtnColors = {};

	const toggleBtnClass = {
		inactive:
			'text-center font-medium inline-flex items-center justify-center px-3 py-2 text-xs text-white rounded-full',
		active:
			'text-center font-medium focus:outline-none inline-flex items-center justify-center px-3 py-2 text-xs text-white bg-primary-700 hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-700 focus:ring-primary-300 dark:focus:ring-primary-800 rounded-full'
	};

	let moodRadarData = {},
		reasonRadarIndicator = {};

	let courseYData = [],
		yearLvlYData = [],
		reasonYData = [];
	let avgMoodByCourse = {},
		avgMoodByYearLvl = {},
		avgMoodByReason = {};

	let xDataSBC = [],
		yDataSBC = [];

	let selectedReasonMarkType = 'average',
		sbcMarkType = '';
	let selectedReasonCalendar = '',
		selectedMoodCalendar = '',
		selectedCalendarYear = '';

	let calendarYearChoices = [];

	let chartFilterModalState = false;
	let tableRef;

	let selectedMoodScore;
	let xMoodWeek = [],
		yMoodWeekEntry = [];
	let yReasonPercentage = [],
		xReason = [];

	let lowMoodsOnly = false;

	let mostFrequentRequestType = '';

	let heatmap = false,
		radar = false,
		moodReasonCalendarChart = false;

	let importExportModalState = false;

	let currentDataView = '';

	let currentUserID = data?.user?.id,
		currentUserName = data?.user?.user_metadata?.username;

	let importError = '';

	$: ({ supabase } = data);

	onMount(() => {
		const timer = setInterval(updateTime, interval);

		const dashboardChannel = supabase
			.channel('dashboard')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'StudentMoodEntries'
				},
				(payload) => {
					if (payload.eventType === 'INSERT') {
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
					event: 'INSERT',
					schema: 'public',
					table: 'AnonMood'
				},
				(payload) => {
					anonMoodData = _.cloneDeep([...anonMoodData, payload.new]);
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'GuestMood'
				},
				(payload) => {
					guestMoodData = _.cloneDeep([...guestMoodData, payload.new]);
				}
			)
			.subscribe(); // (status) => console.log('/dashboard', status));

		return () => {
			clearInterval(timer);
			dashboardChannel.unsubscribe();
		};
	});

	/**
	 * View selected line chart (Today/Weekly/Monthly/Yearly/Overall).
	 * @param {string} lineChart - The line chart selected by the user.
	 */
	function selectLineChart(lineChart) {
		selectedLineChart = lineChart;
	}

	/**
	 * View selected bar chart for **Mood Averages Chart** (Course/Year Level/Reason).
	 * @param {string} barChart - The bar chart selected by the user.
	 */
	function selectNHBarChart(barChart) {
		selectedNHBarChart = barChart;
	}

	/**
	 * View selected reason mark type for **Associated Reason Frequency Chart** (Average/Min/Max).
	 * @param {string} reasonMarkType - The reason mark type selected by the user.
	 */
	function selectReasonMarkType(reasonMarkType) {
		selectedReasonMarkType = reasonMarkType;
	}

	/**
	 * Updates the `current` variable with the current date and time.
	 */
	function updateTime() {
		current = dayjs();
	}

	/**
	 * Handles the click event on an element to smoothly scroll to a target element.
	 * @param {MouseEvent} event
	 * The target of this event is expected to have an 'id' attribute that corresponds to the
	 * id of the target element to scroll to.
	 */
	function scrollIntoView({ target }) {
		const targetElement = document?.getElementById(target.getAttribute('id'));
		if (!targetElement) return;
		targetElement.scrollIntoView({
			behavior: 'smooth'
		});
	}

	/**
	 * Handles the click event on a checkbox to show/hide a chart.
	 * @param {boolean} checkedState - The checked state of the checkbox.
	 * @param {MouseEvent} event
	 *
	 * The target of this event is expected to have an 'id' attribute that corresponds to the
	 * id of the target element to show/hide.
	 */
	function filterChart(checkedState, event) {
		const target = event.target;
		const targetElement = document?.getElementById(target.getAttribute('id'));
		if (!targetElement) return;

		const aElement = targetElement?.parentElement?.querySelector('a');
		if (!aElement) return;

		const href = aElement?.getAttribute('href');
		const chartDiv = document.getElementById(href.slice(1));
		if (!chartDiv) return;

		if (target.checked) {
			checkedState = true;
			if (href.slice(1) == 'moodCalendar') {
				chartDiv.classList.remove('hidden');
				chartDiv.classList.add(
					'flex',
					'p-4',
					'justify-center',
					'self-center',
					'items-center',
					'w-full',
					'bg-white',
					'rounded',
					'drop-shadow-md',
					'hover:ring-1'
				);
			} else {
				chartDiv.classList.remove('hidden');
				chartDiv.classList.add(
					'flex',
					'flex-1',
					'p-4',
					'w-full',
					'bg-white',
					'rounded',
					'justify-center',
					'items-center',
					'self-center',
					'drop-shadow-md',
					'hover:ring-1'
				);
			}
		} else {
			checkedState = false;
			chartDiv.classList.remove(
				'flex',
				'flex-1',
				'p-4',
				'w-full',
				'bg-white',
				'rounded',
				'justify-center',
				'items-center',
				'self-center',
				'drop-shadow-md',
				'hover:ring-1'
			);
			chartDiv.classList.add('hidden');
		}
	}

	async function handleExport() {
		let data = $exportMoodsData;
		const fileType =
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
		const fileExtension = '.xlsx';
		const fileName = currentDataView + '_MoodData';

		const workSheet = XLSX.utils.aoa_to_sheet(data);
		const workBook = {
			Sheets: { data: workSheet, cols: [] },
			SheetNames: ['data']
		};
		const excelBuffer = await XLSX.write(workBook, { bookType: 'xlsx', type: 'array' });
		const fileData = new Blob([excelBuffer], { type: fileType });
		FileSaver.saveAs(fileData, fileName + fileExtension);
	}

	async function handleImport(event) {
		const file = event.target.files[0];
		const reader = new FileReader();

		if (!file) {
			importError = 'No file selected.';
			return;
		} else if (file.type != 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
			importError = 'Invalid file type. Please upload an .xlsx file.';
			return;
		}

		reader.onload = async (e) => {
			const data = new Uint8Array(e.target.result);
			const workbook = XLSX.read(data, { type: 'array' });

			const worksheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[worksheetName];

			const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

			const keys = jsonData[0].map((value) => value.toLowerCase());

			const dataColumns = {
				Guest: ['mood_score', 'reason_score', 'created_at'],
				Anon: ['mood_score', 'reason_score', 'created_at', 'course', 'year_level'],
				Student: ['student_id', 'mood_id', 'reason_id', 'created_at']
			};

			const checkMoodDataType = (values) => {
				return (
					values.every((value) => keys.includes(value)) && keys.every((key) => values.includes(key))
				);
			};

			let moodDataType = Object.keys(dataColumns).find((type) =>
				checkMoodDataType(dataColumns[type])
			);

			if (!moodDataType) {
				importError = 'Invalid format. Please upload a file with the correct format.';
				return;
			}

			const arrayOfObjects = jsonData.slice(1).map((row) => {
				return row.reduce((obj, item, index) => {
					obj[keys[index]] = item;
					return obj;
				}, {});
			});

			if (arrayOfObjects.length === 0) return; // if the file is empty, return

			try {
				if (moodDataType == 'Student') {
					const dataToInsert = arrayOfObjects.map((obj) => ({
						student_id: obj.student_id,
						mood_id: obj.mood_id,
						reason_id: obj.reason_id,
						created_at: obj.created_at,
						created_by: currentUserID
					}));

					const studentIds = dataToInsert.map((obj) => obj.student_id);

					const { data: Students, error: searchStudentErrror } = await supabase
						.from('Student')
						.select('*')
						.in('student_id', studentIds);

					if (searchStudentErrror) throw searchStudentErrror;
					else if (!Students || Students.length === 0) {
						importError =
							'One or more student not found in the database. Please create a student record first.';
						return;
					}

					const { error: insertStudentMoodError } = await supabase
						.from('StudentMood')
						.insert(dataToInsert)
						.select();

					if (insertStudentMoodError) throw insertStudentMoodError;
				} else if (moodDataType == 'Anon') {
					const dataToInsert = arrayOfObjects.map((obj) => ({
						mood_score: obj.mood_score,
						reason_score: obj.reason_score,
						created_at: obj.created_at,
						course: obj.course,
						year_level: obj.year_level,
						created_by: currentUserName
					}));

					const { error: insertAnonMoodError } = await supabase
						.from('AnonMood')
						.insert(dataToInsert)
						.select();

					if (insertAnonMoodError) throw insertAnonMoodError;
				} else if (moodDataType == 'Guest') {
					const dataToInsert = arrayOfObjects.map((obj) => ({
						mood_score: obj.mood_score,
						reason_score: obj.reason_score,
						created_at: obj.created_at,
						created_by: currentUserName
					}));

					const { error: insertGuestMoodError } = await supabase
						.from('GuestMood')
						.insert(dataToInsert)
						.select();

					if (insertGuestMoodError) throw insertGuestMoodError;
				}
			} catch (error) {
				importError = error.message;
				console.error(error.message);
			}
		};
		reader.readAsArrayBuffer(file);
	}

	$: {
		if (switchMoodData.student) {
			dataType = studentMoodData;
			currentDataView = 'Student';
		} else if (switchMoodData.anon) {
			dataType = anonMoodData;
			currentDataView = 'Anon';
		} else if (switchMoodData.guest) {
			dataType = guestMoodData;
			selectedNHBarChart = 'reason';
			currentDataView = 'Guest';
		}
	}

	$: if (requestsData) {
		let getRequests = requestsData?.map((req) => requestTypes[req.request_type]);
		let uniqueRequestTypes = [...new Set(getRequests)];
		let highestCount = 0;

		uniqueRequestTypes?.forEach((requestType) => {
			// this is the number of times the current request type appears in the array
			let count = getRequests?.filter((type) => type === requestType).length;
			// if the current request type appears more times than the previous highest count,
			if (count > highestCount) {
				highestCount = count; // set the current count as the new highest count
				mostFrequentRequestType = requestType; // set the current request type as the most frequent
			}
		});

		// if there are no requests,
		if (uniqueRequestTypes?.length === 0) {
			// set mostFrequentRequestType to 'No requests'
			mostFrequentRequestType = 'No requests';
		}
		// if there is only one request type,
		else if (uniqueRequestTypes?.length === 1) {
			// set mostFrequentRequestType to that request type
			mostFrequentRequestType = uniqueRequestTypes[0];
		}
		// if there are multiple request types with the same highest count,
		else if (highestCount === uniqueRequestTypes?.length) {
			// set mostFrequentRequestType to 'Equal counts for all types'
			mostFrequentRequestType = 'Equal counts for all types';
		}
	}

	$: if (dataType) {
		// CALENDAR CHART
		calendarYearChoices = _.uniqBy(
			dataType?.map((item) => {
				const date = +echarts.time.parse(item?.created_at);
				const formattedDate = echarts.time.format(date, '{yyyy}', false); // format the date to 'yyyy', false means not UTC
				return { name: formattedDate, value: formattedDate };
			}),
			'name'
		);

		// FOR HEATMAP CHART - MOOD FREQUENCY BY DAY AND HOUR

		// apply lowMoodsOnly filter if true
		// which is basically filtering out mood scores from -4 to -1
		let filteredDataType = lowMoodsOnly
			? dataType?.filter((data) => data.mood_score >= -4 && data.mood_score <= -1)
			: dataType;

		// e.g { '0,1': [ { id: ... }, { id: ... } ], '3,14': [ { id: ... } ] }
		const groupedData = _.groupBy(filteredDataType, (data) => {
			const date = new Date(data.created_at);

			// getDay() returns 0 for Sunday, 1 for Monday, etc. (0-6)
			// getHours() returns the hour (0-23)
			return [date.getDay(), date.getHours()];
		});

		// e.g [ [ 14, 2, 4 ], [ ... ] ] -> [ [ hour, weekday, mood occurences ] ]
		heatmapData = _.flatMap(groupedData, (data, key) => {
			// data = [ { id: ... } ], key = '0,1'
			const [day, hour] = key.split(',');
			return [[parseInt(hour), parseInt(day), data.length || '-']];
		});

		// FOR HORIZONTAL MOOD BAR CHART - MOOD FREQUENCY
		const moodCount = {}; // object to store the count of each mood

		/**
		 * example:
		 *
		 * moodCount = {
		 *	Happy: 3,
		 *	Calm: 2,
		 *	Sad: 1,
		 *	Excited: 1,
		 *	Nervous: 1,
		 *	Neutral: 1,
		 *	Bored: 3
		 * }
		 */
		dataType.forEach((item) => {
			const moodScore = item.mood_score; // get mood_score from the current item
			let moodLabel = null;

			// iterate over each key in the mood object (basically mood label:value pairs)
			for (const key in mood) {
				// if the current key's value matches the moodScore,
				// make key the value of moodLabel and break the loop
				if (mood[key] == moodScore) {
					moodLabel = key;
					break;
				}
			}

			// if moodLabel was found, increment its count in moodCount object
			// (or initialize to 1 if not present)
			if (moodLabel) {
				moodCount[moodLabel] = (moodCount[moodLabel] || 0) + 1;
			}
		});

		// make a new object from moodCount,
		// but with entries sorted by their values a.k.a counts
		const sortedMoodCount = Object.fromEntries(
			Object.entries(moodCount).sort(([, curr], [, next]) => curr - next)
		);

		xDataMBC = _.keys(sortedMoodCount); // 'Happy', 'Calm', 'Sad', 'Excited', 'Nervous', 'Neutral', 'Bored
		yDataMBC = _.values(sortedMoodCount); // 3, 2, 1, 1, 1, 1, 3

		// FOR SIMPLE BAR CHART - ASSOCIATED REASON FREQUENCY
		const reasonCount = {}; // object to store the count of each reason

		// iterate over each item in the dataType array
		dataType.forEach((item) => {
			const reasonScore = item.reason_score; // get reason_score from the current item
			let reasonLabel = null; // initialize reasonLabel to null

			for (const key in reason) {
				// iterate over each key in the reason object
				if (reason[key] == reasonScore) {
					// if the current key's value matches the reasonScore,
					reasonLabel = key; // make key the value of reasonLabel and break the loop
					break;
				}
			}

			if (reasonLabel) {
				// if reasonLabel was found, increment its count in reasonCount object
				reasonCount[reasonLabel] = (reasonCount[reasonLabel] || 0) + 1; // (or initialize to 1 if not present)
			}
		});

		// make a new object from reasonCount,
		// but with entries sorted by their values a.k.a counts
		const sortedReasonCount = Object.fromEntries(
			Object.entries(reasonCount).sort(([, curr], [, next]) => curr - next)
		);

		xDataSBC = _.keys(sortedReasonCount);
		yDataSBC = _.values(sortedReasonCount);

		// FOR LINE CHARTS
		if (selectedLineChart === 'today') {
			lineChartTitle = "Today's Moods";
			infoCardTitle = 'Top Mood-Reason';
			// filter the dataType array to only include entries from today
			todaysEntries = _.filter(
				dataType,
				(entry) => dayjs(entry.created_at).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
			);

			timestamps = _.map(todaysEntries, (entry) => dayjs(entry.created_at).format('HH:mm:ss')); // x
			todaysMoodScores = _.map(todaysEntries, (entry) => entry.mood_score); // y

			// map the mood scores of today's entries to an array of mood labels
			const todaysMoodLabels = todaysMoodScores.map(
				(score) => Object.keys(mood).find((key) => mood[key] === parseInt(score)) || '-'
			);

			// map the reason scores of today's entries
			const todaysReasonScores = _.map(todaysEntries, (entry) => entry.reason_score) || [];

			// map the reason scores of today's entries to an array of reason labels
			const todaysReasonLabels = todaysReasonScores.map(
				(score) => Object.keys(reason).find((key) => reason[key] == score) || '-'
			);

			// get the most frequent mood and reason label of today's entries
			const todayMostFreqMood = _.head(_(todaysMoodLabels).countBy().entries().maxBy(_.last));
			const todayMostFreqReason = _.head(_(todaysReasonLabels).countBy().entries().maxBy(_.last));

			if (todayMostFreqMood && todayMostFreqReason) {
				topMoodReason = todayMostFreqMood + ' - ' + todayMostFreqReason;
			}
		} else if (selectedLineChart === 'overall') {
			lineChartTitle = 'Average Moods';
			infoCardTitle = 'Top Mood-Reason';
			// group each mood entries by day
			const groupedByDay = _.groupBy(dataType, (entry) =>
				dayjs(entry.created_at).format('YYYY-MM-DD')
			);

			overall = _.sortBy(_.keys(groupedByDay)); // x, all days recorded (sorted in ascending order)

			// y, average mood score for each day
			overallAverages = Object.values(groupedByDay).map((entries) => {
				const totalMoodScore = entries.reduce((sum, entry) => sum + parseInt(entry.mood_score), 0);
				const averageMoodScore = totalMoodScore / entries.length;
				return averageMoodScore;
			});

			// object that stores number of occurences (value) for each recorded mood_score (key)
			const mostFreqMood = Object.entries(groupedByDay)
				.flatMap(([_, entries]) => entries) // get the entries from groupedByDay object into a single array
				.reduce((moodCounts, entry) => {
					const mood = entry.mood_score;
					moodCounts[mood] = (moodCounts[mood] || 0) + 1; // 0 if mood is not yet in moodCounts, else increment by 1
					return moodCounts;
				}, {});

			// object that stores number of occurences (value) for each recorded reason_score (key)
			const mostFreqReason = Object.entries(groupedByDay)
				.flatMap(([_, entries]) => entries)
				.reduce((reasonCounts, entry) => {
					const reason = entry.reason_score;
					reasonCounts[reason] = (reasonCounts[reason] || 0) + 1; // 0 if mood is not yet in reasonCounts, else increment by 1
					return reasonCounts;
				}, {});

			/*  
				convert the mostFreqMood and mostFreqReason objects into an array of [key, value] pairs, 
				sort it in descending order by value by subtracting nextElem[1] from currentElem[1],
				and take the first pair with shift() which is a method that removes the first element of an array and returns it 
			*/
			const moodValue = Object.entries(mostFreqMood)
				.sort((currentElem, nextElem) => nextElem[1] - currentElem[1])
				.shift();

			const reasonValue = Object.entries(mostFreqReason)
				.sort((currentElem, nextElem) => nextElem[1] - currentElem[1])
				.shift();

			// get the key of the constant mood object that has the value equal to the moodValue
			const overallMostFreqMood = Object.keys(mood).find(
				(key) => mood[key] == parseInt(moodValue[0])
			);

			// get the key of the constant reason object that has the value equal to the reasonValue
			const overallMostFreqReason = Object.keys(reason).find(
				(key) => reason[key] === parseInt(reasonValue[0])
			);

			if (overallMostFreqMood && overallMostFreqReason) {
				topMoodReason = overallMostFreqMood + ' - ' + overallMostFreqReason;
			}
		} else if (selectedLineChart === 'weekly') {
			lineChartTitle = 'Average Moods';
			infoCardTitle = 'Top Mood-Reason';
			// group each mood entries by week using the getWeekNumberString function
			const groupedByWeek = _.groupBy(dataType, (entry) =>
				getWeekNumberString(dayjs(entry.created_at))
			);

			weekly = _.sortBy(_.keys(groupedByWeek)); // x, all weeks recorded (sorted in ascending order)

			// y, get the average mood score for each week
			weeklyAverages = Object.values(groupedByWeek).map((entries) => {
				const totalMoodScore = entries.reduce((sum, entry) => sum + parseInt(entry.mood_score), 0);
				const averageMoodScore = totalMoodScore / entries.length;
				return averageMoodScore;
			});

			// object that stores number of occurences (value) for each recorded mood_score (key)
			const mostFreqMood = Object.entries(groupedByWeek)
				.flatMap(([_, entries]) => entries) // get the entries from groupedByWeek object into a single array
				.reduce((moodCounts, entry) => {
					const mood = entry.mood_score;
					moodCounts[mood] = (moodCounts[mood] || 0) + 1; // 0 if mood is not yet in moodCounts, else increment by 1
					return moodCounts;
				}, {});

			// object that stores number of occurences (value) for each recorded reason_score (key)
			const mostFreqReason = Object.entries(groupedByWeek)
				.flatMap(([_, entries]) => entries)
				.reduce((reasonCounts, entry) => {
					const reason = entry.reason_score;
					reasonCounts[reason] = (reasonCounts[reason] || 0) + 1; // 0 if mood is not yet in reasonCounts, else increment by 1
					return reasonCounts;
				}, {});

			/*  
				convert the mostFreqMood and mostFreqReason objects into an array of [key, value] pairs, 
				sort it in descending order by value by subtracting nextElem[1] from currentElem[1],
				and take the first pair with shift() which is a method that removes the first element of an array and returns it 
			*/
			const moodValue = Object.entries(mostFreqMood)
				.sort((currentElem, nextElem) => nextElem[1] - currentElem[1])
				.shift();

			const reasonValue = Object.entries(mostFreqReason)
				.sort((currentElem, nextElem) => nextElem[1] - currentElem[1])
				.shift();

			// get the key of the constant mood object that has the value equal to the moodValue
			const weeklyMostFreqMood = Object.keys(mood).find(
				(key) => mood[key] == parseInt(moodValue[0])
			);

			// get the key of the constant reason object that has the value equal to the reasonValue
			const weeklyMostFreqReason = Object.keys(reason).find(
				(key) => reason[key] == parseInt(reasonValue[0])
			);

			if (weeklyMostFreqMood && weeklyMostFreqReason) {
				topMoodReason = weeklyMostFreqMood + ' - ' + weeklyMostFreqReason;
			}
		} else if (selectedLineChart === 'monthly') {
			lineChartTitle = 'Average Moods';
			infoCardTitle = 'Top Mood-Reason';
			// group each mood entries by month
			const groupedByMonth = _.groupBy(dataType, (entry) =>
				dayjs(entry.created_at).format('YYYY-MM')
			);

			monthly = _.sortBy(_.keys(groupedByMonth)); // x, all months recorded (sorted in ascending order)

			// y, get the average mood score for each month
			monthlyAverages = Object.values(groupedByMonth).map((entries) => {
				const totalMoodScore = entries.reduce((sum, entry) => sum + parseInt(entry.mood_score), 0);
				const averageMoodScore = totalMoodScore / entries.length;
				return averageMoodScore;
			});

			// object that stores number of occurences (value) for each recorded mood_score (key)
			const mostFreqMood = Object.entries(groupedByMonth)
				.flatMap(([_, entries]) => entries) // get the entries from groupedByWeek object into a single array
				.reduce((moodCounts, entry) => {
					const mood = entry.mood_score;
					moodCounts[mood] = (moodCounts[mood] || 0) + 1; // 0 if mood is not yet in moodCounts, else increment by 1
					return moodCounts;
				}, {});

			// object that stores number of occurences (value) for each recorded reason_score (key)
			const mostFreqReason = Object.entries(groupedByMonth)
				.flatMap(([_, entries]) => entries)
				.reduce((reasonCounts, entry) => {
					const reason = entry.reason_score;
					reasonCounts[reason] = (reasonCounts[reason] || 0) + 1; // 0 if mood is not yet in reasonCounts, else increment by 1
					return reasonCounts;
				}, {});

			/*  
				convert the mostFreqMood and mostFreqReason objects into an array of [key, value] pairs, 
				sort it in descending order by value by subtracting nextElem[1] from currentElem[1],
				and take the first pair with shift() which is a method that removes the first element of an array and returns it 
			*/
			const moodValue = Object.entries(mostFreqMood)
				.sort((currentElem, nextElem) => nextElem[1] - currentElem[1])
				.shift();

			const reasonValue = Object.entries(mostFreqReason)
				.sort((currentElem, nextElem) => nextElem[1] - currentElem[1])
				.shift();

			// get the key of the constant mood object that has the value equal to the moodValue
			const monthlyMostFreqMood = Object.keys(mood).find(
				(key) => mood[key] == parseInt(moodValue[0])
			);

			// get the key of the constant reason object that has the value equal to the reasonValue
			const monthlyMostFreqReason = Object.keys(reason).find(
				(key) => reason[key] == parseInt(reasonValue[0])
			);

			if (monthlyMostFreqMood && monthlyMostFreqReason) {
				topMoodReason = monthlyMostFreqMood + ' - ' + monthlyMostFreqReason;
			}
		} else if (selectedLineChart === 'yearly') {
			lineChartTitle = 'Average Moods';
			infoCardTitle = 'Top Mood-Reason';
			// group each mood entries by year
			const groupedByYear = _.groupBy(dataType, (entry) => dayjs(entry.created_at).format('YYYY'));

			yearly = _.sortBy(_.keys(groupedByYear)); // x, all years recorded (sorted in ascending order)

			// y, get the average mood score for each year
			yearlyAverages = Object.values(groupedByYear).map((entries) => {
				const totalMoodScore = entries.reduce((sum, entry) => sum + parseInt(entry.mood_score), 0);
				const averageMoodScore = totalMoodScore / entries.length;
				return averageMoodScore;
			});

			// object that stores number of occurences (value) for each recorded mood_score (key)
			const mostFreqMood = Object.entries(groupedByYear)
				.flatMap(([_, entries]) => entries) // get the entries from groupedByWeek object into a single array
				.reduce((moodCounts, entry) => {
					const mood = entry.mood_score;
					moodCounts[mood] = (moodCounts[mood] || 0) + 1; // 0 if mood is not yet in moodCounts, else increment by 1
					return moodCounts;
				}, {});

			// object that stores number of occurences (value) for each recorded reason_score (key)
			const mostFreqReason = Object.entries(groupedByYear)
				.flatMap(([_, entries]) => entries) // get the entries from groupedByWeek object into a single array
				.reduce((reasonCounts, entry) => {
					const reason = entry.reason_score;
					reasonCounts[reason] = (reasonCounts[reason] || 0) + 1; // 0 if mood is not yet in reasonCounts, else increment by 1
					return reasonCounts;
				}, {});

			/*  
				convert the mostFreqMood and mostFreqReason objects into an array of [key, value] pairs, 
				sort it in descending order by value by subtracting nextElem[1] from currentElem[1],
				and take the first pair with shift() which is a method that removes the first element of an array and returns it 
			*/
			const moodValue = Object.entries(mostFreqMood)
				.sort((currentElem, nextElem) => nextElem[1] - currentElem[1])
				.shift();

			const reasonValue = Object.entries(mostFreqReason)
				.sort((currentElem, nextElem) => nextElem[1] - currentElem[1])
				.shift();

			// get the key of the constant mood object that has the value equal to the moodValue
			const yearlyMostFreqMood = Object.keys(mood).find(
				(key) => mood[key] == parseInt(moodValue[0])
			);

			// get the key of the constant reason object that has the value equal to the reasonValue
			const yearlyMostFreqReason = Object.keys(reason).find(
				(key) => reason[key] == parseInt(reasonValue[0])
			);

			if (yearlyMostFreqMood && yearlyMostFreqReason) {
				topMoodReason = yearlyMostFreqMood + ' - ' + yearlyMostFreqReason;
			}
		}

		// FOR RADAR CHART - MOOD AND FREQUENCY OF RELATED REASONS
		const moodData = {};

		for (const entry of dataType) {
			// find the mood label corresponding to the student's mood score
			const moodLabel = Object.keys(mood).find((key) => mood[key] == entry.mood_score);

			if (moodLabel) {
				// if mood is found
				// initialize the moodData with the mood label (key) and an array of 0s (value)
				moodData[moodLabel] = Array(Object.keys(reason).length).fill(0);
			}
		}

		// loop through the student mood data and
		// update the mood data object based on the mood and reason scores
		for (const entry of dataType) {
			// find the mood label corresponding to the mood score
			const moodLabel = Object.keys(mood).find((key) => mood[key] == entry.mood_score);

			// calculate the index for the reason score (subtracting 1 to match array indices)
			const reasonIndex = entry.reason_score - 1;

			// if a mood label exists and the reason index is valid (non-negative),
			// increment the corresponding moodData entry
			if (moodLabel && reasonIndex >= 0) {
				moodData[moodLabel][reasonIndex]++;
			}
		}

		// prepare data in a format suitable for a radar chart
		moodRadarData = Object.keys(moodData).map((moodLabel) => ({
			// map mood data to an array of values,
			// representing number of occurences for each reason under each mood
			value: Object.keys(reason).map((reasonLabel) => moodData[moodLabel][reason[reasonLabel] - 1]),
			name: moodLabel
		}));

		let maxCount = 0;
		moodRadarData.forEach((mood) => {
			const moodMax = Math.max(...mood.value);
			if (moodMax > maxCount) maxCount = moodMax;
		});

		// scale factor for the maximum axis value
		const scaleFactor = 1.2;

		// get the maximum axis value by multiplying the maximum count by the scale factor
		const maxAxisValue = Math.ceil(maxCount * scaleFactor);

		// map over the keys of the 'reason' object. for each key ('reasonLabel'),
		// we're also getting its index in the array of keys ('reasonIndex').
		reasonRadarIndicator = Object.keys(reason).map((reasonLabel, reasonIndex) => {
			return {
				name: reasonLabel,
				max: maxAxisValue
			};
		});

		// FOR NEGATIVE HORIZONTAL BAR CHART - MOOD AVERAGES BY COURSE/YEARLVL/REASON
		if (selectedNHBarChart === 'course' && !switchMoodData.guest) {
			// reduce the dataType object to an array of objects
			// where each object represents a course and its mood scores
			const courseData = dataType?.reduce((acc, entry) => {
				// find the course in the accumulator
				const existingCourse = acc.find((item) => item.course === entry.course);

				// if the course exists, push the mood score to its array
				if (existingCourse) {
					existingCourse.mood_scores.push(entry.mood_score);
				} else {
					// if not, create a new object for it and push it to the accumulator
					// which means that this is the first entry for this course
					acc.push({ course: entry.course, mood_scores: [entry.mood_score] });
				}
				return acc;
			}, []);

			// map over the courseData array and get the average mood score for each course
			avgMoodByCourse = courseData?.map((course) => {
				const moodScores = course.mood_scores; // get the mood scores for this course

				if (moodScores.length > 0) {
					// if there are mood scores for this course

					// get the total mood score for this course
					const totalMoodScore = moodScores.reduce((sum, score) => sum + parseInt(score), 0);

					// get the average mood score for this course
					const avgMoodScore = totalMoodScore / moodScores.length;

					if (avgMoodScore < 0) {
						// if average mood score is negative

						// return an object with the average mood score as the value
						// and the position of the label to the right of the bar
						// based on the example from apache echarts
						return { value: avgMoodScore, label: { position: 'right' } };
					} else {
						return avgMoodScore; // else return the average mood score
					}
				} else {
					return null; // if there are no mood scores for this course, return null
				}
			});

			// map over the courseData array and get the course labels
			courseYData = courseData?.map((course) => course.course);
		} else if (selectedNHBarChart === 'year_level' && !switchMoodData.guest) {
			// reduce the dataType object to an array of objects
			// where each object represents a year level and its mood scores
			const yearLevelData = dataType?.reduce((acc, entry) => {
				// find the year level in the accumulator
				const yearLevel = acc.find((item) => item.yearLevel === entry.year_level);

				if (yearLevel) {
					// if the year level exists, push the mood score to its array
					yearLevel.mood_scores.push(entry.mood_score);
				} else {
					// if not, create a new object for it and push it to the accumulator
					// which means that this is the first entry for this year level
					acc.push({ yearLevel: entry.year_level, mood_scores: [entry.mood_score] });
				}

				return acc; // return the accumulator
			}, []);

			// map over the yearLevelData array and get the average mood score for each year level
			avgMoodByYearLvl = yearLevelData?.map((yearLevel) => {
				const moodScores = yearLevel.mood_scores; // get the mood scores for this year level

				if (moodScores.length > 0) {
					// if there are mood scores for this year level

					// get the total mood score for this year level
					const totalMoodScore = moodScores.reduce((sum, score) => sum + parseInt(score), 0);

					// get the average mood score for this year level
					const avgMoodScore = totalMoodScore / moodScores.length;

					if (avgMoodScore < 0) {
						// if average mood score is negative

						// return an object with the average mood score as the value
						// and the position of the label to the right of the bar
						return { value: avgMoodScore, label: { position: 'right' } };
					} else {
						return avgMoodScore; // else return the average mood score
					}
				} else {
					return null; // if there are no mood scores for this year level, return null
				}
			});

			// map over the yearLevelData array and get the year level labels
			yearLvlYData = yearLevelData?.map((yearLevel) => {
				if (typeof yearLevel.yearLevel === 'number') {
					// if year level is a number
					return yearLvl[yearLevel.yearLevel]; // get the year level label from the yearLvl object
				} else {
					// if year level is not a number, remove the ' Level' from the string
					return yearLevel.yearLevel.replace(' Level', '');
				}
			});
		} else if (selectedNHBarChart === 'reason') {
			// reduce the dataType object to an array of objects
			// where each object represents a reason and its mood scores
			const reasonData = dataType?.reduce((acc, entry) => {
				// get the reason and mood scores from the current entry
				const { reason_score, mood_score } = entry;

				// find the reason in the accumulator
				const existingReason = acc.find((item) => item.reason_score === reason_score);

				if (existingReason) {
					// if the reason exists already, push the mood score to its array
					existingReason.mood_scores.push(mood_score);
				} else {
					// if not, get the reason label from the reason object
					// and push a new object for it to the accumulator
					// since this is the first entry for this reason
					const reason_label = Object.keys(reason).find((key) => reason[key] === reason_score);
					acc.push({ reason_label, reason_score, mood_scores: [mood_score] });
				}
				return acc; // return the accumulator
			}, []);

			// map over the reasonData array and get the average mood score for each reason
			avgMoodByReason = reasonData?.map((reason) => {
				// get the mood scores for this reason
				const moodScores = reason.mood_scores;

				if (moodScores.length > 0) {
					// if there are mood scores for this reason,

					// get the total mood score for this reason
					// and get the average mood score for this reason
					const totalMoodScore = moodScores.reduce((sum, score) => sum + parseInt(score), 0);
					const avgMoodScore = totalMoodScore / moodScores.length;

					// if average mood score is negative,
					if (avgMoodScore < 0) {
						// return an object with the average mood score as the value
						// and the position of the label to the right of the bar
						return { value: avgMoodScore, label: { position: 'right' } };
					} else {
						return avgMoodScore; // else return the average mood score
					}
				} else {
					return null; // if there are no mood scores for this reason, return null
				}
			});

			// map over the reasonData array and get the reason labels
			reasonYData = reasonData?.map((reason) => reason.reason_label);
		}

		// LINE CHART BUTTON COLORS
		lcBtnColors = {
			today: selectedLineChart === 'today' ? 'blue' : 'light',
			overall: selectedLineChart === 'overall' ? 'blue' : 'light',
			weekly: selectedLineChart === 'weekly' ? 'blue' : 'light',
			monthly: selectedLineChart === 'monthly' ? 'blue' : 'light',
			yearly: selectedLineChart === 'yearly' ? 'blue' : 'light'
		};

		// NEGATIVE HORIZONTAL BAR CHART BUTTON COLORS
		nhbcBtnColors = {
			course: selectedNHBarChart === 'course' ? 'blue' : 'light',
			year_level: selectedNHBarChart === 'year_level' ? 'blue' : 'light',
			reason: selectedNHBarChart === 'reason' ? 'blue' : 'light'
		};

		// SIMPLE BAR CHART BUTTON COLORS
		sbcBtnColors = {
			min: selectedReasonMarkType === 'min' ? 'blue' : 'light',
			max: selectedReasonMarkType === 'max' ? 'blue' : 'light',
			average: selectedReasonMarkType === 'average' ? 'blue' : 'light'
		};

		// MARK TYPES FOR SIMPLE BAR CHART
		if (selectedReasonMarkType === 'average') {
			sbcMarkType = 'average';
		} else if (selectedReasonMarkType === 'min') {
			sbcMarkType = 'min';
		} else if (selectedReasonMarkType === 'max') {
			sbcMarkType = 'max';
		}

		// SIMPLE BAR CHART - # OF MOOD ENTRIES PER WEEKDAY
		// filter the dataType array to only include entries with the selected mood score
		let filteredSelectedMoodData = dataType?.filter(
			(data) => data.mood_score === selectedMoodScore
		);

		// group the filtered data by the day of the week when each entry was created
		const groupedDays = _.groupBy(filteredSelectedMoodData, (data) => {
			const date = new Date(data.created_at);
			return date.getDay();
		});

		// count the number of entries for each day of the week
		const entriesByWeekday = _.mapValues(groupedDays, (data) => data.length);

		// map the day numbers to their respective names
		xMoodWeek = _.keys(entriesByWeekday).map((dayNumber) => daysShort[dayNumber]);

		// store the counts of entries for each day of the week
		yMoodWeekEntry = _.values(entriesByWeekday);

		// ----------------------------

		// SIMPLE BAR CHART - PERCENTAGE OF REASONS OF THE SELECTED MOOD
		// group the filtered data by the reason score
		const reasonCounts = _.countBy(filteredSelectedMoodData, 'reason_score');

		// calculate the percentage of total entries that each reason score represents
		const reasonPercentages = _.mapValues(
			reasonCounts,
			(count) => (count / filteredSelectedMoodData.length) * 100
		);

		// get the percentage values and reason labels
		yReasonPercentage = _.values(reasonPercentages);
		xReason = Object.keys(reasonPercentages).map((key) => {
			return Object.keys(reason).find((label) => reason[label] == key);
		});
	}

	$: if (studentMoodData) {
		recentStudent = studentMoodData?.slice(-1)[0]?.student_id; // for an info card
	}

	$: if (importExportModalState) {
		let keys = Object.keys(dataType[0]);
		keys[keys.indexOf('mood_score')] = 'mood';
		keys[keys.indexOf('reason_score')] = 'reason';
		keys[keys.indexOf('created_at')] = 'datetime';

		let values = dataType?.map((obj) => {
			let newObj = { ...obj };

			newObj.mood = Object.keys(mood).find((key) => mood[key] === Number(obj.mood_score));
			newObj.reason = Object.keys(reason).find((key) => reason[key] === Number(obj.reason_score));

			newObj.datetime = displayTime(obj.created_at);

			delete newObj.created_at;
			delete newObj.mood_score;
			delete newObj.reason_score;

			if (newObj.created_by == null) newObj.created_by = 'KIOSK';

			let orderedObj = {};

			for (let key of keys) {
				orderedObj[key] = newObj[key];
			}

			newObj = orderedObj;
			return Object.values(newObj);
		});

		exportMoodsData.update(() => [keys, ...values]);
	}

	$: if (typeof window !== 'undefined') {
		if (tableRef && $focusTable) {
			window?.scrollTo(0, tableRef?.offsetTop);
			focusTable?.update((value) => (value = false));
		}
	}
</script>

<svelte:head>
	<title>Dashboard</title>
</svelte:head>

<!-- Student/Anonymous/Guest Floating Toggle Button -->
{#if studentMoodData?.length > 0 || anonMoodData?.length > 0}
	<Tooltip
		placement="left"
		class="fixed z-50 overflow-hidden"
		triggeredBy="#switchData"
		on:hover={(e) => e.preventDefault()}
	>
		Toggle between student, anonymous, and guest mood data
	</Tooltip>

	<div
		id="switchData"
		class="flex justify-evenly space-x-2 bg-slate-900 p-2 rounded-full w-fit fixed right-4 bottom-4 z-20"
	>
		<button
			class={switchMoodData.student ? toggleBtnClass.active : toggleBtnClass.inactive}
			on:click={() => {
				switchMoodData = { student: true, anon: false, guest: false };
			}}
		>
			<p
				class={switchMoodData.student
					? 'text-white font-semibold tracking-widest'
					: 'text-slate-500 tracking-widest'}
			>
				STUDENT
			</p>
		</button>
		<button
			class={switchMoodData.anon ? toggleBtnClass.active : toggleBtnClass.inactive}
			on:click={() => {
				switchMoodData = { student: false, anon: true, guest: false };
			}}
		>
			<p
				class={switchMoodData.anon
					? 'text-white font-semibold tracking-widest'
					: 'text-slate-500 tracking-widest'}
			>
				ANON
			</p>
		</button>
		<button
			class={switchMoodData.guest ? toggleBtnClass.active : toggleBtnClass.inactive}
			on:click={() => {
				switchMoodData = { student: false, anon: false, guest: true };
			}}
		>
			<p
				class={switchMoodData.guest
					? 'text-white font-semibold tracking-widest'
					: 'text-slate-500 tracking-widest'}
			>
				GUEST
			</p>
		</button>
	</div>
{/if}

<div class="bg-zinc-100 flex flex-col space-y-4 mx-4 pt-4 mb-4">
	<!-- Card Section -->
	<div class="flex flex-row flex-wrap flex-1 justify-between w-full gap-4">
		<CardInfo purpose="time" title="" bind:data={current} />
		<CardInfo purpose="recentStudent" title="Recent Student ID:" bind:data={recentStudent} />
		<CardInfo purpose="" title="Most Requested Help:" bind:data={mostFrequentRequestType} />
		<CardInfo purpose="" title={infoCardTitle} bind:data={topMoodReason} />
		<CardInfo purpose="" title="Number of Entries:" bind:data={dataType.length} />

		<Tooltip
			triggeredBy="#importExport"
			placement="left"
			on:hover={(e) => e.preventDefault()}
			class="z-50 relative">Import/Export Mood Data</Tooltip
		>
		<Tooltip
			triggeredBy="#filterCharts"
			placement="left"
			on:hover={(e) => e.preventDefault()}
			class="z-50 relative">Filter Charts</Tooltip
		>

		<Button
			id="importExport"
			class="w-full rounded-md flex flex-1 gap-2"
			color="green"
			shadow
			on:click={() => (importExportModalState = true)}
		>
			<FileImportSolid tabindex="-1" class="text-white focus:outline-none" />
		</Button>

		<Button
			id="filterCharts"
			class="w-full rounded-md flex flex-1 gap-2"
			shadow
			on:click={() => (chartFilterModalState = true)}
		>
			<AdjustmentsVerticalSolid tabindex="-1" class="focus:outline-none" />
		</Button>
	</div>

	<!--  -->
	<div class="flex flex-row flex-wrap gap-4">
		<div
			id="overallMoodFreqHBC"
			class="flex p-4 pt-5 bg-white rounded drop-shadow-md hover:ring-1 flex-wrap justify-center pl-6 w-full flex-1"
		>
			{#if dataType?.length == 0}
				<div
					class="flex flex-col justify-center items-center space-y-5"
					style="width: 225px; min-width: 100%; height:350px;"
				>
					<RocketOutline class="h-20 w-20" />
					<p class="text-sm text-slate-500">Data currently <strong>unavailable</strong>.</p>
				</div>
			{:else}
				<HorizontalMoodBarChart
					title="Mood Frequency"
					xAxisName="Frequency"
					yAxisName=""
					bind:xData={xDataMBC}
					bind:yData={yDataMBC}
					elementID="dashboardHBC"
					style="width: 225px; min-width: 100%; height:350px;"
				/>
			{/if}
		</div>

		<div
			id="lineChartMood"
			class="flex flex-1 p-4 w-full bg-white rounded drop-shadow-md hover:ring-1 flex-wrap justify-center"
		>
			<div class="flex flex-col space-y-3">
				{#if dataType?.length > 0}
					<ButtonGroup
						class="inline-flex rounded-lg shadow-sm self-center flex-wrap justify-center"
					>
						<Button
							class="sm:text-xs"
							disabled={dataType.length == 0}
							color={lcBtnColors.today}
							on:click={() => selectLineChart('today')}
						>
							Today
						</Button>
						<Button
							class="sm:text-xs"
							id="weeklySLC"
							disabled={dataType.length == 0}
							color={lcBtnColors.weekly}
							on:click={() => selectLineChart('weekly')}
						>
							Weekly
						</Button>
						<Button
							class="sm:text-xs"
							id="monthlySLC"
							disabled={dataType.length == 0}
							color={lcBtnColors.monthly}
							on:click={() => selectLineChart('monthly')}
						>
							Monthly
						</Button>
						<Button
							class="sm:text-xs"
							id="yearlySLC"
							disabled={dataType.length == 0}
							color={lcBtnColors.yearly}
							on:click={() => selectLineChart('yearly')}
						>
							Yearly
						</Button>
						<Button
							class="sm:text-xs"
							disabled={dataType.length == 0}
							color={lcBtnColors.overall}
							on:click={() => selectLineChart('overall')}
						>
							Overall
						</Button>
					</ButtonGroup>
					{#if selectedLineChart === 'today'}
						<LineChart
							bind:xData={timestamps}
							bind:yData={todaysMoodScores}
							elementID="dashboardTLC"
							style="width: 400px; min-width: 100%; height:300px;"
						/>
					{:else if selectedLineChart === 'overall'}
						<LineChart
							bind:xData={overall}
							bind:yData={overallAverages}
							elementID="dashboardDLC"
							style="width: 400px; min-width: 100%; height:300px;"
						/>
					{:else if selectedLineChart === 'weekly'}
						<LineChart
							bind:xData={weekly}
							bind:yData={weeklyAverages}
							elementID="dashboardWLC"
							style="width: 400px; min-width: 100%; height:300px;"
						/>
					{:else if selectedLineChart === 'monthly'}
						<LineChart
							bind:xData={monthly}
							bind:yData={monthlyAverages}
							elementID="dashboardMLC"
							style="width: 400px; min-width: 100%; height:300px;"
						/>
					{:else if selectedLineChart === 'yearly'}
						<LineChart
							bind:xData={yearly}
							bind:yData={yearlyAverages}
							elementID="dashboardYLC"
							style="width: 400px; min-width: 100%; height:300px;"
						/>
					{/if}
				{:else}
					<div
						class="flex flex-col justify-center items-center space-y-5"
						style="width: 400px; min-width: 100%; height:300px;"
					>
						<RocketOutline class="h-20 w-20" />
						<p class="text-sm text-slate-500">Data currently <strong>unavailable</strong>.</p>
					</div>
				{/if}
			</div>
		</div>

		<div
			id="moodAvgCourseYrReason"
			class="flex flex-col flex-1 p-4 w-full bg-white rounded items-center drop-shadow-md hover:ring-1"
		>
			{#if dataType?.length > 0}
				{#if switchMoodData.guest}
					<Button
						class="sm:text-xs"
						color={nhbcBtnColors.reason}
						on:click={() => selectNHBarChart('reason')}
					>
						Reason
					</Button>
				{:else}
					<ButtonGroup class="self-center">
						<Button
							class="sm:text-xs"
							color={nhbcBtnColors.course}
							on:click={() => selectNHBarChart('course')}
						>
							Course
						</Button>
						<Button
							class="sm:text-xs"
							color={nhbcBtnColors.year_level}
							on:click={() => selectNHBarChart('year_level')}
						>
							Year Level
						</Button>
						<Button
							class="sm:text-xs"
							color={nhbcBtnColors.reason}
							on:click={() => selectNHBarChart('reason')}
						>
							Reason
						</Button>
					</ButtonGroup>
				{/if}
				<div class="mt-3 items-center">
					{#if selectedNHBarChart === 'course'}
						<NegativeBarChart
							bind:xData={avgMoodByCourse}
							bind:yData={courseYData}
							elementID="courseBarChart-1"
							style="width: 350px; min-width: 100%; height:300px;"
						/>
					{:else if selectedNHBarChart === 'year_level'}
						<NegativeBarChart
							bind:xData={avgMoodByYearLvl}
							bind:yData={yearLvlYData}
							elementID="yrLvlBarChart-1"
							style="width: 350px; min-width: 100%; height:300px;"
						/>
					{:else if selectedNHBarChart === 'reason'}
						<NegativeBarChart
							bind:xData={avgMoodByReason}
							bind:yData={reasonYData}
							elementID="reasonBarChart-1"
							style="width: 350px; min-width: 100%; height:300px;"
						/>
					{/if}
				</div>
			{:else}
				<div
					class="flex flex-col justify-center items-center space-y-5"
					style="width: 350px; min-width: 100%; height:300px;"
				>
					<RocketOutline class="h-20 w-20" />
					<p class="text-sm text-slate-500">Data currently <strong>unavailable</strong>.</p>
				</div>
			{/if}
		</div>

		<div
			id="reasonFreqBC"
			class="flex flex-1 p-4 justify-center w-full bg-white rounded drop-shadow-md hover:ring-1"
		>
			<div class="flex flex-col space-y-3">
				{#if dataType?.length > 0}
					<ButtonGroup class="self-center">
						<Button
							class="sm:text-xs"
							color={sbcBtnColors.average}
							on:click={() => selectReasonMarkType('average')}
						>
							Average
						</Button>
						<Button
							class="sm:text-xs"
							color={sbcBtnColors.max}
							on:click={() => selectReasonMarkType('max')}
						>
							Max
						</Button>
						<Button
							class="sm:text-xs"
							color={sbcBtnColors.min}
							on:click={() => selectReasonMarkType('min')}
						>
							Min
						</Button>
					</ButtonGroup>
					<SimpleBarChart
						xData={xDataSBC}
						xType="category"
						xName="Reason"
						yData={yDataSBC}
						yType="value"
						yName="Frequency"
						yAxisRotate="90"
						title="Reason Frequency"
						markType={sbcMarkType}
						elementID="reasonSBC"
						style="width: 350px; min-width: 100%; height:300px;"
					/>
				{:else}
					<div
						class="flex flex-col justify-center items-center space-y-5"
						style="width: 350px; min-width: 100%; height:300px;"
					>
						<RocketOutline class="h-20 w-20" />
						<p class="text-sm text-slate-500">Data currently <strong>unavailable</strong>.</p>
					</div>
				{/if}
			</div>
		</div>

		<div
			id="moodLoginHrsHistogram"
			class="flex flex-1 p-4 w-full bg-white rounded justify-center items-center drop-shadow-md hover:ring-1"
		>
			{#if dataType?.length > 0}
				<Histogram
					data={dataType}
					title="Mood Login Hours (24-hour)"
					elementID="LoginHrsHistogram"
					style="width: 300px; min-width: 100%; height:300px;"
				/>
			{:else}
				<div
					class="flex flex-col justify-center items-center space-y-5"
					style="width: 300px; min-width: 100%; height:300px;"
				>
					<RocketOutline class="h-20 w-20" />
					<p class="text-sm text-slate-500">Data currently <strong>unavailable</strong>.</p>
				</div>
			{/if}
		</div>

		<div
			id="low-moods"
			bind:this={tableRef}
			class="flex flex-col flex-1 justify-start bg-white rounded !p-4 drop-shadow-md w-full hover:ring-1 items-center flex-wrap space-y-4"
		>
			<p class="text-center my-3 break-words text-sm font-normal text-gray-500 dark:text-gray-400">
				(Students with low mood entries for <span class="font-semibold">atleast 4 days</span>)
			</p>
			<Table
				striped
				divClass="relative overflow-x-auto shadow-md"
				class="table-auto overflow-x-auto min-w-full"
			>
				<TableHead class="bg-zinc-100 border border-t border-zinc-300 top-0 sticky text-center">
					<TableHeadCell>ID #</TableHeadCell>
					<TableHeadCell>Date</TableHeadCell>
					<TableHeadCell>Avg. Mood</TableHeadCell>
					<TableHeadCell>Prevailing Reason</TableHeadCell>
				</TableHead>
				<TableBody tableBodyClass="divide-y bg-white">
					{#if $consistentLowMoods === undefined || $consistentLowMoods.length === 0}
						<TableBodyRow class="text-center">
							<TableBodyCell>No data</TableBodyCell>
							<TableBodyCell>No data</TableBodyCell>
							<TableBodyCell>No data</TableBodyCell>
							<TableBodyCell>No data</TableBodyCell>
						</TableBodyRow>
					{:else}
						{#each $consistentLowMoods as student}
							{#each student.streaks as streak}
								<TableBodyRow class="text-center">
									<TableBodyCell class="underline">
										<a
											class="hover:underline"
											href="/students/mood-analytics?search={student.studentId}"
											rel="noopener noreferrer"
										>
											{student.studentId}
										</a>
									</TableBodyCell>
									<TableBodyCell class="text-center">
										{streak.startDate} - {streak.endDate}
									</TableBodyCell>
									<TableBodyCell class="text-center">
										{Object.keys(mood).find(
											(key) =>
												mood[key] ===
												Math.round(
													streak.moodScores.reduce((accum, elem) => accum + parseInt(elem), 0) /
														streak.moodScores.length
												)
										)}
									</TableBodyCell>
									<TableBodyCell class="text-center">
										{(() => {
											const labelCounts = {};

											// iterate through each reason label in the streak
											streak.reasonLabels.forEach((reasonLabel) => {
												// increment the count for the current reason label in labelCounts
												// if it doesn't exist in labelCounts yet, initialize it to 0 first
												labelCounts[reasonLabel] = (labelCounts[reasonLabel] || 0) + 1;
											});

											// get the reason label with the highest count
											const mostFrequentReason = Object.keys(labelCounts).reduce(
												(a, b) => (labelCounts[a] > labelCounts[b] ? a : b),
												null
											);

											// if there is a most frequent reason and it occurs more than once, return it
											if (mostFrequentReason && labelCounts[mostFrequentReason] > 1) {
												return mostFrequentReason;
											} else {
												return 'Various Reasons';
											}
										})()}
									</TableBodyCell>
								</TableBodyRow>
							{/each}
						{/each}
					{/if}
				</TableBody>
			</Table>
		</div>

		<div id="moodFreqHeatmap" class="hidden">
			{#if dataType.length > 0}
				<div class="flex flex-col justify-evenly space-y-4">
					<div class="flex items-center justify-end mr-1.5 space-x-2">
						<Checkbox
							class="cursor-pointer mr-0"
							bind:value={lowMoodsOnly}
							on:change={() => (lowMoodsOnly = !lowMoodsOnly)}
						/>
						<p class="text-sm font-normal text-gray-500 dark:text-gray-400">Low Moods Only</p>
					</div>
					<HeatmapChart
						{heatmapData}
						title="Mood Frequency"
						elementID="dashboardHM"
						style="width: 500px; min-width: 100%; height:325px;"
					/>
				</div>
			{:else}
				<div
					class="flex flex-col justify-center items-center space-y-5"
					style="width: 500px; min-width: 100%; height:325px;"
				>
					<RocketOutline class="h-20 w-20" />
					<p class="text-sm text-slate-500">Data currently <strong>unavailable</strong>.</p>
				</div>
			{/if}
		</div>

		<div id="moodReasonRadarChart" class="hidden">
			{#if dataType?.length > 0}
				<RadarChart
					title="Mood and Frequency of Related Reasons"
					bind:data={moodRadarData}
					bind:indicator={reasonRadarIndicator}
					elementID="moodReasonRadar"
					style="width: 650px; min-width: 100%; height:360px;"
				/>
			{:else}
				<div
					class="flex flex-col justify-center items-center space-y-5"
					style="width: 650px; min-width: 100%; height:360px;"
				>
					<RocketOutline class="h-20 w-20" />
					<p class="text-sm text-slate-500">Data currently <strong>unavailable</strong>.</p>
				</div>
			{/if}
		</div>

		<div id="moodCalendar" class="hidden">
			<div class="flex flex-col mt-1 px-4">
				{#if dataType?.length > 0}
					<div class="flex flex-row justify-between space-x-3 mt-4">
						<div class="flex flex-col justify-start items-center mt-2">
							<p class="font-semibold self-start">Mood-Reason Calendar</p>
							<p class="text-xs">
								(Please select the calendar year, mood and the associated reason.)
							</p>
						</div>
						<div class="flex flex-row space-x-3">
							<Select
								placeholder="Year"
								class="font-normal h-11 bg-white"
								items={calendarYearChoices}
								bind:value={selectedCalendarYear}
							/>
							<Select
								placeholder="Mood"
								class="font-normal h-11 bg-white"
								items={moodChoices}
								bind:value={selectedMoodCalendar}
							/>
							<Select
								placeholder="Reason"
								class="font-normal h-11 bg-white"
								items={reasonChoices}
								bind:value={selectedReasonCalendar}
							/>
						</div>
					</div>
					<div class="items-center">
						<CalendarChart
							data={dataType}
							seriesName="Mood-Reason Calendar"
							bind:calendarYear={selectedCalendarYear}
							bind:reasonType={selectedReasonCalendar}
							bind:moodType={selectedMoodCalendar}
							elementID="moodCalendarChart"
							style="width: 1200px; min-width: 100%; height:300px;"
						/>
					</div>
				{:else}
					<div class="flex flex-col justify-center items-center w-full space-y-5 my-4">
						<RocketOutline class="h-20 w-20" />
						<p class="text-sm text-slate-500">Data currently <strong>unavailable</strong>.</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<Modal
	class="flex relative max-w-fit max-h-full"
	title="Toggle a chart"
	bind:open={chartFilterModalState}
>
	<div class="flex flex-col gap-3">
		<p class="text-sm">Navigate to:</p>
		<a href="#overallMoodFreqHBC" on:click={scrollIntoView} class="text-gray-700">
			<div class="flex gap-3 items-center">
				<ChartMixedOutline class="focus:outline-none h-5 w-5 text-gray-700" />
				<p class="text-sm">Overall Mood Frequency Chart</p>
			</div>
		</a>
		<a href="#lineChartMood" on:click={scrollIntoView} class="text-gray-700">
			<div class="flex gap-3 items-center">
				<ChartOutline class="focus:outline-none h-5 w-5 text-gray-700" />
				<p class="text-sm">Mood Line Charts</p>
			</div>
		</a>
		<a href="#moodAvgCourseYrReason" on:click={scrollIntoView} class="text-gray-700">
			<div class="flex gap-3 items-center">
				<ChartMixedOutline class="focus:outline-none h-5 w-5 text-gray-700" />
				<p class="text-sm">Mood Averages (Course/Year Level/Reason)</p>
			</div>
		</a>
		<a href="#reasonFreqBC" on:click={scrollIntoView} class="text-gray-700">
			<div class="flex gap-3 items-center">
				<ChartMixedOutline class="focus:outline-none h-5 w-5 text-gray-700" />
				<p class="text-sm">Associated Reason Frequency Chart</p>
			</div>
		</a>
		<a href="#moodLoginHrsHistogram" on:click={scrollIntoView} class="text-gray-700">
			<div class="flex gap-3 items-center">
				<ChartMixedOutline class="focus:outline-none h-5 w-5 text-gray-700" />
				<p class="text-sm">Mood Login Hours (in 24-hour format)</p>
			</div>
		</a>
		<a href="#low-moods" on:click={scrollIntoView} class="text-gray-700">
			<div class="flex gap-3 items-center">
				<TableColumnOutline class="focus:outline-none h-5 w-5 text-gray-700" />
				<p class="text-sm">Table of Students with Consistent Low Moods</p>
			</div>
		</a>

		<p class="mt-2 text-sm">Additional charts:</p>
		<Checkbox
			id="heatmap"
			bind:checked={heatmap}
			on:change={(event) => filterChart(heatmap, event)}
		>
			<a href="#moodFreqHeatmap" on:click={scrollIntoView}>
				<div class="flex gap-3 items-center">
					<p class="text-sm">Mood Frequency by Day and Hour Chart</p>
				</div>
			</a>
		</Checkbox>
		<Checkbox id="radar" bind:checked={radar} on:change={(event) => filterChart(radar, event)}>
			<a href="#moodReasonRadarChart" on:click={scrollIntoView}>
				<div class="flex gap-3 items-center">
					<p class="text-sm">Mood and Frequency of Related Reasons Chart</p>
				</div>
			</a>
		</Checkbox>
		<Checkbox
			id="moodReasonCalendarChart"
			bind:checked={moodReasonCalendarChart}
			on:change={(event) => filterChart(moodReasonCalendarChart, event)}
		>
			<a href="#moodCalendar" on:click={scrollIntoView}>
				<div class="flex gap-3 items-center">
					<p class="text-sm">Mood Calendar</p>
				</div>
			</a>
		</Checkbox>
	</div>
</Modal>

<Modal class="flex relative w-full max-h-full" bind:open={importExportModalState}>
	<Tabs style="underline" contentClass="bg-white rounded-lg" divider={false}>
		<TabItem open title="FORMAT FOR IMPORT">
			<div class="flex flex-col gap-y-4">
				<p class="text-sm text-black uppercase font-semibold inline-flex">
					Student:<button id="b3">
						<QuestionCircleSolid class="w-5 h-5 ms-1.5" />
						<span class="sr-only">Show information</span>
					</button>
				</p>
				<Popover
					triggeredBy="#b3"
					class="w-72 z-20 text-sm font-light text-gray-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
					placement="right"
				>
					<div class="p-3 space-y-2">
						<h3 class="font-semibold text-gray-900 dark:text-white">Mood Scores</h3>
						<p class="text-xs">
							Based on{' '}<a
								href="https://diopd.org/pick-a-mood/"
								class="text-primary-600 font-medium dark:text-primary-500 dark:hover:text-primary-600 hover:text-primary-700"
							>
								Pick A Mood
							</a> pictorial scale.
						</p>

						<p class="text-xs">
							Sad <span class="font-medium">(-4)</span> - Annoyed
							<span class="font-medium">(-3)</span>
							- Nervous <span class="font-medium">(-2)</span> - Bored
							<span class="font-medium">(-1)</span>
							- Neutral <span class="font-medium">(0)</span> - Calm
							<span class="font-medium">(1)</span>
							- Relaxed
							<span class="font-medium">(2)</span> - Happy <span class="font-medium">(3)</span> -
							Excited <span class="font-medium">(4)</span>
						</p>
					</div>
				</Popover>
				<Table
					striped
					divClass="relative overflow-x-auto shadow-md"
					class="table-auto overflow-x-auto min-w-full"
				>
					<TableHead
						class="bg-zinc-100 border border-t border-zinc-300 top-0 sticky lowercase text-center"
					>
						<TableHeadCell>student_id</TableHeadCell>
						<TableHeadCell>mood_id</TableHeadCell>
						<TableHeadCell>reason_id</TableHeadCell>
						<TableHeadCell>created_at</TableHeadCell>
					</TableHead>
					<TableBody tableBodyClass="divide-y bg-white">
						<TableBodyRow class="border border-zinc-300 text-center">
							<TableBodyCell>2020303123</TableBodyCell>
							<TableBodyCell>1</TableBodyCell>
							<TableBodyCell>4</TableBodyCell>
							<TableBodyCell>2024-01-30 13:01:20</TableBodyCell>
						</TableBodyRow>
					</TableBody>
				</Table>
				<p class="text-sm text-black uppercase font-semibold">Anon:</p>
				<Table
					striped
					divClass="relative overflow-x-auto shadow-md"
					class="table-auto overflow-x-auto min-w-full"
				>
					<TableHead
						class="bg-zinc-100 border border-t border-zinc-300 top-0 sticky lowercase text-center"
					>
						<TableHeadCell>mood_score</TableHeadCell>
						<TableHeadCell>reason_score</TableHeadCell>
						<TableHeadCell>course</TableHeadCell>
						<TableHeadCell>year_level</TableHeadCell>
						<TableHeadCell>created_at</TableHeadCell>
					</TableHead>
					<TableBody tableBodyClass="divide-y bg-white">
						<TableBodyRow class="border border-zinc-300 text-center">
							<TableBodyCell>1</TableBodyCell>
							<TableBodyCell>4</TableBodyCell>
							<TableBodyCell>BSIT</TableBodyCell>
							<TableBodyCell>4</TableBodyCell>
							<TableBodyCell>2024-01-30 13:01:20</TableBodyCell>
						</TableBodyRow>
					</TableBody>
				</Table>
				<p class="text-sm text-black uppercase font-semibold">Guest:</p>
				<Table
					striped
					divClass="relative overflow-x-auto shadow-md"
					class="table-auto overflow-x-auto min-w-full"
				>
					<TableHead
						class="bg-zinc-100 border border-t border-zinc-300 top-0 sticky lowercase text-center"
					>
						<TableHeadCell>mood_score</TableHeadCell>
						<TableHeadCell>reason_score</TableHeadCell>
						<TableHeadCell>created_at</TableHeadCell>
					</TableHead>
					<TableBody tableBodyClass="divide-y bg-white">
						<TableBodyRow class="border border-zinc-300 text-center">
							<TableBodyCell>1</TableBodyCell>
							<TableBodyCell>4</TableBodyCell>
							<TableBodyCell>2024-01-30 13:01:20</TableBodyCell>
						</TableBodyRow>
					</TableBody>
				</Table>
			</div>
		</TabItem>

		<TabItem title="IMPORT">
			<Label for="with_helper" class="pb-2">Upload file (.xlsx file only):</Label>
			<Fileupload class="w-full" id="with_helper" accept=".xlsx" on:change={handleImport} />
			{#if importError}
				<p class="mt-3 text-red-500 text-sm">
					<span class="font-semibold">ERROR: </span>{importError}
				</p>
			{/if}
		</TabItem>

		<TabItem
			title={'EXPORT ' + currentDataView.toUpperCase() + ' MOOD DATA'}
			class="space-y-4 items-center"
		>
			<p class="text-sm text-black uppercase font-semibold mb-2">(preview):</p>
			<Table
				striped
				divClass="relative overflow-x-auto shadow-md"
				class="table-auto overflow-x-auto min-w-full"
			>
				{#if currentDataView == 'Student'}
					<TableHead class="bg-zinc-100 border border-t border-zinc-300 top-0 sticky text-center">
						<TableHeadCell>#</TableHeadCell>
						<TableHeadCell>Student ID</TableHeadCell>
						<TableHeadCell>Name</TableHeadCell>
						<TableHeadCell>Course</TableHeadCell>
						<TableHeadCell>Year Level</TableHeadCell>
						<TableHeadCell>College</TableHeadCell>
						<TableHeadCell>Mood</TableHeadCell>
						<TableHeadCell>Reason</TableHeadCell>
						<TableHeadCell>Date</TableHeadCell>
						<TableHeadCell>Time</TableHeadCell>
						<TableHeadCell>Created By</TableHeadCell>
					</TableHead>
				{:else if currentDataView == 'Anon'}
					<TableHead class="bg-zinc-100 border border-t border-zinc-300 top-0 sticky text-center">
						<TableHeadCell>#</TableHeadCell>
						<TableHeadCell>Mood</TableHeadCell>
						<TableHeadCell>Reason</TableHeadCell>
						<TableHeadCell>Date</TableHeadCell>
						<TableHeadCell>Time</TableHeadCell>
						<TableHeadCell>Course</TableHeadCell>
						<TableHeadCell>Year Level</TableHeadCell>
						<TableHeadCell>Created By</TableHeadCell>
					</TableHead>
				{:else if currentDataView == 'Guest'}
					<TableHead class="bg-zinc-100 border border-t border-zinc-300 top-0 sticky text-center">
						<TableHeadCell>#</TableHeadCell>
						<TableHeadCell>Mood</TableHeadCell>
						<TableHeadCell>Reason</TableHeadCell>
						<TableHeadCell>Date</TableHeadCell>
						<TableHeadCell>Time</TableHeadCell>
						<TableHeadCell>Created By</TableHeadCell>
					</TableHead>
				{/if}
				<TableBody tableBodyClass="divide-y bg-white">
					{#if $exportMoodsData?.length === 0}
						{#if currentDataView == 'Student'}
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
								<TableBodyCell>No data</TableBodyCell>
							</TableBodyRow>
						{:else if currentDataView == 'Anon'}
							<TableBodyRow class="border border-zinc-300 text-center">
								<TableBodyCell>No data</TableBodyCell>
								<TableBodyCell>No data</TableBodyCell>
								<TableBodyCell>No data</TableBodyCell>
								<TableBodyCell>No data</TableBodyCell>
								<TableBodyCell>No data</TableBodyCell>
								<TableBodyCell>No data</TableBodyCell>
								<TableBodyCell>No data</TableBodyCell>
								<TableBodyCell>No data</TableBodyCell>
							</TableBodyRow>
						{:else if currentDataView == 'Guest'}
							<TableBodyRow class="border border-zinc-300 text-center">
								<TableBodyCell>No data</TableBodyCell>
								<TableBodyCell>No data</TableBodyCell>
								<TableBodyCell>No data</TableBodyCell>
								<TableBodyCell>No data</TableBodyCell>
								<TableBodyCell>No data</TableBodyCell>
							</TableBodyRow>
						{/if}
					{:else}
						{#each $exportMoodsData?.slice(1, 2) as entry}
							<TableBodyRow class="border border-zinc-300 text-center">
								{#each entry as row}
									<TableBodyCell>{row}</TableBodyCell>
								{/each}
							</TableBodyRow>
						{/each}
					{/if}
				</TableBody>
			</Table>
			<Button class="w-fit mt-4" on:click={handleExport}>CONFIRM EXPORT</Button>
		</TabItem>
	</Tabs>
</Modal>
