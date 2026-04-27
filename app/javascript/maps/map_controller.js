import { MEMPHIS_BOUNDS, DEFAULT_CENTER, DEFAULT_ZOOM } from "./config";

export default class MapController {
	constructor() {
		this.map = null;
		this.directionsService = null;
		this.directionsRenderer = null;
		this.originAutocomplete = null;
		this.destinationAutocomplete = null;
		this.geocoder = null;
	}

	init() {
		this.map = new google.maps.Map(document.getElementById("map"), {
			center: DEFAULT_CENTER,
			zoom: DEFAULT_ZOOM,
			restriction: {
				latLngBounds: MEMPHIS_BOUNDS,
				strictBounds: true
			}
		});

		this.directionsService = new google.maps.DirectionsService();
		this.directionsRenderer = new google.maps.DirectionsRenderer();
		this.directionsRenderer.setMap(this.map);
		this.geocoder = new google.maps.Geocoder();

		const options = {
			bounds: MEMPHIS_BOUNDS,
			strictBounds: true
		};

		this.originAutocomplete = new google.maps.places.Autocomplete(
			document.getElementById("origin"),
			options
		);

		this.destinationAutocomplete = new google.maps.places.Autocomplete(
			document.getElementById("destination"),
			options
		);
	}

	onIdle(callback) {
		google.maps.event.addListener(this.map, "idle", callback);
	}

	onViewportChange(callback) {
		google.maps.event.addListener(this.map, "dragend", callback);
		google.maps.event.addListener(this.map, "zoom_changed", callback);
	}

	getCenter() {
		return this.map.getCenter();
	}

	getBounds() {
		return this.map.getBounds();
	}

	viewportKey() {
		if (!this.map) return "";

		const center = this.getCenter();
		const zoom = this.map.getZoom();
		if (!center || typeof zoom !== "number") return "";

		return [
			center.lat().toFixed(3),
			center.lng().toFixed(3),
			zoom
		].join(":");
	}

	panTo(position) {
		if (!this.map) return;

		this.map.panTo(position);
	}

	setZoom(zoom) {
		if (!this.map) return;

		this.map.setZoom(zoom);
	}

	async reverseGeocode(position) {
		if (!this.geocoder) return null;

		const response = await this.geocoder.geocode({ location: position });
		return response.results?.[0]?.formatted_address || null;
	}
}
