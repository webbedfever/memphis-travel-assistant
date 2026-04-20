let plannerItemKeys = new Set();
let plannerItemsPromise = null;

function normalizedDate(value) {
	if (!value) return "";

	const rawValue = String(value);
	const isoDateMatch = rawValue.match(/^\d{4}-\d{2}-\d{2}/);

	if (isoDateMatch) {
		return isoDateMatch[0];
	}

	const parsed = new Date(rawValue);
	return Number.isNaN(parsed.getTime()) ? rawValue : parsed.toISOString().slice(0, 10);
}

export function plannerItemKey(item) {
	const source = item.source || "manual";
	const externalId = item.external_id || item.externalId;

	if (externalId) {
		return `${source}:${externalId}`;
	}

	if (item.item_type === "event") {
		return [
			source,
			item.item_type,
			item.title,
			item.location_name,
			normalizedDate(item.start_time)
		].join(":");
	}

	return [
		source,
		item.item_type,
		item.title,
		item.location_name,
		item.latitude,
		item.longitude
	].join(":");
}

async function parseResponse(response) {
	const contentType = response.headers.get("content-type") || "";
	const bodyText = await response.text();

	if (!bodyText) return null;
	if (!contentType.includes("application/json")) return bodyText;

	try {
		return JSON.parse(bodyText);
	} catch {
		return bodyText;
	}
}

function markButtonAsAdded(button) {
	button.textContent = "Saved";
	button.disabled = true;
	button.dataset.saved = "true";
}

export async function loadPlannerItems(force = false) {
	if (!plannerItemsPromise || force) {
		plannerItemsPromise = fetch("/planner_items.json", {
			headers: {
				Accept: "application/json"
			}
		})
			.then(async response => {
				if (!response.ok) {
					throw new Error("Unable to load planner items");
				}

				const items = await response.json();
				plannerItemKeys = new Set(items.map(plannerItemKey));
				return plannerItemKeys;
			})
			.catch(error => {
				plannerItemKeys = new Set();
				plannerItemsPromise = null;
				throw error;
			});
	}

	return plannerItemsPromise;
}

export function syncPlannerButtons(root = document) {
	root.querySelectorAll(".add-to-planner-button").forEach(button => {
		const rawItem = button.dataset.item;
		if (!rawItem) return;

		const plannerItem = JSON.parse(decodeURIComponent(rawItem));
		if (plannerItemKeys.has(plannerItemKey(plannerItem))) {
			markButtonAsAdded(button);
		}
	});
}

export function bindPlannerButtons(root = document) {
	root.querySelectorAll(".add-to-planner-button").forEach(button => {
		if (button.dataset.plannerBound === "true") return;
		button.dataset.plannerBound = "true";

		button.addEventListener("click", async e => {
			e.preventDefault();

			const clickedButton = e.currentTarget;
			const rawItem = clickedButton.dataset.item;
			if (!rawItem) return;

			const plannerItem = JSON.parse(decodeURIComponent(rawItem));

			try {
				const response = await fetch("/planner_items", {
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
						"X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content
					},
					body: JSON.stringify({
						planner_item: plannerItem
					})
				});

				const responseBody = await parseResponse(response);

				if (!response.ok) {
					const errorMessage = Array.isArray(responseBody?.errors)
						? responseBody.errors.join(", ")
						: typeof responseBody === "string" && responseBody.trim().startsWith("<!DOCTYPE")
							? "Unable to save item right now."
							: "Unable to save item";

					throw new Error(errorMessage);
				}

				plannerItemKeys.add(plannerItemKey(plannerItem));
				markButtonAsAdded(clickedButton);
			} catch (error) {
				alert(error.message);
				console.error(error);
			}
		});
	});
}
