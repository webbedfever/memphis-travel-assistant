function bindDeleteButtons() {
	document.querySelectorAll(".delete-planner-item").forEach(button => {
		if (button.dataset.deleteBound === "true") return;
		button.dataset.deleteBound = "true";

		button.addEventListener("click", async e => {
			const clickedButton = e.currentTarget;
			const plannerItemId = clickedButton.dataset.plannerItemId;

			if (!plannerItemId) return;

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
						document.querySelector(".planner-timeline")?.remove();
						const page = document.querySelector(".planner-page");
						if (page && !page.querySelector(".planner-empty")) {
							page.insertAdjacentHTML("beforeend", '<div class="planner-empty">No planner items saved yet.</div>');
						}
					}
				}
			} catch (error) {
				alert(error.message);
				console.error(error);
			}
		});
	});
}

const reminderTimers = new Map();

function csrfToken() {
	return document.querySelector('meta[name="csrf-token"]')?.content;
}

function setReminderStatus(form, message, state = "") {
	const status = form.closest(".planner-reminder-dropdown")?.querySelector(".planner-reminder-status");
	if (!status) return;

	status.textContent = message;
	status.dataset.state = state;
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
}

function notifyPlannerItem(item) {
	if (!("Notification" in window) || Notification.permission !== "granted") return;

	const title = item.dataset.reminderTitle || "Planner reminder";
	const location = item.dataset.reminderLocation;
	const body = location ? `Your saved plan is coming up at ${location}.` : "Your saved plan is coming up.";

	new Notification(title, { body });
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
	if (!("Notification" in window)) {
		const form = button.closest(".planner-reminder-form");
		if (form) setReminderStatus(form, "Browser notifications are not supported here.", "error");
		return;
	}

	const permission = await Notification.requestPermission();
	const form = button.closest(".planner-reminder-form");
	if (!form) return;

	if (permission === "granted") {
		setReminderStatus(form, "Browser notifications enabled for this device.", "success");
		document.querySelectorAll("[data-reminder-item]").forEach(scheduleBrowserReminder);
	} else {
		setReminderStatus(form, "Browser notifications were not enabled.", "error");
	}
}

function bindReminderForms() {
	document.querySelectorAll(".planner-reminder-form").forEach(form => {
		if (form.dataset.reminderBound === "true") return;
		form.dataset.reminderBound = "true";

		syncReminderControls(form);

		form.addEventListener("change", e => {
			if (e.target.matches(".planner-reminder-enabled, .planner-reminder-offset")) {
				syncReminderControls(form);
			}
		});

		form.addEventListener("submit", async e => {
			e.preventDefault();
			const plannerItemId = form.dataset.plannerItemId;
			if (!plannerItemId) return;

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

				const data = await response.json();
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

function bindPlannerPage() {
	bindDeleteButtons();
	bindReminderForms();
}

document.addEventListener("turbo:load", bindPlannerPage);
document.addEventListener("DOMContentLoaded", bindPlannerPage);
