import {
	bindDirectionAddressButtons,
	clearMarkers,
	escapeHtml,
	normalizeRange,
	sanitizeUrl,
	timeToMinutes
} from "maps/helpers";
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
		this.updateCountLabel("Loading...");
		container.innerHTML = "<p>Loading places...</p>";

		const bounds = this.mapController.getBounds();
		const center = this.mapController.getCenter();
		const ne = bounds.getNorthEast();

		const lat = center.lat();
		const lng = center.lng();
		const radius = google.maps.geometry.spherical.computeDistanceBetween(center, ne);
		const type = document.getElementById("placeType").value;
		const date = document.getElementById("startDate").value;
		const startTime = document.getElementById("startTime").value;
		const endTime = document.getElementById("endTime").value;
		const openNowOnly = document.getElementById("openNowButton").getAttribute("aria-pressed") === "true";

		const params = new URLSearchParams({ lat, lng, radius });

		if (type) params.set("type", type);
		if (date) params.set("date", date);
		if (openNowOnly) params.set("open_now", "true");
		const query = params.toString();

		try {
			const response = await fetch(`/places?${query}`);
			if (!response.ok) throw new Error(`Request failed: ${response.status}`);

			const places = this.filterPlaces(await response.json(), {
				date,
				startTime,
				endTime,
				openNowOnly
			});

			this.updateCountLabel(this.countLabel(places.length, "place"));
			this.renderList(places, type);
			this.renderMarkers(places);
			this.bindPlannerButtons();
		} catch (error) {
			this.updateCountLabel("Unavailable");
			container.innerHTML = "<p>Unable to load places.</p>";
			console.error(error);
		}
	}

	renderList(places, type) {
		const container = document.getElementById("placeList");

		if (places.length === 0) {
			this.updateCountLabel(this.countLabel(0, "place"));
			container.innerHTML = "<p>No places found</p>";
			return;
		}

		container.innerHTML = places.map(place => {
			const name = escapeHtml(place.name || "Unnamed place");
			const address = escapeHtml(place.address || "Address unavailable");
			const addressAction = place.address ? this.renderAddressButton(place.address) : `<span>${address}</span>`;
			const rating = escapeHtml(place.rating || "N/A");
			const hours = escapeHtml(this.formatHours(place));
			const status = escapeHtml(this.formatOpenStatus(place));
			const phone = escapeHtml(place.phone || "");
			const website = sanitizeUrl(place.website);
			const googleUrl = sanitizeUrl(place.google_url);

			const payload = encodeURIComponent(JSON.stringify({
				title: place.name,
				item_type: "place",
				location_name: place.name,
				address: place.address,
				latitude: place.lat,
				longitude: place.lng,
				external_id: place.place_id || `google-place-${place.name}-${place.lat}-${place.lng}`,
				source: "google_places",
				category: type || place.category,
				rating: place.rating,
				open_now: place.open_now,
				hours_day: place.hours_day,
				hours_for_day: place.hours_for_day,
				phone: place.phone,
				website: place.website,
				google_url: place.google_url
			}));

			return `
				<div class="maps-group-card maps-place-card">
					<div class="maps-result-item">
						<div class="maps-result-copy">
							<strong>${name}</strong>
							<div class="maps-result-meta">
								${addressAction}
								<span>Rating: ${rating}</span>
								<span>${status}</span>
								<span>${hours}</span>
								${phone ? `<span>${phone}</span>` : ""}
							</div>
							${this.renderPlaceLinks(website, googleUrl)}
						</div>
						<button
							type="button"
							class="add-to-planner-button planner-inline-action"
							data-item="${payload}"
							aria-label="Save ${name} to planner">
							Save
						</button>
					</div>
				</div>
			`;
		}).join("");

		syncPlannerButtons(container);
		bindDirectionAddressButtons(container);
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
						<strong>${escapeHtml(place.name || "Unnamed place")}</strong><br>
						${escapeHtml(place.address || "")}<br>
						Rating: ${escapeHtml(place.rating || "N/A")}<br>
						${escapeHtml(this.formatOpenStatus(place))}<br>
						${escapeHtml(this.formatHours(place))}
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

	filterPlaces(places, filters) {
		return places.filter(place => {
			if (filters.openNowOnly && place.open_now !== true) return false;
			if (!filters.startTime && !filters.endTime) return true;

			return this.placeMatchesTimeWindow(place, filters);
		});
	}

	placeMatchesTimeWindow(place, filters) {
		if (!Array.isArray(place.hours_periods) || place.hours_periods.length === 0) {
			return false;
		}

		const date = filters.date ? new Date(`${filters.date}T00:00:00`) : new Date();
		if (Number.isNaN(date.getTime())) return false;

		const day = date.getDay();
		const startMinute = timeToMinutes(filters.startTime || "00:00");
		const endMinute = timeToMinutes(filters.endTime || "23:59");
		if (startMinute === null || endMinute === null) return false;

		const requestedRanges = normalizeRange(startMinute, endMinute);
		const openRanges = place.hours_periods.flatMap(period => this.periodRangesForDay(period, day));

		return requestedRanges.every(requestedRange => (
			openRanges.some(openRange => (
				openRange.start <= requestedRange.start && openRange.end >= requestedRange.end
			))
		));
	}

	periodRangesForDay(period, day) {
		const openDay = Number(period.open?.day);
		const closeDay = Number(period.close?.day);
		const openMinute = this.timeTextToMinutes(period.open?.time);
		const closeMinute = this.timeTextToMinutes(period.close?.time);

		if (Number.isNaN(openDay) || openMinute === null) return [];
		if (!period.close) return day === openDay ? [{ start: 0, end: 24 * 60 }] : [];
		if (Number.isNaN(closeDay) || closeMinute === null) return [];

		if (openDay === day && closeDay === day && closeMinute > openMinute) {
			return [{ start: openMinute, end: closeMinute }];
		}

		const ranges = [];
		if (openDay === day) ranges.push({ start: openMinute, end: 24 * 60 });
		if (closeDay === day) ranges.push({ start: 0, end: closeMinute });

		return ranges;
	}

	timeTextToMinutes(time) {
		if (!time || !/^\d{4}$/.test(time)) return null;

		const hours = Number(time.slice(0, 2));
		const minutes = Number(time.slice(2));
		if (hours > 23 || minutes > 59) return null;

		return (hours * 60) + minutes;
	}

	formatOpenStatus(place) {
		if (place.open_now === true) return "Open now";
		if (place.open_now === false) return "Closed now";
		return "Open status unavailable";
	}

	formatHours(place) {
		if (place.hours_for_day) return place.hours_for_day;
		if (place.hours_day) return `${place.hours_day}: hours unavailable`;
		return "Hours unavailable";
	}

	renderPlaceLinks(website, googleUrl) {
		const links = [];
		if (website) links.push(`<a href="${website}" target="_blank" rel="noopener">Website</a>`);
		if (googleUrl) links.push(`<a href="${googleUrl}" target="_blank" rel="noopener">Google listing</a>`);

		if (links.length === 0) return "";

		return `<div class="maps-result-links">${links.join("")}</div>`;
	}

	renderAddressButton(address) {
		const safeAddress = escapeHtml(address);

		return `
			<button
				type="button"
				class="maps-address-button"
				data-address="${safeAddress}"
				title="Use as directions destination">
				${safeAddress}
			</button>
		`;
	}

	updateCountLabel(label) {
		const count = document.getElementById("placeCount");
		if (count) count.textContent = label;
	}

	countLabel(total, noun) {
		return `${total} ${noun}${total === 1 ? "" : "s"} available`;
	}
}
