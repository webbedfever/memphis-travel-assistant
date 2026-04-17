import { clearMarkers, filterOpenPlaces } from "./helpers";

export default class PlacesController {
	constructor(mapController) {
		this.mapController = mapController;
		this.markers = [];
		this.infoWindow = new google.maps.InfoWindow();
	}

	async load() {
		clearMarkers(this.markers);
		this.markers = [];

		const bounds = this.mapController.getBounds();
		const center = this.mapController.getCenter();
		const ne = bounds.getNorthEast();

		const lat = center.lat();
		const lng = center.lng();
		const radius = google.maps.geometry.spherical.computeDistanceBetween(center, ne);
		const type = document.getElementById("placeType").value;

		const url = `/places?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${encodeURIComponent(radius)}&type=${encodeURIComponent(type)}`;

		const response = await fetch(url);
		const places = await response.json();

		const openPlaces = filterOpenPlaces(places);
		this.renderList(openPlaces);
		this.renderMarkers(openPlaces);
	}

	renderList(places) {
		const container = document.getElementById("placeList");

		if (places.length === 0) {
			container.innerHTML = "<p>No places found</p>";
			return;
		}

		container.innerHTML = places.map(place => `
			<div style="margin-bottom:10px; padding:10px; border:1px solid #ccc;">
				<strong>${place.name}</strong><br>
				${place.address || ""}<br>
				Rating: ${place.rating || "N/A"}
			</div>
		`).join("");
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
				icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
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
}