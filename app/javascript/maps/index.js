import MapController from "maps/map_controller";
import DirectionsController from "maps/directions_controller";
import EventsController from "maps/events_controller";
import PlacesController from "maps/places_controller";
import { fillDirectionsDestination, fillDirectionsOrigin, renderStateCard } from "maps/helpers";
import { loadPlannerItems } from "maps/planner_state";

let googleMapsPromise = null;

function todayDateValue() {
	return new Date().toLocaleDateString("en-CA");
}

function addDays(date, days) {
	const nextDate = new Date(date);
	nextDate.setDate(nextDate.getDate() + days);
	return nextDate;
}

function toDateValue(date) {
	return date.toLocaleDateString("en-CA");
}

function nextWeekendRange() {
	const today = new Date();
	const day = today.getDay();
	const daysUntilSaturday = day === 6 ? 0 : day === 0 ? 6 : 6 - day;
	const start = addDays(today, daysUntilSaturday);
	const end = addDays(start, 1);
	return { start: toDateValue(start), end: toDateValue(end), label: "Weekend" };
}

function nextWeekRange() {
	const today = new Date();
	const day = today.getDay();
	const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
	const start = addDays(today, daysUntilNextMonday);
	const end = addDays(start, 6);
	return { start: toDateValue(start), end: toDateValue(end), label: "Following week" };
}

function nextMonthRange() {
	const today = new Date();
	const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
	const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
	return { start: toDateValue(start), end: toDateValue(end), label: "Following month" };
}

function ensureDefaultDateFilters() {
	const today = todayDateValue();
	["startDate", "endDate"].forEach(id => {
		const input = document.getElementById(id);
		if (input && !input.value) input.value = today;
	});
}

class MapsPage {
	constructor() {
		this.mapController = new MapController();
		this.directionsController = null;
		this.eventsController = null;
		this.placesController = null;
		this.initialized = false;
		this.loadAllTimer = null;
		this.lastViewportKey = "";
	}

	filterInputs() {
		return {
			startDate: document.getElementById("startDate"),
			endDate: document.getElementById("endDate"),
			startTime: document.getElementById("startTime"),
			endTime: document.getElementById("endTime"),
			status: document.getElementById("filterStatus")
		};
	}

	setFilterStatus(message = "") {
		const { status } = this.filterInputs();
		if (status) status.textContent = message;
	}

	normalizeDateRange() {
		const { startDate, endDate } = this.filterInputs();
		if (!startDate || !endDate) return;

		const today = todayDateValue();
		startDate.min = today;
		endDate.min = today;

		if (startDate.value && startDate.value < today) {
			startDate.value = today;
			this.setFilterStatus("Past dates are not available, so the start date was moved to today.");
		}

		if (endDate.value && endDate.value < today) {
			endDate.value = today;
			this.setFilterStatus("Past dates are not available, so the end date was moved to today.");
		}

		if (!startDate.value) startDate.value = today;
		if (!endDate.value) endDate.value = startDate.value;

		if (endDate.value < startDate.value) {
			endDate.value = startDate.value;
			this.setFilterStatus("The end date was adjusted to match the start date.");
		}

		endDate.min = startDate.value || today;
	}

	bindFilterValidation() {
		const { startDate, endDate } = this.filterInputs();
		if (!startDate || !endDate) return;
		if (startDate.dataset.validationBound === "true") return;

		startDate.dataset.validationBound = "true";
		endDate.dataset.validationBound = "true";

		startDate.addEventListener("change", () => this.normalizeDateRange());
		endDate.addEventListener("change", () => this.normalizeDateRange());
	}

	bindDatePresets() {
		document.querySelectorAll("[data-date-preset]").forEach(button => {
			if (button.dataset.presetBound === "true") return;
			button.dataset.presetBound = "true";

			button.addEventListener("click", async () => {
				let range = null;

				switch (button.dataset.datePreset) {
				case "today":
					range = {
						start: todayDateValue(),
						end: todayDateValue(),
						label: "Today"
					};
					break;
				case "nextWeek":
					range = nextWeekRange();
					break;
				case "weekend":
					range = nextWeekendRange();
					break;
				case "nextMonth":
					range = nextMonthRange();
					break;
				default:
					return;
				}

				const { startDate, endDate } = this.filterInputs();
				if (!startDate || !endDate) return;

				startDate.value = range.start;
				endDate.value = range.end;
				this.normalizeDateRange();
				this.setFilterStatus(`${range.label} selected: ${range.start} to ${range.end}.`);
				await this.loadAll();
			});
		});
	}

	bindRetryButtons() {
		document.querySelectorAll("[data-retry-scope]").forEach(button => {
			if (button.dataset.retryBound === "true") return;
			button.dataset.retryBound = "true";

			button.addEventListener("click", async () => {
				const scope = button.dataset.retryScope;

				if (scope === "events" && this.eventsController) {
					await this.eventsController.load();
				} else if (scope === "places" && this.placesController) {
					await this.placesController.load();
				} else {
					await this.loadAll();
				}
			});
		});
	}

	async initMap() {
		if (this.initialized) return;
		if (!document.getElementById("map")) return;
		if (!window.google || !window.google.maps) return;

		ensureDefaultDateFilters();
		this.normalizeDateRange();
		this.bindFilterValidation();
		this.bindDatePresets();
		this.mapController.init();

		this.directionsController = new DirectionsController(this.mapController);
		this.eventsController = new EventsController(this.mapController);
		this.placesController = new PlacesController(this.mapController);

		this.mapController.onViewportChange(() => this.scheduleLoadAll());
		await this.loadAll();
		this.bindRetryButtons();
		this.lastViewportKey = this.mapController.viewportKey();

		this.initialized = true;
	}

	scheduleLoadAll() {
		window.clearTimeout(this.loadAllTimer);
		this.loadAllTimer = window.setTimeout(() => {
			const nextViewportKey = this.mapController.viewportKey();
			if (nextViewportKey === this.lastViewportKey) return;

			this.lastViewportKey = nextViewportKey;
			this.loadAll().catch(error => console.error(error));
		}, 700);
	}

	async loadAll() {
		try {
			await loadPlannerItems(true);
		} catch (error) {
			console.error(error);
		}

		await Promise.all([
			this.eventsController.load(),
			this.placesController.load()
		]);
		this.bindRetryButtons();
	}

	async applyFilters() {
		this.normalizeDateRange();
		await this.loadAll();
	}

	async resetFilters() {
		["startDate", "endDate", "startTime", "endTime", "classification", "placeType"].forEach(id => {
			const input = document.getElementById(id);
			if (input) input.value = "";
		});

		ensureDefaultDateFilters();
		this.normalizeDateRange();
		this.setFilterStatus("Filters reset to today.");

		const openNowButton = document.getElementById("openNowButton");
		if (openNowButton) openNowButton.setAttribute("aria-pressed", "false");

		await this.loadAll();
	}

	async toggleOpenNowFilter() {
		const button = document.getElementById("openNowButton");
		if (!button || !this.placesController) return;

		const pressed = button.getAttribute("aria-pressed") === "true";
		button.setAttribute("aria-pressed", String(!pressed));

		await this.placesController.load();
	}

	getDirections() {
		if (!this.directionsController) return;
		this.directionsController.getDirections();
	}

	swapDirections() {
		if (!this.directionsController) return;
		this.directionsController.swapLocations();
	}

	useCurrentLocation() {
		if (!this.directionsController) return;
		this.directionsController.useCurrentLocation();
	}

	reset() {
		window.clearTimeout(this.loadAllTimer);
		this.mapController = new MapController();
		this.directionsController = null;
		this.eventsController = null;
		this.placesController = null;
		this.initialized = false;
		this.lastViewportKey = "";
	}
}

const app = new MapsPage();

window.applyFilters = () => app.applyFilters();
window.resetFilters = () => app.resetFilters();
window.getDirections = () => app.getDirections();
window.toggleOpenNowFilter = () => app.toggleOpenNowFilter();
window.swapDirections = () => app.swapDirections();
window.useCurrentLocation = () => app.useCurrentLocation();
window.useMarkerDestination = address => fillDirectionsDestination(address);
window.useMarkerOrigin = address => fillDirectionsOrigin(address);

function loadGoogleMapsApi() {
	if (window.google?.maps?.places && window.google.maps.geometry) {
		return Promise.resolve();
	}

	if (googleMapsPromise) {
		return googleMapsPromise;
	}

	const mapElement = document.getElementById("map");
	const apiKey = mapElement?.dataset.googleMapsApiKey;

	if (!apiKey) {
		return Promise.reject(new Error("Missing Google Maps API key"));
	}

	googleMapsPromise = new Promise((resolve, reject) => {
		const existingScript = document.getElementById("google-maps-script");

		const handleLoad = () => resolve();
		const handleError = () => {
			googleMapsPromise = null;
			reject(new Error("Unable to load Google Maps API"));
		};

		if (existingScript) {
			if (window.google?.maps?.places && window.google.maps.geometry) {
				resolve();
				return;
			}

			existingScript.addEventListener("load", handleLoad, { once: true });
			existingScript.addEventListener("error", handleError, { once: true });
			return;
		}

		const script = document.createElement("script");
		script.id = "google-maps-script";
		script.async = true;
		script.defer = true;
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry`;
		script.addEventListener("load", handleLoad, { once: true });
		script.addEventListener("error", handleError, { once: true });
		document.head.appendChild(script);
	});

	return googleMapsPromise;
}

async function waitForGoogleMaps() {
	if (!document.getElementById("map")) return;

	try {
		await loadGoogleMapsApi();
		await app.initMap();
	} catch (error) {
		renderMapFailure(error);
		console.error(error);
	}
}

function renderMapFailure(error) {
	const map = document.getElementById("map");
	const eventList = document.getElementById("eventList");
	const placeList = document.getElementById("placeList");

	if (map) {
		map.innerHTML = renderStateCard(
			"Map unavailable",
			error.message || "The map could not load. You can try again after checking the maps configuration.",
			{ scope: "all", label: "Retry map" }
		);
	}

	if (eventList) {
		eventList.innerHTML = renderStateCard(
			"Events paused",
			"Events will load once the map is available.",
			{ scope: "all", label: "Retry" }
		);
	}

	if (placeList) {
		placeList.innerHTML = renderStateCard(
			"Places paused",
			"Nearby places need the map before they can load.",
			{ scope: "all", label: "Retry" }
		);
	}

	document.querySelectorAll("[data-retry-scope]").forEach(button => {
		button.addEventListener("click", () => window.location.reload(), { once: true });
	});
}

document.addEventListener("turbo:load", waitForGoogleMaps);
document.addEventListener("DOMContentLoaded", waitForGoogleMaps);
document.addEventListener("turbo:before-cache", () => app.reset());
