function bindDeleteButtons() {
	document.querySelectorAll(".delete-planner-item").forEach(button => {
		if (button.dataset.deleteBound === "true") return;
		button.dataset.deleteBound = "true";

		button.addEventListener("click", async e => {
			const clickedButton = e.currentTarget;
			const plannerItemId = clickedButton.dataset.plannerItemId;

			if (!plannerItemId) return;
			const title = clickedButton.closest(".planner-item")?.dataset.itemTitle || "this stop";
			if (!window.confirm(`Remove ${title} from your planner?`)) return;

			try {
				const response = await fetch(`/planner_items/${plannerItemId}`, {
					method: "DELETE",
					headers: {
						"X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
						"Content-Type": "application/json"
					}
				});

				if (!response.ok) {
					throw new Error("Unable to remove planner item");
				}

				const plannerItem = clickedButton.closest(".planner-item");
				if (plannerItem) {
					const plannerDay = plannerItem.closest(".planner-day");
					plannerItem.remove();

					if (plannerDay && !plannerDay.querySelector(".planner-item")) {
						plannerDay.remove();
					}

					if (!document.querySelector(".planner-item")) {
						document.querySelector("[data-planner-timeline]")?.remove();
						const page = document.querySelector(".planner-page");
						if (page && !page.querySelector("[data-planner-empty]")) {
							page.insertAdjacentHTML("beforeend", `
								<div class="planner-empty" data-planner-empty>
									<strong>No saved stops yet.</strong>
									<p>Maps is where discovery starts. Save a place or event there, then come back here to edit the day.</p>
									<a href="/maps" class="planner-empty-action">Open Maps</a>
								</div>
							`);
						}
					}

					refreshPlannerOverview();
				}
			} catch (error) {
				alert(error.message);
				console.error(error);
			}
		});
	});
}

function ensurePlannerEmptyState() {
	if (document.querySelector(".planner-item")) return;

	document.querySelector("[data-planner-timeline]")?.remove();
	const page = document.querySelector(".planner-page");
	if (page && !page.querySelector("[data-planner-empty]")) {
		page.insertAdjacentHTML("beforeend", `
			<div class="planner-empty" data-planner-empty>
				<strong>No saved stops yet.</strong>
				<p>Maps is where discovery starts. Save a place or event there, then come back here to edit the day.</p>
				<a href="/maps" class="planner-empty-action">Open Maps</a>
			</div>
		`);
	}
}

function refreshPlannerOverview() {
	const items = Array.from(document.querySelectorAll(".planner-item"));
	const total = items.length;
	const timed = items.filter(item => item.dataset.hasStartTime === "true").length;
	const places = items.filter(item => item.dataset.itemType === "place").length;
	const events = items.filter(item => item.dataset.itemType === "event").length;
	const prep = items.filter(item => item.dataset.itemType === "weather_prep").length;

	const totalNode = document.querySelector("[data-planner-total]");
	if (totalNode) {
		totalNode.textContent = `${total} saved item${total === 1 ? "" : "s"}`;
	}

	const timedNode = document.querySelector("[data-planner-timed]");
	if (timedNode) timedNode.textContent = timed;

	const placesNode = document.querySelector("[data-planner-places]");
	if (placesNode) placesNode.textContent = places;

	const eventsNode = document.querySelector("[data-planner-events]");
	if (eventsNode) eventsNode.textContent = events;

	const prepNode = document.querySelector("[data-planner-prep]");
	if (prepNode) prepNode.textContent = prep;

	refreshNextStop(items);
}

function bindClearDayButtons() {
	document.querySelectorAll("[data-clear-day]").forEach(button => {
		if (button.dataset.clearDayBound === "true") return;
		button.dataset.clearDayBound = "true";

		button.addEventListener("click", async () => {
			const day = button.closest("[data-planner-day]");
			if (!day) return;

			const dayLabel = day.dataset.dayLabel || "this day";
			const items = Array.from(day.querySelectorAll(".planner-item"));
			if (items.length === 0) return;

			const confirmed = window.confirm(`Clear the plan for ${dayLabel}? This will remove all ${items.length} stop${items.length === 1 ? "" : "s"} in this day.`);
			if (!confirmed) return;

			button.disabled = true;
			button.textContent = "Clearing...";

			try {
				await Promise.all(items.map(item => {
					const plannerItemId = item.querySelector(".delete-planner-item")?.dataset.plannerItemId;
					if (!plannerItemId) return Promise.resolve();

					return fetch(`/planner_items/${plannerItemId}`, {
						method: "DELETE",
						headers: {
							"X-CSRF-Token": csrfToken(),
							"Content-Type": "application/json"
						}
					}).then(response => {
						if (!response.ok) throw new Error("Unable to clear the day plan");
					});
				}));

				day.remove();
				ensurePlannerEmptyState();
				refreshPlannerOverview();
			} catch (error) {
				alert(error.message);
				button.disabled = false;
				button.textContent = "Clear day";
			}
		});
	});
}

function bindCompleteButtons() {
	document.querySelectorAll("[data-complete-planner-item]").forEach(button => {
		if (button.dataset.completeBound === "true") return;
		button.dataset.completeBound = "true";

		button.addEventListener("click", async () => {
			const plannerItemId = button.dataset.plannerItemId;
			const item = button.closest(".planner-item");
			if (!plannerItemId || !item) return;

			button.disabled = true;
			button.textContent = "Saving...";

			try {
				const completedAt = new Date().toISOString();
				const response = await fetch(`/planner_items/${plannerItemId}`, {
					method: "PATCH",
					headers: {
						"X-CSRF-Token": csrfToken(),
						"Accept": "application/json",
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						planner_item: {
							completed_at: completedAt
						}
					})
				});

				const data = await parseReminderResponse(response);
				if (!response.ok) {
					throw new Error(data.errors?.join(", ") || "Unable to mark stop as done");
				}

				item.classList.add("is-complete");
				item.dataset.completedAt = data.completed_at || completedAt;
				if (!item.querySelector(".planner-complete-pill")) {
					item.querySelector(".planner-quick-meta")?.insertAdjacentHTML("beforeend", `<span class="planner-complete-pill">Done</span>`);
				}
				button.textContent = "Done";
				refreshNextStop();
			} catch (error) {
				alert(error.message);
				button.disabled = false;
				button.textContent = "Mark done";
			}
		});
	});
}

function refreshNextStop(items = Array.from(document.querySelectorAll(".planner-item"))) {
	const nextStopTitle = document.querySelector(".planner-next-stop strong");
	const nextStopCopy = document.querySelector(".planner-next-stop p");
	if (!nextStopTitle || !nextStopCopy) return;

	const nextItem = items
		.filter(item => item.dataset.itemType !== "weather_prep" && item.dataset.hasStartTime === "true" && item.dataset.startTime)
		.filter(item => !item.dataset.completedAt)
		.sort((left, right) => new Date(left.dataset.startTime) - new Date(right.dataset.startTime))[0];

	if (!nextItem) {
		nextStopTitle.textContent = "Add your first stop";
		nextStopCopy.textContent = "Nothing scheduled yet";
		return;
	}

	const startsAt = new Date(nextItem.dataset.startTime);
	const title = nextItem.dataset.itemTitle || "Upcoming stop";

	nextStopTitle.textContent = title;
	nextStopCopy.textContent = startsAt.toLocaleString([], {
		weekday: "long",
		hour: "numeric",
		minute: "2-digit"
	});
}

const reminderTimers = new Map();

function csrfToken() {
	return document.querySelector('meta[name="csrf-token"]')?.content;
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, character => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;"
	})[character]);
}

function timeToMinutes(value) {
	const match = String(value || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
	if (!match) return null;

	let hours = Number(match[1]);
	const minutes = Number(match[2]);
	const period = match[3].toUpperCase();

	if (hours < 1 || hours > 12 || minutes > 59) return null;
	if (period === "AM" && hours === 12) hours = 0;
	if (period === "PM" && hours !== 12) hours += 12;

	return (hours * 60) + minutes;
}

function parsePlaceHourRanges(hoursText) {
	if (!hoursText) return null;

	const normalized = String(hoursText)
		.replace(/\u202f|\u00a0/g, " ")
		.replace(/\u2013|\u2014/g, "-");
	const hoursOnly = normalized.includes(":") ? normalized.slice(normalized.indexOf(":") + 1).trim() : normalized.trim();

	if (!hoursOnly) return null;
	if (/closed/i.test(hoursOnly)) return [];
	if (/open 24 hours/i.test(hoursOnly)) return [{ start: 0, end: 24 * 60 }];

	return hoursOnly.split(",").map(range => {
		const parts = range.split("-").map(part => part.trim());
		if (parts.length !== 2) return null;

		const start = timeToMinutes(parts[0]);
		const end = timeToMinutes(parts[1]);
		if (start === null || end === null) return null;

		return end > start
			? { start, end }
			: { start, end: end + (24 * 60) };
	}).filter(Boolean);
}

function startMinuteFromLocalDateTime(value) {
	if (!value) return null;
	if (/^\d{2}:\d{2}$/.test(value)) {
		const [hours, minutes] = value.split(":").map(Number);
		return (hours * 60) + minutes;
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	return (date.getHours() * 60) + date.getMinutes();
}

function updatePlaceHoursWarning(form) {
	if (form.dataset.itemType !== "place") return;

	const warning = form.querySelector("[data-hours-warning]");
	const startInput = form.querySelector(".planner-edit-start");
	if (!warning || !startInput) return;

	const hoursText = form.dataset.hoursForDay || "";
	const hoursDay = form.dataset.hoursDay || "the saved day";
	const ranges = parsePlaceHourRanges(hoursText);
	const startMinute = startMinuteFromLocalDateTime(startInput.value);

	warning.dataset.state = "";
	warning.textContent = "";

	if (!startInput.value) return;

	if (!hoursText || ranges === null) {
		warning.dataset.state = "neutral";
		warning.textContent = `Hours are unavailable for ${hoursDay}, so double-check before going.`;
		return;
	}

	if (ranges.length === 0) {
		warning.dataset.state = "warning";
		warning.textContent = `This place is listed as closed for ${hoursDay}.`;
		return;
	}

	if (startMinute === null) return;

	const inRange = ranges.some(range => (
		startMinute >= range.start && startMinute < range.end
	));

	if (!inRange) {
		warning.dataset.state = "warning";
		warning.textContent = `Heads up: this place may be closed at that time. Saved hours: ${hoursText}.`;
	}
}

function dateTimeFromClock(input, fallbackTime = "00:00") {
	const date = input?.dataset.date;
	if (!date) return "";

	const time = input.value || fallbackTime;
	return `${date}T${time.length === 5 ? `${time}:00` : time}`;
}

function buildEditFormData(form) {
	const formData = new FormData(form);
	const startClock = form.querySelector(".planner-edit-start");
	const endClock = form.querySelector(".planner-edit-end");

	formData.delete("planner_item_start_clock");
	formData.delete("planner_item_end_clock");

	if (startClock) {
		formData.set("planner_item[start_time]", dateTimeFromClock(startClock));
	}

	if (endClock) {
		formData.set("planner_item[end_time]", endClock.value ? dateTimeFromClock(endClock) : "");
	}

	return formData;
}

function formatClock(date) {
	if (!date || Number.isNaN(date.getTime())) return "";

	return date.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit"
	});
}

function formatRailTime(date) {
	if (!date || Number.isNaN(date.getTime())) return "Flex";

	const hour = date.toLocaleTimeString([], { hour: "numeric", hour12: true }).replace(/\s?(AM|PM)$/i, "");
	const period = date.toLocaleTimeString([], { hour: "numeric", hour12: true }).match(/AM|PM/i)?.[0] || "";
	return `${hour}<small>${period}</small>`;
}

function updatePlannerCardTime(item, data, form) {
	const startClock = form.querySelector(".planner-edit-start");
	const endClock = form.querySelector(".planner-edit-end");
	if (!startClock && !endClock) return;

	const startTime = startClock?.value ? data.start_time : "";
	const endTime = endClock?.value ? data.end_time : "";
	const startDate = startTime ? new Date(startTime) : null;
	const endDate = endTime ? new Date(endTime) : null;
	const railTime = item.querySelector("[data-planner-time]");
	const timeMeta = item.querySelector("[data-time-meta]");

	item.dataset.startTime = startTime || "";
	item.dataset.hasStartTime = startTime ? "true" : "false";

	if (railTime) {
		railTime.innerHTML = startTime ? formatRailTime(startDate) : "Flex";
	}

	if (timeMeta) {
		if (startTime) {
			const range = endTime ? `${formatClock(startDate)} - ${formatClock(endDate)}` : formatClock(startDate);
			timeMeta.textContent = range;
		} else {
			timeMeta.textContent = "Flex stop";
		}
	}
}

function setReminderStatus(form, message, state = "") {
	const status = form.closest(".planner-reminder-dropdown")?.querySelector(".planner-reminder-status");
	if (!status) return;

	status.textContent = message;
	status.dataset.state = state;
}

function nowDateTimeLocalValue() {
	const now = new Date();
	now.setSeconds(0, 0);
	return now.toISOString().slice(0, 16);
}

function reminderBounds(form) {
	return {
		min: nowDateTimeLocalValue(),
		max: form.dataset.startTime ? String(form.dataset.startTime).slice(0, 16) : ""
	};
}

function applyReminderInputBounds(form) {
	const reminderAt = form.querySelector(".planner-reminder-at");
	if (!reminderAt) return;

	const { min, max } = reminderBounds(form);
	reminderAt.min = min;
	if (max) {
		reminderAt.max = max;
	} else {
		reminderAt.removeAttribute("max");
	}
}

function validateReminderForm(form) {
	const enabled = form.querySelector(".planner-reminder-enabled")?.checked;
	const offset = form.querySelector(".planner-reminder-offset");
	const reminderAt = form.querySelector(".planner-reminder-at");

	if (!enabled) return null;
	if (!reminderAt) return "Reminder time is unavailable.";
	if (offset && offset.value !== "") return null;
	if (!reminderAt.value) return "Choose a custom reminder time.";

	const reminderAtDate = new Date(reminderAt.value);
	if (Number.isNaN(reminderAtDate.getTime())) {
		return "Choose a valid custom reminder time.";
	}

	if (reminderAtDate.getTime() <= Date.now()) {
		return "Reminder time must be in the future.";
	}

	if (form.dataset.startTime) {
		const startTime = new Date(form.dataset.startTime);
		if (!Number.isNaN(startTime.getTime()) && reminderAtDate > startTime) {
			return "Reminder time must be before the planned start time.";
		}
	}

	return null;
}

function syncReminderControls(form) {
	const enabled = form.querySelector(".planner-reminder-enabled")?.checked;
	const offset = form.querySelector(".planner-reminder-offset");
	const reminderAt = form.querySelector(".planner-reminder-at");
	const customSelected = !offset || offset.value === "";

	if (offset) {
		offset.disabled = !enabled;
	}

	if (reminderAt) {
		reminderAt.disabled = !enabled || !customSelected;
		reminderAt.required = Boolean(enabled && customSelected);
	}

	applyReminderInputBounds(form);
}

function bindEditForms() {
	document.querySelectorAll(".planner-edit-form").forEach(form => {
		if (form.dataset.editBound === "true") return;
		form.dataset.editBound = "true";
		updatePlaceHoursWarning(form);

		form.addEventListener("change", event => {
			if (event.target.matches(".planner-edit-start")) {
				updatePlaceHoursWarning(form);
			}
		});

		form.addEventListener("input", event => {
			if (event.target.matches(".planner-edit-start")) {
				updatePlaceHoursWarning(form);
			}
		});

		form.addEventListener("submit", async event => {
			event.preventDefault();
			const plannerItemId = form.dataset.plannerItemId;
			if (!plannerItemId) return;

			const status = form.querySelector(".planner-edit-status");
			const button = form.querySelector(".planner-edit-save");
			const item = form.closest(".planner-item");

			if (button) {
				button.disabled = true;
				button.textContent = "Saving...";
			}
			if (status) {
				status.textContent = "Saving changes...";
				status.dataset.state = "";
			}

			try {
				const response = await fetch(`/planner_items/${plannerItemId}`, {
					method: "PATCH",
					headers: {
						"X-CSRF-Token": csrfToken(),
						"Accept": "application/json"
					},
					body: buildEditFormData(form)
				});

				const data = await parseReminderResponse(response);
				if (!response.ok) {
					throw new Error(data.errors?.join(", ") || "Unable to save changes");
				}

				if (item) {
					updatePlannerCardTime(item, data, form);

					const note = item.querySelector(".planner-item-note");
					const notesValue = form.querySelector(".planner-edit-notes")?.value.trim();
					if (note && notesValue) {
						note.textContent = notesValue;
					} else if (note && !notesValue) {
						note.remove();
					} else if (notesValue) {
						item.querySelector(".planner-item-copy")?.insertAdjacentHTML("beforeend", `<p class="planner-item-note">${escapeHtml(notesValue)}</p>`);
					}
				}

				refreshPlannerOverview();
				if (status) {
					status.textContent = "Changes saved.";
					status.dataset.state = "success";
				}
			} catch (error) {
				if (status) {
					status.textContent = error.message;
					status.dataset.state = "error";
				}
				console.error(error);
			} finally {
				if (button) {
					button.disabled = false;
					button.textContent = "Save changes";
				}
			}
		});
	});
}

function notifyPlannerItem(item) {
	if (!("Notification" in window) || Notification.permission !== "granted") return;

	const title = item.dataset.reminderTitle || "Planner reminder";
	const location = item.dataset.reminderLocation;
	const body = location ? `Your saved plan is coming up at ${location}.` : "Your saved plan is coming up.";

	try {
		new Notification(title, { body });
	} catch (error) {
		console.error("Unable to show browser notification", error);
	}
}

function scheduleBrowserReminder(item) {
	const itemId = item.querySelector(".planner-reminder-form")?.dataset.plannerItemId;
	const reminderAt = item.dataset.reminderAt;
	if (!itemId) return;

	if (reminderTimers.has(itemId)) {
		clearTimeout(reminderTimers.get(itemId));
		reminderTimers.delete(itemId);
	}

	if (!reminderAt || !("Notification" in window) || Notification.permission !== "granted") return;

	const delay = new Date(reminderAt).getTime() - Date.now();
	if (Number.isNaN(delay) || delay <= 0 || delay > 2147483647) return;

	reminderTimers.set(itemId, window.setTimeout(() => {
		notifyPlannerItem(item);
		reminderTimers.delete(itemId);
	}, delay));
}

async function requestBrowserNotifications(button) {
	button.disabled = true;

	const form = button.closest(".planner-reminder-form");

	if (!("Notification" in window)) {
		if (form) setReminderStatus(form, "Browser notifications are not supported here.", "error");
		button.disabled = false;
		return;
	}

	try {
		const permission = await Notification.requestPermission();
		if (!form) return;

		if (permission === "granted") {
			setReminderStatus(form, "Browser notifications enabled for this device.", "success");
			document.querySelectorAll("[data-reminder-item]").forEach(scheduleBrowserReminder);
		} else if (permission === "denied") {
			setReminderStatus(form, "Browser notifications are blocked in this browser.", "error");
		} else {
			setReminderStatus(form, "Browser notifications were not enabled.", "error");
		}
	} catch (error) {
		if (form) setReminderStatus(form, "Unable to request browser notifications right now.", "error");
		console.error(error);
	} finally {
		button.disabled = false;
	}
}

async function parseReminderResponse(response) {
	const contentType = response.headers.get("content-type") || "";
	const bodyText = await response.text();

	if (!bodyText) return {};
	if (!contentType.includes("application/json")) return {};

	try {
		return JSON.parse(bodyText);
	} catch {
		return {};
	}
}

function bindReminderForms() {
	document.querySelectorAll(".planner-reminder-form").forEach(form => {
		if (form.dataset.reminderBound === "true") return;
		form.dataset.reminderBound = "true";

		syncReminderControls(form);

		form.addEventListener("change", e => {
			if (e.target.matches(".planner-reminder-enabled, .planner-reminder-offset, .planner-reminder-at")) {
				syncReminderControls(form);
				if (e.target.matches(".planner-reminder-at")) {
					const validationError = validateReminderForm(form);
					if (validationError) {
						setReminderStatus(form, validationError, "error");
					}
				}
			}
		});

		form.addEventListener("submit", async e => {
			e.preventDefault();
			const plannerItemId = form.dataset.plannerItemId;
			if (!plannerItemId) return;

			const validationError = validateReminderForm(form);
			if (validationError) {
				setReminderStatus(form, validationError, "error");
				return;
			}

			const submitButton = form.querySelector(".planner-reminder-save");
			if (submitButton) {
				submitButton.disabled = true;
				submitButton.textContent = "Saving...";
			}
			setReminderStatus(form, "Saving reminder...");

			try {
				const response = await fetch(`/planner_items/${plannerItemId}`, {
					method: "PATCH",
					headers: {
						"X-CSRF-Token": csrfToken(),
						"Accept": "application/json"
					},
					body: new FormData(form)
				});

				const data = await parseReminderResponse(response);
				if (!response.ok) {
					throw new Error(data.errors?.join(", ") || "Unable to save reminder");
				}

				const item = form.closest("[data-reminder-item]");
				if (item) {
					item.dataset.reminderAt = data.reminder_at || "";
					scheduleBrowserReminder(item);
				}

				setReminderStatus(form, data.reminder_enabled ? "Reminder saved." : "Reminder off", "success");
			} catch (error) {
				setReminderStatus(form, error.message, "error");
				console.error(error);
			} finally {
				if (submitButton) {
					submitButton.disabled = false;
					submitButton.textContent = "Save";
				}
			}
		});
	});

	document.querySelectorAll(".planner-browser-notifications").forEach(button => {
		if (button.dataset.browserNotificationsBound === "true") return;
		button.dataset.browserNotificationsBound = "true";

		button.addEventListener("click", () => requestBrowserNotifications(button));
	});

	document.querySelectorAll("[data-reminder-item]").forEach(scheduleBrowserReminder);
}

async function persistFlexOrder(list) {
	const items = Array.from(list.querySelectorAll("[data-flex-item]"));
	const requests = items.map((item, index) => {
		const plannerItemId = item.dataset.plannerItemId;
		if (!plannerItemId) return Promise.resolve();

		item.dataset.position = String(index + 1);
		return fetch(`/planner_items/${plannerItemId}`, {
			method: "PATCH",
			headers: {
				"X-CSRF-Token": csrfToken(),
				"Accept": "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				planner_item: {
					position: index + 1
				}
			})
		}).then(async response => {
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.errors?.join(", ") || "Unable to reorder stops");
			}
		});
	});

	await Promise.all(requests);
}

function bindFlexDragAndDrop() {
	document.querySelectorAll("[data-flex-item]").forEach(item => {
		if (item.dataset.dragBound === "true") return;
		item.dataset.dragBound = "true";

		item.addEventListener("dragstart", () => {
			item.classList.add("is-dragging");
		});

		item.addEventListener("dragend", () => {
			item.classList.remove("is-dragging");
		});
	});

	document.querySelectorAll("[data-flex-list]").forEach(list => {
		if (list.dataset.dragListBound === "true") return;
		list.dataset.dragListBound = "true";

		list.addEventListener("dragover", event => {
			event.preventDefault();
			const dragging = list.querySelector(".is-dragging");
			if (!dragging) return;

			const afterElement = Array.from(list.querySelectorAll("[data-flex-item]:not(.is-dragging)")).find(element => {
				const rect = element.getBoundingClientRect();
				return event.clientY < rect.top + (rect.height / 2);
			});

			if (!afterElement) {
				list.appendChild(dragging);
			} else {
				list.insertBefore(dragging, afterElement);
			}
		});

		list.addEventListener("drop", async event => {
			event.preventDefault();

			try {
				await persistFlexOrder(list);
			} catch (error) {
				alert(error.message);
				window.location.reload();
			}
		});
	});
}

function bindPlannerPage() {
	bindDeleteButtons();
	bindClearDayButtons();
	bindCompleteButtons();
	bindEditForms();
	bindReminderForms();
	bindFlexDragAndDrop();
	refreshPlannerOverview();
}

document.addEventListener("turbo:load", bindPlannerPage);
document.addEventListener("DOMContentLoaded", bindPlannerPage);
