import { MEMPHIS_BOUNDS, DEFAULT_CENTER, DEFAULT_ZOOM } from "./config";

export default class MapController {
	constructor() {
		this.map = null;
		this.directionsService = null;
		this.directionsRenderer = null;
		this.originAutocomplete = null;
		this.destinationAutocomplete = null;
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
		google.maps.event.addListenerOnce(this.map, "idle", callback);
	}

	getCenter() {
		return this.map.getCenter();
	}

	getBounds() {
		return this.map.getBounds();
	}
}