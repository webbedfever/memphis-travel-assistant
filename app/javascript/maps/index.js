import MapController from "maps/map_controller";
import DirectionsController from "maps/directions_controller";
import EventsController from "maps/events_controller";
import PlacesController from "maps/places_controller";

class MapsPage {
	constructor() {
		this.mapController = new MapController();
		this.directionsController = null;
		this.eventsController = null;
		this.placesController = null;
		this.initialized = false;
	}

	async initMap() {
		if (this.initialized) return;
		if (!window.google || !window.google.maps) return;

		this.mapController.init();

		this.directionsController = new DirectionsController(this.mapController);
		this.eventsController = new EventsController(this.mapController);
		this.placesController = new PlacesController(this.mapController);

		this.mapController.onIdle(async () => {
			await this.loadAll();
		});

		this.initialized = true;
	}

	async loadAll() {
		await this.eventsController.load();
		await this.placesController.load();
	}

	async applyFilters() {
		await this.loadAll();
	}

	getDirections() {
		if (!this.directionsController) return;
		this.directionsController.getDirections();
	}
}

const app = new MapsPage();

window.applyFilters = () => app.applyFilters();
window.getDirections = () => app.getDirections();

function waitForGoogleMaps() {
	if (window.google && window.google.maps) {
		app.initMap();
	} else {
		setTimeout(waitForGoogleMaps, 100);
	}
}

document.addEventListener("turbo:load", waitForGoogleMaps);
document.addEventListener("DOMContentLoaded", waitForGoogleMaps);