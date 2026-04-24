import MapController from "maps/map_controller";
import DirectionsController from "maps/directions_controller";
import EventsController from "maps/events_controller";
import PlacesController from "maps/places_controller";
import { fillDirectionsDestination, fillDirectionsOrigin } from "maps/helpers";
import { loadPlannerItems } from "maps/planner_state";

let googleMapsPromise = null;

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

	async initMap() {
		if (this.initialized) return;
		if (!document.getElementById("map")) return;
		if (!window.google || !window.google.maps) return;

		this.mapController.init();

		this.directionsController = new DirectionsController(this.mapController);
		this.eventsController = new EventsController(this.mapController);
		this.placesController = new PlacesController(this.mapController);

		this.mapController.onViewportChange(() => this.scheduleLoadAll());
		await this.loadAll();
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
	}

	async applyFilters() {
		await this.loadAll();
	}

	async resetFilters() {
		["startDate", "endDate", "startTime", "endTime", "classification", "placeType"].forEach(id => {
			const input = document.getElementById(id);
			if (input) input.value = "";
		});

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
		console.error(error);
	}
}

document.addEventListener("turbo:load", waitForGoogleMaps);
document.addEventListener("DOMContentLoaded", waitForGoogleMaps);
document.addEventListener("turbo:before-cache", () => app.reset());
