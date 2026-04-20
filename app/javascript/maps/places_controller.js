import { clearMarkers, filterOpenPlaces } from "maps/helpers";
import { bindPlannerButtons, syncPlannerButtons } from "maps/planner_state";

export default class PlacesController {
	constructor(mapController) {
		this.mapController = mapController;
		this.markers = [];
		this.infoWindow = new google.maps.InfoWindow();
	}

	async load() {
		clearMarkers(this.markers);
		this.markers = [];

		const container = document.getElementById("placeList");
		container.innerHTML = "<p>Loading places...</p>";

		const bounds = this.mapController.getBounds();
		const center = this.mapController.getCenter();
		const ne = bounds.getNorthEast();

		const lat = center.lat();
		const lng = center.lng();
		const radius = google.maps.geometry.spherical.computeDistanceBetween(center, ne);
		const type = document.getElementById("placeType").value;

		const url = `/places?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${encodeURIComponent(radius)}&type=${encodeURIComponent(type)}`;

		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`Request failed: ${response.status}`);

			const places = await response.json();
			const openPlaces = filterOpenPlaces(places);

			this.renderList(openPlaces, type);
			this.renderMarkers(openPlaces);
			this.bindPlannerButtons();
		} catch (error) {
			container.innerHTML = "<p>Unable to load places.</p>";
			console.error(error);
		}
	}

	renderList(places, type) {
		const container = document.getElementById("placeList");

		if (places.length === 0) {
			container.innerHTML = "<p>No places found</p>";
			return;
		}

		container.innerHTML = places.map(place => {
			const payload = encodeURIComponent(JSON.stringify({
				title: place.name,
				item_type: "place",
				location_name: place.name,
				address: place.address,
				latitude: place.lat,
				longitude: place.lng,
				external_id: `google-place-${place.name}-${place.lat}-${place.lng}`,
				source: "google_places",
				category: type,
				rating: place.rating
			}));

			return `
				<div class="maps-group-card maps-place-card">
					<div class="maps-result-item">
						<div class="maps-result-copy">
							<strong>${place.name}</strong>
							<div class="maps-result-meta">
								<span>${place.address || "Address unavailable"}</span>
								<span>Rating: ${place.rating || "N/A"}</span>
							</div>
						</div>
						<button
							type="button"
							class="add-to-planner-button planner-inline-action"
							data-item="${payload}"
							aria-label="Save ${place.name} to planner">
							Save
						</button>
					</div>
				</div>
			`;
		}).join("");

		syncPlannerButtons(container);
	}

	renderMarkers(places) {
		places.forEach(place => {
			if (!place.lat || !place.lng) return;

			const marker = new google.maps.Marker({
				position: {
					lat: parseFloat(place.lat),
					lng: parseFloat(place.lng)
				},
				map: this.mapController.map,
				title: place.name,
				icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
			});

			marker.addListener("click", () => {
				this.infoWindow.setContent(`
					<div style="max-width:200px">
						<strong>${place.name}</strong><br>
						${place.address || ""}<br>
						${place.rating || "N/A"}
					</div>
				`);

				this.infoWindow.open(this.mapController.map, marker);
			});

			this.markers.push(marker);
		});
	}

	bindPlannerButtons() {
		const container = document.getElementById("placeList");
		bindPlannerButtons(container);
	}
}
